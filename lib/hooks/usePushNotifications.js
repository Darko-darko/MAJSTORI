// lib/hooks/usePushNotifications.js
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications(majstorId) {
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (!majstorId) return
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(isSupported)
    if (isSupported) {
      setPermission(Notification.permission)
      // Provjeri postoji li aktivna push subscription u browseru
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) setSubscribed(true)
          })
        }
      })
    }
  }, [majstorId])

  const subscribe = async () => {
    if (!majstorId || !VAPID_PUBLIC_KEY || !supported) return

    setLoading(true)
    try {
      // Registruj service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Traži dozvolu
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      // Ako postoji stara (možda istekla) subscription, obriši je da dobijemo svjež endpoint
      const existingSub = await registration.pushManager.getSubscription()
      if (existingSub) {
        await existingSub.unsubscribe()
      }

      // Subscrajbuj na push (uvijek svjež endpoint)
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subJson = pushSubscription.toJSON()

      // Sačuvaj u Supabase (upsert da ne dupličemo isti uređaj)
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          majstor_id: majstorId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        { onConflict: 'endpoint' }
      )

      if (error) throw error

      setSubscribed(true)
      window.dispatchEvent(new CustomEvent('push-subscription-changed', { detail: { subscribed: true } }))
      console.log('✅ Push subscription saved')
    } catch (err) {
      console.error('❌ Push subscription error:', err)
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!majstorId) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
          await sub.unsubscribe()
        }
      }
      setSubscribed(false)
      window.dispatchEvent(new CustomEvent('push-subscription-changed', { detail: { subscribed: false } }))
      console.log('✅ Push unsubscribed')
    } catch (err) {
      console.error('❌ Push unsubscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { permission, subscribed, loading, supported, subscribe, unsubscribe }
}
