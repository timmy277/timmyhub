import { Global, Module } from '@nestjs/common'

import { PrismaService } from './prisma.service'

// @Global(): một PrismaService/PrismaClient duy nhất cho cả app — tránh mỗi domain module tự khởi
// một connection pool riêng. Import module này một lần ở AppModule, các module domain khác không cần import lại.
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}
