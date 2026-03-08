'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function RefCapture() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const ref = searchParams.get('ref')
    const source = searchParams.get('source') || 'link'

    if (ref) {
      localStorage.setItem('prm_ref', ref)
      // Track the click — fire and forget
      fetch('/api/ref/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_code: ref, source }),
      }).catch(() => {})
    }

    // Inject ref into all /signup links on the page (survives in-app browser switches)
    const activeRef = ref || localStorage.getItem('prm_ref')
    if (activeRef) {
      document.querySelectorAll<HTMLAnchorElement>('a[href="/signup"]').forEach(a => {
        a.href = `/signup?ref=${encodeURIComponent(activeRef)}`
      })
    }
  }, [searchParams])
  return null
}
