import type { PrismaClient } from '../../src/generated/prisma/client'

type CategorySeed = {
    slug: string
    name: string
    children?: Array<{ slug: string; name: string }>
}

const CATEGORY_TREE: CategorySeed[] = [
    {
        slug: 'thoi-trang',
        name: 'Thời trang',
        children: [
            { slug: 'thoi-trang-nam', name: 'Thời trang nam' },
            { slug: 'thoi-trang-nu', name: 'Thời trang nữ' },
            { slug: 'giay-dep', name: 'Giày dép' },
        ],
    },
    {
        slug: 'dien-tu',
        name: 'Điện tử',
        children: [
            { slug: 'dien-thoai', name: 'Điện thoại' },
            { slug: 'phu-kien-dien-thoai', name: 'Phụ kiện điện thoại' },
            { slug: 'laptop-may-tinh', name: 'Laptop - Máy tính' },
        ],
    },
    {
        slug: 'gia-dung',
        name: 'Nhà cửa - Đời sống',
        children: [
            { slug: 'do-dung-nha-bep', name: 'Đồ dùng nhà bếp' },
            { slug: 'do-dien-gia-dung', name: 'Đồ điện gia dụng' },
        ],
    },
    {
        slug: 'sac-dep',
        name: 'Sắc đẹp',
        children: [
            { slug: 'cham-soc-da', name: 'Chăm sóc da' },
            { slug: 'trang-diem', name: 'Trang điểm' },
        ],
    },
    {
        slug: 'me-va-be',
        name: 'Mẹ và bé',
        children: [
            { slug: 'do-choi-tre-em', name: 'Đồ chơi trẻ em' },
            { slug: 'sua-dinh-duong', name: 'Sữa và dinh dưỡng' },
        ],
    },
]

export async function seedCategories(prisma: PrismaClient): Promise<Record<string, string>> {
    console.log('  - Seeding categories (parent + children)...')

    const idBySlug: Record<string, string> = {}

    for (let position = 0; position < CATEGORY_TREE.length; position++) {
        const parentSeed = CATEGORY_TREE[position]!

        const parent = await prisma.category.upsert({
            where: { slug: parentSeed.slug },
            update: {},
            create: { slug: parentSeed.slug, name: parentSeed.name, position },
        })
        idBySlug[parentSeed.slug] = parent.id

        const children = parentSeed.children ?? []
        for (let childPosition = 0; childPosition < children.length; childPosition++) {
            const childSeed = children[childPosition]!

            const child = await prisma.category.upsert({
                where: { slug: childSeed.slug },
                update: {},
                create: { slug: childSeed.slug, name: childSeed.name, parentId: parent.id, position: childPosition },
            })
            idBySlug[childSeed.slug] = child.id
        }
    }

    return idBySlug
}
