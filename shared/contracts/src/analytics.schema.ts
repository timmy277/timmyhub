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

// ===== Seller Action To-Dos =====
export const SellerActionTodosSchema = z.object({
    pendingConfirm: z.number(),
    pendingPickup: z.number(),
    shipping: z.number(),
    returnRefund: z.number(),
    outOfStock: z.number(),
})
export type SellerActionTodos = z.infer<typeof SellerActionTodosSchema>

// ===== Seller KPI Metrics =====
export const SellerDashboardKpisSchema = z.object({
    todayRevenue: z.number(),
    todayRevenueChange: z.number(),
    todayOrders: z.number(),
    todayOrdersChange: z.number(),
    periodRevenue: z.number(),
    periodRevenueChange: z.number(),
    periodOrders: z.number(),
    periodOrdersChange: z.number(),
    avgOrderValue: z.number(),
    conversionRate: z.number(),
    activeProducts: z.number(),
    shopViews: z.number(),
    sparklines: z.object({
        revenue: z.array(z.number()),
        orders: z.array(z.number()),
    }),
})
export type SellerDashboardKpis = z.infer<typeof SellerDashboardKpisSchema>

// ===== Seller Operational Health =====
export const SellerOperationalHealthSchema = z.object({
    rating: z.number(),
    fulfillmentRate: z.number(),
    cancelRate: z.number(),
    avgResponseHours: z.number(),
    returnPolicyDays: z.number(),
})
export type SellerOperationalHealth = z.infer<typeof SellerOperationalHealthSchema>

// ===== Full Seller Dashboard Response =====
export const SellerDashboardOverviewResponseSchema = z.object({
    range: DashboardRangeSchema,
    updatedAt: z.string(),
    shopId: z.string(),
    shopName: z.string(),
    todos: SellerActionTodosSchema,
    kpis: SellerDashboardKpisSchema,
    revenueChart: z.array(RevenueTimePointSchema),
    orderStatusChart: z.array(OrderStatusDistributionPointSchema),
    topProducts: z.array(TopProductItemSchema),
    operationalHealth: SellerOperationalHealthSchema,
})
export type SellerDashboardOverviewResponse = z.infer<typeof SellerDashboardOverviewResponseSchema>
