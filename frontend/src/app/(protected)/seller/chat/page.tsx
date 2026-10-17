'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
    CheckCheckIcon,
    ChevronRightIcon,
    CopyIcon,
    ExternalLinkIcon,
    FilterIcon,
    FolderKanbanIcon,
    HelpCircleIcon,
    ImageIcon,
    InfoIcon,
    Loader2Icon,
    MessageCircleIcon,
    MessageSquareIcon,
    PackageIcon,
    PanelRightCloseIcon,
    PanelRightOpenIcon,
    PaperclipIcon,
    RefreshCwIcon,
    SearchIcon,
    SendIcon,
    SparklesIcon,
    StoreIcon,
    TagIcon,
    UserCheckIcon,
    UserIcon,
    VideoIcon,
    XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ChatMessageDto, ConversationDto } from '@timmyhub/contracts'

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Input,
    ScrollArea,
    Separator,
    Textarea,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import { useChat, useConversationMessages } from '@/hooks/use-chat'
import { useUploadMedia } from '@/hooks/use-media'
import { formatCurrencyVND, formatRelativeTime } from '@/utils'

// Các mẫu câu trả lời nhanh (Canned Replies) cho Seller chăm sóc khách hàng
const QUICK_REPLIES = [
    'Chào bạn! Shop có thể tư vấn kích thước hoặc hỗ trợ gì cho bạn ạ?',
    'Dạ shop đã xác nhận đơn hàng và đang đóng gói để giao sớm nhất ạ!',
    'Bạn vui lòng cung cấp thêm hình ảnh hoặc video cận cảnh để shop hỗ trợ ngay nhé.',
    'Sản phẩm hiện đang có sẵn trong kho, bạn đặt sớm shop gửi ngay trong ngày ạ!',
    'Shop gửi tặng bạn mã giảm giá ưu đãi khi mua đơn hàng này nhé!',
]

