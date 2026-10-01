'use client'

import { CalendarDaysIcon, CodeIcon, FingerprintIcon, GlobeIcon, InfoIcon, UserRoundIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { AuditLogDetail } from '@timmyhub/contracts'

import { StatusBadge } from '@/components'
import {
    AUDIT_ACTION_LABEL_KEY,
    AUDIT_ACTOR_TYPE_LABEL_KEY,
    AUDIT_ENTITY_LABEL_KEY,
    AUDIT_RESULT_LABEL_KEY,
    AUDIT_RESULT_TONE,
} from '@/constants'
import { formatTimestamp } from '@/utils'

interface AuditDetailViewProps {
    log: AuditLogDetail
}

// Nội dung tab "Chi tiết" của một bản ghi audit. Client component vì phần thay đổi dữ liệu tô màu theo diff; dữ liệu
// thì Server Component đã tải sẵn và truyền xuống — client không tự gọi backend.
export function AuditDetailView({ log }: AuditDetailViewProps) {
    // ===== Hooks =====
    const t = useTranslations('auditLog')

    // ===== Derived =====
    const tone = AUDIT_RESULT_TONE[log.result as keyof typeof AUDIT_RESULT_TONE]
    const resultLabel = AUDIT_RESULT_LABEL_KEY[log.result as keyof typeof AUDIT_RESULT_LABEL_KEY]
    const hasChange = log.before !== null || log.after !== null

    // Chi tiết là nơi mã kỹ thuật sống: bảng đã hiện mô tả tiếng người, ở đây hiện cả hai để người tra cứu đối chiếu
    // được với log thô / tài liệu.
    const actionKey = AUDIT_ACTION_LABEL_KEY[log.action as keyof typeof AUDIT_ACTION_LABEL_KEY]
    const entityKey = AUDIT_ENTITY_LABEL_KEY[log.entityType as keyof typeof AUDIT_ENTITY_LABEL_KEY]
    const actorTypeKey = AUDIT_ACTOR_TYPE_LABEL_KEY[log.actorType as keyof typeof AUDIT_ACTOR_TYPE_LABEL_KEY]

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-5 rounded-xl border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-semibold tracking-tight">
                            {actionKey ? t(actionKey) : log.action}
                        </h1>
                        {tone && resultLabel ? (
                            <StatusBadge tone={tone} label={t(resultLabel)} />
                        ) : (
                            <span className="text-sm text-muted-foreground">{log.result}</span>
                        )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                        {entityKey ? t(entityKey) : log.entityType} ·{' '}
                        <span className="font-mono text-xs">{log.entityId}</span>
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FingerprintIcon className="size-3.5" />
                        {t('detailLogId', { id: log.id })}
                    </span>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <DetailSection icon={<InfoIcon />} title={t('detailSectionMeta')}>
                    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <DetailItem label={t('detailAction')}>
                            <span className="flex flex-col">
                                <span>{actionKey ? t(actionKey) : log.action}</span>
                                <span className="font-mono text-xs text-muted-foreground">{log.action}</span>
                            </span>
                        </DetailItem>
                        <DetailItem label={t('detailService')}>{log.service}</DetailItem>
                        <DetailItem label={t('detailEntity')}>
                            <span className="flex flex-col">
                                <span>{entityKey ? t(entityKey) : log.entityType}</span>
                                <span className="font-mono text-xs text-muted-foreground">{log.entityType}</span>
                            </span>
                        </DetailItem>
                        <DetailItem label={t('detailEntityId')}>
                            <span className="font-mono text-xs">{log.entityId}</span>
                        </DetailItem>
                        <DetailItem label={t('detailOccurredAt')}>
                            {formatTimestamp(log.occurredAt) || t('notUpdated')}
                        </DetailItem>
                        <DetailItem label={t('detailResult')}>
                            {tone && resultLabel ? <StatusBadge tone={tone} label={t(resultLabel)} /> : log.result}
                        </DetailItem>
                    </dl>
                </DetailSection>

                <DetailSection icon={<UserRoundIcon />} title={t('detailSectionActor')}>
                    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <DetailItem label={t('detailActorName')}>
                            {log.actorName ? (
                                <span>{log.actorName}</span>
                            ) : (
                                <span className="italic text-muted-foreground">
                                    {log.actorType === 'SYSTEM' ? t('systemActor') : t('unknownActor')}
                                </span>
                            )}
                        </DetailItem>
                        <DetailItem label={t('detailActorType')}>
                            {actorTypeKey ? t(actorTypeKey) : log.actorType}
                        </DetailItem>
                        <DetailItem label={t('detailActorId')} className="sm:col-span-2">
                            {log.actorId ? (
                                <span className="font-mono text-xs">{log.actorId}</span>
                            ) : (
                                <span className="italic text-muted-foreground">{t('systemActor')}</span>
                            )}
                        </DetailItem>
                    </dl>
                </DetailSection>

                <DetailSection icon={<GlobeIcon />} title={t('detailSectionRequest')} className="lg:col-span-2">
                    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <DetailItem label={t('detailActorIp')}>{log.actorIp ?? t('notUpdated')}</DetailItem>
                        <DetailItem label={t('detailUserAgent')}>
                            <span className="break-all">{log.userAgent ?? t('notUpdated')}</span>
                        </DetailItem>
                        {log.errorMessage && (
                            <DetailItem label={t('detailErrorMessage')} className="sm:col-span-2">
                                <span className="text-destructive">{log.errorMessage}</span>
                            </DetailItem>
                        )}
                    </dl>
                </DetailSection>

                <DetailSection icon={<CalendarDaysIcon />} title={t('detailSectionChange')} className="lg:col-span-2">
                    {hasChange ? (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <JsonPanel title={t('detailBefore')} value={log.before} tone="remove" />
                            <JsonPanel title={t('detailAfter')} value={log.after} tone="add" />
                        </div>
                    ) : (
                        <p className="text-sm italic text-muted-foreground">{t('detailNoChange')}</p>
                    )}
                </DetailSection>
            </section>
        </div>
    )
}

// Khối JSON đọc/ghi của một vế diff. `before`/`after` là JSON tuỳ ý (mỗi hành động nghiệp vụ có hình dạng riêng), nên
// chỉ hiển thị nguyên văn đã format — không cố diễn giải thành bảng trường.
function JsonPanel({ title, value, tone }: { title: string; value: unknown; tone: 'add' | 'remove' }) {
    const border = tone === 'add' ? 'border-l-primary/60' : 'border-l-destructive/60'

    return (
        <div className={`rounded-lg border border-l-4 bg-muted/30 ${border}`}>
            <div className="flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold text-muted-foreground">
                <CodeIcon className="size-3.5" />
                {title}
            </div>
            <pre className="max-h-80 overflow-auto p-4 text-xs leading-relaxed">
                {value === null || value === undefined ? '—' : JSON.stringify(value, null, 2)}
            </pre>
        </div>
    )
}

function DetailSection({
    icon,
    title,
    children,
    className,
}: {
    icon: React.ReactNode
    title: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <section className={`rounded-xl border p-5 ${className ?? ''}`}>
            <div className="mb-5 flex items-center gap-2">
                <span className="text-primary [&_svg]:size-4">{icon}</span>
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            {children}
        </section>
    )
}

function DetailItem({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <dt className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm font-medium text-foreground">{children}</dd>
        </div>
    )
}
