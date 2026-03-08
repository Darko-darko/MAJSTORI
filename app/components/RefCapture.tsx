'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function RefCapture() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('prm_ref', ref)

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
