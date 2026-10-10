'use client'

import { useState } from 'react'
import {
    CheckIcon,
    Loader2Icon,
    MapPinIcon,
    MoreVerticalIcon,
    PencilIcon,
    PlusIcon,
    StarIcon,
    Trash2Icon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { AddressDetail } from '@timmyhub/contracts'
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Skeleton,
} from '@/components/ui'
import { AddressFormDialog } from '@/features/checkout'
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from '@/hooks'

export function AddressesTab() {
    const t = useTranslations('account.addresses')

    const { data: addresses = [], isLoading } = useAddresses()
    const deleteMutation = useDeleteAddress()
    const setDefaultMutation = useSetDefaultAddress()

    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
    const [editingAddress, setEditingAddress] = useState<AddressDetail | null>(null)

    const handleOpenCreate = () => {
        setEditingAddress(null)
        setIsFormDialogOpen(true)
    }

    const handleOpenEdit = (address: AddressDetail) => {
        setEditingAddress(address)
        setIsFormDialogOpen(true)
    }

    const handleSetDefault = (id: string) => {
        setDefaultMutation.mutate(id)
    }

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id)
    }

    return (
        <div className="space-y-6">
            <Card className="border-border/80 shadow-xs">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold">{t('title')}</CardTitle>
                        <CardDescription className="text-xs">{t('description')}</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 text-xs font-semibold h-8 shrink-0">
                        <PlusIcon className="size-3.5" />
                        <span>{t('addNew')}</span>
                    </Button>
                </CardHeader>

                <CardContent className="space-y-3">
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-28 w-full rounded-xl" />
                            <Skeleton className="h-28 w-full rounded-xl" />
                        </div>
                    ) : addresses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border/80 rounded-xl bg-muted/5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                                <MapPinIcon className="h-6 w-6" />
                            </div>
                            <h4 className="text-sm font-semibold text-foreground">{t('emptyTitle')}</h4>
                            <p className="mt-1 text-xs text-muted-foreground max-w-sm">{t('emptyDescription')}</p>
                            <Button onClick={handleOpenCreate} size="sm" className="mt-4 gap-1.5 text-xs">
                                <PlusIcon className="size-3.5" />
                                <span>{t('addNew')}</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {addresses.map((address) => {
                                const fullAddressText = [
                                    address.addressLine1,
                                    address.addressLine2,
                                    address.wardName,
                                    address.districtName,
                                    address.provinceName,
                                ]
                                    .filter(Boolean)
                                    .join(', ')

                                return (
                                    <div
                                        key={address.id}
                                        className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                                            address.isDefault
                                                ? 'border-primary/50 bg-primary/5 shadow-2xs'
                                                : 'border-border/70 hover:border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-bold text-foreground">
                                                    {address.fullName}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    ({address.phone})
                                                </span>
                                                {address.isDefault && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] bg-primary/15 text-primary border-primary/20 font-bold px-2 py-0.5"
                                                    >
                                                        {t('defaultBadge')}
                                                    </Badge>
                                                )}
                                                {address.label && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5"
                                                    >
                                                        {address.label}
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-xs text-muted-foreground leading-relaxed break-words">
                                                {fullAddressText}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                            {!address.isDefault && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleSetDefault(address.id)}
                                                    disabled={setDefaultMutation.isPending}
                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    {setDefaultMutation.isPending ? (
                                                        <Loader2Icon className="size-3 animate-spin mr-1" />
                                                    ) : (
                                                        <StarIcon className="size-3.5 mr-1" />
                                                    )}
                                                    <span>{t('setDefault')}</span>
                                                </Button>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenEdit(address)}
                                                className="h-8 text-xs gap-1"
                                            >
                                                <PencilIcon className="size-3" />
                                                <span>Sửa</span>
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <MoreVerticalIcon className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="text-xs">
                                                    {!address.isDefault && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleSetDefault(address.id)}
                                                            disabled={setDefaultMutation.isPending}
                                                        >
                                                            <CheckIcon className="size-3.5 mr-2 text-primary" />
                                                            <span>{t('setDefault')}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => handleOpenEdit(address)}>
                                                        <PencilIcon className="size-3.5 mr-2" />
                                                        <span>Chỉnh sửa</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(address.id)}
                                                        disabled={deleteMutation.isPending}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2Icon className="size-3.5 mr-2" />
                                                        <span>{t('delete')}</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dùng chung AddressFormDialog chuẩn từ checkout */}
            <AddressFormDialog
                open={isFormDialogOpen}
                onOpenChange={setIsFormDialogOpen}
                initialData={editingAddress}
            />
        </div>
    )
}
