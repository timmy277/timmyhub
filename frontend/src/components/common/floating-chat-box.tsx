'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { format } from 'date-fns'
import {
    CheckCheckIcon,
    ImageIcon,
    Loader2Icon,
    Maximize2Icon,
    MinusIcon,
    SendIcon,
    StoreIcon,
    XIcon,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { ConversationDto } from '@timmyhub/contracts'

import { Avatar, AvatarFallback, AvatarImage, Button, Input, ScrollArea, TypingIndicator } from '@/components'
import { CHAT_CONFIG, ROUTE } from '@/constants'
import { useChat, useConversationMessages, useIsSeller, useTypingIndicator, useUploadMedia } from '@/hooks'
import { useChatStore } from '@/stores'
import { formatCurrencyVND, formatMessengerTimestamp, formatRelativeTime, shouldShowMessageDivider } from '@/utils'

// Khung chat nổi đơn lẻ (Floating Chat Box)
function SingleFloatingChatBox({
    conversation,
    onClose,
    onMinimize,
}: {
    conversation: ConversationDto
    onClose: () => void
    onMinimize: () => void
}) {
    // 1. State
    const [inputText, setInputText] = useState('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [mediaPreviews, setMediaPreviews] = useState<Array<{ url: string; type: 'image' | 'video' }>>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 2. Hooks
    const t = useTranslations('chat')
    const locale = useLocale() as 'vi' | 'en'
    const { isSeller } = useIsSeller()
    const { userId, sendMessage, isSending, markConversationRead, isUserOnline, getUserLastSeen } = useChat()
    const { messages, isLoading } = useConversationMessages(conversation.id)
    const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia()
    const { isPeerTyping, startTyping, stopTyping } = useTypingIndicator(conversation.id)

    // 3. Derived
    const isPeerOnline = isUserOnline(conversation.peer.id) || Boolean(conversation.peer.isOnline)
    const peerLastSeen = getUserLastSeen(conversation.peer.id)

    // 4. Handlers
    // Xử lý chọn ảnh/video đính kèm
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
        const text = inputText.trim()
        if (!text && selectedFiles.length === 0) return

        const uploadedImageUrls: string[] = []
        const uploadedVideoUrls: string[] = []

        if (selectedFiles.length > 0) {
            try {
                const assets = await uploadMedia({
                    files: selectedFiles,
                    ownerType: 'GENERAL',
                    ownerId: conversation.id,
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
            }
        }

        try {
            await sendMessage({
                conversationId: conversation.id,
                content: text || undefined,
                imageUrls: uploadedImageUrls.filter(Boolean),
                videoUrls: uploadedVideoUrls.filter(Boolean),
            })
            setInputText('')
            setSelectedFiles([])
            setMediaPreviews([])
        } catch (err) {
            console.error('Lỗi khi gửi tin nhắn:', err)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void handleSend()
        }
    }

    // 5. Effects
    // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc đối tác đang soạn tin
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, mediaPreviews, isPeerTyping])

    // Đánh dấu đã đọc khi mở khung chat
    useEffect(() => {
        if (conversation.unreadCount > 0) {
            markConversationRead(conversation.id)
        }
    }, [conversation.id, conversation.unreadCount, markConversationRead])

    return (
        <div className="w-[340px] sm:w-[360px] h-[480px] bg-background border border-border/80 shadow-2xl rounded-t-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div
                className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-card/80 backdrop-blur-md cursor-pointer select-none"
                onClick={onMinimize}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                        <Avatar className="size-8 border border-border/50">
                            <AvatarImage src={conversation.peer.avatar ?? undefined} alt={conversation.peer.name} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                {conversation.peer.isSeller ? (
                                    <StoreIcon className="size-3.5" />
                                ) : (
                                    conversation.peer.name.slice(0, 2).toUpperCase()
                                )}
                            </AvatarFallback>
                        </Avatar>
                        <span
                            className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background transition-colors ${
                                isPeerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            }`}
                            title={isPeerOnline ? t('online') : t('offline')}
                        />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate max-w-[150px]">
                                {conversation.peer.name}
                            </p>
                            {conversation.peer.isSeller && (
                                <span className="text-[9px] font-semibold px-1 rounded-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                    {t('shop')}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                            <span
                                className={`size-1.5 rounded-full inline-block shrink-0 ${
                                    isPeerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                }`}
                            />
                            <span>
                                {isPeerOnline
                                    ? t('active')
                                    : peerLastSeen
                                      ? t('activeAgo', { time: formatRelativeTime(peerLastSeen, locale) })
                                      : t('offline')}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={onMinimize}
                        title={t('minimizeToChatHead')}
                    >
                        <MinusIcon className="size-3.5" />
                    </Button>
                    {isSeller && (
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            title={t('openFullScreen')}
                        >
                            <Link href={ROUTE.SELLER_CHAT_CONVERSATION(conversation.id)}>
                                <Maximize2Icon className="size-3.5" />
                            </Link>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={onClose}
                        title={t('closeChat')}
                    >
                        <XIcon className="size-3.5" />
                    </Button>
                </div>
            </div>

            {/* Messages Thread Body - Messenger Facebook Style */}
            <ScrollArea className="flex-1 p-3 bg-gradient-to-b from-muted/5 via-muted/10 to-background">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full py-12 text-xs text-muted-foreground">
                        <Loader2Icon className="size-4 animate-spin mr-1.5" />
                        {t('loadingMessages')}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <StoreIcon className="size-6" />
                        </div>
                        <p className="text-xs font-semibold text-foreground">
                            {t('startChatWith', { name: conversation.peer.name })}
                        </p>
                        <p className="text-[11px] text-muted-foreground max-w-[220px]">{t('startChatSubtitle')}</p>
                    </div>
                ) : (
                    <div className="space-y-1 pb-1">
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
                                    {/* Mốc thời gian phân cách kiểu Messenger */}
                                    {showDivider && (
                                        <div className="flex justify-center my-2.5">
                                            <span className="text-[10px] font-medium text-muted-foreground/75 px-2.5 py-0.5 rounded-full bg-muted/60 select-none">
                                                {formatMessengerTimestamp(msg.createdAt, locale)}
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        className={`flex items-end gap-1.5 group/msg ${
                                            isMe ? 'justify-end' : 'justify-start'
                                        }`}
                                    >
                                        {/* Avatar phía bên trái chỉ hiện ở tin nhắn cuối của nhóm cùng người gửi */}
                                        {!isMe && (
                                            <div className="size-6 mb-0.5 shrink-0">
                                                {isLastInSenderGroup ? (
                                                    <Avatar className="size-6 border border-border/50">
                                                        <AvatarImage src={msg.senderAvatar ?? undefined} />
                                                        <AvatarFallback className="text-[8px] bg-muted font-bold">
                                                            {msg.senderName?.slice(0, 2).toUpperCase() || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ) : null}
                                            </div>
                                        )}

                                        <div
                                            className={`flex flex-col max-w-[78%] ${
                                                isMe ? 'items-end' : 'items-start'
                                            }`}
                                        >
                                            {/* Attached Product Snippet */}
                                            {msg.attachedProduct && (
                                                <Link
                                                    href={ROUTE.PRODUCT_DETAIL(msg.attachedProduct.slug)}
                                                    className="mb-1 p-2 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors flex items-center gap-2 text-left shadow-xs w-full"
                                                >
                                                    {msg.attachedProduct.thumbnailUrl && (
                                                        <div className="relative size-10 rounded-md overflow-hidden shrink-0">
                                                            <Image
                                                                src={msg.attachedProduct.thumbnailUrl}
                                                                alt={msg.attachedProduct.name}
                                                                fill
                                                                sizes="40px"
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-semibold text-foreground truncate">
                                                            {msg.attachedProduct.name}
                                                        </p>
                                                        <p className="text-[11px] font-bold text-primary">
                                                            {formatCurrencyVND(msg.attachedProduct.price)}
                                                        </p>
                                                    </div>
                                                </Link>
                                            )}

                                            {/* Attached Order Snippet */}
                                            {msg.attachedOrder && (
                                                <Link
                                                    href={ROUTE.ORDER_DETAIL(msg.attachedOrder.id)}
                                                    className="mb-1 p-2 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors flex items-center gap-2 text-left shadow-xs w-full"
                                                >
                                                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <StoreIcon className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-semibold text-foreground">
                                                            {t('orderNumber', {
                                                                number: msg.attachedOrder.orderNumber,
                                                            })}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {formatCurrencyVND(msg.attachedOrder.totalAmount)} •{' '}
                                                            {msg.attachedOrder.status}
                                                        </p>
                                                    </div>
                                                </Link>
                                            )}

                                            {/* Message Content Bubble with Messenger-style hover timestamp */}
                                            {msg.content && (
                                                <div
                                                    className={`flex items-center gap-1.5 group/bubble ${
                                                        isMe ? 'justify-end' : 'justify-start'
                                                    }`}
                                                >
                                                    {isMe && (
                                                        <span className="text-[9px] text-muted-foreground/60 opacity-0 group-hover/bubble:opacity-100 transition-opacity select-none order-first">
                                                            {format(new Date(msg.createdAt), 'HH:mm')}
                                                        </span>
                                                    )}
                                                    <div
                                                        className={`px-3.5 py-2 text-xs leading-relaxed break-words rounded-2xl shadow-xs ${
                                                            isMe
                                                                ? 'bg-gradient-to-r from-primary to-primary/95 text-primary-foreground rounded-br-xs'
                                                                : 'bg-card text-foreground border border-border/60 rounded-bl-xs'
                                                        }`}
                                                        title={format(new Date(msg.createdAt), 'HH:mm, dd/MM/yyyy')}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                    {!isMe && (
                                                        <span className="text-[9px] text-muted-foreground/60 opacity-0 group-hover/bubble:opacity-100 transition-opacity select-none">
                                                            {format(new Date(msg.createdAt), 'HH:mm')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Attached Images */}
                                            {msg.imageUrls?.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    {msg.imageUrls.map((url, i) => (
                                                        <a
                                                            key={i}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="relative rounded-xl overflow-hidden border border-border/50 group/img shadow-xs block h-36 w-44"
                                                        >
                                                            <Image
                                                                src={url}
                                                                alt={t('attachMedia')}
                                                                fill
                                                                sizes="(max-width: 640px) 160px, 200px"
                                                                className="object-cover transition-transform group-hover/img:scale-105"
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Attached Videos */}
                                            {msg.videoUrls?.length > 0 && (
                                                <div className="mt-1 space-y-1 w-full">
                                                    {msg.videoUrls.map((url, i) => (
                                                        <div
                                                            key={i}
                                                            className="rounded-xl overflow-hidden border border-border/50 bg-black/60 shadow-xs"
                                                        >
                                                            <video
                                                                src={url}
                                                                controls
                                                                preload="metadata"
                                                                className="max-h-44 max-w-full rounded-xl w-full"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Trạng thái gửi / đã xem cho tin nhắn cuối cùng của Me */}
                                            {isMe && index === messages.length - 1 && (
                                                <div className="flex items-center gap-1 justify-end mt-0.5 pr-0.5 select-none">
                                                    {msg.isRead ? (
                                                        <span className="text-[9px] text-muted-foreground/75 flex items-center gap-1">
                                                            <span>{t('seen')}</span>
                                                            {conversation.peer.avatar ? (
                                                                <Avatar className="size-3 border border-background">
                                                                    <AvatarImage
                                                                        src={conversation.peer.avatar}
                                                                        alt={conversation.peer.name}
                                                                    />
                                                                    <AvatarFallback className="text-[6px]">
                                                                        {conversation.peer.name.slice(0, 1)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            ) : (
                                                                <CheckCheckIcon className="size-2.5 text-primary" />
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] text-muted-foreground/75 flex items-center gap-1">
                                                            <CheckCheckIcon className="size-2.5 text-primary" />
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
                        {isPeerTyping && (
                            <div className="pt-1">
                                <TypingIndicator
                                    peerName={conversation.peer.name}
                                    peerAvatar={conversation.peer.avatar}
                                />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Media Attachment Previews Staging Bar */}
            {mediaPreviews.length > 0 && (
                <div className="px-3 py-2 border-t border-border/50 bg-muted/40 flex items-center gap-2 overflow-x-auto">
                    {mediaPreviews.map((preview, i) => (
                        <div
                            key={i}
                            className="relative size-12 rounded-lg border border-border/80 overflow-hidden shrink-0 group"
                        >
                            {preview.type === 'video' ? (
                                <video src={preview.url} className="size-full object-cover" />
                            ) : (
                                <Image src={preview.url} alt="Staged" fill sizes="48px" className="object-cover" />
                            )}
                            <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                onClick={() => removeFile(i)}
                                className="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/70 text-white hover:bg-black/90 p-0"
                            >
                                <XIcon className="size-2.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Composer Footer */}
            <div className="p-2.5 border-t border-border/60 bg-card/60 backdrop-blur-md flex items-center gap-1.5">
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
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    title={t('attachMedia')}
                >
                    <ImageIcon className="size-4" />
                </Button>

                <Input
                    placeholder={t('inputPlaceholderShort')}
                    value={inputText}
                    onChange={(e) => {
                        setInputText(e.target.value)
                        startTyping()
                    }}
                    onBlur={() => stopTyping()}
                    onKeyDown={handleKeyDown}
                    disabled={isSending || isUploading}
                    className="h-8 text-xs rounded-xl bg-muted/40 border-border/50 focus-visible:ring-1"
                />

                <Button
                    type="button"
                    size="icon"
                    onClick={() => void handleSend()}
                    disabled={(inputText.trim().length === 0 && selectedFiles.length === 0) || isSending || isUploading}
                    className="size-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-xs transition-all active:scale-95"
                >
                    {isSending || isUploading ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                        <SendIcon className="size-3.5" />
                    )}
                </Button>
            </div>
        </div>
    )
}

// Thanh Dock chứa các khung chat nổi ở góc dưới bên phải màn hình (kiểu Facebook Messenger)
export function FloatingChatDock() {
    const t = useTranslations('chat')
    const pathname = usePathname()
    const { conversations, markConversationRead, isAuthenticated, isUserOnline } = useChat()
    const openConversations = useChatStore((s) => s.openConversations)
    const minimizedIds = useChatStore((s) => s.minimizedIds)
    const toggleMinimize = useChatStore((s) => s.toggleMinimize)
    const closeChat = useChatStore((s) => s.closeChat)

    // Ẩn hoàn toàn nếu chưa đăng nhập, hoặc không có hội thoại mở, hoặc đang ở trang đăng nhập / đăng ký
    if (
        !isAuthenticated ||
        openConversations.length === 0 ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/register')
    ) {
        return null
    }

    // Tách riêng các hội thoại đang mở full box và các hội thoại đang thu nhỏ (minimized)
    const activeBoxes: ConversationDto[] = []
    const minimizedHeads: ConversationDto[] = []

    for (const storedConv of openConversations) {
        const liveConv = conversations.find((c) => c.id === storedConv.id) ?? storedConv
        if (minimizedIds.includes(liveConv.id)) {
            minimizedHeads.push(liveConv)
        } else {
            activeBoxes.push(liveConv)
        }
    }

    // Giới hạn hiển thị tối đa MAX_VISIBLE_CHAT_HEADS (5) avatar theo cột dọc
    const maxHeads = CHAT_CONFIG.MAX_VISIBLE_CHAT_HEADS
    const visibleHeads = minimizedHeads.slice(0, maxHeads)
    const overflowCount = Math.max(0, minimizedHeads.length - maxHeads)

    return (
        <div className="fixed bottom-0 right-3 sm:right-6 z-50 flex items-end gap-3 pointer-events-none">
            {/* 1. Các khung chat nổi mở đầy đủ (nằm ngang cạnh nhau sang trái) */}
            {activeBoxes.map((conv) => (
                <SingleFloatingChatBox
                    key={conv.id}
                    conversation={conv}
                    onClose={() => toggleMinimize(conv.id)}
                    onMinimize={() => toggleMinimize(conv.id)}
                />
            ))}

            {/* 2. Cột dọc các Chat Head avatar thu nhỏ ở góc ngoài cùng bên phải */}
            {minimizedHeads.length > 0 && (
                <div className="flex flex-col-reverse items-center gap-2 mb-3 sm:mb-4 pointer-events-auto">
                    {/* Bong bóng +N nếu số lượng avatar vượt quá giới hạn 5 */}
                    {overflowCount > 0 && (
                        <div
                            className="relative group cursor-pointer select-none transition-transform hover:scale-105 active:scale-95 animate-in zoom-in-75 duration-200"
                            onClick={() => {
                                const nextConv = minimizedHeads[maxHeads]
                                if (nextConv) {
                                    toggleMinimize(nextConv.id)
                                    if (nextConv.unreadCount > 0) {
                                        markConversationRead(nextConv.id)
                                    }
                                }
                            }}
                            title={t('moreChatHeads', { count: overflowCount })}
                        >
                            <div className="size-12 rounded-full border-2 border-primary/30 bg-primary/10 text-primary font-black shadow-xl ring-2 ring-background hover:ring-primary/50 transition-all flex items-center justify-center text-sm backdrop-blur-md">
                                +{overflowCount}
                            </div>
                            {/* Hover tooltip */}
                            <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-popover text-popover-foreground text-xs font-semibold shadow-lg border border-border/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                                {t('moreChatHeads', { count: overflowCount })}
                            </div>
                        </div>
                    )}

                    {/* Danh sách các Chat Head avatar (tối đa 5 item) xếp theo hàng dọc */}
                    {visibleHeads.map((liveConv) => {
                        const isHeadOnline = isUserOnline(liveConv.peer.id) || Boolean(liveConv.peer.isOnline)
                        return (
                            <div
                                key={liveConv.id}
                                className="relative group cursor-pointer select-none transition-transform hover:scale-105 active:scale-95 animate-in zoom-in-75 duration-200"
                                onClick={() => {
                                    toggleMinimize(liveConv.id)
                                    if (liveConv.unreadCount > 0) {
                                        markConversationRead(liveConv.id)
                                    }
                                }}
                                title={liveConv.peer.name}
                            >
                                {/* Avatar Bubble */}
                                <div className="size-12 sm:size-13 rounded-full border-2 border-primary/20 bg-card shadow-2xl p-0.5 ring-2 ring-background hover:ring-primary/50 transition-all flex items-center justify-center">
                                    <Avatar className="size-full rounded-full">
                                        <AvatarImage src={liveConv.peer.avatar ?? undefined} alt={liveConv.peer.name} />
                                        <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold">
                                            {liveConv.peer.isSeller ? (
                                                <StoreIcon className="size-5" />
                                            ) : (
                                                liveConv.peer.name.slice(0, 2).toUpperCase()
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                {/* Online Indicator */}
                                <span
                                    className={`absolute bottom-0 right-0 size-3.5 rounded-full ring-2 ring-background shadow-xs transition-colors ${
                                        isHeadOnline ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                    }`}
                                    title={isHeadOnline ? t('online') : t('offline')}
                                />

                                {/* Unread Count Badge (ẩn khi hover để ưu tiên nút X đóng chat) */}
                                {liveConv.unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] text-white font-extrabold shadow-md ring-2 ring-background group-hover:opacity-0 transition-opacity">
                                        {liveConv.unreadCount > 99 ? '99+' : liveConv.unreadCount}
                                    </span>
                                )}

                                {/* Hover close 'X' button ở góc trên bên phải bằng shadcn Button */}
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        closeChat(liveConv.id)
                                    }}
                                    className="absolute -top-1 -right-1 size-5 rounded-full bg-muted-foreground/90 hover:bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md ring-2 ring-background z-10 hover:scale-110 active:scale-95 p-0"
                                    title={t('closeChatHead')}
                                >
                                    <XIcon className="size-3" />
                                </Button>

                                {/* Hover tooltip with peer name */}
                                <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-popover text-popover-foreground text-xs font-semibold shadow-lg border border-border/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                                    {liveConv.peer.name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
