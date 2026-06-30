export function formatMessageTime(date: string | Date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (days === 1) return 'Hier'
  if (days < 7) {
    return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function formatLastSeen(date: string | null) {
  if (!date) return 'Récemment'
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  return `Il y a ${Math.floor(hours / 24)}j`
}

export function truncateMessage(text: string | null | undefined, max = 80) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

export function groupMessagesByDate(messages: { created_at: string }[]) {
  const groups: { date: string; messages: typeof messages }[] = []
  let currentDate = ''
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
}

export function shouldVibrate() {
  return 'vibrate' in navigator && !/Mobi/.test(navigator.userAgent) === false
}

export function lightVibrate() {
  if (shouldVibrate()) navigator.vibrate(10)
}

export function getDayLabel(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  return dateStr
}
