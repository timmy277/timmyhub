// Hằng số của module platform — coding-standards.md §4.3: không khai báo trong file class.

// Health KHÔNG có tiền tố version: đây là probe hạ tầng (load balancer, k8s liveness/readiness) chứ không phải API
// nghiệp vụ — đường dẫn phải ổn định qua mọi version API (observability.md, project-plan.md: `GET /health`).
export const PLATFORM_ROUTE = {
    HEALTH: 'health',
} as const

export const PLATFORM_EVENT = {
    HEALTH_CHECKED: 'platform.health.checked',
} as const
