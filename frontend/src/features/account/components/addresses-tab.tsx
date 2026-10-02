'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon, MapPinIcon, MoreVerticalIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FloatInput } from '@/components'
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Label,
    Switch,
} from '@/components/ui'
import { AddressFormSchema, type AddressFormValues } from '@/schemas'

export interface UserAddressItem {
    id: string
    fullName: string
    phone: string
    addressLine1: string
    provinceName: string
    districtName: string
    wardName: string
    isDefault: boolean
}

export function AddressesTab() {
    const t = useTranslations('account.addresses')
    const tAccount = useTranslations('account')

    const [addresses, setAddresses] = useState<UserAddressItem[]>([
        {
            id: 'addr-1',
            fullName: 'Nguyễn Văn A',
            phone: '0912345678',
            addressLine1: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ',
            provinceName: 'Thành phố Hồ Chí Minh',
            districtName: 'Quận Bình Thạnh',
            wardName: 'Phường 22',
            isDefault: true,
        },
    ])

    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AddressFormValues>({
        resolver: zodResolver(AddressFormSchema),
        defaultValues: {
            fullName: '',
            phone: '',
            provinceName: 'Thành phố Hồ Chí Minh',
            districtName: 'Quận 1',
            wardName: 'Phường Bến Nghé',
            addressLine1: '',
            isDefault: false,
        },
    })

    const getErrorText = (key?: string): string | undefined => {
        if (!key) return undefined
        const lookupKey = key.startsWith('account.') ? key.slice('account.'.length) : key
        const translator = tAccount as unknown as { has: (k: string) => boolean; (k: string): string }
        if (translator.has(lookupKey)) {
            return translator(lookupKey)
        }
        return key
    }

    const handleSetDefault = (id: string) => {
        setAddresses((prev) =>
            prev.map((item) => ({
                ...item,
                isDefault: item.id === id,
            })),
        )
        toast.success(t('setDefaultSuccess'))
    }

    const handleDelete = (id: string) => {
        setAddresses((prev) => prev.filter((item) => item.id !== id))
        toast.success(t('deleteSuccess'))
    }

    const onAddAddress = (data: AddressFormValues) => {
        const newAddress: UserAddressItem = {
            id: `addr-${addresses.length + 1}`,
            fullName: data.fullName.trim(),
            phone: data.phone.trim(),
            provinceName: data.provinceName.trim(),
            districtName: data.districtName.trim(),
            wardName: data.wardName.trim(),
            addressLine1: data.addressLine1.trim(),
            isDefault: data.isDefault || addresses.length === 0,
        }

        if (newAddress.isDefault) {
            setAddresses((prev) => [newAddress, ...prev.map((item) => ({ ...item, isDefault: false }))])
        } else {
            setAddresses((prev) => [...prev, newAddress])
        }

        toast.success(t('addSuccess'))
        setIsDialogOpen(false)
        reset()
    }

    return (
        <div className="space-y-6">
            <Card className="border border-border/80 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">{t('title')}</CardTitle>
                        <CardDescription>{t('description')}</CardDescription>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            reset({
                                fullName: '',
                                phone: '',
                                provinceName: 'Thành phố Hồ Chí Minh',
                                districtName: 'Quận 1',
                                wardName: 'Phường Bến Nghé',
                                addressLine1: '',
                                isDefault: addresses.length === 0,
                            })
                            setIsDialogOpen(true)
                        }}
                        className="gap-1.5"
                    >
                        <PlusIcon className="h-4 w-4" />
                        {t('addNew')}
                    </Button>
                </CardHeader>

                <CardContent className="space-y-3">
                    {addresses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl">
                            <MapPinIcon className="h-10 w-10 text-muted-foreground/60 mb-2" />
                            <p className="text-sm font-semibold">{t('emptyTitle')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('emptyDescription')}</p>
                        </div>
                    ) : (
                        addresses.map((item) => (
                            <div
                                key={item.id}
                                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all ${
                                    item.isDefault
                                        ? 'border-primary/50 bg-primary/5 shadow-2xs'
                                        : 'border-border/70 hover:border-border bg-card'
                                }`}
                            >
                                <div className="space-y-1.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-foreground">{item.fullName}</span>
                                        <span className="text-xs text-muted-foreground border-l pl-2 border-border">
                                            {item.phone}
                                        </span>
                                        {item.isDefault && (
                                            <Badge
                                                variant="outline"
                                                className="border-primary text-primary text-[10px] font-semibold py-0 px-1.5 gap-1"
                                            >
                                                <StarIcon className="h-2.5 w-2.5 fill-primary" />
                                                {t('defaultBadge')}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed">{item.addressLine1}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.wardName}, {item.districtName}, {item.provinceName}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-center">
                                    {!item.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSetDefault(item.id)}
                                            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                                        >
                                            {t('setDefault')}
                                        </Button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                                                <MoreVerticalIcon className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            {!item.isDefault && (
                                                <DropdownMenuItem onClick={() => handleSetDefault(item.id)}>
                                                    <CheckIcon className="h-4 w-4 mr-2" />
                                                    {t('setDefault')}
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(item.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2Icon className="h-4 w-4 mr-2" />
                                                {t('delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Modal Thêm địa chỉ mới */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('modalTitle')}</DialogTitle>
                        <DialogDescription>{t('modalDescription')}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onAddAddress)}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FloatInput
                                    label={t('fullName')}
                                    required
                                    size="sm"
                                    error={getErrorText(errors.fullName?.message)}
                                    {...register('fullName')}
                                />
                                <FloatInput
                                    label={t('phone')}
                                    required
                                    size="sm"
                                    error={getErrorText(errors.phone?.message)}
                                    {...register('phone')}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <FloatInput
                                    label={t('province')}
                                    required
                                    size="sm"
                                    error={getErrorText(errors.provinceName?.message)}
                                    {...register('provinceName')}
                                />
                                <FloatInput
                                    label={t('district')}
                                    required
                                    size="sm"
                                    error={getErrorText(errors.districtName?.message)}
                                    {...register('districtName')}
                                />
                                <FloatInput
                                    label={t('ward')}
                                    required
                                    size="sm"
                                    error={getErrorText(errors.wardName?.message)}
                                    {...register('wardName')}
                                />
                            </div>

                            <FloatInput
                                label={t('addressLine1')}
                                required
                                size="sm"
                                error={getErrorText(errors.addressLine1?.message)}
                                {...register('addressLine1')}
                            />

                            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 mt-1">
                                <div className="space-y-0.5">
                                    <Label htmlFor="addr-default" className="text-xs font-medium cursor-pointer">
                                        {t('isDefault')}
                                    </Label>
                                </div>
                                <Controller
                                    name="isDefault"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="addr-default"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                                {t('cancel')}
                            </Button>
                            <Button type="submit" size="sm" disabled={isSubmitting}>
                                {t('save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
