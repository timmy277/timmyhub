import { exec, execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

import { Injectable, Logger } from '@nestjs/common'
import ffmpegStatic from 'ffmpeg-static'

import { VIDEO_TRANSCODE_DEFAULTS } from './content.constants'

const execAsync = promisify(exec)

export interface TranscodeResult {
    success: boolean
    outputPath?: string
    thumbnailPath?: string
    hlsPlaylistPath?: string
    durationSeconds?: number
    error?: string
}

@Injectable()
export class VideoTranscodeService {
    private readonly logger = new Logger(VideoTranscodeService.name)
    private cachedFfmpegBinary: string | null = null

    /**
     * Lấy đường dẫn binary ffmpeg (ưu tiên binary từ ffmpeg-static, fallback PATH hệ thống)
     */
    getFfmpegBinary(): string | null {
        if (this.cachedFfmpegBinary !== null) {
            return this.cachedFfmpegBinary
        }

        const resolvedPath =
            typeof ffmpegStatic === 'string' ? ffmpegStatic : (ffmpegStatic as unknown as { default?: string })?.default

        if (typeof resolvedPath === 'string' && existsSync(resolvedPath)) {
            this.cachedFfmpegBinary = resolvedPath
            this.logger.log(`Phát hiện binary ffmpeg từ static bundle: ${resolvedPath}`)
            return this.cachedFfmpegBinary
        }

        try {
            execSync('ffmpeg -version', { stdio: 'ignore' })
            this.cachedFfmpegBinary = 'ffmpeg'
            this.logger.log('Phát hiện binary ffmpeg từ biến môi trường PATH.')
            return this.cachedFfmpegBinary
        } catch {
            this.cachedFfmpegBinary = null
            this.logger.warn('Không tìm thấy ffmpeg binary. Pipeline sẽ chuyển sang chế độ fallback an toàn.')
            return null
        }
    }

    isFfmpegAvailable(): boolean {
        return Boolean(this.getFfmpegBinary())
    }

    /**
     * Chuyển URL hoặc đường dẫn video thành đường dẫn tệp tin thực tế hoặc URL HTTP hợp lệ cho ffmpeg
     */
    private resolveVideoSource(inputUrlOrPath: string): string {
        if (inputUrlOrPath.includes('/uploads/')) {
            const relativePart = inputUrlOrPath.slice(inputUrlOrPath.indexOf('uploads/'))
            const candidates = [
                path.resolve(process.cwd(), relativePart),
                path.resolve(process.cwd(), 'apps', 'api', relativePart),
                path.resolve(process.cwd(), 'backend', 'apps', 'api', relativePart),
            ]
            for (const candidate of candidates) {
                if (existsSync(candidate)) {
                    return candidate
                }
            }
        }
        if (inputUrlOrPath.startsWith('http://') || inputUrlOrPath.startsWith('https://')) {
            return inputUrlOrPath
        }
        if (existsSync(inputUrlOrPath)) {
            return inputUrlOrPath
        }
        return path.resolve(process.cwd(), inputUrlOrPath.replace(/^\//, ''))
    }

    /**
     * Trích xuất thumbnail từ video tại thời điểm 0.001s
     */
    async extractThumbnail(
        inputVideoPath: string,
        outputThumbnailPath: string,
        offsetSeconds: number = VIDEO_TRANSCODE_DEFAULTS.DEFAULT_THUMBNAIL_OFFSET_SECONDS,
    ): Promise<string | null> {
        const ffmpegBin = this.getFfmpegBinary()
        if (!ffmpegBin) {
            this.logger.warn(`Bỏ qua extractThumbnail do thiếu ffmpeg. Dùng fallback #t=${offsetSeconds}`)
            return null
        }

        try {
            const outputDir = path.dirname(outputThumbnailPath)
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true })
            }

            const source = this.resolveVideoSource(inputVideoPath)
            const cmd = `"${ffmpegBin}" -y -ss 00:00:00.001 -i "${source}" -vframes 1 -q:v 2 "${outputThumbnailPath}"`
            await execAsync(cmd)

            if (existsSync(outputThumbnailPath)) {
                this.logger.log(`Tạo thumbnail thành công tại ${outputThumbnailPath}`)
                return outputThumbnailPath
            }
            return null
        } catch (error) {
            this.logger.error(`Lỗi khi trích xuất thumbnail bằng ffmpeg: ${(error as Error).message}`)
            return null
        }
    }

    /**
     * Nén video chất lượng cao bằng H.264 CRF 23 + AAC + faststart cho web streaming
     */
    async compressVideo(
        inputVideoPath: string,
        outputVideoPath: string,
    ): Promise<{ success: boolean; outputPath: string }> {
        const ffmpegBin = this.getFfmpegBinary()
        if (!ffmpegBin) {
            return { success: false, outputPath: inputVideoPath }
        }

        try {
            const outputDir = path.dirname(outputVideoPath)
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true })
            }

            const source = this.resolveVideoSource(inputVideoPath)
            const cmd = `"${ffmpegBin}" -y -i "${source}" -c:v libx264 -crf ${VIDEO_TRANSCODE_DEFAULTS.CRF} -preset ${VIDEO_TRANSCODE_DEFAULTS.PRESET} -c:a aac -b:a ${VIDEO_TRANSCODE_DEFAULTS.AUDIO_BITRATE} -movflags +faststart "${outputVideoPath}"`
            this.logger.log(`Bắt đầu nén video: ${source} -> ${outputVideoPath}`)
            await execAsync(cmd)

            return { success: true, outputPath: outputVideoPath }
        } catch (error) {
            this.logger.error(`Lỗi nén video qua ffmpeg: ${(error as Error).message}`)
            return { success: false, outputPath: inputVideoPath }
        }
    }

    /**
     * Tạo HLS stream (.m3u8 và các segment .ts) để phát thích ứng băng thông
     */
    async generateHlsStream(
        inputVideoPath: string,
        outputDir: string,
        playlistName = 'index.m3u8',
    ): Promise<{ success: boolean; playlistPath: string | null }> {
        const ffmpegBin = this.getFfmpegBinary()
        if (!ffmpegBin) {
            return { success: false, playlistPath: null }
        }

        try {
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true })
            }

            const source = this.resolveVideoSource(inputVideoPath)
            const playlistPath = path.join(outputDir, playlistName)
            const segmentPattern = path.join(outputDir, 'segment_%03d.ts')

            const cmd = `"${ffmpegBin}" -y -i "${source}" -c:v libx264 -crf ${VIDEO_TRANSCODE_DEFAULTS.CRF} -preset ${VIDEO_TRANSCODE_DEFAULTS.PRESET} -c:a aac -b:a ${VIDEO_TRANSCODE_DEFAULTS.AUDIO_BITRATE} -hls_time ${VIDEO_TRANSCODE_DEFAULTS.HLS_SEGMENT_DURATION_SECONDS} -hls_list_size 0 -hls_segment_filename "${segmentPattern}" "${playlistPath}"`
            this.logger.log(`Bắt đầu tạo HLS stream tại ${playlistPath}`)
            await execAsync(cmd)

            return { success: true, playlistPath }
        } catch (error) {
            this.logger.error(`Lỗi khi tạo HLS stream qua ffmpeg: ${(error as Error).message}`)
            return { success: false, playlistPath: null }
        }
    }

    /**
     * Xử lý trọn gói pipeline video bài đăng: thumbnail + nén + HLS stream
     */
    async processVideoForPost(
        inputVideoUrl: string,
        targetId: string,
    ): Promise<{
        success: boolean
        hlsUrl?: string | undefined
        thumbnailUrl?: string | undefined
        error?: string | undefined
    }> {
        if (!this.isFfmpegAvailable()) {
            return {
                success: false,
                hlsUrl: inputVideoUrl,
                thumbnailUrl: `${inputVideoUrl}#t=0.0001`,
                error: 'ffmpeg binary not available',
            }
        }

        try {
            const hlsDir = path.resolve(process.cwd(), 'uploads', 'hls', targetId)
            if (!existsSync(hlsDir)) {
                mkdirSync(hlsDir, { recursive: true })
            }

            const thumbnailPath = path.join(hlsDir, 'poster.jpg')
            const playlistName = 'index.m3u8'

            // 1. Trích xuất thumbnail tại 0.001s
            await this.extractThumbnail(inputVideoUrl, thumbnailPath, 0.001)

            // 2. Tạo luồng HLS stream
            const hlsResult = await this.generateHlsStream(inputVideoUrl, hlsDir, playlistName)

            if (hlsResult.success && hlsResult.playlistPath) {
                const publicHlsUrl = `/uploads/hls/${targetId}/${playlistName}`
                const publicThumbUrl = existsSync(thumbnailPath) ? `/uploads/hls/${targetId}/poster.jpg` : undefined
                this.logger.log(`[VideoTranscode] Pipeline HLS hoàn tất cho bài đăng ${targetId}: ${publicHlsUrl}`)
                return {
                    success: true,
                    hlsUrl: publicHlsUrl,
                    thumbnailUrl: publicThumbUrl,
                }
            }

            return {
                success: false,
                hlsUrl: inputVideoUrl,
                error: 'HLS stream generation failed',
            }
        } catch (error) {
            this.logger.error(`[VideoTranscode] Lỗi xử lý video cho bài đăng ${targetId}: ${(error as Error).message}`)
            return {
                success: false,
                hlsUrl: inputVideoUrl,
                error: (error as Error).message,
            }
        }
    }
}
