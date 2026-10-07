import { ResourceStatus, UserRole } from '@timmyhub/contracts'
import type { CreateSellerApplicationInput, ReviewSellerApplicationInput } from '@timmyhub/contracts'
import type { SellerApplication, SellerProfile } from '@timmyhub/prisma'

import type { SellerRepository } from './seller.repository'
import { SellerService } from './seller.service'

type MockRepository = {
    [K in keyof SellerRepository]: jest.Mock
}

describe('SellerService', () => {
    let service: SellerService
    let repository: MockRepository

    const mockDate = new Date('2026-10-01T12:00:00Z')

    const createMockApplication = (overrides?: Partial<SellerApplication>): SellerApplication => ({
        id: 'app-1',
        userId: 'user-1',
        sellerProfileId: null,
        shopName: 'Tiệm Bách Hóa Timmy',
        shopDescription: 'Mô tả shop',
        idDocumentUrl: 'https://example.com/id.jpg',
        taxCode: '0123456789',
        status: ResourceStatus.PENDING,
        reviewNote: null,
        reviewedById: null,
        reviewedAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        ...overrides,
    })

    const createMockProfile = (overrides?: Partial<SellerProfile>): SellerProfile => ({
        id: 'profile-1',
        userId: 'user-1',
        shopName: 'Tiệm Bách Hóa Timmy',
        shopSlug: 'tiem-bach-hoa-timmy',
        shopLogo: null,
        shopBanner: null,
        description: 'Mô tả shop',
        warehouseAddressLine: null,
        provinceCode: null,
        districtCode: null,
        wardCode: null,
        status: ResourceStatus.APPROVED,
        isVerified: false,
        verifiedAt: null,
        isSuspended: false,
        suspendedReason: null,
        rating: 5.0,
        cancelRate: 0,
        avgResponseHours: 1.0,
        returnPolicyDays: 7,
        prepTimeHours: 24,
        createdAt: mockDate,
        updatedAt: mockDate,
        ...overrides,
    })

    beforeEach(() => {
        repository = {
            findPendingApplicationByUserId: jest.fn(),
            findLatestApplicationByUserId: jest.fn(),
            findApplicationsByUserId: jest.fn(),
            findProfileByUserId: jest.fn(),
            findUserRoles: jest.fn().mockResolvedValue([]),
            findProfileById: jest.fn(),
            findProfileBySlug: jest.fn(),
            findApplicationById: jest.fn(),
            listApplications: jest.fn(),
            createApplication: jest.fn(),
            approveApplication: jest.fn(),
            rejectApplication: jest.fn(),
            updateProfile: jest.fn(),
            verifyShop: jest.fn(),
            suspendShop: jest.fn(),
            restoreShop: jest.fn(),
        }

        service = new SellerService(repository as unknown as SellerRepository)
    })

    describe('submitApplication (REQ-SEL-001..005)', () => {
        const input: CreateSellerApplicationInput = {
            shopName: 'Tiệm Bách Hóa Timmy',
            shopDescription: 'Mô tả shop bán lẻ',
            idDocumentUrl: 'https://example.com/cccd.jpg',
            taxCode: '0123456789',
        }

        it('tạo đơn thành công khi user chưa có shop và chưa có đơn pending', async () => {
            repository.findProfileByUserId.mockResolvedValue(null)
            repository.findPendingApplicationByUserId.mockResolvedValue(null)
            repository.findLatestApplicationByUserId.mockResolvedValue(null)
            repository.createApplication.mockResolvedValue(createMockApplication())

            const result = await service.submitApplication('user-1', input)

            expect(result.id).toBe('app-1')
            expect(result.status).toBe(ResourceStatus.PENDING)
            expect(repository.createApplication).toHaveBeenCalledWith('user-1', input)
        })

        it('từ chối nộp đơn khi user có vai trò quản trị viên (ADMIN)', async () => {
            repository.findUserRoles.mockResolvedValue([UserRole.ADMIN])

            await expect(service.submitApplication('admin-1', input)).rejects.toThrow()
            expect(repository.createApplication).not.toHaveBeenCalled()
        })

        it('từ chối nộp đơn khi user đã có shop APPROVED (REQ-SEL-003)', async () => {
            repository.findProfileByUserId.mockResolvedValue(createMockProfile({ status: ResourceStatus.APPROVED }))

            await expect(service.submitApplication('user-1', input)).rejects.toThrow()
            expect(repository.createApplication).not.toHaveBeenCalled()
        })

        it('từ chối nộp đơn khi user đã có đơn PENDING (REQ-SEL-003)', async () => {
            repository.findProfileByUserId.mockResolvedValue(null)
            repository.findPendingApplicationByUserId.mockResolvedValue(createMockApplication())

            await expect(service.submitApplication('user-1', input)).rejects.toThrow()
            expect(repository.createApplication).not.toHaveBeenCalled()
        })

        it('từ chối nộp đơn khi đơn bị REJECTED cách đây chưa đủ 24 giờ (REQ-SEL-005)', async () => {
            repository.findProfileByUserId.mockResolvedValue(null)
            repository.findPendingApplicationByUserId.mockResolvedValue(null)
            // Đơn bị từ chối 2 giờ trước
            const rejected2hAgo = createMockApplication({
                status: ResourceStatus.REJECTED,
                reviewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            })
            repository.findLatestApplicationByUserId.mockResolvedValue(rejected2hAgo)

            await expect(service.submitApplication('user-1', input)).rejects.toThrow()
            expect(repository.createApplication).not.toHaveBeenCalled()
        })

        it('cho phép nộp lại đơn khi đơn REJECTED đã qua 25 giờ (REQ-SEL-004, REQ-SEL-005)', async () => {
            repository.findProfileByUserId.mockResolvedValue(null)
            repository.findPendingApplicationByUserId.mockResolvedValue(null)
            // Đơn bị từ chối 25 giờ trước
            const rejected25hAgo = createMockApplication({
                status: ResourceStatus.REJECTED,
                reviewedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
            })
            repository.findLatestApplicationByUserId.mockResolvedValue(rejected25hAgo)
            repository.createApplication.mockResolvedValue(createMockApplication({ id: 'app-2' }))

            const result = await service.submitApplication('user-1', input)
            expect(result.id).toBe('app-2')
            expect(repository.createApplication).toHaveBeenCalled()
        })
    })

    describe('approveApplication (REQ-SEL-006, REQ-SEL-008)', () => {
        it('duyệt đơn thành công và tạo shop với slug an toàn', async () => {
            const pendingApp = createMockApplication({ status: ResourceStatus.PENDING })
            repository.findApplicationById.mockResolvedValue(pendingApp)
            repository.findProfileBySlug.mockResolvedValue(null)

            const approvedApp = createMockApplication({
                status: ResourceStatus.APPROVED,
                reviewedById: 'admin-1',
                reviewedAt: new Date(),
                sellerProfileId: 'profile-1',
            })
            const profile = createMockProfile()

            repository.approveApplication.mockResolvedValue({
                application: approvedApp,
                profile,
            })

            const result = await service.approveApplication('app-1', 'admin-1')

            expect(result.status).toBe(ResourceStatus.APPROVED)
            expect(repository.approveApplication).toHaveBeenCalledWith(
                expect.objectContaining({
                    applicationId: 'app-1',
                    reviewedById: 'admin-1',
                    shopSlug: 'tiem-bach-hoa-timmy',
                }),
            )
        })

        it('từ chối duyệt đơn nếu đơn không còn PENDING (REQ-SEL-008)', async () => {
            const alreadyApproved = createMockApplication({ status: ResourceStatus.APPROVED })
            repository.findApplicationById.mockResolvedValue(alreadyApproved)

            await expect(service.approveApplication('app-1', 'admin-1')).rejects.toThrow()
            expect(repository.approveApplication).not.toHaveBeenCalled()
        })
    })

    describe('rejectApplication (REQ-SEL-007, REQ-SEL-008)', () => {
        const rejectInput: ReviewSellerApplicationInput = {
            status: 'REJECT',
            reviewNote: 'Ảnh căn cước công dân bị mờ',
        }

        it('từ chối đơn kèm lý do thành công', async () => {
            const pendingApp = createMockApplication({ status: ResourceStatus.PENDING })
            repository.findApplicationById.mockResolvedValue(pendingApp)

            const rejectedApp = createMockApplication({
                status: ResourceStatus.REJECTED,
                reviewedById: 'admin-1',
                reviewNote: 'Ảnh căn cước công dân bị mờ',
            })
            repository.rejectApplication.mockResolvedValue(rejectedApp)

            const result = await service.rejectApplication('app-1', 'admin-1', rejectInput)

            expect(result.status).toBe(ResourceStatus.REJECTED)
            expect(result.reviewNote).toBe('Ảnh căn cước công dân bị mờ')
        })

        it('báo lỗi nếu từ chối mà thiếu reviewNote (REQ-SEL-007)', async () => {
            const pendingApp = createMockApplication({ status: ResourceStatus.PENDING })
            repository.findApplicationById.mockResolvedValue(pendingApp)

            await expect(
                service.rejectApplication('app-1', 'admin-1', {
                    status: 'REJECT',
                    reviewNote: '   ',
                }),
            ).rejects.toThrow()
        })
    })

    describe('getPublicShopBySlug (REQ-SEL-011, REQ-SEL-012)', () => {
        it('trả về thông tin shop công khai nếu APPROVED và không bị tạm ngưng', async () => {
            repository.findProfileBySlug.mockResolvedValue(createMockProfile())

            const result = await service.getPublicShopBySlug('tiem-bach-hoa-timmy')

            expect(result.shopSlug).toBe('tiem-bach-hoa-timmy')
            expect(result.shopName).toBe('Tiệm Bách Hóa Timmy')
        })

        it('trả lỗi NOT_FOUND nếu shop bị tạm ngưng (REQ-SEL-012, luật cứng #8)', async () => {
            repository.findProfileBySlug.mockResolvedValue(
                createMockProfile({ isSuspended: true, suspendedReason: 'Vi phạm' }),
            )

            await expect(service.getPublicShopBySlug('tiem-bach-hoa-timmy')).rejects.toThrow()
        })
    })
})
