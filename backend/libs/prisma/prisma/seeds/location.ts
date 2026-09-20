import type { PrismaClient } from '../../src/generated/prisma/client'

type WardSeed = { code: string; name: string }
type DistrictSeed = { code: string; name: string; wards: WardSeed[] }
type ProvinceSeed = { code: string; name: string; districts: DistrictSeed[] }

// Mã tỉnh/quận khớp với provinceCode/districtCode đã dùng trong seller.ts (HN/HN-CG, HCM/HCM-Q1, DN/DN-HC)
const PROVINCES: ProvinceSeed[] = [
    {
        code: 'HN',
        name: 'Hà Nội',
        districts: [
            {
                code: 'HN-CG',
                name: 'Cầu Giấy',
                wards: [
                    { code: 'HN-CG-DY', name: 'Dịch Vọng' },
                    { code: 'HN-CG-NC', name: 'Nghĩa Chí' },
                ],
            },
            {
                code: 'HN-HK',
                name: 'Hai Bà Trưng',
                wards: [
                    { code: 'HN-HK-BD', name: 'Bạch Đằng' },
                    { code: 'HN-HK-TL', name: 'Thanh Lương' },
                ],
            },
        ],
    },
    {
        code: 'HCM',
        name: 'Hồ Chí Minh',
        districts: [
            {
                code: 'HCM-Q1',
                name: 'Quận 1',
                wards: [
                    { code: 'HCM-Q1-BN', name: 'Bến Nghé' },
                    { code: 'HCM-Q1-BT', name: 'Bến Thành' },
                ],
            },
            {
                code: 'HCM-Q7',
                name: 'Quận 7',
                wards: [
                    { code: 'HCM-Q7-TT', name: 'Tân Thuận Tây' },
                    { code: 'HCM-Q7-PT', name: 'Phú Thuận' },
                ],
            },
        ],
    },
    {
        code: 'DN',
        name: 'Đà Nẵng',
        districts: [
            {
                code: 'DN-HC',
                name: 'Hải Châu',
                wards: [
                    { code: 'DN-HC-TB', name: 'Thạch Thang' },
                    { code: 'DN-HC-HP', name: 'Hải Phú' },
                ],
            },
            {
                code: 'DN-TK',
                name: 'Thanh Khê',
                wards: [
                    { code: 'DN-TK-TK1', name: 'Thanh Khê Đông' },
                    { code: 'DN-TK-TK2', name: 'Thanh Khê Tây' },
                ],
            },
        ],
    },
]

export async function seedLocations(prisma: PrismaClient) {
    console.log('  - Seeding provinces, districts, wards...')

    for (const province of PROVINCES) {
        await prisma.province.upsert({
            where: { code: province.code },
            update: { name: province.name },
            create: { code: province.code, name: province.name },
        })

        for (const district of province.districts) {
            await prisma.district.upsert({
                where: { code: district.code },
                update: { name: district.name, provinceCode: province.code },
                create: { code: district.code, name: district.name, provinceCode: province.code },
            })

            for (const ward of district.wards) {
                await prisma.ward.upsert({
                    where: { code: ward.code },
                    update: { name: ward.name, districtCode: district.code },
                    create: { code: ward.code, name: ward.name, districtCode: district.code },
                })
            }
        }
    }
}
