// lib/fastspring.js - FastSpring Integration (FIXED VERSION)
// Tags now use builder.tag() method instead of push({tags})

'use client'

import { markPaymentJustCompleted } from '@/lib/hooks/useSubscription'

export const FASTSPRING_CONFIG = {
  storeId: process.env.NEXT_PUBLIC_FASTSPRING_STORE_ID || '',
  popupUrl: process.env.NEXT_PUBLIC_FASTSPRING_POPUP_URL || '',
  testMode: process.env.NEXT_PUBLIC_FASTSPRING_TEST_MODE === 'true',
  productIds: {
    // PRO
    monthly: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_MONTHLY || '',
    yearly: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_YEARLY || '',
    monthlyNoTrial: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_MONTHLY_NOTRIAL || '',
    yearlyNoTrial: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_YEARLY_NOTRIAL || '',
    // PRO+
    plusMonthly: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_PLUS_MONTHLY || '',
    plusYearly: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_PLUS_YEARLY || '',
    plusMonthlyNoTrial: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_PLUS_MONTHLY_NOTRIAL || '',
    plusYearlyNoTrial: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_PLUS_YEARLY_NOTRIAL || '',
    // Addon
    teamSeat: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_TEAM_SEAT || '',
    teamSeatYearly: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_TEAM_SEAT_YEARLY || '',
  }
}


/**
 * Initialize FastSpring Popup Storefronts
 */
export function initializeFastSpring(onSuccess, onError) {
  if (window.fastspring) {
    console.log('✅ FastSpring already loaded')
    if (onSuccess) onSuccess(window.fastspring)
    return window.fastspring
  }

  const script = document.createElement('script')
  script.id = 'fsc-api'
  script.src = 'https://sbl.onfastspring.com/sbl/1.0.3/fastspring-builder.min.js'
  script.type = 'text/javascript'
  script.setAttribute('data-storefront', FASTSPRING_CONFIG.popupUrl)
  script.setAttribute('data-continuous', 'true')
  script.setAttribute('data-data-callback', 'fastspringDataCallback')
  script.setAttribute('data-popup-closed', 'fastspringPopupClosed')
  script.setAttribute('data-popup-webhook-received', 'fastspringWebhookReceived')
  
  script.onload = () => {
    console.log('✅ FastSpring script loaded')
    if (window.fastspring) {
      console.log('✅ FastSpring initialized successfully')
      if (onSuccess) onSuccess(window.fastspring)
    }
  }
  
  script.onerror = (err) => {
    console.error('❌ Failed to load FastSpring')
    if (onError) onError(err)
  }
  
  document.head.appendChild(script)
}

/**
 * Open FastSpring Checkout - FIXED VERSION
 * Now uses builder.tag() for custom data
 */
export async function openFastSpringCheckout(options) {

  const {
    priceId,
    customerId,
    email,
    majstorId,
    billingInterval = 'monthly',
    quantity = 1,
    onSuccess,
    onError,
    onClose
  } = options

  if (!window.fastspring) {
    const error = new Error('FastSpring is not loaded')
    console.error('❌', error)
    if (onError) onError(error)
    return
  }

  try {
    console.log('🚀 Opening FastSpring Checkout:', {
      product: priceId,
      email: email,
      majstorId: majstorId
    })

    // Setup global callbacks
    window.fastspringDataCallback = function(data) {
      console.log('🎯 FastSpring Data Callback:', data)
      
      if (data && data.id) {
        console.log('✅ Order created:', data.id)
      }
    }

    window.fastspringPopupClosed = function(orderReference) {
      console.log('🚪 FastSpring Popup Closed:', orderReference)
      
      if (orderReference && orderReference.id) {
        console.log('✅ Checkout completed successfully!')
        console.log('📋 Order Reference:', orderReference.id)
        
        markPaymentJustCompleted()
        
        if (onSuccess) {
          onSuccess({
            orderId: orderReference.id,
            reference: orderReference.reference
          })
        }
      } else {
        console.log('ℹ️ User closed popup without completing purchase')
        
        if (onClose) {
          onClose({ reason: 'user_closed' })
        }
      }
    }

    window.fastspringWebhookReceived = function(data) {
      console.log('📢 FastSpring Webhook Received:', data)
    }

    // Create checkout payload WITHOUT tags
    const checkoutData = {
      products: [
        {
          path: priceId,
          quantity: quantity
        }
      ]
    }

    // Add email if provided
    if (email) {
      checkoutData.contact = {
        email: email
      }
    }

    // Add customer ID if exists
    if (customerId) {
      checkoutData.contact = {
        ...checkoutData.contact,
        account: customerId
      }
    }

    console.log('📦 FastSpring Checkout Data:', checkoutData)

    // Open FastSpring Popup
    if (window.fastspring && window.fastspring.builder) {
      // 1) Clear previous session
      if (window.fastspring.builder.reset) {
        window.fastspring.builder.reset()
      }

      // 2) 🔥 NEW: Set tags using builder.tag() method
      console.log('🏷️ Setting FastSpring tags...')
      window.fastspring.builder.tag({
        majstor_id: majstorId,
        billing_interval: billingInterval,
        source: 'upgrade_modal'
      })
      console.log('✅ Tags set:', {
        majstor_id: majstorId,
        billing_interval: billingInterval,
        source: 'upgrade_modal'
      })

      // 3) Push checkout data
      window.fastspring.builder.push(checkoutData)
      console.log('📦 Checkout data pushed')

      // 4) Open popup
      window.fastspring.builder.checkout()
      console.log('🚀 Checkout popup opened')
    } else {
      throw new Error('FastSpring builder not available')
    }

  } catch (error) {
    console.error('❌ Error opening FastSpring Checkout:', error)
    if (onError) onError(error)
  }

}


