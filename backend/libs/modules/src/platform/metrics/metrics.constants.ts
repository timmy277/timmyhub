export const METRICS_CONSTANTS = {
    DEFAULT_PREFIX: 'timmyhub_',
    // Bucket phân vị cho thời gian đáp ứng HTTP (giây), bao gồm ngưỡng 300ms theo cam kết NFR-001 (p95 <= 300ms)
    HTTP_DURATION_BUCKETS: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.3, 0.5, 1, 2.5, 5, 10],
} as const

export const METRIC_NAME = {
    HTTP_REQUESTS_TOTAL: 'http_requests_total',
    HTTP_REQUEST_DURATION_SECONDS: 'http_request_duration_seconds',
    HTTP_REQUESTS_IN_FLIGHT: 'http_requests_in_flight',
} as const
