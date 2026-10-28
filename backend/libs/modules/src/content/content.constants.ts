import type { VideoPostDto } from '@timmyhub/contracts'

export const CONTENT_ROUTES = {
    FEED: 'v1/feed',
    SELLER_POSTS: 'v1/seller/posts',
} as const

export const CONTENT_PAGINATION = {
    DEFAULT_PAGE: 1 as number,
    DEFAULT_LIMIT: 10 as number,
    MAX_LIMIT: 50 as number,
} as const

export const VIDEO_TRANSCODE_DEFAULTS = {
    DEFAULT_THUMBNAIL_OFFSET_SECONDS: 0.0001,
    HLS_SEGMENT_DURATION_SECONDS: 6,
    CRF: 23,
    PRESET: 'medium',
    AUDIO_BITRATE: '128k',
} as const

export const STATIC_FALLBACK_VIDEO_POSTS: VideoPostDto[] = [
    {
        id: 'seed-post-ao-thun-basic',
        sellerId: 'cmu8nks1l003sftgoafhv40gw',
        shopName: 'TimmyWear Official',
        shopLogo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        shopSlug: 'timmywear',
        title: 'Trải nghiệm phong cách Minimalism với Áo thun nam Basic Cotton 100%',
        content:
            'Chất vải cotton co giãn 4 chiều mềm mịn, không xù lông khi giặt máy. Phù hợp cả đi làm lẫn dạo phố cuối tuần! #aothun #thoitrangnam #minimalism',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        videoDuration: '00:46',
        hashtags: ['aothun', 'thoitrangnam', 'minimalism'],
        status: 'PUBLISHED',
        viewCount: 3420,
        likeCount: 215,
        commentCount: 36,
        isLiked: false,
        productTags: [
            {
                id: 'pt-1',
                productId: 'cmu8nl1f5004wftgohzto0pgt',
                position: 0,
                product: {
                    id: 'cmu8nl1f5004wftgohzto0pgt',
                    name: 'Áo thun nam Basic Cotton 100%',
                    slug: 'ao-thun-nam-basic-cotton-100',
                    price: 189000,
                    originalPrice: 250000,
                    thumbnailUrl:
                        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
                    inStock: true,
                },
            },
        ],
        createdAt: '2026-10-18T10:20:20.041Z',
    },
    {
        id: 'seed-post-review-xphone-12',
        sellerId: 'cmu8nksd4003tftgokdi49wgt',
        shopName: 'XPhone Store',
        shopLogo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        shopSlug: 'xphone-store',
        title: 'Đập hộp & Test camera Xphone 12 Pro: Siêu phẩm quay đêm cực đỉnh!',
        content:
            'Camera AI cảm biến lớn bắt nét siêu nhanh, chống rung quang học OIS cực êm. Xem ngay ưu đãi trả góp 0% tại TimmyHub! #xphone #techreview #smartphone',
        videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
        videoDuration: '00:10',
        hashtags: ['xphone', 'techreview', 'dienthoai'],
        status: 'PUBLISHED',
        viewCount: 5890,
        likeCount: 478,
        commentCount: 80,
        isLiked: false,
        productTags: [
            {
                id: 'pt-2',
                productId: 'cmu8nl87t006sftgo77yc4nt5',
                position: 0,
                product: {
                    id: 'cmu8nl87t006sftgo77yc4nt5',
                    name: 'Điện thoại Xphone 12 Pro 256GB',
                    slug: 'dien-thoai-xphone-12-pro-256gb',
                    price: 24990000,
                    originalPrice: 28990000,
                    thumbnailUrl:
                        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
                    inStock: true,
                },
            },
        ],
        createdAt: '2026-10-18T10:20:20.514Z',
    },
    {
        id: 'seed-post-bo-noi-sale',
        sellerId: 'cmu8nksoi003uftgoik9yrecm',
        shopName: 'Gia Dụng Thông Minh',
        shopLogo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
        shopSlug: 'gia-dung-thong-minh',
        title: 'Bí quyết nấu ăn không dính với Bộ nồi chảo vân đá Ceramic cao cấp',
        content:
            'Đáy từ 5 lớp bắt nhiệt siêu nhanh, tiết kiệm 30% điện năng khi dùng bếp từ. Thử ngay món trứng cuộn lướt nhẹ êm ru! #giadung #bepnha #sale',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
        videoDuration: '00:05',
        hashtags: ['giadung', 'nhabep', 'sale'],
        status: 'PUBLISHED',
        viewCount: 1980,
        likeCount: 142,
        commentCount: 24,
        isLiked: false,
        productTags: [
            {
                id: 'pt-3',
                productId: 'cmu8nl6290066ftgoyemltlxt',
                position: 0,
                product: {
                    id: 'cmu8nl6290066ftgoyemltlxt',
                    name: 'Bộ nồi chảo vân đá Ceramic',
                    slug: 'bo-noi-chao-van-da-ceramic',
                    price: 890000,
                    originalPrice: 1200000,
                    thumbnailUrl:
                        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
                    inStock: true,
                },
            },
        ],
        createdAt: '2026-10-18T10:20:20.911Z',
    },
    {
        id: 'seed-post-hoodie-lookbook',
        sellerId: 'cmu8nks1l003sftgoafhv40gw',
        shopName: 'TimmyWear Official',
        shopLogo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        shopSlug: 'timmywear',
        title: 'Lookbook Hoodie TimmyWear Streetwear Collection Thu Đông',
        content:
            'Form oversize cá tính, chất nỉ bông dày dặn ấm áp. Phối với quần jogger hoặc jean rách đều chất! #timmywear #hoodie #streetwear',
        videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        thumbnailUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
        videoDuration: 'HLS HD',
        hashtags: ['timmywear', 'hoodie', 'streetwear'],
        status: 'PUBLISHED',
        viewCount: 4120,
        likeCount: 310,
        commentCount: 52,
        isLiked: false,
        productTags: [
            {
                id: 'pt-4',
                productId: 'cmu8nl87t006sftgo77yc4nt5',
                position: 0,
                product: {
                    id: 'cmu8nl87t006sftgo77yc4nt5',
                    name: 'Hoodie TimmyWear Streetwear Thu Đông',
                    slug: 'hoodie-timmywear-streetwear-thu-dong',
                    price: 350000,
                    originalPrice: 450000,
                    thumbnailUrl:
                        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
                    inStock: true,
                },
            },
        ],
        createdAt: '2026-10-18T10:20:21.230Z',
    },
]
