import { Injectable } from '@nestjs/common'

// Khung tối giản — model Product/Category (catalog.prisma) chưa được tạo ở lượt dựng khung này,
// sẽ nối vào PrismaService khi triển khai spec catalog thật.
@Injectable()
export class CatalogRepository {
    // ===== Queries =====
    countProducts(): Promise<number> {
        return Promise.resolve(0)
    }
}
