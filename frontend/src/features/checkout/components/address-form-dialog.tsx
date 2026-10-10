'use client'

import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { Loader2Icon, MapPinIcon } from 'lucide-react'
import { CreateAddressInputSchema, type AddressDetail, type CreateAddressInput } from '@timmyhub/contracts'
import { FloatCombobox, FloatInput } from '@/components'
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Label,
    Switch,
} from '@/components/ui'
import { PROVINCE_OPTIONS, VIETNAM_PROVINCES, getDistrictsByProvinceCode, getWardsByDistrictCode } from '@/constants'
import { useCreateAddress, useUpdateAddress } from '@/hooks'

export interface AddressFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: AddressDetail | null
    onSuccess?: (address: AddressDetail) => void
}

const DEFAULT_FORM_VALUES: CreateAddressInput = {
    fullName: '',
    phone: '',
    provinceCode: 'HCM',
    provinceName: 'Thành phố Hồ Chí Minh',
    districtCode: 'HCM-Q1',
    districtName: 'Quận 1',
    wardCode: 'HCM-Q1-BN',
    wardName: 'Phường Bến Nghé',
    addressLine1: '',
    addressLine2: '',
    label: 'Nhà riêng',
    isDefault: false,
}

export function AddressFormDialog({ open, onOpenChange, initialData, onSuccess }: AddressFormDialogProps) {
    const t = useTranslations('checkout')
    const tValidation = useTranslations('validation')
    const isEditMode = Boolean(initialData?.id)

    const createMutation = useCreateAddress()
    const updateMutation = useUpdateAddress()
    const isPending = createMutation.isPending || updateMutation.isPending

    const addressForm = useForm<CreateAddressInput>({
        resolver: zodResolver(CreateAddressInputSchema) as Resolver<CreateAddressInput>,
        mode: 'onChange',
        defaultValues: DEFAULT_FORM_VALUES,
    })

    // Đồng bộ dữ liệu khi mở dialog hoặc thay đổi initialData
    useEffect(() => {
        if (!open) return

        if (initialData) {
            addressForm.reset({
                fullName: initialData.fullName,
                phone: initialData.phone,
                provinceCode: initialData.provinceCode,
                provinceName: initialData.provinceName,
                districtCode: initialData.districtCode,
                districtName: initialData.districtName,
                wardCode: initialData.wardCode,
                wardName: initialData.wardName,
                addressLine1: initialData.addressLine1,
                addressLine2: initialData.addressLine2 || '',
                label: initialData.label || 'Nhà riêng',
                isDefault: initialData.isDefault,
            })
        } else {
            addressForm.reset(DEFAULT_FORM_VALUES)
        }
    }, [open, initialData, addressForm])

    const selectedProvinceCode = useWatch({ control: addressForm.control, name: 'provinceCode' })
    const selectedDistrictCode = useWatch({ control: addressForm.control, name: 'districtCode' })

    const districtOptions = useMemo(() => getDistrictsByProvinceCode(selectedProvinceCode), [selectedProvinceCode])

    const wardOptions = useMemo(
        () => getWardsByDistrictCode(selectedProvinceCode, selectedDistrictCode),
        [selectedProvinceCode, selectedDistrictCode],
    )

    const formatAddressError = (errorKey?: string): string | undefined => {
        if (!errorKey) return undefined
        const key = errorKey.startsWith('validation.') ? errorKey.slice('validation.'.length) : errorKey
        const translator = tValidation as unknown as { has: (k: string) => boolean; (k: string): string }
        if (translator.has(key)) {
            return translator(key)
        }
        return errorKey
    }

    const onSubmit = addressForm.handleSubmit(async (data) => {
        try {
            let result: AddressDetail
            if (isEditMode && initialData) {
                result = await updateMutation.mutateAsync({ id: initialData.id, input: data })
            } else {
                result = await createMutation.mutateAsync(data)
            }
            onSuccess?.(result)
            onOpenChange(false)
            addressForm.reset(DEFAULT_FORM_VALUES)
        } catch {
            // Lỗi đã được xử lý bằng toast trong mutation hook
        }
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl"
                onPointerDownOutside={(e) => {
                    const target = e.target as HTMLElement | null
                    if (
                        target?.closest('[data-slot="combobox-content"]') ||
                        target?.closest('[data-slot="combobox-list"]')
                    ) {
                        e.preventDefault()
                    }
                }}
                onInteractOutside={(e) => {
                    const target = e.target as HTMLElement | null
                    if (
                        target?.closest('[data-slot="combobox-content"]') ||
                        target?.closest('[data-slot="combobox-list"]')
                    ) {
                        e.preventDefault()
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <MapPinIcon className="size-5 text-primary" />
                        <span>{isEditMode ? 'Cập nhật địa chỉ nhận hàng' : t('newAddressModalTitle')}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {isEditMode
                            ? 'Chỉnh sửa thông tin địa chỉ giao nhận hàng của bạn.'
                            : 'Nhập thông tin giao hàng chi tiết để nhận hàng thuận tiện và nhanh chóng.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FloatInput
                            label={t('fullName')}
                            required
                            size="sm"
                            reserveErrorSpace
                            error={formatAddressError(addressForm.formState.errors.fullName?.message)}
                            {...addressForm.register('fullName')}
                        />
                        <FloatInput
                            label={t('phone')}
                            required
                            size="sm"
                            reserveErrorSpace
                            error={formatAddressError(addressForm.formState.errors.phone?.message)}
                            {...addressForm.register('phone')}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Controller
                            control={addressForm.control}
                            name="provinceCode"
                            render={({ field }) => (
                                <FloatCombobox
                                    label={t('province')}
                                    size="sm"
                                    options={PROVINCE_OPTIONS}
                                    value={field.value}
                                    error={formatAddressError(addressForm.formState.errors.provinceCode?.message)}
                                    onValueChange={(code) => {
                                        if (!code) return
                                        const prov = VIETNAM_PROVINCES.find((p) => p.code === code)
                                        field.onChange(code)
                                        addressForm.setValue('provinceName', prov?.name || code, {
                                            shouldValidate: true,
                                        })
                                        const newDistricts = getDistrictsByProvinceCode(code)
                                        const firstDist = newDistricts[0]
                                        if (firstDist) {
                                            addressForm.setValue('districtCode', firstDist.value, {
                                                shouldValidate: true,
                                            })
                                            addressForm.setValue('districtName', firstDist.label, {
                                                shouldValidate: true,
                                            })
                                            const newWards = getWardsByDistrictCode(code, firstDist.value)
                                            const firstWard = newWards[0]
                                            if (firstWard) {
                                                addressForm.setValue('wardCode', firstWard.value, {
                                                    shouldValidate: true,
                                                })
                                                addressForm.setValue('wardName', firstWard.label, {
                                                    shouldValidate: true,
                                                })
                                            } else {
                                                addressForm.setValue('wardCode', '', { shouldValidate: true })
                                                addressForm.setValue('wardName', '', { shouldValidate: true })
                                            }
                                        } else {
                                            addressForm.setValue('districtCode', '', { shouldValidate: true })
                                            addressForm.setValue('districtName', '', { shouldValidate: true })
                                            addressForm.setValue('wardCode', '', { shouldValidate: true })
                                            addressForm.setValue('wardName', '', { shouldValidate: true })
                                        }
                                    }}
                                />
                            )}
                        />

                        <Controller
                            control={addressForm.control}
                            name="districtCode"
                            render={({ field }) => (
                                <FloatCombobox
                                    label={t('district')}
                                    size="sm"
                                    options={districtOptions}
                                    value={field.value}
                                    disabled={districtOptions.length === 0}
                                    error={formatAddressError(addressForm.formState.errors.districtCode?.message)}
                                    onValueChange={(distCode) => {
                                        if (!distCode) return
                                        const dist = districtOptions.find((d) => d.value === distCode)
                                        field.onChange(distCode)
                                        addressForm.setValue('districtName', dist?.label || distCode, {
                                            shouldValidate: true,
                                        })
                                        const newWards = getWardsByDistrictCode(selectedProvinceCode, distCode)
                                        const firstWard = newWards[0]
                                        if (firstWard) {
                                            addressForm.setValue('wardCode', firstWard.value, {
                                                shouldValidate: true,
                                            })
                                            addressForm.setValue('wardName', firstWard.label, {
                                                shouldValidate: true,
                                            })
                                        } else {
                                            addressForm.setValue('wardCode', '', { shouldValidate: true })
                                            addressForm.setValue('wardName', '', { shouldValidate: true })
                                        }
                                    }}
                                />
                            )}
                        />

                        <Controller
                            control={addressForm.control}
                            name="wardCode"
                            render={({ field }) => (
                                <FloatCombobox
                                    label={t('ward')}
                                    size="sm"
                                    options={wardOptions}
                                    value={field.value}
                                    disabled={wardOptions.length === 0}
                                    error={formatAddressError(addressForm.formState.errors.wardCode?.message)}
                                    onValueChange={(wardCode) => {
                                        if (!wardCode) return
                                        const ward = wardOptions.find((w) => w.value === wardCode)
                                        field.onChange(wardCode)
                                        addressForm.setValue('wardName', ward?.label || wardCode, {
                                            shouldValidate: true,
                                        })
                                    }}
                                />
                            )}
                        />
                    </div>

                    <FloatInput
                        label={t('addressLine1')}
                        required
                        size="sm"
                        reserveErrorSpace
                        error={formatAddressError(addressForm.formState.errors.addressLine1?.message)}
                        {...addressForm.register('addressLine1')}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <FloatInput
                            label={t('addressLabel')}
                            size="sm"
                            reserveErrorSpace
                            error={formatAddressError(addressForm.formState.errors.label?.message)}
                            {...addressForm.register('label')}
                        />

                        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 h-10 mb-5">
                            <Label htmlFor="addr-default-switch" className="text-xs font-semibold cursor-pointer">
                                {t('setDefault')}
                            </Label>
                            <Controller
                                control={addressForm.control}
                                name="isDefault"
                                render={({ field }) => (
                                    <Switch
                                        id="addr-default-switch"
                                        checked={Boolean(field.value)}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="h-9 text-xs rounded-lg"
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isPending}
                            className="h-9 text-xs font-bold rounded-lg gap-1.5"
                        >
                            {isPending ? (
                                <>
                                    <Loader2Icon className="size-3.5 animate-spin" />
                                    <span>Đang lưu...</span>
                                </>
                            ) : (
                                <span>{isEditMode ? 'Cập nhật' : t('save')}</span>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
