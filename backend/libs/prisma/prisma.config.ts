import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Không khai báo `datasource` ở đây: Prisma config loader sẽ validate `url` và throw
// PrismaConfigEnvError khi CI thiếu DATABASE_URL (prisma generate không cần DB URL).
// Datasource đã được khai báo trong prisma/schema/base.prisma qua env("DATABASE_URL"),
// chỉ được resolve lúc runtime (migrate deploy / db push) — khi DATABASE_URL đã có.
export default defineConfig({
    schema: path.join(__dirname, 'prisma', 'schema'),
})
