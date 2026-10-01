import type { AuditRepository } from './audit.repository'
import { AuditService } from './audit.service'

// Test AuditService — cùng khuôn với auth.service.spec.ts: mock repository, test logic service.
// Repository có hàm thuần `buildAuditLogWhere`/`buildAuditLogOrderBy` — test riêng, không cần DB.

const NOW = new Date('2026-10-01T10:00:00Z')

function buildAuditLog(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'log-1',
        service: 'identity',
        action: 'identity.user.create',
        entityType: 'User',
        entityId: 'user-1',
        actorId: 'admin-1',
        actorType: 'ADMIN',
        actorIp: null,
        userAgent: null,
        before: null,
        after: { email: 'test@example.com' },
        result: 'SUCCESS',
        errorMessage: null,
        occurredAt: NOW,
        ...overrides,
    }
}

function buildService(
    options: { logs?: ReturnType<typeof buildAuditLog>[]; log?: ReturnType<typeof buildAuditLog> | null } = {},
) {
    const listAuditLogs = jest.fn().mockResolvedValue({
        items: options.logs ?? [buildAuditLog()],
        totalItems: options.logs?.length ?? 1,
    })
    const findAuditLogById = jest.fn().mockResolvedValue(options.log === undefined ? buildAuditLog() : options.log)

    const repository = { listAuditLogs, findAuditLogById } as unknown as AuditRepository
    return { service: new AuditService(repository), listAuditLogs, findAuditLogById }
}

describe('AuditService', () => {
    describe('listAuditLogs', () => {
        it('trả danh sách + phân trang đúng', async () => {
            const { service, listAuditLogs } = buildService({
                logs: [buildAuditLog({ id: 'log-1' }), buildAuditLog({ id: 'log-2' })],
            })

            const result = await service.listAuditLogs({
                page: 1,
                pageSize: 20,
                sort: '-occurredAt',
            })

            expect(result.items).toHaveLength(2)
            expect(result.items[0]!.id).toBe('log-1')
            expect(result.items[0]!.action).toBe('identity.user.create')
            expect(result.pagination.totalItems).toBe(2)
            expect(result.pagination.totalPages).toBe(1)
            expect(result.pagination.hasNext).toBe(false)
            expect(result.pagination.hasPrev).toBe(false)
            // Summary không mang before/after
            expect(result.items[0]!).not.toHaveProperty('before')
            expect(result.items[0]!).not.toHaveProperty('after')
            expect(listAuditLogs).toHaveBeenCalledWith(
                expect.objectContaining({ page: 1, pageSize: 20, sort: '-occurredAt' }),
            )
        })

        it('truyền filter xuống repository đúng', async () => {
            const { service, listAuditLogs } = buildService()

            await service.listAuditLogs({
                page: 2,
                pageSize: 50,
                sort: 'occurredAt',
                actorId: 'admin-1',
                action: 'identity.user',
                entityType: 'User',
                entityId: 'user-1',
                service: 'identity',
                occurredFrom: '2026-10-01T00:00:00Z',
                occurredTo: '2026-10-02T00:00:00Z',
            })

            // Dùng plain object thay vì `expect.objectContaining` lồng nhau — tránh `any` từ Jest matcher.
            expect(listAuditLogs).toHaveBeenCalledWith(
                expect.objectContaining({
                    filters: {
                        actorId: 'admin-1',
                        action: 'identity.user',
                        entityType: 'User',
                        entityId: 'user-1',
                        service: 'identity',
                        occurredFrom: '2026-10-01T00:00:00Z',
                        occurredTo: '2026-10-02T00:00:00Z',
                    },
                    page: 2,
                    pageSize: 50,
                    sort: 'occurredAt',
                }),
            )
        })

        it('phân trang đúng khi nhiều trang', async () => {
            const { service } = buildService({
                logs: Array.from({ length: 20 }, (_, i) => buildAuditLog({ id: `log-${i}` })),
            })

            const result = await service.listAuditLogs({ page: 2, pageSize: 20, sort: '-occurredAt' })

            expect(result.pagination.totalItems).toBe(20)
            expect(result.pagination.totalPages).toBe(1)
            expect(result.pagination.hasNext).toBe(false)
            expect(result.pagination.hasPrev).toBe(true)
        })
    })

    describe('getAuditLog', () => {
        it('trả chi tiết khi tìm thấy — có before/after', async () => {
            const { service } = buildService({
                log: buildAuditLog({ before: { email: 'old@example.com' }, after: { email: 'new@example.com' } }),
            })

            const result = await service.getAuditLog('log-1')

            expect(result.id).toBe('log-1')
            expect(result.before).toEqual({ email: 'old@example.com' })
            expect(result.after).toEqual({ email: 'new@example.com' })
            expect(result.actorIp).toBeNull()
            expect(result.errorMessage).toBeNull()
        })

        it('NOT_FOUND khi không tìm thấy', async () => {
            const { service } = buildService({ log: null })

            await expect(service.getAuditLog('nonexistent')).rejects.toMatchObject({
                code: 'NOT_FOUND',
                status: 404,
            })
        })
    })
})
