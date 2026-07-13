export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { error: 'Push non supporté' }
  }

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    const ok = await saveSubscription(existing)
    if (ok) return {}
    await existing.unsubscribe()
  }

  let sub: PushSubscription
  try {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY ?? ''
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
    })
  } catch {
    return { error: 'Refus de l\'autorisation push' }
  }

  const ok = await saveSubscription(sub)
  if (!ok) {
    await sub.unsubscribe()
    return { error: 'Erreur lors de la sauvegarde' }
  }
  return {}
}

async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  })
  return res.ok
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
