import { exec, execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

import { Injectable, Logger } from '@nestjs/common'

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
    private ffmpegInstalled: boolean | null = null

    /**
     * Kiểm tra xem ffmpeg có được cài đặt trong PATH hệ điều hành hay không
     */
    isFfmpegAvailable(): boolean {
        if (this.ffmpegInstalled !== null) {
            return this.ffmpegInstalled
        }

        try {
            execSync('ffmpeg -version', { stdio: 'ignore' })
            this.ffmpegInstalled = true
            this.logger.log('ffmpeg binary phát hiện thành công trong môi trường runtime.')
        } catch {
            this.ffmpegInstalled = false
            this.logger.warn(
                'ffmpeg không có sẵn trong hệ thống PATH. Các tác vụ nén video và sinh HLS tự động sẽ chuyển sang chế độ fallback (giữ file gốc và dùng thumbnail từ client snapshot / media fragment #t=0.0001).',
            )
        }

        return this.ffmpegInstalled
    }

    /**
     * Trích xuất thumbnail từ video tại thời điểm chỉ định (mặc định 0.0001s như yêu cầu)
     * Lệnh: ffmpeg -ss 00:00:00.001 -i <input> -vframes 1 -q:v 2 <output>
     */
    async extractThumbnail(
        inputVideoPath: string,
        outputThumbnailPath: string,
        offsetSeconds: number = VIDEO_TRANSCODE_DEFAULTS.DEFAULT_THUMBNAIL_OFFSET_SECONDS,
    ): Promise<string | null> {
        if (!this.isFfmpegAvailable()) {
            this.logger.warn(
                `Bỏ qua extractThumbnail qua ffmpeg do ffmpeg không khả dụng. Fallback URL với media fragment #t=${offsetSeconds}`,
            )
            return null
        }

        try {
            const outputDir = path.dirname(outputThumbnailPath)
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true })
            }

            // Định dạng offset thành chuỗi thời gian HH:MM:SS.mmm
            const timeStr = '00:00:00.001'
            const cmd = `ffmpeg -y -ss ${timeStr} -i "${inputVideoPath}" -vframes 1 -q:v 2 "${outputThumbnailPath}"`

            this.logger.debug(`Đang chạy ffmpeg thumbnail: ${cmd}`)
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
        if (!this.isFfmpegAvailable()) {
            this.logger.warn('ffmpeg không khả dụng. Giữ nguyên video gốc không qua nén.')
            return { success: false, outputPath: inputVideoPath }
        }

        try {
            const outputDir = path.dirname(outputVideoPath)
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true })
            }

            // Lệnh nén tối ưu web MP4
            const cmd = `ffmpeg -y -i "${inputVideoPath}" -c:v libx264 -crf ${VIDEO_TRANSCODE_DEFAULTS.CRF} -preset ${VIDEO_TRANSCODE_DEFAULTS.PRESET} -c:a aac -b:a ${VIDEO_TRANSCODE_DEFAULTS.AUDIO_BITRATE} -movflags +faststart "${outputVideoPath}"`

            this.logger.log(`Bắt đầu nén video: ${inputVideoPath} -> ${outputVideoPath}`)
            await execAsync(cmd)

            return { success: true, outputPath: outputVideoPath }
        } catch (error) {
            this.logger.error(`Lỗi nén video qua ffmpeg: ${(error as Error).message}. Dùng video gốc.`)
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
        if (!this.isFfmpegAvailable()) {
            this.logger.warn('ffmpeg không khả dụng. Bỏ qua sinh HLS playlist.')
            return { success: false, playlistPath: null }
        }

        try {
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true })
            }

            const playlistPath = path.join(outputDir, playlistName)
            const segmentPattern = path.join(outputDir, 'segment_%03d.ts')

            const cmd = `ffmpeg -y -i "${inputVideoPath}" -c:v libx264 -crf ${VIDEO_TRANSCODE_DEFAULTS.CRF} -preset ${VIDEO_TRANSCODE_DEFAULTS.PRESET} -c:a aac -b:a ${VIDEO_TRANSCODE_DEFAULTS.AUDIO_BITRATE} -hls_time ${VIDEO_TRANSCODE_DEFAULTS.HLS_SEGMENT_DURATION_SECONDS} -hls_list_size 0 -hls_segment_filename "${segmentPattern}" "${playlistPath}"`

            this.logger.log(`Bắt đầu tạo HLS stream tại ${playlistPath}`)
            await execAsync(cmd)

            return { success: true, playlistPath }
        } catch (error) {
            this.logger.error(`Lỗi khi tạo HLS stream qua ffmpeg: ${(error as Error).message}`)
            return { success: false, playlistPath: null }
        }
    }
}
