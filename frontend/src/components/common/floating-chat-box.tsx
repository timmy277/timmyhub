'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
    CheckCheckIcon,
    ExternalLinkIcon,
    ImageIcon,
    Loader2Icon,
    Maximize2Icon,
    MinusIcon,
    PaperclipIcon,
    SendIcon,
    StoreIcon,
    XIcon,
} from 'lucide-react'
import type { ChatMessageDto, ConversationDto } from '@timmyhub/contracts'

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Button,
    Input,
    ScrollArea,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import { useChat, useConversationMessages } from '@/hooks/use-chat'
import { useUploadMedia } from '@/hooks/use-media'
import { useChatStore } from '@/stores/use-chat-store'
import { formatCurrencyVND, formatRelativeTime } from '@/utils'

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
    const { userId, sendMessage, isSending, markConversationRead } = useChat()
    const { messages, isLoading } = useConversationMessages(conversation.id)
    const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia()

    const [inputText, setInputText] = useState('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [mediaPreviews, setMediaPreviews] = useState<Array<{ url: string; type: 'image' | 'video' }>>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, mediaPreviews])

    // Đánh dấu đã đọc khi mở khung chat
    useEffect(() => {
        if (conversation.unreadCount > 0) {
            markConversationRead(conversation.id)
        }
    }, [conversation.id, conversation.unreadCount, markConversationRead])

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
        const text = inputText.trim()
        if (!text && selectedFiles.length === 0) return

        let uploadedImageUrls: string[] = []
        let uploadedVideoUrls: string[] = []

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

    return (
        <div className="w-[340px] sm:w-[360px] h-[480px] bg-background border border-border/80 shadow-2xl rounded-t-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-card/80 backdrop-blur-md">
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
                        <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-foreground truncate max-w-[150px]">
                                {conversation.peer.name}
                            </p>
                            {conversation.peer.isSeller && (
                                <span className="text-[9px] font-semibold px-1 rounded-sm bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    Shop
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                            Đang hoạt động
                        </p>
                    </div>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={onMinimize}
                        title="Thu nhỏ"
                    >
                        <MinusIcon className="size-3.5" />
                    </Button>
                    {conversation.peer.isSeller && (
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Mở toàn màn hình"
                        >
                            <Link href={ROUTE.SELLER_CHAT}>
                                <Maximize2Icon className="size-3.5" />
                            </Link>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={onClose}
                        title="Đóng chat"
                    >
                        <XIcon className="size-3.5" />
                    </Button>
                </div>
            </div>

            {/* Messages Thread Body */}
            <ScrollArea className="flex-1 p-3 bg-muted/10">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full py-12 text-xs text-muted-foreground">
                        <Loader2Icon className="size-4 animate-spin mr-1.5" />
                        Đang tải tin nhắn...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <StoreIcon className="size-6" />
                        </div>
                        <p className="text-xs font-semibold text-foreground">
                            Bắt đầu nhắn tin với {conversation.peer.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground max-w-[220px]">
                            Gửi tin nhắn, hỏi thông tin sản phẩm hoặc chia sẻ ảnh/video dễ dàng.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-1">
                        {messages.map((msg) => {
                            const isMe = msg.senderId === userId

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex items-end gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!isMe && (
                                        <Avatar className="size-6 mb-0.5 border border-border/50 shrink-0">
                                            <AvatarImage src={msg.senderAvatar ?? undefined} />
                                            <AvatarFallback className="text-[8px] bg-muted">
                                                {msg.senderName?.slice(0, 2).toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div
                                        className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}
                                    >
                                        {/* Attached Product Snippet */}
                                        {msg.attachedProduct && (
                                            <Link
                                                href={ROUTE.PRODUCT_DETAIL(msg.attachedProduct.slug)}
                                                className="mb-1 p-2 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors flex items-center gap-2 text-left shadow-xs w-full"
                                            >
                                                {msg.attachedProduct.thumbnailUrl && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={msg.attachedProduct.thumbnailUrl}
                                                        alt={msg.attachedProduct.name}
                                                        className="size-10 rounded-md object-cover shrink-0"
                                                    />
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
                                                        Đơn #{msg.attachedOrder.orderNumber}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {formatCurrencyVND(msg.attachedOrder.totalAmount)} • {msg.attachedOrder.status}
                                                    </p>
                                                </div>
                                            </Link>
                                        )}

                                        {/* Message Content Bubble */}
                                        {msg.content && (
                                            <div
                                                className={`px-3.5 py-2 text-xs leading-relaxed break-words rounded-2xl shadow-xs ${
                                                    isMe
                                                        ? 'bg-primary text-primary-foreground rounded-tr-xs'
                                                        : 'bg-card text-foreground border border-border/60 rounded-tl-xs'
                                                }`}
                                            >
                                                {msg.content}
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
                                                        className="relative rounded-xl overflow-hidden border border-border/50 group/img shadow-xs block"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={url}
                                                            alt="Attached"
                                                            className="max-h-36 max-w-[200px] object-cover transition-transform group-hover/img:scale-105"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {/* Attached Videos */}
                                        {msg.videoUrls?.length > 0 && (
                                            <div className="mt-1 space-y-1 w-full">
                                                {msg.videoUrls.map((url, i) => (
                                                    <div key={i} className="rounded-xl overflow-hidden border border-border/50 bg-black/60 shadow-xs">
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

                                        {/* Timestamp */}
                                        <span className="text-[9px] text-muted-foreground/70 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

            {/* Media Attachment Previews Staging Bar */}
            {mediaPreviews.length > 0 && (
                <div className="px-3 py-2 border-t border-border/50 bg-muted/40 flex items-center gap-2 overflow-x-auto">
                    {mediaPreviews.map((preview, i) => (
                        <div key={i} className="relative size-12 rounded-lg border border-border/80 overflow-hidden shrink-0 group">
                            {preview.type === 'video' ? (
                                <video src={preview.url} className="size-full object-cover" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview.url} alt="Staged" className="size-full object-cover" />
                            )}
                            <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 hover:opacity-100"
                            >
                                <XIcon className="size-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Composer Footer */}
            <div className="p-2.5 border-t border-border/60 bg-card/60 backdrop-blur-md flex items-center gap-1.5">
                <input
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
                    title="Đính kèm ảnh hoặc video"
                >
                    <ImageIcon className="size-4" />
                </Button>

                <Input
                    placeholder="Nhập tin nhắn..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
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

// Thanh Dock chứa các khung chat nổi ở góc dưới bên phải màn hình (như Facebook)
export function FloatingChatDock() {
    const { openConversations, minimizedIds, closeChat, toggleMinimize } = useChatStore()

    if (openConversations.length === 0) {
        return null
    }

    return (
        <div className="fixed bottom-0 right-3 sm:right-6 z-50 flex items-end gap-3 pointer-events-none">
            {openConversations.map((conv) => {
                const isMinimized = minimizedIds.includes(conv.id)

                if (isMinimized) {
                    // Minimized Tab Bar / Pill
                    return (
                        <div
                            key={conv.id}
                            className="h-10 px-3 bg-card/95 backdrop-blur-md border border-border/80 rounded-t-xl shadow-xl flex items-center gap-2 cursor-pointer pointer-events-auto hover:bg-accent/80 transition-all select-none group"
                            onClick={() => toggleMinimize(conv.id)}
                        >
                            <div className="relative shrink-0">
                                <Avatar className="size-6 border border-border/60">
                                    <AvatarImage src={conv.peer.avatar ?? undefined} alt={conv.peer.name} />
                                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                                        {conv.peer.isSeller ? (
                                            <StoreIcon className="size-3" />
                                        ) : (
                                            conv.peer.name.slice(0, 2).toUpperCase()
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="absolute bottom-0 right-0 size-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
                            </div>

                            <span className="text-xs font-semibold text-foreground max-w-[100px] truncate">
                                {conv.peer.name}
                            </span>

                            {conv.unreadCount > 0 && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] text-white font-bold">
                                    {conv.unreadCount}
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    closeChat(conv.id)
                                }}
                                className="size-4 rounded-full text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <XIcon className="size-3" />
                            </button>
                        </div>
                    )
                }

                // Full Floating Box
                return (
                    <SingleFloatingChatBox
                        key={conv.id}
                        conversation={conv}
                        onClose={() => closeChat(conv.id)}
                        onMinimize={() => toggleMinimize(conv.id)}
                    />
                )
            })}
        </div>
    )
}