export default function SellerChatPage() {
    const { userId, conversations, totalUnreadCount, isLoading, markConversationRead, sendMessage, isSending, refetchConversations } =
        useChat()

    // Trạng thái hội thoại đang chọn
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
    const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'order'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showCustomerCrm, setShowCustomerCrm] = useState(true)

    // Trạng thái input & media đính kèm
    const [inputText, setInputText] = useState('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [mediaPreviews, setMediaPreviews] = useState<Array<{ url: string; type: 'image' | 'video' }>>([])
    const [customerNotes, setCustomerNotes] = useState<Record<string, string>>({})

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia()

    // Tự động chọn cuộc hội thoại đầu tiên nếu chưa chọn
    useEffect(() => {
        if (!selectedConvId && conversations.length > 0) {
            const first = conversations[0]
            if (first) {
                setSelectedConvId(first.id)
            }
        }
    }, [conversations, selectedConvId])

    // Lấy thông tin cuộc hội thoại đang chọn
    const activeConversation = useMemo(() => {
        return conversations.find((c) => c.id === selectedConvId) ?? null
    }, [conversations, selectedConvId])

    // Lấy tin nhắn của cuộc hội thoại đang chọn
    const { messages, isLoading: isLoadingMessages, refetch: refetchMessages } = useConversationMessages(selectedConvId)

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, mediaPreviews])

    // Đánh dấu đã đọc khi chọn hội thoại
    useEffect(() => {
        if (activeConversation && activeConversation.unreadCount > 0) {
            markConversationRead(activeConversation.id)
        }
    }, [activeConversation, markConversationRead])

    // Lọc danh sách hội thoại
    const filteredConversations = useMemo(() => {
        return conversations.filter((c) => {
            // Lọc theo tab
            if (filterTab === 'unread' && c.unreadCount === 0) return false
            if (filterTab === 'order' && !c.orderId) return false

            // Lọc theo từ khóa
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchName = c.peer.name.toLowerCase().includes(q)
                const matchLastMsg = c.lastMessage?.toLowerCase().includes(q)
                return matchName || matchLastMsg
            }
            return true
        })
    }, [conversations, filterTab, searchQuery])

    // Xử lý chọn ảnh/video
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? [])
        if (!files.length) return

        setSelectedFiles((prev) => [...prev, ...files])
        const newPreviews = files.map((file) => ({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? ('video' as const) : ('image' as const),
        }))
        setMediaPreviews((prev) => [...prev, ...newPreviews])
    }

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
        setMediaPreviews((prev) => prev.filter((_, i) => i !== index))
    }

    // Gửi tin nhắn
    const handleSend = async () => {
        if (!selectedConvId) return
        const text = inputText.trim()
        if (!text && selectedFiles.length === 0) return

        let uploadedImageUrls: string[] = []
        let uploadedVideoUrls: string[] = []

        if (selectedFiles.length > 0) {
            try {
                const assets = await uploadMedia({
                    files: selectedFiles,
                    ownerType: 'GENERAL',
                    ownerId: selectedConvId,
                })
                for (let i = 0; i < assets.length; i++) {
                    const asset = assets[i]
                    const file = selectedFiles[i]
                    if (file?.type.startsWith('video/')) {
                        uploadedVideoUrls.push(asset?.originalUrl ?? '')
                    } else {
                        uploadedImageUrls.push(asset?.originalUrl ?? '')
                    }
                }
            } catch (err) {
                console.error('Lỗi khi tải ảnh/video lên:', err)
                toast.error('Không thể tải tệp lên. Vui lòng thử lại.')
            }
        }

        try {
            await sendMessage({
                conversationId: selectedConvId,
                content: text || undefined,
                imageUrls: uploadedImageUrls.filter(Boolean),
                videoUrls: uploadedVideoUrls.filter(Boolean),
            })
            setInputText('')
            setSelectedFiles([])
            setMediaPreviews([])
        } catch (err) {
            console.error('Lỗi khi gửi tin nhắn:', err)
            toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void handleSend()
        }
    }

    const insertQuickReply = (text: string) => {
        setInputText(text)
    }

    return (
        <div className="flex h-[calc(100svh-4rem)] w-full overflow-hidden bg-background">
            {/* ======================================================== */}
            {/* CỘT 1: DANH SÁCH KHÁCH HÀNG / HỘI THOẠI (320px - 360px)   */}
            {/* ======================================================== */}
            <div className="w-80 lg:w-88 h-full flex flex-col border-r border-border/80 bg-card/60 backdrop-blur-xl shrink-0 overflow-hidden">
                {/* Header Kênh Chăm sóc khách hàng */}
                <div className="p-4 border-b border-border/60 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs">
                                <MessageCircleIcon className="size-4" />
                            </div>
                            <div>
                                <h1 className="font-bold text-base tracking-tight text-foreground">
                                    Tin nhắn tư vấn
                                </h1>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Trực tuyến • Phản hồi ~5 phút
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void refetchConversations()}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Làm mới danh sách"
                    >
                        <RefreshCwIcon className="size-3.5" />
                    </Button>
                </div>

                {/* Tìm kiếm */}
                <div className="p-3 border-b border-border/40 bg-muted/20">
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Tìm khách hàng hoặc tin nhắn..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs rounded-xl bg-background/80 border-border/60"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 mt-2.5">
                        <button
                            type="button"
                            onClick={() => setFilterTab('all')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                filterTab === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Tất cả ({conversations.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('unread')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                filterTab === 'unread'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Chưa đọc {totalUnreadCount > 0 && `(${totalUnreadCount})`}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('order')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                filterTab === 'order'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Có đơn hàng
                        </button>
                    </div>
                </div>

                {/* Danh sách các cuộc trò chuyện */}
                <ScrollArea className="flex-1 divide-y divide-border/20">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <Loader2Icon className="size-5 animate-spin text-primary" />
                            Đang tải hội thoại...
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <MessageSquareIcon className="size-6" />
                            </div>
                            <p className="font-semibold text-foreground">Không có hội thoại nào</p>
                            <p className="text-[11px] text-muted-foreground max-w-[200px]">
                                {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Khi khách hàng nhắn tin cho shop, danh sách sẽ hiện ở đây.'}
                            </p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredConversations.map((conv) => {
                                const isSelected = conv.id === selectedConvId
                                const isUnread = conv.unreadCount > 0
                                const isSelfLast = conv.lastSenderId === userId

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedConvId(conv.id)}
                                        className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                                            isSelected
                                                ? 'bg-primary/10 border-primary/30 shadow-xs ring-1 ring-primary/20'
                                                : isUnread
                                                ? 'bg-card border-border/70 hover:bg-accent/40 font-semibold'
                                                : 'bg-transparent border-transparent hover:bg-accent/40 hover:border-border/30'
                                        }`}
                                    >
                                        {/* Avatar & Online Dot */}
                                        <div className="relative shrink-0 mt-0.5">
                                            <Avatar className="size-11 border border-border/60 shadow-xs">
                                                <AvatarImage src={conv.peer.avatar ?? undefined} alt={conv.peer.name} />
                                                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold">
                                                    {conv.peer.name.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <span className={`text-sm truncate ${isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                                                    {conv.peer.name}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground font-normal shrink-0">
                                                    {formatRelativeTime(conv.lastMessageAt)}
                                                </span>
                                            </div>

                                            {/* Order tag if attached */}
                                            {conv.orderId && (
                                                <div className="mb-1">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                        <PackageIcon className="size-2.5" />
                                                        Đơn #{conv.orderId.slice(-8).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-xs truncate ${isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                                                    {isSelfLast && <span className="text-muted-foreground font-normal">Bạn: </span>}
                                                    {conv.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                                                </p>
                                                {isUnread && (
                                                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] text-white font-bold shrink-0">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* ======================================================== */}
            {/* CỘT 2: KHUNG CHAT TOÀN MÀN HÌNH CHÍNH (flex-1)             */}
            {/* ======================================================== */}
            <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden bg-background/50">
                {activeConversation ? (
                    <>
                        {/* Header Hội thoại đang mở */}
                        <div className="h-16 px-6 border-b border-border/80 bg-card/80 backdrop-blur-md flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="relative shrink-0">
                                    <Avatar className="size-10 border border-border/60 shadow-xs">
                                        <AvatarImage src={activeConversation.peer.avatar ?? undefined} alt={activeConversation.peer.name} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                            {activeConversation.peer.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-sm sm:text-base text-foreground truncate">
                                            {activeConversation.peer.name}
                                        </h2>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                            <UserCheckIcon className="size-2.5" />
                                            Khách hàng
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>Đang trực tuyến</span>
                                        {activeConversation.orderId && (
                                            <>
                                                <span>•</span>
                                                <Link
                                                    href={ROUTE.ORDER_DETAIL(activeConversation.orderId)}
                                                    className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                                                >
                                                    Đơn hàng #{activeConversation.orderId.slice(-8).toUpperCase()}
                                                    <ExternalLinkIcon className="size-2.5" />
                                                </Link>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Actions Right Header */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void refetchMessages()}
                                    className="h-8 text-xs gap-1.5 rounded-xl border-border/60"
                                >
                                    <RefreshCwIcon className="size-3" />
                                    <span>Làm mới</span>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowCustomerCrm(!showCustomerCrm)}
                                    className={`size-8 rounded-xl transition-colors ${showCustomerCrm ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                                    title={showCustomerCrm ? 'Ẩn thông tin khách hàng' : 'Xem thông tin khách hàng'}
                                >
                                    {showCustomerCrm ? <PanelRightCloseIcon className="size-4" /> : <PanelRightOpenIcon className="size-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* Vùng tin nhắn (Messages Canvas) */}
                        <ScrollArea className="flex-1 min-h-0 p-6 bg-gradient-to-b from-muted/5 via-muted/10 to-background">
                            {isLoadingMessages ? (
                                <div className="flex items-center justify-center py-20 text-xs text-muted-foreground gap-2">
                                    <Loader2Icon className="size-5 animate-spin text-primary" />
                                    Đang tải tin nhắn...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                                    <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                                        <MessageSquareIcon className="size-8" />
                                    </div>
                                    <h3 className="font-bold text-base text-foreground">
                                        Bắt đầu tư vấn khách hàng
                                    </h3>
                                    <p className="text-xs text-muted-foreground max-w-sm">
                                        Gửi tin nhắn, hỏi thăm nhu cầu, tư vấn sản phẩm hoặc gửi hình ảnh/video để chốt đơn nhanh chóng.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-w-4xl mx-auto pb-2">
                                    {messages.map((msg) => {
                                        const isMe = msg.senderId === userId

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex items-end gap-2.5 group ${isMe ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {!isMe && (
                                                    <Avatar className="size-8 mb-1 border border-border/60 shrink-0">
                                                        <AvatarImage src={msg.senderAvatar ?? undefined} />
                                                        <AvatarFallback className="text-[10px] bg-muted font-bold">
                                                            {msg.senderName?.slice(0, 2).toUpperCase() || 'KH'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}

                                                <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {/* Sender name label */}
                                                    <span className="text-[11px] text-muted-foreground/80 mb-1 px-1 font-medium">
                                                        {isMe ? 'Bạn (Shop)' : msg.senderName}
                                                    </span>

                                                    {/* Attached Product Card */}
                                                    {msg.attachedProduct && (
                                                        <Link
                                                            href={ROUTE.PRODUCT_DETAIL(msg.attachedProduct.slug)}
                                                            className="mb-1.5 p-3 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all flex items-center gap-3 shadow-xs w-full max-w-sm"
                                                        >
                                                            {msg.attachedProduct.thumbnailUrl && (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={msg.attachedProduct.thumbnailUrl}
                                                                    alt={msg.attachedProduct.name}
                                                                    className="size-12 rounded-xl object-cover shrink-0"
                                                                />
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-foreground truncate">
                                                                    {msg.attachedProduct.name}
                                                                </p>
                                                                <p className="text-xs font-extrabold text-primary">
                                                                    {formatCurrencyVND(msg.attachedProduct.price)}
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    )}

                                                    {/* Attached Order Card */}
                                                    {msg.attachedOrder && (
                                                        <Link
                                                            href={ROUTE.ORDER_DETAIL(msg.attachedOrder.id)}
                                                            className="mb-1.5 p-3 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all flex items-center gap-3 shadow-xs w-full max-w-sm"
                                                        >
                                                            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                                <PackageIcon className="size-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-foreground">
                                                                    Đơn hàng #{msg.attachedOrder.orderNumber}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {formatCurrencyVND(msg.attachedOrder.totalAmount)} • Trạng thái: {msg.attachedOrder.status}
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    )}

                                                    {/* Text Content */}
                                                    {msg.content && (
                                                        <div
                                                            className={`px-4 py-2.5 text-sm leading-relaxed break-words rounded-2xl shadow-xs ${
                                                                isMe
                                                                    ? 'bg-gradient-to-r from-primary to-primary/95 text-primary-foreground rounded-tr-xs'
                                                                    : 'bg-card text-foreground border border-border/80 rounded-tl-xs shadow-xs'
                                                            }`}
                                                        >
                                                            {msg.content}
                                                        </div>
                                                    )}

                                                    {/* Images Gallery */}
                                                    {msg.imageUrls?.length > 0 && (
                                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                                            {msg.imageUrls.map((url, i) => (
                                                                <a
                                                                    key={i}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="relative rounded-2xl overflow-hidden border border-border/60 shadow-sm block group/img"
                                                                >
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={url}
                                                                        alt="Đính kèm"
                                                                        className="max-h-56 max-w-[280px] object-cover transition-transform group-hover/img:scale-105"
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Videos Player */}
                                                    {msg.videoUrls?.length > 0 && (
                                                        <div className="mt-1.5 space-y-2 w-full max-w-md">
                                                            {msg.videoUrls.map((url, i) => (
                                                                <div key={i} className="rounded-2xl overflow-hidden border border-border/60 bg-black/80 shadow-md">
                                                                    <video
                                                                        src={url}
                                                                        controls
                                                                        preload="metadata"
                                                                        className="max-h-60 rounded-2xl w-full"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Timestamp */}
                                                    <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {formatRelativeTime(msg.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </ScrollArea>

                        {/* Canned Replies Shortcuts */}
                        <div className="px-6 py-2 border-t border-border/40 bg-muted/20 flex items-center gap-2 overflow-x-auto">
                            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                                <SparklesIcon className="size-3 text-amber-500" />
                                Mẫu trả lời:
                            </span>
                            {QUICK_REPLIES.map((reply, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => insertQuickReply(reply)}
                                    className="px-2.5 py-1 text-xs rounded-lg bg-card border border-border/70 text-foreground/80 hover:text-primary hover:border-primary/50 transition-all shrink-0 truncate max-w-[260px] shadow-2xs"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>

                        {/* Staged media previews */}
                        {mediaPreviews.length > 0 && (
                            <div className="px-6 py-2.5 border-t border-border/50 bg-muted/40 flex items-center gap-3 overflow-x-auto">
                                {mediaPreviews.map((preview, i) => (
                                    <div key={i} className="relative size-16 rounded-xl border border-border/80 overflow-hidden shrink-0 group">
                                        {preview.type === 'video' ? (
                                            <video src={preview.url} className="size-full object-cover" />
                                        ) : (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={preview.url} alt="Staged" className="size-full object-cover" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 hover:opacity-100"
                                        >
                                            <XIcon className="size-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Composer Input Bar */}
                        <div className="p-4 border-t border-border/80 bg-card/70 backdrop-blur-md flex items-end gap-2.5 shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                            />

                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="size-9 rounded-xl border-border/70 text-muted-foreground hover:text-primary hover:border-primary/50"
                                    title="Đính kèm ảnh hoặc video"
                                >
                                    <ImageIcon className="size-4" />
                                </Button>
                            </div>

                            <Textarea
                                placeholder="Nhập tin nhắn tư vấn khách hàng (Nhấn Enter để gửi, Shift+Enter xuống dòng)..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isSending || isUploading}
                                className="min-h-11 max-h-32 text-sm rounded-xl resize-none py-2.5 px-3.5 bg-background border-border/70 focus-visible:ring-1"
                            />

                            <Button
                                type="button"
                                onClick={() => void handleSend()}
                                disabled={(inputText.trim().length === 0 && selectedFiles.length === 0) || isSending || isUploading}
                                className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 transition-all active:scale-95 shrink-0 gap-1.5"
                            >
                                {isSending || isUploading ? (
                                    <>
                                        <Loader2Icon className="size-4 animate-spin" />
                                        <span>Đang gửi...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Gửi</span>
                                        <SendIcon className="size-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                        <div className="size-20 rounded-3xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                            <MessageCircleIcon className="size-10" />
                        </div>
                        <h2 className="font-bold text-lg text-foreground">
                            Chọn một khách hàng để bắt đầu tư vấn
                        </h2>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            Xem lịch sử trò chuyện, hỗ trợ đơn hàng và gửi hình ảnh/video trực tiếp tới khách hàng.
                        </p>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* CỘT 3: THÔNG TIN KHÁCH HÀNG CRM & INSIGHTS (300px - 340px) */}
            {/* ======================================================== */}
            {showCustomerCrm && activeConversation && (
                <div className="w-80 lg:w-84 border-l border-border/80 bg-card/60 backdrop-blur-xl h-full flex flex-col shrink-0 overflow-hidden">
                    <div className="p-4 border-b border-border/60 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <InfoIcon className="size-4 text-primary" />
                            Thông tin khách hàng
                        </h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowCustomerCrm(false)}
                            className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                            <XIcon className="size-3.5" />
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 p-4 space-y-5">
                        {/* Hồ sơ cá nhân */}
                        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-muted/30 border border-border/60">
                            <Avatar className="size-16 border-2 border-primary/20 shadow-sm mb-2.5">
                                <AvatarImage src={activeConversation.peer.avatar ?? undefined} alt={activeConversation.peer.name} />
                                <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                                    {activeConversation.peer.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <h4 className="font-bold text-sm text-foreground">
                                {activeConversation.peer.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Khách hàng đã xác thực
                            </p>

                            <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-3 border-t border-border/50 text-left">
                                <div className="p-2 rounded-xl bg-background/80 border border-border/40">
                                    <p className="text-[10px] text-muted-foreground">Tổng đơn hàng</p>
                                    <p className="text-xs font-bold text-foreground">3 đơn</p>
                                </div>
                                <div className="p-2 rounded-xl bg-background/80 border border-border/40">
                                    <p className="text-[10px] text-muted-foreground">Đã chi tiêu</p>
                                    <p className="text-xs font-bold text-primary">1.250.000₫</p>
                                </div>
                            </div>
                        </div>

                        {/* Đơn hàng liên quan */}
                        <div className="space-y-2 mt-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                    <PackageIcon className="size-3.5 text-blue-500" />
                                    Đơn hàng liên quan
                                </h4>
                            </div>

                            {activeConversation.orderId ? (
                                <Link
                                    href={ROUTE.ORDER_DETAIL(activeConversation.orderId)}
                                    className="p-3 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-all block group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                            #{activeConversation.orderId.slice(-8).toUpperCase()}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                            Đã xác nhận
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center justify-between">
                                        <span>Tổng tiền:</span>
                                        <span className="font-bold text-foreground">450.000₫</span>
                                    </p>
                                </Link>
                            ) : (
                                <div className="p-3 text-center rounded-xl bg-muted/20 border border-border/40 text-[11px] text-muted-foreground">
                                    Chưa có đơn hàng nào gắn vào cuộc trò chuyện này.
                                </div>
                            )}
                        </div>

                        {/* Tặng mã giảm giá nhanh */}
                        <div className="space-y-2 mt-4">
                            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                <TagIcon className="size-3.5 text-amber-500" />
                                Tặng voucher nhanh
                            </h4>

                            <div className="p-3 rounded-xl border border-border/60 bg-card space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary">GIAM20K</span>
                                    <span className="text-[10px] text-muted-foreground">Đơn từ 200k</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setInputText((prev) => `${prev} Shop tặng bạn mã giảm giá GIAM20K giảm 20.000₫ nha!`)
                                        toast.success('Đã chèn mã voucher vào ô chat!')
                                    }}
                                    className="w-full h-7 text-xs rounded-lg border-border/60 hover:bg-primary hover:text-primary-foreground"
                                >
                                    Gửi mã vào chat
                                </Button>
                            </div>
                        </div>

                        {/* Ghi chú nội bộ về khách hàng */}
                        <div className="space-y-2 mt-4">
                            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                <SparklesIcon className="size-3.5 text-violet-500" />
                                Ghi chú nội bộ
                            </h4>
                            <Textarea
                                placeholder="Ghi chú về sở thích, lưu ý của khách (chỉ shop nhìn thấy)..."
                                value={customerNotes[activeConversation.id] ?? ''}
                                onChange={(e) =>
                                    setCustomerNotes((prev) => ({
                                        ...prev,
                                        [activeConversation.id]: e.target.value,
                                    }))
                                }
                                className="min-h-20 text-xs rounded-xl bg-background border-border/60"
                            />
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    )
}
