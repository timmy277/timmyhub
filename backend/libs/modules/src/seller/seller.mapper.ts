import type { PublicShopDetail, SellerApplicationDetail, SellerProfileDetail } from '@timmyhub/contracts'
import type { SellerApplication, SellerProfile } from '@timmyhub/prisma'

export type SellerApplicationWithUser = SellerApplication & {
    user?: {
        id: string
        email: string
        profile?: {
            displayName: string | null
            firstName: string
            lastName: string
        } | null
        phone?: string | null
    } | null
}

export function toSellerApplicationDetail(app: SellerApplicationWithUser): SellerApplicationDetail {
    const userName =
        app.user?.profile?.displayName ||
        [app.user?.profile?.firstName, app.user?.profile?.lastName].filter(Boolean).join(' ') ||
        app.user?.email ||
        ''

    const detail: SellerApplicationDetail = {
        id: app.id,
        userId: app.userId,
        sellerProfileId: app.sellerProfileId,
        shopName: app.shopName,
        shopDescription: app.shopDescription,
        idDocumentUrl: app.idDocumentUrl,
        taxCode: app.taxCode,
        status: app.status,
        reviewNote: app.reviewNote,
        reviewedById: app.reviewedById,
        reviewedAt: app.reviewedAt?.toISOString() ?? null,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
    }

    const u = app.user
    if (u) {
        detail.user = {
            id: u.id,
            email: u.email,
            name: userName,
            phone: u.phone ?? null,
        }
    }

    return detail
}

export function toSellerProfileDetail(profile: SellerProfile): SellerProfileDetail {
    return {
        id: profile.id,
        userId: profile.userId,
        shopName: profile.shopName,
        shopSlug: profile.shopSlug,
        shopLogo: profile.shopLogo,
        shopBanner: profile.shopBanner,
        description: profile.description,
        warehouseAddressLine: profile.warehouseAddressLine,
        provinceCode: profile.provinceCode,
        districtCode: profile.districtCode,
        wardCode: profile.wardCode,
        status: profile.status,
        isVerified: profile.isVerified,
        verifiedAt: profile.verifiedAt?.toISOString() ?? null,
        isSuspended: profile.isSuspended,
        suspendedReason: profile.suspendedReason,
        rating: profile.rating,
        cancelRate: profile.cancelRate,
        avgResponseHours: profile.avgResponseHours,
        returnPolicyDays: profile.returnPolicyDays,
        prepTimeHours: profile.prepTimeHours,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
    }
}

export function toPublicShopDetail(profile: SellerProfile): PublicShopDetail {
    return {
        id: profile.id,
        sellerId: profile.userId,
        shopName: profile.shopName,
        shopSlug: profile.shopSlug,
        shopLogo: profile.shopLogo,
        shopBanner: profile.shopBanner,
        description: profile.description,
        rating: profile.rating,
        isVerified: profile.isVerified,
        createdAt: profile.createdAt.toISOString(),
    }
}

export function slugifyShopName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
}
