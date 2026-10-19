// ===== 1. Helper Function: Trích xuất frame hình đại diện từ video =====

export interface ExtractFrameOptions {
    timeSec?: number
    width?: number
    height?: number
    quality?: number
}

export function extractVideoFrame(videoSource: string, options: ExtractFrameOptions = {}): Promise<string> {
    const { timeSec = 0.0001, width = 720, height = 1280, quality = 0.88 } = options

    return new Promise((resolve, reject) => {
        if (!videoSource) {
            reject(new Error('Video source is empty'))
            return
        }

        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        video.preload = 'metadata'
        video.muted = true
        video.playsInline = true

        video.onloadedmetadata = () => {
            try {
                video.currentTime = Math.min(timeSec, Math.max(0, (video.duration || 1) - 0.001))
            } catch (err) {
                reject(err)
            }
        }

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = video.videoWidth || width
                canvas.height = video.videoHeight || height
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Canvas 2D context not available'))
                    return
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const dataUrl = canvas.toDataURL('image/jpeg', quality)
                resolve(dataUrl)
            } catch (err) {
                reject(err)
            }
        }

        video.onerror = () => {
            reject(new Error('Failed to load video for frame extraction'))
        }

        video.src = videoSource
    })
}
