import { PrismaClient } from '../dist/index.js'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../apps/api/.env') })

const prisma = new PrismaClient()

const PRODUCT_IMAGE_SOURCES = {
    'ao-thun-nam-basic-cotton': [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
        'https://images.unsplash.com/photo-1583743814966-8930f2cf3e8c?w=800&q=80',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
    ],
    'vay-suong-nu-dao-pho': [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80',
        'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
    ],
    'giay-sneaker-the-thao': [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80',
        'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&q=80',
    ],
    'dien-thoai-xphone-12': [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
        'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&q=80',
    ],
    'tai-nghe-bluetooth-tws-pro': [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
        'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80',
        'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&q=80',
    ],
    'laptop-ultrabook-14-inch': [
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
        'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80',
    ],
    'bo-noi-chong-dinh-3-mon': [
        'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&q=80',
        'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&q=80',
        'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80',
    ],
    'may-xay-sinh-to-da-nang': [
        'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80',
        'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=800&q=80',
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80',
    ],
    'ao-hoodie-timmywear-unisex': [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&q=80',
        'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&q=80',
    ],
    'set-skincare-duong-am-timmywear': [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
        'https://images.unsplash.com/photo-1608248597359-5bf4e8c1ec7a?w=800&q=80',
    ],
}

async function uploadImageViaApi(accessToken, url, fileName) {
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`Failed to download ${url}: ${res.statusText}`)
    }
    const arrayBuffer = await res.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' })

    const formData = new FormData()
    formData.append('files', blob, fileName)
    formData.append('ownerType', 'GENERAL')

    const uploadRes = await fetch('http://[::1]:3001/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken },
        body: formData,
    })

    if (!uploadRes.ok) {
        const text = await uploadRes.text()
        throw new Error(`Upload failed: ${uploadRes.status} ${text}`)
    }

    const uploadData = await uploadRes.json()
    return uploadData[0]?.originalUrl
}

async function main() {
    console.log('🔑 Logging in as superadmin...')
    const loginRes = await fetch('http://[::1]:3001/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'superadmin@timmyhub.dev', password: 'Seed@12345' }),
    })
    const { accessToken } = await loginRes.json()
    if (!accessToken) {
        throw new Error('Failed to get superadmin access token')
    }

    console.log('🚀 Processing products for image uploads...')
    for (const [slug, urls] of Object.entries(PRODUCT_IMAGE_SOURCES)) {
        const product = await prisma.product.findFirst({
            where: { slug },
        })

        if (!product) {
            console.log(`⚠️ Product with slug "${slug}" not found in database. Skipping.`)
            continue
        }

        if (product.images && product.images.length >= urls.length) {
            console.log(`✅ Product "${slug}" already has ${product.images.length} images. Skipping.`)
            continue
        }

        console.log(`📸 Uploading ${urls.length} images for product "${product.name}" (${slug})...`)
        const uploadedUrls = []
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i]
            const fileName = `${slug}-${i + 1}.jpg`
            try {
                const s3Url = await uploadImageViaApi(accessToken, url, fileName)
                uploadedUrls.push(s3Url)
                console.log(`  -> [${i + 1}/${urls.length}] Uploaded: ${s3Url}`)
            } catch (err) {
                console.error(`  ❌ Failed to upload image ${i + 1} for ${slug}:`, err.message)
            }
        }

        if (uploadedUrls.length > 0) {
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    images: uploadedUrls,
                    status: 'APPROVED',
                    isSuspended: false,
                },
            })
            console.log(`🎉 Updated product "${slug}" with ${uploadedUrls.length} S3 images in DB.`)
        }
    }

    console.log('🏁 All product images have been seeded and uploaded to S3!')
}

main()
    .catch((err) => {
        console.error('Fatal error:', err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
