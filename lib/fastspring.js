// lib/fastspring.js - FastSpring Integration (ISTI INTERFACE kao paddle.js)
// 🔥 Frontend komponente ostaju ISTE - samo menjaju import!

'use client'

import { markPaymentJustCompleted } from '@/lib/hooks/useSubscription'

export const FASTSPRING_CONFIG = {
  storeId: process.env.NEXT_PUBLIC_FASTSPRING_STORE_ID || '',
  popupUrl: process.env.NEXT_PUBLIC_FASTSPRING_POPUP_URL || '',
  testMode: process.env.NEXT_PUBLIC_FASTSPRING_TEST_MODE === 'true',
  productIds: {
    monthly: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_MONTHLY || '',
    yearly: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_YEARLY || ''
  }
}


/**
 * 🔧 Inicijalizuj FastSpring Popup Storefronts
 * IDENTIČAN interface kao initializePaddle()
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
  script.setAttribute('data-continuous', 'true')  // ✅ DODATO!
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
 * 💳 Otvori FastSpring Checkout
 * IDENTIČAN interface kao openPaddleCheckout()
 */
export async function openFastSpringCheckout(options) {
  const {
    priceId,          // FastSpring product ID (npr. 'promeister-monthly')
    customerId,       // FastSpring account ID (ako postoji)
    email,
    majstorId,
    billingInterval = 'monthly',
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

    // 🔧 Setup global callbacks PRE nego što otvorimo checkout
    window.fastspringDataCallback = function(data) {
      console.log('🎯 FastSpring Data Callback:', data)
      
      // 🔥 Ovo se poziva kada se kreira order
      if (data && data.id) {
        console.log('✅ Order created:', data.id)
      }
    }

    window.fastspringPopupClosed = function(orderReference) {
      console.log('🚪 FastSpring Popup Closed:', orderReference)
      
      if (orderReference && orderReference.id) {
        // ✅ Checkout completed - order kreiran
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
        // 🚪 User zatvorio popup bez kupovine
        console.log('ℹ️ User closed popup without completing purchase')
        
        if (onClose) {
          onClose({ reason: 'user_closed' })
        }
      }
    }

    window.fastspringWebhookReceived = function(data) {
      console.log('🔔 FastSpring Webhook Received:', data)
      // Webhook je processed na server-side
    }

    // 🔧 Kreiraj payload za FastSpring
    const checkoutData = {
      products: [
        {
          path: priceId,
          quantity: 1
        }
      ],
      // 🔥 Custom tags za webhook identification
      tags: {
        majstor_id: majstorId,
        billing_interval: billingInterval,
        source: 'upgrade_modal'
      }
    }

    // Dodaj email ako postoji
    if (email) {
      checkoutData.contact = {
        email: email
      }
    }

    // Dodaj existing customer ID ako postoji
    if (customerId) {
      checkoutData.contact = {
        ...checkoutData.contact,
        account: customerId
      }
    }

      console.log('📦 FastSpring Checkout Data:', checkoutData)

    // 🎯 Otvori FastSpring Popup – ISTO kao ručno:
    if (window.fastspring && window.fastspring.builder) {
      // 1) očisti prethodnu sesiju
      if (window.fastspring.builder.reset) {
        window.fastspring.builder.reset()
      }

      // 2) pošalji naše podatke
      window.fastspring.builder.push(checkoutData)

      // 3) otvori popup BEZ argumenata
      window.fastspring.builder.checkout()
    } else {
      throw new Error('FastSpring builder not available')
    }

  } catch (error) {
    console.error('❌ Error opening FastSpring Checkout:', error)
    if (onError) onError(error)
  }
}


/**
 * 🔄 Update Payment Method - FastSpring Account Management
 * IDENTIČAN interface kao openUpdatePaymentMethod()
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
    
    // 🔧 FastSpring Account Management URL
    const accountUrl = `${FASTSPRING_CONFIG.popupUrl}/account`
    
    // Otvori u novom tabu ili popup
    window.open(accountUrl, 'fastspring-account', 'width=600,height=700')
    
    if (onSuccess) {
      // FastSpring nema direktan callback za payment update
      // User može zatvoriti prozor kada završi
      console.log('ℹ️ User redirected to Account Management')
      onSuccess({ redirected: true })
    }

  } catch (error) {
    console.error('❌ Error opening Account Management:', error)
    if (onError) onError(error)
  }
}

/**
 * 🔗 Generiši FastSpring Account Management Link
 * IDENTIČAN interface kao getPaddleCustomerPortalUrl()
 */
export function getFastSpringAccountUrl(customerId, subscriptionId) {
  // FastSpring Account Management URL
  return `${FASTSPRING_CONFIG.popupUrl}/account`
}

/**
 * 📊 Format price sa VAT info
 * IDENTIČAN kao u paddle.js
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
 * ✅ Validate FastSpring Config
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
 * 🧪 Test FastSpring Connection
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

// 🔥 BACKWARD COMPATIBILITY ALIASES
// Ovo omogućava da frontend komponente mogu koristiti ista imena funkcija
export const initializePaddle = initializeFastSpring
export const openPaddleCheckout = openFastSpringCheckout
export const PADDLE_CONFIG = FASTSPRING_CONFIG