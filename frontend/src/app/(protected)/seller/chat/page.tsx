'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import {
    CheckCheckIcon,
    ExternalLinkIcon,
    ImageIcon,
    InfoIcon,
    Loader2Icon,
    MessageCircleIcon,
    MessageSquareIcon,
    PackageIcon,
    PanelRightCloseIcon,
    PanelRightOpenIcon,
    RefreshCwIcon,
    SearchIcon,
    SendIcon,
    SparklesIcon,
    TagIcon,
    UserCheckIcon,
    XIcon,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    Input,
    ScrollArea,
    Textarea,
    TypingIndicator,
} from '@/components'
import { ROUTE } from '@/constants'
import { useChat, useConversationMessages, useTypingIndicator, useUploadMedia } from '@/hooks'
import { useChatStore } from '@/stores'
import { formatCurrencyVND, formatMessengerTimestamp, formatRelativeTime, shouldShowMessageDivider } from '@/utils'

export default function SellerChatPage() {
    const t = useTranslations('chat')
    const locale = useLocale() as 'vi' | 'en'

    // Các mẫu câu trả lời nhanh (Canned Replies) đa ngôn ngữ cho Seller
    const quickReplies = useMemo(
        () => [t('quickReply1'), t('quickReply2'), t('quickReply3'), t('quickReply4'), t('quickReply5')],
        [t],
    )

    const params = useParams()
    const router = useRouter()
    const routeId = (params?.id as string) || null

    const {
        userId,
        conversations,
        totalUnreadCount,
        isLoading,
        markConversationRead,
        sendMessage,
        isSending,
        refetchConversations,
        isUserOnline,
        getUserLastSeen,
    } = useChat()

    // Tìm cuộc hội thoại theo conv.id hoặc peer.id trong URL param
    const matchedRouteConv = useMemo(() => {
        if (!routeId) return null
        return conversations.find((c) => c.id === routeId || c.peer.id === routeId) ?? null
    }, [conversations, routeId])

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

    // Chọn hội thoại: ưu tiên route param -> cuộc hội thoại đầu tiên
    const effectiveSelectedConvId =
        matchedRouteConv?.id ??
        (routeId && !conversations.some((c) => c.id === routeId) ? routeId : null) ??
        conversations[0]?.id ??
        null

    // Lấy thông tin cuộc hội thoại đang chọn
    const activeConversation = useMemo(() => {
        return (
            conversations.find((c) => c.id === effectiveSelectedConvId || c.peer.id === effectiveSelectedConvId) ?? null
        )
    }, [conversations, effectiveSelectedConvId])

    const isActivePeerOnline = activeConversation
        ? isUserOnline(activeConversation.peer.id) || Boolean(activeConversation.peer.isOnline)
        : false
    const activePeerLastSeen = activeConversation ? getUserLastSeen(activeConversation.peer.id) : undefined

    // Điều hướng route /seller/chat/[id] khi chọn cuộc trò chuyện
    const handleSelectConversation = (convId: string) => {
        router.replace(ROUTE.SELLER_CHAT_CONVERSATION(convId), { scroll: false })
        const target = conversations.find((c) => c.id === convId)
        if (target && target.unreadCount > 0) {
            markConversationRead(convId)
        }
    }

    // Tự động đồng bộ URL nếu truy cập /seller/chat chưa có id
    useEffect(() => {
        if (!routeId && conversations.length > 0 && effectiveSelectedConvId) {
            router.replace(ROUTE.SELLER_CHAT_CONVERSATION(effectiveSelectedConvId), { scroll: false })
        }
    }, [routeId, conversations.length, effectiveSelectedConvId, router])

    // Lấy tin nhắn của cuộc hội thoại đang chọn
    const {
        messages,
        isLoading: isLoadingMessages,
        refetch: refetchMessages,
    } = useConversationMessages(effectiveSelectedConvId)
    const { isPeerTyping, startTyping, stopTyping } = useTypingIndicator(effectiveSelectedConvId)

    // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc khách hàng đang soạn tin
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, mediaPreviews, isPeerTyping])

    // Đánh dấu đã đọc và gán activeConversationId khi chọn hội thoại
    useEffect(() => {
        const { setActiveConversationId } = useChatStore.getState()
        setActiveConversationId(effectiveSelectedConvId)

        return () => {
            setActiveConversationId(null)
        }
    }, [effectiveSelectedConvId])

    const hasMarkedReadRef = useRef<string | null>(null)

    useEffect(() => {
        const convId = activeConversation?.id
        const unread = activeConversation?.unreadCount ?? 0
        if (convId && unread > 0 && hasMarkedReadRef.current !== convId) {
            hasMarkedReadRef.current = convId
            markConversationRead(convId)
        }
    }, [activeConversation?.id, activeConversation?.unreadCount, markConversationRead])

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
        stopTyping()
        if (!effectiveSelectedConvId) return
        const text = inputText.trim()
        if (!text && selectedFiles.length === 0) return

        const uploadedImageUrls: string[] = []
        const uploadedVideoUrls: string[] = []

        if (selectedFiles.length > 0) {
            try {
                const assets = await uploadMedia({
                    files: selectedFiles,
                    ownerType: 'GENERAL',
                    ownerId: effectiveSelectedConvId,
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
                console.error('Error uploading media:', err)
                toast.error(t('uploadMediaFailed'))
            }
        }

        try {
            await sendMessage({
                conversationId: effectiveSelectedConvId,
                content: text || undefined,
                imageUrls: uploadedImageUrls.filter(Boolean),
                videoUrls: uploadedVideoUrls.filter(Boolean),
            })
            setInputText('')
            setSelectedFiles([])
            setMediaPreviews([])
        } catch (err) {
            console.error('Error sending message:', err)
            toast.error(t('sendMessageFailed'))
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
        startTyping()
    }

    return (
        <div className="flex h-[calc(100svh-4rem)] w-full overflow-hidden bg-background">
            {/* ======================================================== */}
            {/* CỘT 1: DANH SÁCH KHÁCH HÀNG / HỘI THOẠI (320px - 360px)   */}
            {/* ======================================================== */}
            <div className="w-80 lg:w-88 h-full flex flex-col border-r border-border/80 bg-card/60 backdrop-blur-xl shrink-0 overflow-hidden">
                {/* Header Kênh Chăm sóc khách hàng - Đồng bộ h-16 với 2 cột bên */}
                <div className="h-16 px-4 border-b border-border/80 bg-card/80 backdrop-blur-md flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs shrink-0">
                            <MessageCircleIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-bold text-sm sm:text-base tracking-tight text-foreground truncate">
                                {t('advisorMessages')}
                            </h1>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                                <span className="size-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                                <span className="truncate">{t('advisorSubtitle')}</span>
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void refetchConversations()}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                        title={t('refreshList')}
                    >
                        <RefreshCwIcon className="size-3.5" />
                    </Button>
                </div>

                {/* Tìm kiếm */}
                <div className="p-3 border-b border-border/40 bg-muted/20">
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs rounded-xl bg-background/80 border-border/60"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 mt-2.5">
                        <Button
                            type="button"
                            variant={filterTab === 'all' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFilterTab('all')}
                            className={`h-7 px-2.5 text-xs rounded-lg font-medium transition-all ${
                                filterTab === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {t('tabAll')} ({conversations.length})
                        </Button>
                        <Button
                            type="button"
                            variant={filterTab === 'unread' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFilterTab('unread')}
                            className={`h-7 px-2.5 text-xs rounded-lg font-medium transition-all ${
                                filterTab === 'unread'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {t('tabUnread')} {totalUnreadCount > 0 && `(${totalUnreadCount})`}
                        </Button>
                        <Button
                            type="button"
                            variant={filterTab === 'order' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFilterTab('order')}
                            className={`h-7 px-2.5 text-xs rounded-lg font-medium transition-all ${
                                filterTab === 'order'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {t('tabHasOrder')}
                        </Button>
                    </div>
                </div>

                {/* Danh sách các cuộc trò chuyện - Bo tròn đẹp, border 4 phía rõ nét, text truncate chuẩn */}
                <ScrollArea className="flex-1">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <Loader2Icon className="size-5 animate-spin text-primary" />
                            {t('loadingConversations')}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <MessageSquareIcon className="size-6" />
                            </div>
                            <p className="font-semibold text-foreground">{t('noConversations')}</p>
                            <p className="text-[11px] text-muted-foreground max-w-[200px]">
                                {searchQuery ? t('noConversationsSearch') : t('noConversationsDesc')}
                            </p>
                        </div>
                    ) : (
                        <div className="p-2.5 space-y-1.5">
                            {filteredConversations.map((conv) => {
                                const isSelected = conv.id === effectiveSelectedConvId
                                const isUnread = conv.unreadCount > 0
                                const isSelfLast = conv.lastSenderId === userId

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => handleSelectConversation(conv.id)}
                                        className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                                            isSelected
                                                ? 'bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/30'
                                                : isUnread
                                                  ? 'bg-card border-border/70 hover:bg-accent/40 font-semibold'
                                                  : 'bg-transparent border-transparent hover:bg-accent/40 hover:border-border/40'
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
                                            <span
                                                className={`absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-background transition-colors ${
                                                    isUserOnline(conv.peer.id) || Boolean(conv.peer.isOnline)
                                                        ? 'bg-emerald-500'
                                                        : 'bg-muted-foreground/30'
                                                }`}
                                                title={
                                                    isUserOnline(conv.peer.id) || Boolean(conv.peer.isOnline)
                                                        ? t('online')
                                                        : t('offline')
                                                }
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1.5 mb-1 min-w-0">
                                                <span
                                                    className={`text-sm truncate min-w-0 ${isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}
                                                >
                                                    {conv.peer.name}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground font-normal shrink-0">
                                                    {formatRelativeTime(conv.lastMessageAt, locale)}
                                                </span>
                                            </div>

                                            {/* Order tag if attached */}
                                            {conv.orderId && (
                                                <div className="mb-1 min-w-0 truncate">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 truncate max-w-full">
                                                        <PackageIcon className="size-2.5 shrink-0" />
                                                        <span className="truncate">
                                                            {t('orderNumber', {
                                                                number: conv.orderId.slice(-8).toUpperCase(),
                                                            })}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between gap-2 min-w-0">
                                                <p
                                                    className={`text-xs truncate min-w-0 flex-1 ${isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                                                >
                                                    {isSelfLast && (
                                                        <span className="text-muted-foreground font-normal">
                                                            {t('you')}:{' '}
                                                        </span>
                                                    )}
                                                    {conv.lastMessage || t('startAdvising')}
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
                        {/* Header Hội thoại đang mở - h-16 đồng bộ với 2 cột bên */}
                        <div className="h-16 px-4 sm:px-6 border-b border-border/80 bg-card/80 backdrop-blur-md flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="relative shrink-0">
                                    <Avatar className="size-10 border border-border/60 shadow-xs">
                                        <AvatarImage
                                            src={activeConversation.peer.avatar ?? undefined}
                                            alt={activeConversation.peer.name}
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                            {activeConversation.peer.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span
                                        className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background transition-colors ${
                                            isActivePeerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                        }`}
                                        title={isActivePeerOnline ? t('online') : t('offline')}
                                    />
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h2 className="font-bold text-sm sm:text-base text-foreground truncate max-w-[180px] sm:max-w-[280px] md:max-w-[340px]">
                                            {activeConversation.peer.name}
                                        </h2>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                                            <UserCheckIcon className="size-2.5" />
                                            {t('customer')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                                        <span className="flex items-center gap-1.5 shrink-0">
                                            <span
                                                className={`size-1.5 rounded-full inline-block shrink-0 ${
                                                    isActivePeerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                                }`}
                                            />
                                            <span>
                                                {isActivePeerOnline
                                                    ? t('online')
                                                    : activePeerLastSeen
                                                      ? t('activeAgo', {
                                                            time: formatRelativeTime(activePeerLastSeen, locale),
                                                        })
                                                      : t('offline')}
                                            </span>
                                        </span>
                                        {activeConversation.orderId && (
                                            <>
                                                <span className="shrink-0">•</span>
                                                <Link
                                                    href={ROUTE.ORDER_DETAIL(activeConversation.orderId)}
                                                    className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 truncate"
                                                >
                                                    <span className="truncate">
                                                        {t('orderNumber', {
                                                            number: activeConversation.orderId.slice(-8).toUpperCase(),
                                                        })}
                                                    </span>
                                                    <ExternalLinkIcon className="size-2.5 shrink-0" />
                                                </Link>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Actions Right Header */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void refetchMessages()}
                                    className="h-8 text-xs gap-1.5 rounded-xl border-border/60 shrink-0"
                                >
                                    <RefreshCwIcon className="size-3" />
                                    <span>{t('refresh')}</span>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowCustomerCrm(!showCustomerCrm)}
                                    className={`size-8 rounded-xl transition-colors shrink-0 ${showCustomerCrm ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                                    title={showCustomerCrm ? t('hideCustomerInfo') : t('showCustomerInfo')}
                                >
                                    {showCustomerCrm ? (
                                        <PanelRightCloseIcon className="size-4" />
                                    ) : (
                                        <PanelRightOpenIcon className="size-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Vùng tin nhắn (Messages Canvas) - Kiểu Facebook Messenger chuẩn */}
                        <ScrollArea className="flex-1 min-h-0 p-4 sm:p-6 bg-gradient-to-b from-muted/5 via-muted/10 to-background">
                            {isLoadingMessages ? (
                                <div className="flex items-center justify-center py-20 text-xs text-muted-foreground gap-2">
                                    <Loader2Icon className="size-5 animate-spin text-primary" />
                                    {t('loadingMessages')}
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                                    <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                                        <MessageSquareIcon className="size-8" />
                                    </div>
                                    <h3 className="font-bold text-base text-foreground">{t('startAdvising')}</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm">{t('startAdvisingDesc')}</p>
                                </div>
                            ) : (
                                <div className="space-y-1 max-w-4xl mx-auto pb-2">
                                    {messages.map((msg, index) => {
                                        const isMe = msg.senderId === userId
                                        const prevMsg = index > 0 ? messages[index - 1] : null
                                        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null
                                        const showDivider = shouldShowMessageDivider(msg.createdAt, prevMsg?.createdAt)
                                        const isLastInSenderGroup =
                                            !nextMsg ||
                                            nextMsg.senderId !== msg.senderId ||
                                            shouldShowMessageDivider(nextMsg.createdAt, msg.createdAt)

                                        return (
                                            <div key={msg.id} className="space-y-1">
                                                {/* Mốc thời gian phân cách kiểu Facebook Messenger */}
                                                {showDivider && (
                                                    <div className="flex justify-center my-3">
                                                        <span className="text-[11px] font-medium text-muted-foreground/75 px-3 py-0.5 rounded-full bg-muted/60 select-none shadow-xs">
                                                            {formatMessengerTimestamp(msg.createdAt, locale)}
                                                        </span>
                                                    </div>
                                                )}

                                                <div
                                                    className={`flex items-end gap-2 group/msg ${
                                                        isMe ? 'justify-end' : 'justify-start'
                                                    }`}
                                                >
                                                    {/* Avatar bên trái chỉ hiện ở tin nhắn cuối của nhóm */}
                                                    {!isMe && (
                                                        <div className="size-8 mb-0.5 shrink-0">
                                                            {isLastInSenderGroup ? (
                                                                <Avatar className="size-8 border border-border/60 shadow-xs">
                                                                    <AvatarImage src={msg.senderAvatar ?? undefined} />
                                                                    <AvatarFallback className="text-[10px] bg-muted font-bold">
                                                                        {msg.senderName?.slice(0, 2).toUpperCase() ||
                                                                            'KH'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            ) : null}
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`flex flex-col max-w-[70%] ${
                                                            isMe ? 'items-end' : 'items-start'
                                                        }`}
                                                    >
                                                        {/* Attached Product Card */}
                                                        {msg.attachedProduct && (
                                                            <Link
                                                                href={ROUTE.PRODUCT_DETAIL(msg.attachedProduct.slug)}
                                                                className="mb-1.5 p-3 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all flex items-center gap-3 shadow-xs w-full max-w-sm"
                                                            >
                                                                {msg.attachedProduct.thumbnailUrl && (
                                                                    <div className="relative size-12 rounded-xl overflow-hidden shrink-0">
                                                                        <Image
                                                                            src={msg.attachedProduct.thumbnailUrl}
                                                                            alt={msg.attachedProduct.name}
                                                                            fill
                                                                            sizes="48px"
                                                                            className="object-cover"
                                                                        />
                                                                    </div>
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
                                                                        {t('orderNumber', {
                                                                            number: msg.attachedOrder.orderNumber,
                                                                        })}
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {formatCurrencyVND(
                                                                            msg.attachedOrder.totalAmount,
                                                                        )}{' '}
                                                                        • {msg.attachedOrder.status}
                                                                    </p>
                                                                </div>
                                                            </Link>
                                                        )}

                                                        {/* Text Content Bubble - Giống Messenger: Hover hiện giờ bên cạnh */}
                                                        {msg.content && (
                                                            <div
                                                                className={`flex items-center gap-2 group/bubble ${
                                                                    isMe ? 'justify-end' : 'justify-start'
                                                                }`}
                                                            >
                                                                {isMe && (
                                                                    <span className="text-[10px] text-muted-foreground/60 opacity-0 group-hover/bubble:opacity-100 transition-opacity select-none order-first">
                                                                        {format(new Date(msg.createdAt), 'HH:mm')}
                                                                    </span>
                                                                )}
                                                                <div
                                                                    className={`px-4 py-2.5 text-sm leading-relaxed break-words rounded-2xl shadow-xs ${
                                                                        isMe
                                                                            ? 'bg-gradient-to-r from-primary to-primary/95 text-primary-foreground rounded-br-xs'
                                                                            : 'bg-card text-foreground border border-border/80 rounded-bl-xs shadow-xs'
                                                                    }`}
                                                                    title={format(
                                                                        new Date(msg.createdAt),
                                                                        'HH:mm, dd/MM/yyyy',
                                                                    )}
                                                                >
                                                                    {msg.content}
                                                                </div>
                                                                {!isMe && (
                                                                    <span className="text-[10px] text-muted-foreground/60 opacity-0 group-hover/bubble:opacity-100 transition-opacity select-none">
                                                                        {format(new Date(msg.createdAt), 'HH:mm')}
                                                                    </span>
                                                                )}
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
                                                                        className="relative rounded-2xl overflow-hidden border border-border/60 shadow-sm block group/img h-56 w-72"
                                                                    >
                                                                        <Image
                                                                            src={url}
                                                                            alt={t('attachMedia')}
                                                                            fill
                                                                            sizes="(max-width: 640px) 240px, 288px"
                                                                            className="object-cover transition-transform group-hover/img:scale-105"
                                                                        />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Videos Player */}
                                                        {msg.videoUrls?.length > 0 && (
                                                            <div className="mt-1.5 space-y-2 w-full max-w-md">
                                                                {msg.videoUrls.map((url, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="rounded-2xl overflow-hidden border border-border/60 bg-black/80 shadow-md"
                                                                    >
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

                                                        {/* Trạng thái gửi / đã xem cho tin nhắn cuối cùng của Me */}
                                                        {isMe && index === messages.length - 1 && (
                                                            <div className="flex items-center gap-1 justify-end mt-1 pr-1 select-none">
                                                                {msg.isRead ? (
                                                                    <span className="text-[10px] text-muted-foreground/75 flex items-center gap-1">
                                                                        <span>{t('seen')}</span>
                                                                        {activeConversation?.peer.avatar ? (
                                                                            <Avatar className="size-3.5 border border-background">
                                                                                <AvatarImage
                                                                                    src={activeConversation.peer.avatar}
                                                                                    alt={activeConversation.peer.name}
                                                                                />
                                                                                <AvatarFallback className="text-[7px]">
                                                                                    {activeConversation.peer.name.slice(
                                                                                        0,
                                                                                        1,
                                                                                    )}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        ) : (
                                                                            <CheckCheckIcon className="size-3 text-primary" />
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground/75 flex items-center gap-1">
                                                                        <CheckCheckIcon className="size-3 text-primary" />
                                                                        <span>{t('delivered')}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {isPeerTyping && activeConversation && (
                                        <div className="pt-2 pb-1">
                                            <TypingIndicator
                                                peerName={activeConversation.peer.name}
                                                peerAvatar={activeConversation.peer.avatar}
                                            />
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </ScrollArea>

                        {/* Thanh mẫu câu trả lời nhanh (Canned Replies) */}
                        <div className="px-4 sm:px-6 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-2 overflow-x-auto shrink-0">
                            <span className="text-[11px] font-medium text-muted-foreground shrink-0 flex items-center gap-1">
                                <SparklesIcon className="size-3 text-primary" />
                                {t('quickReplyTip')}
                            </span>
                            {quickReplies.map((reply, i) => (
                                <Button
                                    key={i}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => insertQuickReply(reply)}
                                    className="h-7 text-xs px-2.5 rounded-lg bg-card border-border/60 hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all shrink-0 whitespace-nowrap shadow-xs"
                                >
                                    {reply}
                                </Button>
                            ))}
                        </div>

                        {/* Staged media previews */}
                        {mediaPreviews.length > 0 && (
                            <div className="px-6 py-2.5 border-t border-border/50 bg-muted/40 flex items-center gap-3 overflow-x-auto">
                                {mediaPreviews.map((preview, i) => (
                                    <div
                                        key={i}
                                        className="relative size-16 rounded-xl border border-border/80 overflow-hidden shrink-0 group"
                                    >
                                        {preview.type === 'video' ? (
                                            <video src={preview.url} className="size-full object-cover" />
                                        ) : (
                                            <Image
                                                src={preview.url}
                                                alt="Staged"
                                                fill
                                                sizes="64px"
                                                className="object-cover"
                                            />
                                        )}
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            onClick={() => removeFile(i)}
                                            className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white hover:bg-black/90 p-0"
                                        >
                                            <XIcon className="size-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Composer Input Bar */}
                        <div className="p-4 border-t border-border/80 bg-card/70 backdrop-blur-md flex items-center gap-2.5 shrink-0">
                            <Input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                            />

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                className="size-11 rounded-xl border-border/70 text-muted-foreground hover:text-primary hover:border-primary/50 shrink-0"
                                title={t('attachMedia')}
                            >
                                <ImageIcon className="size-5" />
                            </Button>

                            <Textarea
                                placeholder={t('inputPlaceholder')}
                                value={inputText}
                                onChange={(e) => {
                                    setInputText(e.target.value)
                                    startTyping()
                                }}
                                onBlur={() => stopTyping()}
                                onKeyDown={handleKeyDown}
                                disabled={isSending || isUploading}
                                rows={1}
                                className="min-h-11 max-h-32 text-sm rounded-xl resize-none py-3 px-3.5 bg-background border-border/70 focus-visible:ring-1 flex-1 leading-normal"
                            />

                            <Button
                                type="button"
                                onClick={() => void handleSend()}
                                disabled={
                                    (inputText.trim().length === 0 && selectedFiles.length === 0) ||
                                    isSending ||
                                    isUploading
                                }
                                className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
                            >
                                {isSending || isUploading ? (
                                    <>
                                        <Loader2Icon className="size-4 animate-spin" />
                                        <span>{t('sending')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{t('send')}</span>
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
                        <h2 className="font-bold text-lg text-foreground">{t('selectCustomerPrompt')}</h2>
                        <p className="text-xs text-muted-foreground max-w-sm">{t('selectCustomerDesc')}</p>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* CỘT 3: THÔNG TIN KHÁCH HÀNG CRM & INSIGHTS (300px - 340px) */}
            {/* ======================================================== */}
            {showCustomerCrm && activeConversation && (
                <div className="w-80 lg:w-84 border-l border-border/80 bg-card/60 backdrop-blur-xl h-full flex flex-col shrink-0 overflow-hidden">
                    {/* Header Cột 3 - h-16 đồng bộ với 2 cột bên */}
                    <div className="h-16 px-4 border-b border-border/80 bg-card/80 backdrop-blur-md flex items-center justify-between shrink-0">
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-2 min-w-0 truncate">
                            <InfoIcon className="size-4 text-primary shrink-0" />
                            <span className="truncate">{t('customerInfo')}</span>
                        </h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowCustomerCrm(false)}
                            className="size-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                            title={t('close')}
                        >
                            <XIcon className="size-4" />
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 p-4 space-y-5">
                        {/* Hồ sơ cá nhân */}
                        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-muted/30 border border-border/60">
                            <div className="relative mb-2.5">
                                <Avatar className="size-16 border-2 border-primary/20 shadow-sm">
                                    <AvatarImage
                                        src={activeConversation.peer.avatar ?? undefined}
                                        alt={activeConversation.peer.name}
                                    />
                                    <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                                        {activeConversation.peer.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span
                                    className={`absolute bottom-0.5 right-0.5 size-3.5 rounded-full ring-2 ring-background transition-colors ${
                                        isActivePeerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                    }`}
                                    title={isActivePeerOnline ? t('online') : t('offline')}
                                />
                            </div>

                            <h4 className="font-bold text-sm text-foreground truncate max-w-full">
                                {activeConversation.peer.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1.5">
                                <span
                                    className={`size-1.5 rounded-full inline-block shrink-0 ${
                                        isActivePeerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                    }`}
                                />
                                <span>
                                    {isActivePeerOnline
                                        ? t('online')
                                        : activePeerLastSeen
                                          ? t('activeAgo', { time: formatRelativeTime(activePeerLastSeen, locale) })
                                          : t('offline')}
                                </span>
                            </p>

                            <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-3 border-t border-border/50 text-left">
                                <div className="p-2 rounded-xl bg-background/80 border border-border/40">
                                    <p className="text-[10px] text-muted-foreground">{t('totalOrders')}</p>
                                    <p className="text-xs font-bold text-foreground">
                                        {t('ordersCount', { count: 3 })}
                                    </p>
                                </div>
                                <div className="p-2 rounded-xl bg-background/80 border border-border/40">
                                    <p className="text-[10px] text-muted-foreground">{t('totalSpent')}</p>
                                    <p className="text-xs font-bold text-primary">1.250.000₫</p>
                                </div>
                            </div>
                        </div>

                        {/* Đơn hàng liên quan */}
                        <div className="space-y-2 mt-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                    <PackageIcon className="size-3.5 text-blue-500" />
                                    {t('relatedOrders')}
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
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        >
                                            {t('orderConfirmed')}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center justify-between">
                                        <span>{t('totalAmount')}</span>
                                        <span className="font-bold text-foreground">450.000₫</span>
                                    </p>
                                </Link>
                            ) : (
                                <div className="p-3 text-center rounded-xl bg-muted/20 border border-border/40 text-[11px] text-muted-foreground">
                                    {t('noRelatedOrders')}
                                </div>
                            )}
                        </div>

                        {/* Tặng mã giảm giá nhanh */}
                        <div className="space-y-2 mt-4">
                            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                <TagIcon className="size-3.5 text-amber-500" />
                                {t('sendVoucherQuick')}
                            </h4>

                            <div className="p-3 rounded-xl border border-border/60 bg-card space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary">GIAM20K</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {t('voucherMinOrder', { min: '200k' })}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setInputText(
                                            (prev) =>
                                                `${prev} ${t('voucherGiftMessage', { code: 'GIAM20K', discount: '20.000₫' })}`,
                                        )
                                        toast.success(t('voucherInserted'))
                                    }}
                                    className="w-full h-7 text-xs rounded-lg border-border/60 hover:bg-primary hover:text-primary-foreground"
                                >
                                    {t('sendVoucherToChat')}
                                </Button>
                            </div>
                        </div>

                        {/* Ghi chú nội bộ về khách hàng */}
                        <div className="space-y-2 mt-4">
                            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                <SparklesIcon className="size-3.5 text-violet-500" />
                                {t('notes')}
                            </h4>
                            <Textarea
                                placeholder={t('addNotePlaceholder')}
                                value={customerNotes[activeConversation.id] ?? ''}
                                onChange={(e) =>
                                    setCustomerNotes((prev) => ({
                                        ...prev,
                                        [activeConversation.id]: e.target.value,
                                    }))
                                }
                                className="min-h-20 text-xs rounded-xl bg-background border-border/60 resize-none"
                            />
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    )
}
