import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { PRESIGNED_URL_EXPIRES_SECONDS } from '@timmyhub/contracts'

export interface UploadFileOptions {
    key: string
    buffer: Buffer
    mimeType: string
}

export interface PresignedUrlResult {
    uploadUrl: string
    publicUrl: string
    key: string
    headers?: Record<string, string>
    expiresInSeconds: number
}

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name)
    private readonly s3Client?: S3Client
    private readonly bucketName: string
    private readonly publicUrlPrefix: string
    private readonly isS3Configured: boolean
    private readonly localStorageDir: string

    constructor(private readonly configService: ConfigService) {
        const endpoint = this.configService.get<string>('S3_ENDPOINT') || this.configService.get<string>('SUPABASE_STORAGE_S3_ENDPOINT')
        const region = this.configService.get<string>('S3_REGION') || this.configService.get<string>('AWS_REGION') || 'auto'
        const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID') || this.configService.get<string>('AWS_ACCESS_KEY_ID')
        const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY') || this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
        this.bucketName = this.configService.get<string>('S3_BUCKET') || this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'media'
        this.publicUrlPrefix = this.configService.get<string>('S3_PUBLIC_URL_PREFIX') || this.configService.get<string>('MEDIA_PUBLIC_URL_PREFIX') || ''

        // Local storage fallback directory
        this.localStorageDir = path.resolve(process.cwd(), 'uploads')
        if (!fs.existsSync(this.localStorageDir)) {
            fs.mkdirSync(this.localStorageDir, { recursive: true })
        }

        if (accessKeyId && secretAccessKey) {
            const s3Config: Record<string, unknown> = {
                region,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
                forcePathStyle: true,
            }
            if (endpoint) {
                s3Config.endpoint = endpoint
            }
            this.s3Client = new S3Client(s3Config)
            this.isS3Configured = true
            this.logger.log(`S3/Supabase Storage Client initialized for bucket: ${this.bucketName}`)
        } else {
            this.isS3Configured = false
            this.logger.warn(`No S3 credentials found. Falling back to local storage at: ${this.localStorageDir}`)
        }
    }

    /**
     * Uploads buffer directly to storage (S3 or Local)
     */
    async uploadFile(options: UploadFileOptions): Promise<string> {
        const { key, buffer, mimeType } = options

        if (this.isS3Configured && this.s3Client) {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: buffer,
                    ContentType: mimeType,
                }),
            )
            return this.getPublicUrl(key)
        }

        // Local disk fallback
        const filePath = path.join(this.localStorageDir, key)
        const fileDir = path.dirname(filePath)
        if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true })
        }
        await fs.promises.writeFile(filePath, buffer)
        return `/uploads/${key}`
    }

    /**
     * Generates a presigned PUT URL for client-side direct S3/Supabase upload
     */
    async getPresignedUploadUrl(key: string, mimeType: string): Promise<PresignedUrlResult> {
        const expiresInSeconds = PRESIGNED_URL_EXPIRES_SECONDS

        if (this.isS3Configured && this.s3Client) {
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                ContentType: mimeType,
            })

            const uploadUrl = await getSignedUrl(this.s3Client, command, {
                expiresIn: expiresInSeconds,
            })

            return {
                uploadUrl,
                publicUrl: this.getPublicUrl(key),
                key,
                headers: {
                    'Content-Type': mimeType,
                },
                expiresInSeconds,
            }
        }

        // For local dev fallback where client can upload to backend multipart endpoint
        const apiBaseUrl = this.configService.get<string>('API_BASE_URL') || 'http://localhost:3001'
        return {
            uploadUrl: `${apiBaseUrl}/api/v1/media/upload`,
            publicUrl: `/uploads/${key}`,
            key,
            expiresInSeconds,
        }
    }

    /**
     * Deletes file from storage
     */
    async deleteFile(key: string): Promise<void> {
        if (this.isS3Configured && this.s3Client) {
            try {
                await this.s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: this.bucketName,
                        Key: key,
                    }),
                )
            } catch (err) {
                this.logger.error(`Failed to delete S3 file ${key}:`, err)
            }
            return
        }

        // Local disk
        const filePath = path.join(this.localStorageDir, key)
        if (fs.existsSync(filePath)) {
            try {
                await fs.promises.unlink(filePath)
            } catch (err) {
                this.logger.error(`Failed to delete local file ${filePath}:`, err)
            }
        }
    }

    /**
     * Resolves public URL for a given S3 key
     */
    getPublicUrl(key: string): string {
        if (this.publicUrlPrefix) {
            const prefix = this.publicUrlPrefix.endsWith('/')
                ? this.publicUrlPrefix.slice(0, -1)
                : this.publicUrlPrefix
            return `${prefix}/${key}`
        }
        const endpoint = this.configService.get<string>('S3_ENDPOINT') || this.configService.get<string>('SUPABASE_STORAGE_S3_ENDPOINT')
        if (endpoint) {
            return `${endpoint}/${this.bucketName}/${key}`
        }
        return `/uploads/${key}`
    }
}
