import { Injectable } from '@nestjs/common'
import { PrismaService } from '@timmyhub/prisma'

@Injectable()
export class IdentityRepository {
    constructor(private readonly prisma: PrismaService) {}

    countUsers(): Promise<number> {
        return this.prisma.user.count()
    }
}
