'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type {
    ConfirmMediaUploadDto,
    CreatePresignedUrlDto,
    MediaAsset,
    MediaFilterDto,
    MediaListResponse,
    PresignedUrlResponse,
} from '@timmyhub/contracts'

import { API_ROUTE, QUERY_KEY } from '@/constants'
import { apiClient } from '@/services'

export interface UploadMediaParams {
    files: File[]
    ownerType?: string
    ownerId?: string
    onProgress?: (progressPercent: number, fileIndex: number) => void
}

export interface PresignedUploadParams {
    file: File
    ownerType?: CreatePresignedUrlDto['ownerType']
    ownerId?: string
    onProgress?: (progressPercent: number) => void
}

/**
 * Hook to fetch paginated/filtered media list
 */
export function useMediaList(filters: MediaFilterDto = { page: 1, limit: 20 }) {
    return useQuery<MediaListResponse>({
        queryKey: QUERY_KEY.MEDIA.LIST(filters as Record<string, unknown>),
        queryFn: async () => {
            const response = await apiClient.get<MediaListResponse>(API_ROUTE.MEDIA.LIST, {
                params: filters,
            })
            return response.data
        },
    })
}

/**
 * Hook to fetch single media detail
 */
export function useMediaDetail(id: string) {
    return useQuery<MediaAsset>({
        queryKey: QUERY_KEY.MEDIA.DETAIL(id),
        queryFn: async () => {
            const response = await apiClient.get<MediaAsset>(API_ROUTE.MEDIA.DETAIL(id))
            return response.data
        },
        enabled: Boolean(id),
    })
}

/**
 * Hook for direct multipart multi-file upload with live progress tracking
 */
export function useUploadMedia() {
    const queryClient = useQueryClient()

    return useMutation<MediaAsset[], Error, UploadMediaParams>({
        mutationFn: async ({ files, ownerType, ownerId, onProgress }) => {
            const formData = new FormData()
            files.forEach((file) => {
                formData.append('files', file)
            })
            if (ownerType) formData.append('ownerType', ownerType)
            if (ownerId) formData.append('ownerId', ownerId)

            const response = await apiClient.post<MediaAsset[]>(API_ROUTE.MEDIA.UPLOAD, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total && onProgress) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        onProgress(percent, 0)
                    }
                },
            })

            return response.data
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.MEDIA.ALL })
        },
    })
}

/**
 * Hook for S3 / Supabase Direct Presigned URL upload.
 *
 * Local dev fallback: khi không có S3 credentials, backend trả uploadUrl trỏ về
 * /api/v1/media/upload (multipart POST). Hook tự detect và chuyển sang FormData
 * thay vì PUT để tránh 404 trong môi trường development.
 */
export function usePresignedUpload() {
    const queryClient = useQueryClient()

    return useMutation<MediaAsset, Error, PresignedUploadParams>({
        mutationFn: async ({ file, ownerType, ownerId, onProgress }) => {
            // Step 1: Request presigned URL from Backend
            const presignedPayload: CreatePresignedUrlDto = {
                filename: file.name,
                mimeType: file.type as CreatePresignedUrlDto['mimeType'],
                sizeBytes: file.size,
                ownerType: ownerType || 'GENERAL',
                ownerId,
            }

            const presignedRes = await apiClient.post<PresignedUrlResponse>(
                API_ROUTE.MEDIA.PRESIGNED_URL,
                presignedPayload,
            )
            const { assetId, uploadUrl, publicUrl, headers } = presignedRes.data

            // Step 2: Upload file
            // Nếu uploadUrl trỏ về /media/upload hoặc assetId là 'local-fallback'
            // -> Đây là local dev fallback, dùng FormData multipart thay vì PUT.
            const isLocalFallback = uploadUrl.includes('/media/upload') || assetId === 'local-fallback'

            if (isLocalFallback) {
                // Local fallback: multipart POST giống useUploadMedia
                const formData = new FormData()
                formData.append('files', file)
                if (ownerType) formData.append('ownerType', ownerType)
                if (ownerId) formData.append('ownerId', ownerId)

                const uploadRes = await apiClient.post<MediaAsset[]>(API_ROUTE.MEDIA.UPLOAD, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total && onProgress) {
                            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                            onProgress(percent)
                        }
                    },
                })

                // Direct upload endpoint đã lưu DB và trả MediaAsset READY — không cần confirm
                const asset = uploadRes.data[0]
                if (!asset) throw new Error('Upload không trả về media asset')

                // Dọn orphan asset chỉ khi trước đó backend cũ từng tạo record UPLOADING thật
                if (assetId && assetId !== 'local-fallback') {
                    void apiClient.delete(API_ROUTE.MEDIA.DELETE(assetId)).catch(() => {})
                }

                return asset
            }

            // S3 / Supabase: PUT trực tiếp lên presigned URL
            await axios.put(uploadUrl, file, {
                headers: {
                    'Content-Type': file.type,
                    ...headers,
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total && onProgress) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        onProgress(percent)
                    }
                },
            })

            // Step 3: Confirm upload với Backend để kích hoạt MediaAsset
            const confirmPayload: ConfirmMediaUploadDto = {
                assetId,
                publicUrl,
                sizeBytes: file.size,
            }

            const confirmRes = await apiClient.post<MediaAsset>(API_ROUTE.MEDIA.CONFIRM, confirmPayload)

            return confirmRes.data
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.MEDIA.ALL })
        },
    })
}

/**
 * Hook to delete a media asset
 */
export function useDeleteMedia() {
    const queryClient = useQueryClient()

    return useMutation<MediaAsset, Error, string>({
        mutationFn: async (id: string) => {
            const response = await apiClient.delete<MediaAsset>(API_ROUTE.MEDIA.DELETE(id))
            return response.data
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.MEDIA.ALL })
        },
    })
}
