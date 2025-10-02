// lib/paddle.js - Paddle Helper Functions & Configuration
'use client'

/**
 * 🚀 PADDLE HELPER LIBRARY
 * Centralizovane funkcije za rad sa Paddle Billing API
 */
import { markPaymentJustCompleted } from '@/lib/hooks/useSubscription'
// ✅ Paddle Environment Setup
export const PADDLE_CONFIG = {
  environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox', // 'sandbox' ili 'production'
  clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  priceIds: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY
  }
}

/**
 * 🔧 Inicijalizuj Paddle.js
 * Poziva se jednom na stranici gde treba Paddle
 */
export function initializePaddle(onSuccess, onError) {
  // Proveri da li Paddle.js već postoji
  if (window.Paddle) {
    console.log('✅ Paddle.js already loaded')
    if (onSuccess) onSuccess(window.Paddle)
    return window.Paddle
  }

  // Load Paddle.js script dynamically
  const script = document.createElement('script')
  script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
  script.async = true
  
  script.onload = () => {
    if (window.Paddle) {
      // Initialize Paddle with environment and token
      window.Paddle.Environment.set(PADDLE_CONFIG.environment)
      window.Paddle.Initialize({
        token: PADDLE_CONFIG.clientToken,
        eventCallback: function(data) {
          // Global event handler za sve Paddle events
          console.log('🎯 Paddle Event:', data.name, data)
          
          // Možeš dodati custom logiku za različite events
          if (data.name === 'checkout.completed') {
            console.log('✅ Checkout completed!', data)
          }
        }
      })
      
      console.log('✅ Paddle.js initialized successfully')
      if (onSuccess) onSuccess(window.Paddle)
    }
  }
  
  script.onerror = () => {
    console.error('❌ Failed to load Paddle.js')
    if (onError) onError(new Error('Failed to load Paddle.js'))
  }
  
  document.head.appendChild(script)
}

/**
 * 💳 Otvori Paddle Checkout za PRO subscription
 * 
 * @param {Object} options - Checkout opcije
 * @param {string} options.priceId - Paddle Price ID (monthly ili yearly)
 * @param {string} options.customerId - Paddle Customer ID (ako postoji)
 * @param {string} options.email - Korisnikov email
 * @param {string} options.majstorId - Majstor ID iz Supabase
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
export async function openPaddleCheckout(options) {
  const {
    priceId,
    customerId,
    email,
    majstorId,
    billingInterval = 'monthly', // 'monthly' ili 'yearly'
    onSuccess,
    onError
  } = options

  if (!window.Paddle) {
    const error = new Error('Paddle.js is not loaded')
    console.error('❌', error)
    if (onError) onError(error)
    return
  }

  try {
    // 🔧 Pripremi checkout items
    const items = [{
      priceId: priceId,
      quantity: 1
    }]

    // 🔧 Pripremi custom data za webhook
    const customData = {
      majstor_id: majstorId,
      billing_interval: billingInterval,
      source: 'choose_plan_page'
    }

    // 🔧 Checkout Settings
    const checkoutSettings = {
      displayMode: 'overlay', // ili 'inline'
      theme: 'dark', // 'light' ili 'dark'
      locale: 'de', // Nemački jezik
      allowLogout: false,
      frameTarget: 'checkout-container',
      frameInitialHeight: 450,
      frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
      successUrl: `${window.location.origin}/dashboard?paddle_success=true&plan=${billingInterval}`
    }

    // 🎯 Paddle Checkout Configuration
    const checkoutConfig = {
      items: items,
      customData: customData,
      settings: checkoutSettings
    }

    // Dodaj customer email ako postoji
    if (email) {
      checkoutConfig.customer = {
        email: email
      }
    }

    // Dodaj existing customer ID ako postoji
    if (customerId) {
      checkoutConfig.customer = {
        ...checkoutConfig.customer,
        id: customerId
      }
    }

    console.log('🚀 Opening Paddle Checkout with config:', checkoutConfig)

    // 🎯 Otvori Paddle Checkout sa event callback-ima
    window.Paddle.Checkout.open({
      ...checkoutConfig,
      eventCallback: function(event) {
        console.log('🎯 Paddle Event:', event.name, event)
        
        // Handle success events
        if (event.name === 'checkout.completed' || event.name === 'checkout.payment.initiated') {
          console.log('✅ Checkout completed successfully!')
             markPaymentJustCompleted()
          
          if (onSuccess) {
            onSuccess(event.data)
          }
        }
        
        // Handle error events
        if (event.name === 'checkout.error') {
          console.error('❌ Checkout error:', event.data)
          if (onError) {
            onError(event.data)
          }
        }
        
        // Handle close events
        if (event.name === 'checkout.closed') {
          console.log('ℹ️ Checkout closed')
        }
      }
    })

  } catch (error) {
    console.error('❌ Error opening Paddle Checkout:', error)
    if (onError) onError(error)
  }
}

/**
 * 🔄 Otvori Paddle Update Payment Method
 * Koristi se za promenu payment metoda za postojeću subscription
 */
export function openUpdatePaymentMethod(subscriptionId, onSuccess, onError) {
  if (!window.Paddle) {
    const error = new Error('Paddle.js is not loaded')
    console.error('❌', error)
    if (onError) onError(error)
    return
  }

  try {
    window.Paddle.Checkout.updatePaymentMethod({
      subscriptionId: subscriptionId,
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'de'
      }
    })

    if (onSuccess) {
      window.Paddle.on('checkout.payment.selected', (data) => {
        console.log('✅ Payment method updated:', data)
        onSuccess(data)
      })
    }

  } catch (error) {
    console.error('❌ Error updating payment method:', error)
    if (onError) onError(error)
  }
}

/**
 * 🔗 Generiši Paddle Customer Portal Link
 * Korisnici mogu da upravljaju svojim subscription kroz Customer Portal
 */
export function getPaddleCustomerPortalUrl(customerId, subscriptionId) {
  if (PADDLE_CONFIG.environment === 'sandbox') {
    return `https://sandbox-vendors.paddle.com/customers/${customerId}/subscriptions/${subscriptionId}`
  }
  return `https://vendors.paddle.com/customers/${customerId}/subscriptions/${subscriptionId}`
}

/**
 * 📊 Format price sa VAT info
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
 * ✅ Validate Paddle Config
 * Proveri da li su svi potrebni credentials postavljeni
 */
export function validatePaddleConfig() {
  const errors = []

  if (!PADDLE_CONFIG.clientToken) {
    errors.push('Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN')
  }

  if (!PADDLE_CONFIG.priceIds.monthly) {
    errors.push('Missing NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY')
  }

  if (!PADDLE_CONFIG.priceIds.yearly) {
    errors.push('Missing NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY')
  }

  if (errors.length > 0) {
    console.error('❌ Paddle Configuration Errors:', errors)
    return false
  }

  console.log('✅ Paddle configuration is valid')
  return true
}

/**
 * 🧪 Test Paddle Connection
 * Debugging funkcija za testiranje Paddle setup-a
 */
export async function testPaddleConnection() {
  if (!window.Paddle) {
    console.error('❌ Paddle.js not loaded')
    return false
  }

  try {
    // Paddle Status check
    const status = window.Paddle.Status.get()
    console.log('🔍 Paddle Status:', status)
    
    console.log('🔍 Paddle Environment:', PADDLE_CONFIG.environment)
    console.log('🔍 Price IDs:', PADDLE_CONFIG.priceIds)
    
    return true
  } catch (error) {
    console.error('❌ Paddle connection test failed:', error)
    return false
  }
}