import { z } from 'zod'

// ===== Dashboard Date Range =====
export const DashboardRangeSchema = z.enum(['7d', '30d', '90d', '1y']).default('30d')
export type DashboardRange = z.infer<typeof DashboardRangeSchema>

// ===== KPI Metrics =====
export const DashboardKpisSchema = z.object({
    gmv: z.number(),
    gmvChange: z.number(),
    orderCount: z.number(),
    orderCountChange: z.number(),
    activeUsers: z.number(),
    activeUsersChange: z.number(),
    avgOrderValue: z.number(),
    avgOrderValueChange: z.number(),
    conversionRate: z.number(),
    conversionRateChange: z.number(),
    sparklines: z.object({
        gmv: z.array(z.number()),
        orders: z.array(z.number()),
        users: z.array(z.number()),
        conversion: z.array(z.number()),
    }),
})
export type DashboardKpis = z.infer<typeof DashboardKpisSchema>

// ===== Revenue & Orders Chart Points (Area Chart) =====
export const RevenueTimePointSchema = z.object({
    date: z.string(),
    label: z.string(),
    revenue: z.number(),
    orders: z.number(),
    previousRevenue: z.number().optional(),
})
export type RevenueTimePoint = z.infer<typeof RevenueTimePointSchema>

// ===== Category Performance (Bar Chart) =====
export const CategorySalesPointSchema = z.object({
    categoryId: z.string(),
    categoryName: z.string(),
    sales: z.number(),
    orders: z.number(),
    color: z.string().optional(),
})
export type CategorySalesPoint = z.infer<typeof CategorySalesPointSchema>

// ===== Order Status Distribution (Donut / Pie Chart) =====
export const OrderStatusDistributionPointSchema = z.object({
    status: z.string(),
    label: z.string(),
    count: z.number(),
    percentage: z.number(),
    color: z.string(),
})
export type OrderStatusDistributionPoint = z.infer<typeof OrderStatusDistributionPointSchema>

// ===== Payment Method Breakdown (Donut Chart) =====
export const PaymentMethodDistributionPointSchema = z.object({
    method: z.string(),
    label: z.string(),
    count: z.number(),
    amount: z.number(),
    percentage: z.number(),
    color: z.string(),
})
export type PaymentMethodDistributionPoint = z.infer<typeof PaymentMethodDistributionPointSchema>

// ===== Top Selling Products =====
export const TopProductItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    price: z.number(),
    soldCount: z.number(),
    revenue: z.number(),
    stock: z.number(),
    rating: z.number(),
    imageUrl: z.string().optional(),
})
export type TopProductItem = z.infer<typeof TopProductItemSchema>

// ===== Recent Transactions =====
export const RecentOrderTransactionSchema = z.object({
    id: z.string(),
    orderNumber: z.string(),
    customerName: z.string(),
    customerAvatar: z.string().optional(),
    totalAmount: z.number(),
    status: z.string(),
    paymentMethod: z.string(),
    itemCount: z.number(),
    createdAt: z.string(),
})
export type RecentOrderTransaction = z.infer<typeof RecentOrderTransactionSchema>

// ===== Operational & SLA Performance =====
export const PlatformPerformanceMetricsSchema = z.object({
    fulfillmentRate: z.number(),
    onTimeDeliveryRate: z.number(),
    returnRefundRate: z.number(),
    customerSatisfactionScore: z.number(),
})
export type PlatformPerformanceMetrics = z.infer<typeof PlatformPerformanceMetricsSchema>

// ===== Full Dashboard Overview Response =====
export const DashboardOverviewResponseSchema = z.object({
    range: DashboardRangeSchema,
    updatedAt: z.string(),
    kpis: DashboardKpisSchema,
    revenueChart: z.array(RevenueTimePointSchema),
    categoryChart: z.array(CategorySalesPointSchema),
    orderStatusChart: z.array(OrderStatusDistributionPointSchema),
    paymentMethodChart: z.array(PaymentMethodDistributionPointSchema),
    topProducts: z.array(TopProductItemSchema),
    recentOrders: z.array(RecentOrderTransactionSchema),
    performance: PlatformPerformanceMetricsSchema,
})
export type DashboardOverviewResponse = z.infer<typeof DashboardOverviewResponseSchema>
