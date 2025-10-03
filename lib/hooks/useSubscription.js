// lib/hooks/useSubscription.js - REFACTORED (NO TRIAL)
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Cache + Request Deduplication
const subscriptionCache = new Map()
const pendingRequests = new Map()
const cacheExpiry = 5 * 1000 // 5 seconds

/**
 * 🎯 SIMPLIFIED SUBSCRIPTION MODEL:
 * - No subscription in DB = FREEMIUM (free features)
 * - Active subscription = PRO (all features)
 * - Paddle handles 30-day grace period automatically
 */
export function useSubscription(majstorId) {
  const [subscription, setSubscription] = useState(null)
  const [plan, setPlan] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const intervalRef = useRef(null)

  // Handle expired subscription transition
  const handleExpiredSubscription = useCallback(async (expiredSub) => {
    try {
      console.log('⚠️ Handling expired subscription for user:', majstorId)
      
      // Mark as expired
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', expiredSub.id)

      if (updateError) {
        console.error('Failed to update expired subscription:', updateError)
      }

      // Load freemium plan
      const { data: freemiumPlan, error: freemiumError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'freemium')
        .single()

      if (!freemiumError && freemiumPlan) {
        setPlan(freemiumPlan)
        setSubscription(null)
        await loadPlanFeatures(freemiumPlan.id)
      }

    } catch (err) {
      console.error('Error handling expired subscription:', err)
    }
  }, [majstorId])

  // Load plan features
  const loadPlanFeatures = useCallback(async (planId) => {
    if (!planId) return []

    try {
      const { data: featuresData, error: featuresError } = await supabase
        .from('subscription_features')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_enabled', true)

      if (!featuresError) {
        return featuresData || []
      }
      return []
    } catch (err) {
      console.error('Error loading plan features:', err)
      return []
    }
  }, [])

  // Load subscription data
  const loadSubscription = useCallback(async (forceRefresh = false) => {
    if (!majstorId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cacheKey = majstorId
        const cached = subscriptionCache.get(cacheKey)
        
        if (cached && (Date.now() - cached.timestamp < cacheExpiry)) {
          console.log('✅ Using cached subscription data')
          setSubscription(cached.subscription)
          setPlan(cached.plan)
          setFeatures(cached.features)
          setLoading(false)
          return
        }
      } else {
        console.log('🔄 Force refresh - skipping cache')
      }

      // Check if request already in progress
      const cacheKey = majstorId
      if (pendingRequests.has(cacheKey) && !forceRefresh) {
        console.log('⏳ Waiting for existing request')
        const existingPromise = pendingRequests.get(cacheKey)
        const result = await existingPromise
        
        setSubscription(result.subscription)
        setPlan(result.plan)
        setFeatures(result.features)
        setLoading(false)
        return
      }

      // Create new request
      console.log('🚀 Starting new subscription request')
      setLoading(true)

      const requestPromise = (async () => {
        try {
          // Get user's latest subscription
          const { data: latestSubscription, error: latestError } = await supabase
            .from('user_subscriptions')
            .select(`
              *,
              subscription_plans (
                id,
                name,
                display_name,
                description,
                price_monthly
              )
            `)
            .eq('majstor_id', majstorId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (latestError && latestError.code !== 'PGRST116') {
            throw latestError
          }

          let finalSubscription = null
          let finalPlan = null
          let finalFeatures = []

          if (!latestSubscription) {
            // No subscription = FREEMIUM
            console.log('No subscription found - using freemium')
            
            const { data: freemiumPlan, error: freemiumError } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('name', 'freemium')
              .single()

            if (!freemiumError && freemiumPlan) {
              finalPlan = freemiumPlan
              finalFeatures = await loadPlanFeatures(freemiumPlan.id)
            }
          } else {
            // Check subscription status and expiration
            const now = new Date()
            const subscription = latestSubscription
            let isActive = false
            let isExpired = false

            if (subscription.status === 'active') {
              const periodEnd = new Date(subscription.current_period_end)
              isActive = periodEnd > now
              isExpired = periodEnd <= now
            } else if (subscription.status === 'expired' || subscription.status === 'cancelled') {
              isActive = false
              isExpired = true
            }

            if (isActive && !isExpired) {
              // Active PRO subscription
              console.log('✅ Active subscription found:', subscription.subscription_plans.name)
              finalSubscription = subscription
              finalPlan = subscription.subscription_plans
              finalFeatures = await loadPlanFeatures(subscription.subscription_plans.id)
            } else if (isExpired) {
              // Expired subscription - fall back to freemium
              console.log('Subscription expired, falling back to freemium')
              await handleExpiredSubscription(subscription)
              
              const { data: freemiumPlan } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('name', 'freemium')
                .single()

              if (freemiumPlan) {
                finalPlan = freemiumPlan
                finalFeatures = await loadPlanFeatures(freemiumPlan.id)
              }
            } else {
              // Unknown state - fall back to freemium
              console.log('Unknown subscription state, falling back to freemium')
              const { data: freemiumPlan } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('name', 'freemium')
                .single()

              if (freemiumPlan) {
                finalPlan = freemiumPlan
                finalFeatures = await loadPlanFeatures(freemiumPlan.id)
              }
            }
          }

          const result = {
            subscription: finalSubscription,
            plan: finalPlan,
            features: finalFeatures
          }

          // Cache the result
          if (finalPlan) {
            subscriptionCache.set(cacheKey, {
              ...result,
              timestamp: Date.now()
            })
            console.log('💾 Cached subscription data')
          }

          return result
        } finally {
          pendingRequests.delete(cacheKey)
        }
      })()

      pendingRequests.set(cacheKey, requestPromise)
      const result = await requestPromise

      setSubscription(result.subscription)
      setPlan(result.plan)
      setFeatures(result.features)

    } catch (err) {
      console.error('Error loading subscription:', err)
      setError(err.message)
      
      pendingRequests.delete(majstorId)
      
      // Fallback to freemium on error
      try {
        const { data: freemiumPlan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', 'freemium')
          .single()

        if (freemiumPlan) {
          setPlan(freemiumPlan)
          setSubscription(null)
          const fallbackFeatures = await loadPlanFeatures(freemiumPlan.id)
          setFeatures(fallbackFeatures)
        }
      } catch (fallbackErr) {
        console.error('Failed to load freemium fallback:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }, [majstorId, handleExpiredSubscription, loadPlanFeatures])

  // Load data on mount
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // 🎯 SIMPLIFIED AUTO-REFRESH LOGIC
  useEffect(() => {
    if (!majstorId) return

    // Check if just paid (from Paddle redirect)
    const urlParams = new URLSearchParams(window.location.search)
    const justPaid = urlParams.get('paddle_success') === 'true'
    
    if (justPaid) {
      console.log('💳 Payment detected - refreshing subscription...')
      
      // Multiple refresh attempts to catch webhook updates
      setTimeout(() => loadSubscription(true), 1000)   // 1 second
      setTimeout(() => loadSubscription(true), 3000)   // 3 seconds
      setTimeout(() => loadSubscription(true), 6000)   // 6 seconds
      setTimeout(() => loadSubscription(true), 10000)  // 10 seconds
      
      // Clear URL parameter
      const url = new URL(window.location.href)
      url.searchParams.delete('paddle_success')
      window.history.replaceState({}, '', url.toString())
    }

    // Normal refresh every 3 minutes
    const interval = setInterval(() => {
      console.log('🔄 Periodic subscription refresh')
      loadSubscription(true)
    }, 3 * 60 * 1000)

    return () => clearInterval(interval)
  }, [majstorId, loadSubscription])

  // Helper functions
  
  const hasFeatureAccess = useCallback((featureKey) => {
    return features.some(feature => feature.feature_key === featureKey)
  }, [features])

  const isInTrial = useCallback(() => {
    return false  // No trial period
  }, [])

  const getTrialDaysRemaining = useCallback(() => {
    return 0  // No trial period
  }, [])

  const isActive = useCallback(() => {
    // No subscription = freemium (active)
    if (!subscription) {
      return plan?.name === 'freemium'
    }

    const now = new Date()
    
    // PRO subscription - check if still valid
    if (subscription.status === 'active') {
      return new Date(subscription.current_period_end) > now
    }

    return false
  }, [subscription, plan])

  const getPlanLimit = useCallback((featureKey) => {
    const feature = features.find(f => f.feature_key === featureKey)
    return feature?.limit_value || null
  }, [features])

  // Force refresh function
  const refresh = useCallback(() => {
    if (majstorId) {
      console.log('🔄 Manual refresh requested')
      subscriptionCache.delete(majstorId)
      pendingRequests.delete(majstorId)
      loadSubscription(true)
    }
  }, [majstorId, loadSubscription])

  return {
    // Data
    subscription,
    plan,
    features,
    loading,
    error,

    // Status helpers
    isActive: isActive(),
    isInTrial: isInTrial(),
    trialDaysRemaining: getTrialDaysRemaining(),
    isPaid: subscription?.status === 'active',
    isFreemium: plan?.name === 'freemium',
    isExpired: subscription ? !isActive() : false,

    // Feature helpers
    hasFeatureAccess,
    getPlanLimit,

    // Actions
    refresh
  }
}

// Export helper functions
export function clearSubscriptionCache(majstorId = null) {
  if (majstorId) {
    subscriptionCache.delete(majstorId)
    pendingRequests.delete(majstorId)
    console.log('Cleared cache for user:', majstorId)
  } else {
    subscriptionCache.clear()
    pendingRequests.clear()
    console.log('Cleared all subscription cache')
  }
}

export function getSubscriptionCacheStats() {
  return {
    cacheSize: subscriptionCache.size,
    pendingRequests: pendingRequests.size,
    cachedUsers: Array.from(subscriptionCache.keys()),
    pendingUsers: Array.from(pendingRequests.keys())
  }
}

/**
 * 💳 Helper: Mark payment just completed
 * Call this immediately after successful Paddle checkout
 */
export function markPaymentJustCompleted() {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.set('paddle_success', 'true')
    window.history.replaceState({}, '', url.toString())
    console.log('💳 Payment marked - subscription will refresh')
  }
}

// Helper: Check feature access (RPC function)
export async function checkFeatureAccess(majstorId, featureKey) {
  try {
    const { data, error } = await supabase
      .rpc('has_feature_access', {
        majstor_uuid: majstorId,
        feature_key_param: featureKey
      })

    if (error) throw error
    return data === true
  } catch (error) {
    console.error('Error checking feature access:', error)
    return false
  }
}

// Helper: Check active subscription (RPC function)
export async function checkActiveSubscription(majstorId) {
  try {
    const { data, error } = await supabase
      .rpc('has_active_subscription', {
        majstor_uuid: majstorId
      })

    if (error) throw error
    return data === true
  } catch (error) {
    console.error('Error checking active subscription:', error)
    return false
  }
}

// Helper: Get current plan (RPC function)
export async function getCurrentPlan(majstorId) {
  try {
    const { data, error } = await supabase
      .rpc('get_user_current_plan', {
        majstor_uuid: majstorId
      })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error getting current plan:', error)
    return null
  }
}