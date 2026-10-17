'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    ExternalLinkIcon,
    MessageCircleIcon,
    SearchIcon,
    StoreIcon,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { ConversationDto } from '@timmyhub/contracts'

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Input,
    ScrollArea,
} from '@/components'
import { ROUTE } from '@/constants'
import { useChat } from '@/hooks'
import { useChatStore } from '@/stores'
import { formatRelativeTime } from '@/utils'

export function MessageMenu() {
    const locale = useLocale() as 'vi' | 'en'
    const tNav = useTranslations('nav')
    const tChat = useTranslations('chat')
    const { isAuthenticated, userId, conversations, totalUnreadCount, isLoading, markConversationRead } = useChat()
    const openChat = useChatStore((s) => s.openChat)
    const [searchTerm, setSearchTerm] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    // Lọc theo từ khoá tìm kiếm
    const filteredConversations = useMemo(() => {
        if (!searchTerm.trim()) return conversations
        const q = searchTerm.toLowerCase()
        return conversations.filter(
            (c) =>
                c.peer.name.toLowerCase().includes(q) ||
                (c.lastMessage && c.lastMessage.toLowerCase().includes(q)),
        )
    }, [conversations, searchTerm])

    const handleSelectConversation = (conversation: ConversationDto) => {
        openChat(conversation)
        setIsOpen(false)
        if (conversation.unreadCount > 0) {
            markConversationRead(conversation.id)
        }
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={totalUnreadCount > 0 ? `${tNav('messages')} (${totalUnreadCount})` : tNav('messages')}
                >
                    <MessageCircleIcon aria-hidden className="size-4 text-primary" />
                    {totalUnreadCount > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-200"
                        >
                            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-[360px] sm:w-[390px] p-0 shadow-2xl rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base tracking-tight text-foreground">
                            {tChat('dropdownTitle')}
                        </h3>
                        {totalUnreadCount > 0 && (
                            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                                {tChat('newBadge', { count: totalUnreadCount })}
                            </span>
                        )}
                    </div>

                    <Link
                        href={ROUTE.SELLER_CHAT}
                        onClick={() => setIsOpen(false)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium group"
                    >
                        <span>{tChat('sellerChannel')}</span>
                        <ExternalLinkIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                {/* Search Box */}
                <div className="px-3 py-2 border-b border-border/40 bg-muted/20">
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder={tChat('searchUserShopPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs rounded-xl bg-background/80 border-border/60 focus-visible:ring-1"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <ScrollArea className="max-h-[380px] divide-y divide-border/20">
                    {!isAuthenticated ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <MessageCircleIcon className="size-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-foreground">{tChat('loginToViewMessages')}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {tChat('loginToViewMessagesDesc')}
                                </p>
                            </div>
                            <Button asChild size="sm" className="h-8 text-xs rounded-xl mt-1">
                                <Link href={ROUTE.LOGIN} onClick={() => setIsOpen(false)}>
                                    {tChat('loginNow')}
                                </Link>
                            </Button>
                        </div>
                    ) : isLoading ? (
                        <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                            {tChat('loadingChats')}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <MessageCircleIcon className="size-5" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {searchTerm ? tChat('noMatchFound') : tChat('noConversationsYet')}
                            </p>
                        </div>
                    ) : (
                        <div className="p-1 space-y-0.5">
                            {filteredConversations.map((conv) => {
                                const isUnread = conv.unreadCount > 0
                                const isSelfLast = conv.lastSenderId === userId

                                return (
                                    <DropdownMenuItem
                                        key={conv.id}
                                        onClick={() => handleSelectConversation(conv)}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                                            isUnread
                                                ? 'bg-primary/5 hover:bg-primary/10 font-semibold'
                                                : 'hover:bg-accent/60'
                                        }`}
                                    >
                                        {/* Avatar & Online Badge */}
                                        <div className="relative shrink-0">
                                            <Avatar className="size-11 border border-border/60 shadow-sm">
                                                <AvatarImage src={conv.peer.avatar ?? undefined} alt={conv.peer.name} />
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold text-primary">
                                                    {conv.peer.isSeller ? (
                                                        <StoreIcon className="size-4" />
                                                    ) : (
                                                        conv.peer.name.slice(0, 2).toUpperCase()
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-background shadow-xs" />
                                        </div>

                                        {/* Content info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className={`text-sm truncate ${isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                                                        {conv.peer.name}
                                                    </span>
                                                    {conv.peer.isSeller && (
                                                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                            {tChat('shop')}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-muted-foreground shrink-0 font-normal">
                                                    {formatRelativeTime(conv.lastMessageAt, locale)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 min-w-0">
                                                <p className={`text-xs truncate min-w-0 flex-1 ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {isSelfLast && <span className="text-muted-foreground">{tChat('you')}: </span>}
                                                    {conv.lastMessage || tChat('startConversationPrompt')}
                                                </p>
                                                {isUnread && (
                                                    <span className="size-2 rounded-full bg-primary shrink-0 animate-pulse" />
                                                )}
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="p-2 border-t border-border/40 bg-muted/30 text-center">
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs font-medium h-8 rounded-lg hover:bg-background/80"
                    >
                        <Link href={ROUTE.SELLER_CHAT} onClick={() => setIsOpen(false)}>
                            {tChat('openFullScreenInSeller')}
                        </Link>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
