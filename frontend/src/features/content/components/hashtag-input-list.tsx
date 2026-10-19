'use client'

import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge, Button, Input } from '@/components/ui'

export interface HashtagInputListProps {
    hashtags: string[]
    onChange: (hashtags: string[]) => void
}

export function HashtagInputList({ hashtags, onChange }: HashtagInputListProps) {
    const t = useTranslations('content.form')
    const [inputValue, setInputValue] = useState('')

    const handleAdd = () => {
        const clean = inputValue.replace(/^#/, '').trim()
        if (!clean) return
        if (!hashtags.includes(clean)) {
            onChange([...hashtags, clean])
        }
        setInputValue('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAdd()
        }
    }

    const handleRemove = (tag: string) => {
        onChange(hashtags.filter((t) => t !== tag))
    }

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('hashtagPlaceholder')}
                    className="h-10 text-xs rounded-xl"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdd}
                    className="h-10 px-3 text-xs rounded-xl"
                >
                    <Plus className="size-3.5 mr-1" />
                    {t('addHashtag')}
                </Button>
            </div>

            {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {hashtags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs bg-muted/60 hover:bg-muted font-normal pl-2 pr-1 py-0.5 rounded-lg flex items-center gap-1"
                        >
                            <span>#{tag}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(tag)}
                                className="size-3.5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground p-0"
                            >
                                <X className="size-2.5" />
                            </Button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
