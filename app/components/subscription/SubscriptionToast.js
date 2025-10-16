// app/components/subscription/SubscriptionToast.js - CELEBRATION TOAST 🎉

'use client'
import { useState, useEffect } from 'react'

export function SubscriptionToast() {
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState('success') // success, info, warning, error

  useEffect(() => {
    // 🎉 Listener za TRIAL → ACTIVE celebration
    const handleActivation = (event) => {
      console.log('🎉 TOAST: Subscription activated!', event.detail)
      
      setMessage('Glückwunsch! 🎉\nSie sind jetzt PRO Mitglied!')
      setType('success')
      setShow(true)

      // Auto-hide nakon 8 sekundi
      setTimeout(() => {
        setShow(false)
      }, 8000)
    }

    // 📢 Listener za generic subscription promene
    const handleChange = (event) => {
      const { oldStatus, newStatus } = event.detail || {}
      
      // Samo prikaži za specifične promene (ne za sve)
      if (oldStatus === 'cancelled' && newStatus === 'active') {
        setMessage('Subscription reaktiviert! ✅')
        setType('success')
        setShow(true)
        
        setTimeout(() => setShow(false), 5000)
      }
    }

    window.addEventListener('subscription-activated', handleActivation)
    window.addEventListener('subscription-changed', handleChange)

    return () => {
      window.removeEventListener('subscription-activated', handleActivation)
      window.removeEventListener('subscription-changed', handleChange)
    }
  }, [])

  if (!show) return null

  const colors = {
    success: {
      bg: 'from-green-500 to-emerald-600',
      border: 'border-green-400',
      text: 'text-white',
      icon: '🎉'
    },
    info: {
      bg: 'from-blue-500 to-blue-600',
      border: 'border-blue-400',
      text: 'text-white',
      icon: 'ℹ️'
    },
    warning: {
      bg: 'from-yellow-500 to-orange-500',
      border: 'border-yellow-400',
      text: 'text-white',
      icon: '⚠️'
    },
    error: {
      bg: 'from-red-500 to-red-600',
      border: 'border-red-400',
      text: 'text-white',
      icon: '❌'
    }
  }

  const currentColors = colors[type] || colors.success

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
      <div className={`
        bg-gradient-to-r ${currentColors.bg}
        border-2 ${currentColors.border}
        ${currentColors.text}
        rounded-xl shadow-2xl
        p-6 min-w-[320px] max-w-md
        transform transition-all duration-300
        backdrop-blur-sm
      `}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="text-4xl animate-bounce">
            {currentColors.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <p className="font-bold text-lg leading-tight whitespace-pre-line">
              {message}
            </p>
            
            {type === 'success' && (
              <p className="text-sm mt-2 text-white/90">
                Alle PRO-Funktionen sind jetzt für Sie freigeschaltet.
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShow(false)}
            className="text-white/80 hover:text-white transition-colors ml-2"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/50 animate-progress-bar"
            style={{ animationDuration: type === 'success' ? '8s' : '5s' }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progress-bar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out;
        }

        .animate-progress-bar {
          animation: progress-bar linear forwards;
        }
      `}</style>
    </div>
  )
}

// Hook za manual toast pozive (opciono)
export function useSubscriptionToast() {
  const showToast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message, type }
    }))
  }

  return { showToast }
}