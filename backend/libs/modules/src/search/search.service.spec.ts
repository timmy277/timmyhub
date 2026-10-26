import type { ConfigService } from '@nestjs/config'
import type { PrismaService } from '@timmyhub/prisma'

jest.mock('@nestjs/event-emitter', () => ({
    EventEmitter2: class EventEmitter2 {},
    OnEvent: () => () => undefined,
}))
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }))

import { SearchService } from './search.service'

describe('SearchService', () => {
    let service: SearchService
    let prismaMock: {
        product: {
            findMany: jest.Mock
            findUnique: jest.Mock
            count: jest.Mock
        }
        sellerProfile: {
            findMany: jest.Mock
            findUnique: jest.Mock
        }
    }
    let configMock: {
        get: jest.Mock
    }

    const mockDate = new Date('2026-10-01T12:00:00Z')

    const mockProduct = {
        id: 'prod-1',
        shopId: 'shop-1',
        categoryId: 'cat-1',
        name: 'Áo Thun Nam Cao Cấp',
        slug: 'ao-thun-nam-cao-cap',
        description: 'Chất liệu cotton 100% thoáng mát',
        status: 'APPROVED',
        minPrice: 199000,
        maxPrice: 249000,
        totalStock: 50,
        soldCount: 120,
        viewCount: 1500,
        ratingAvg: 4.8,
        ratingCount: 35,
        isFeatured: true,
        images: ['https://example.com/ao.jpg'],
        videos: [],
        isSuspended: false,
        createdAt: mockDate,
        updatedAt: mockDate,
        category: { id: 'cat-1', name: 'Thời Trang Nam' },
        variants: [{ price: 199000, compareAtPrice: 299000 }],
    }

    beforeEach(() => {
        prismaMock = {
            product: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                count: jest.fn(),
            },
            sellerProfile: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
            },
        }

        configMock = {
            get: jest.fn().mockReturnValue('http://localhost:9200'),
        }

        service = new SearchService(configMock as unknown as ConfigService, prismaMock as unknown as PrismaService)
    })

    describe('Database Fallback Search', () => {
        it('should fallback to database when Elasticsearch is unavailable', async () => {
            prismaMock.product.findMany.mockResolvedValue([mockProduct])
            prismaMock.product.count.mockResolvedValue(1)
            prismaMock.sellerProfile.findMany.mockResolvedValue([
                { id: 'shop-1', shopName: 'Shop Thời Trang Official', shopSlug: 'shop-thoi-trang' },
            ])

            const result = await service.search({
                q: 'áo thun',
                page: 1,
                limit: 10,
            })

            expect(result.meta.source).toBe('database')
            expect(result.data.length).toBe(1)
            expect(result.data[0]?.name).toBe('Áo Thun Nam Cao Cấp')
            expect(result.data[0]?.shopName).toBe('Shop Thời Trang Official')
            expect(result.data[0]?.discount).toBe(33) // (299k - 199k) / 299k = 33%
            expect(result.meta.total).toBe(1)
        })

        it('should apply price and category filters in database fallback', async () => {
            prismaMock.product.findMany.mockResolvedValue([])
            prismaMock.product.count.mockResolvedValue(0)
            prismaMock.sellerProfile.findMany.mockResolvedValue([])

            await service.search({
                category: 'cat-1',
                minPrice: 100000,
                maxPrice: 300000,
                minRating: 4,
                sortBy: 'price_asc',
            })

            expect(prismaMock.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        status: 'APPROVED',
                        isSuspended: false,
                        totalStock: { gt: 0 },
                        categoryId: 'cat-1',
                        minPrice: { gte: 100000, lte: 300000 },
                        ratingAvg: { gte: 4 },
                    },
                    orderBy: { minPrice: 'asc' },
                }),
            )
        })
    })

    describe('Suggest autocomplete', () => {
        it('should return empty list when query is empty', async () => {
            const res = await service.suggest('')
            expect(res.data).toEqual([])
        })

        it('should return keyword suggestions from database when ES unavailable', async () => {
            prismaMock.product.findMany.mockResolvedValue([{ name: 'Áo Thun Nam' }, { name: 'Áo Thun Nữ' }])

            const res = await service.suggest('áo')
            expect(res.data).toEqual(['Áo Thun Nam', 'Áo Thun Nữ'])
            expect(prismaMock.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        status: 'APPROVED',
                        isSuspended: false,
                        name: { contains: 'áo', mode: 'insensitive' },
                    },
                }),
            )
        })
    })

    describe('Status report', () => {
        it('should report availability status correctly', async () => {
            const status = await service.getStatus()
            expect(status.available).toBe(false)
            expect(status.index).toBe('products')
        })
    })
})