/**
 * Update Payment Method - FastSpring Account Management
 */
export function openUpdatePaymentMethod(subscriptionId, onSuccess, onError) {
  if (!window.fastspring) {
    const error = new Error('FastSpring is not loaded')
    console.error('❌', error)
    if (onError) onError(error)
    return
  }

  try {
    console.log('🔄 Opening FastSpring Account Management for:', subscriptionId)
    
    const popupUrl = FASTSPRING_CONFIG.popupUrl.startsWith('http')
      ? FASTSPRING_CONFIG.popupUrl
      : `https://${FASTSPRING_CONFIG.popupUrl}`
    // Strip popup path (e.g. /popup-defaultB2B) to get the store base URL
    const storeBase = popupUrl.replace(/\/popup[^/]*/i, '').replace(/\/$/, '')
    const accountUrl = `${storeBase}/account`

    console.log('💳 Opening account management:', accountUrl)
    window.open(accountUrl, '_blank')
    
    if (onSuccess) {
      console.log('ℹ️ User redirected to Account Management')
      onSuccess({ redirected: true })
    }

  } catch (error) {
    console.error('❌ Error opening Account Management:', error)
    if (onError) onError(error)
  }
}

/**
 * Get FastSpring Account Management URL
 */
export function getFastSpringAccountUrl(customerId, subscriptionId) {
  return `${FASTSPRING_CONFIG.popupUrl}/account`
}

/**
 * Format price with VAT info
 */
export function formatPriceWithVAT(priceEUR, isYearly = false) {
  const formatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(priceEUR)

  const period = isYearly ? 'pro Jahr' : 'pro Monat'
  
  return {
    display: `${formatted} ${period}`,
    withVAT: `${formatted} + MwSt. ${period}`,
    netPrice: priceEUR,
    period: period
  }
}

/**
 * Validate FastSpring Config
 */
export function validateFastSpringConfig() {
  const errors = []

  if (!FASTSPRING_CONFIG.storeId) {
    errors.push('Missing NEXT_PUBLIC_FASTSPRING_STORE_ID')
  }

  if (!FASTSPRING_CONFIG.popupUrl) {
    errors.push('Missing NEXT_PUBLIC_FASTSPRING_POPUP_URL')
  }

  if (!FASTSPRING_CONFIG.productIds.monthly) {
    errors.push('Missing NEXT_PUBLIC_FASTSPRING_PRODUCT_MONTHLY')
  }

  if (!FASTSPRING_CONFIG.productIds.yearly) {
    errors.push('Missing NEXT_PUBLIC_FASTSPRING_PRODUCT_YEARLY')
  }

  if (errors.length > 0) {
    console.error('❌ FastSpring Configuration Errors:', errors)
    return false
  }

  console.log('✅ FastSpring configuration is valid')
  return true
}

/**
 * Test FastSpring Connection
 */
export async function testFastSpringConnection() {
  if (!window.fastspring) {
    console.error('❌ FastSpring not loaded')
    return false
  }

  try {
    console.log('🔍 FastSpring Status:')
    console.log('🔍 Store ID:', FASTSPRING_CONFIG.storeId)
    console.log('🔍 Popup URL:', FASTSPRING_CONFIG.popupUrl)
    console.log('🔍 Product IDs:', FASTSPRING_CONFIG.productIds)
    console.log('🔍 Test Mode:', FASTSPRING_CONFIG.testMode)
    
    return true
  } catch (error) {
    console.error('❌ FastSpring connection test failed:', error)
    return false
  }
}

// Backward compatibility aliases
export const initializePaddle = initializeFastSpring
export const openPaddleCheckout = openFastSpringCheckout
export const PADDLE_CONFIG = FASTSPRING_CONFIG