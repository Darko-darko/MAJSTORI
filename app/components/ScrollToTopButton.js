'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const onScroll = () => {
      // Show when ~3rd card starts leaving viewport
      setVisible(window.scrollY > 1200)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    // Try to scroll to the first invoice/quote card
    const firstCard = document.querySelector('[id^="invoice-"], [id^="quote-"]')
    if (firstCard) {
      const y = firstCard.getBoundingClientRect().top + window.scrollY - 120
      window.scrollTo({ top: y, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (!mounted || !visible) return null

  return createPortal(
    <button
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        height: '40px',
        paddingLeft: '20px',
        paddingRight: '20px',
        borderRadius: '9999px',
        border: 'none',
        cursor: 'pointer',
        background: 'rgba(37, 99, 235, 0.9)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        letterSpacing: '0.3px',
      }}
      aria-label="Nach oben scrollen"
    >
      <span style={{ fontSize: '16px' }}>↑</span>
      Nach oben
    </button>,
    document.body
  )
}
