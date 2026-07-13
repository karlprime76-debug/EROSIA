'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { Check, CheckCheck, Pencil, Trash2, Copy, Reply, Flag, X } from 'lucide-react'
import type { ChatMessage } from '@/lib/chat/types'
import { formatMessageTime } from '@/lib/chat/utils'

function useTimeAgo(createdAt: string) {
  const [timeAgo, setTimeAgo] = useState(() => {
    const diff = Date.now() - new Date(createdAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "à l'instant"
    if (mins < 60) return `il y a ${mins} min`
    return formatMessageTime(createdAt)
  })

  useEffect(() => {
    const diff = Date.now() - new Date(createdAt).getTime()
    if (diff < 60000) {
      const id = setInterval(() => {
        const d = Date.now() - new Date(createdAt).getTime()
        const m = Math.floor(d / 60000)
        setTimeAgo(m < 1 ? "à l'instant" : `il y a ${m} min`)
      }, 10000)
      return () => clearInterval(id)
    }
  }, [createdAt])

  return timeAgo
}

export const MessageBubble = React.memo(function MessageBubble({ msg, isOwn, onReply, onEdit, onDelete, onReport }: {
  msg: ChatMessage
  isOwn: boolean
  onReply?: (msg: ChatMessage) => void
  onEdit?: (msg: ChatMessage) => void
  onDelete?: (msg: ChatMessage) => void
  onReport?: (msg: ChatMessage) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(msg.text || '')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const timeAgo = useTimeAgo(msg.created_at)

  if (msg.deleted_for_all) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} opacity-40`}>
        <div className="px-4 py-2 text-xs text-muted italic rounded-xl bg-surface/50">
          Message supprimé
        </div>
      </div>
    )
  }

  const handleCopy = () => {
    if (msg.text) navigator.clipboard.writeText(msg.text)
  }

  const handleEdit = () => {
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editText.trim()) return
    setEditing(false)
    onEdit?.({ ...msg, text: editText.trim() })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5 group relative`}
      onContextMenu={e => { e.preventDefault(); setShowActions(!showActions) }}
    >
      <div className={`max-w-[80%] sm:max-w-[70%] ${isOwn ? 'order-1' : 'order-1'}`}>
        {msg.reply_preview && (
          <div className={`px-3 py-1.5 rounded-t-lg text-xs border-l-2 ${isOwn ? 'border-primary/50 bg-primary/10' : 'border-secondary/50 bg-surface'} mb-0.5`}>
            <p className="text-[10px] text-secondary mb-0.5">
              {msg.reply_preview.sender_id === msg.sender_id ? 'Réponse' : 'En réponse'}
            </p>
            <p className="truncate text-[11px] opacity-70">{msg.reply_preview.text || '📎 Pièce jointe'}</p>
          </div>
        )}

        {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <Image src={lightbox} alt="Photo" width={800} height={800} className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl" />
        </div>
      )}
      <div className={`relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
          isOwn
            ? 'text-on-primary rounded-br-md'
            : 'text-theme rounded-bl-md'
        }`}
          style={{
            background: isOwn
              ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
              : 'var(--surface)',
            boxShadow: isOwn
              ? '0 2px 8px rgba(217,45,74,0.25)'
              : '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          {msg.image_url && (
            <div className="mb-2 -mx-1 -mt-1">
              <Image src={msg.image_url} alt="Photo partagée" width={300} height={300} loading="lazy"
                className="rounded-xl w-full max-h-[300px] object-cover cursor-pointer"
                onClick={() => setLightbox(msg.image_url!)} />
            </div>
          )}

          {msg.audio_url && (
            <div className="mb-1">
              <audio src={msg.audio_url} controls className="h-10 w-full max-w-[220px] rounded-lg" />
            </div>
          )}

          {msg.gif_url && (
            <div className="mb-2 -mx-1 -mt-1">
              <Image src={msg.gif_url} alt="GIF animé" width={300} height={300} loading="lazy"
                className="rounded-xl w-full max-h-[200px] object-cover" unoptimized />
            </div>
          )}

          {editing ? (
            <div className="flex gap-2">
              <input value={editText} onChange={e => setEditText(e.target.value)}
                className="flex-1 bg-transparent border-b border-theme/30 outline-none text-sm py-0.5" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(false) }} />
              <button onClick={handleSaveEdit} aria-label="Enregistrer la modification" className="p-2.5 text-theme/70 hover:text-theme"><Check size={14} /></button>
              <button onClick={() => setEditing(false)} aria-label="Annuler la modification" className="p-2.5 text-theme/70 hover:text-theme"><X size={14} /></button>
            </div>
          ) : msg.text && (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] opacity-50">{timeAgo}</span>
            {msg.edited_at && <span className="text-[9px] opacity-40">modifié</span>}
            {isOwn && (
              msg.read_at
                ? <CheckCheck size={12} className="text-success" />
                : <Check size={12} className="opacity-50" />
            )}
          </div>
        </div>

        <AnimatedActions isOwn={isOwn} show={showActions} onCopy={handleCopy} onReply={() => { onReply?.(msg); setShowActions(false) }}
          onEdit={isOwn ? () => { handleEdit(); setShowActions(false) } : undefined}
          onDelete={isOwn ? () => { onDelete?.(msg); setShowActions(false) } : undefined}
          onReport={() => { onReport?.(msg); setShowActions(false) }} />
      </div>
    </motion.div>
  )
})

function AnimatedActions({ isOwn, show, onCopy, onReply, onEdit, onDelete, onReport }: {
  isOwn: boolean; show: boolean; onCopy: () => void; onReply: () => void
  onEdit?: () => void; onDelete?: () => void; onReport?: () => void
}) {
  if (!show) return null
  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <ActionButton icon={<Copy size={12} />} label="Copier" onClick={onCopy} />
      <ActionButton icon={<Reply size={12} />} label="Répondre" onClick={onReply} />
      {onEdit && <ActionButton icon={<Pencil size={12} />} label="Modifier" onClick={onEdit} />}
      {onDelete && <ActionButton icon={<Trash2 size={12} />} label="Supprimer" onClick={onDelete} />}
      {onReport && <ActionButton icon={<Flag size={12} />} label="Signaler" onClick={onReport} />}
    </motion.div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-2 py-1 rounded-lg bg-surface border border-theme text-[9px] text-secondary flex items-center gap-1 hover:bg-hover transition-colors">
      {icon}{label}
    </button>
  )
}
