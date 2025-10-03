// lib/hooks/useSubscription.js - FINAL FIXED VERSION
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Cache + Request Deduplication
const subscriptionCache = new Map()
const pendingRequests = new Map()
const cacheExpiry = 5 * 1000 // 5 seconds for cache

/**
 * 🎯 REFRESH LOGIC:
 * - Odmah nakon plaćanja: JEDAN refresh nakon 1 sekunde
 * - Normalno: refresh svakih 3 minuta
 */
const INITIAL_REFRESH_DELAY = 1000 // 1 sekunda nakon plaćanja
const SLOW_REFRESH_INTERVAL = 3 * 60 * 1000 // 3 minuta

/**
 * 🎯 NOVI MODEL:
 * - 7-day trial = majstors.subscription_status='trial', NEMA user_subscriptions unosa
 * - Freemium = user_subscriptions sa plan_id='freemium', status='active'
 * - PRO = user_subscriptions sa plan_id='pro', status='active' (sa Paddle ID)
 */
export function useSubscription(majstorId) {
  const [subscription, setSubscription] = useState(null)
  const [plan, setPlan] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [majstorData, setMajstorData] = useState(null) // 🔥 NOVO: Za 7-day trial

  // Tracking za refresh
  const intervalRef = useRef(null)
  const initialRefreshDoneRef = useRef(false)

  // Handle expired trial transition
  const handleExpiredTrial = useCallback(async (expiredSubscription) => {
    try {
      console.log('Handling expired trial for user:', majstorId)
      
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', expiredSubscription.id)

      if (updateError) {
        console.error('Failed to update expired trial:', updateError)
      }

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
      console.error('Error handling expired trial:', err)
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
          setMajstorData(cached.majstorData) // 🔥 NOVO
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
        setMajstorData(result.majstorData) // 🔥 NOVO
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
          let finalMajstorData = null

          if (!latestSubscription) {
            console.log('No subscription found - checking majstor status')
            
            // 🔥 NOVO: Proveri majstors.subscription_status
            const { data: majstorDataResult } = await supabase
              .from('majstors')
              .select('subscription_status, subscription_ends_at')
              .eq('id', majstorId)
              .single()
            
            if (majstorDataResult?.subscription_status === 'trial' || 
                (majstorDataResult?.subscription_status === null && majstorDataResult?.subscription_ends_at)) {
              // 7-day trial - može biti 'trial' ili NULL sa subscription_ends_at
              console.log('✅ User is in 7-day trial - no plan needed')
              finalPlan = null
              finalFeatures = []
              finalMajstorData = majstorDataResult
            } else {
              // Freemium
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
            }
          } else {
            // Check subscription status and expiration
            const now = new Date()
            const subscription = latestSubscription
            let isActive = false
            let isExpired = false

            if (subscription.status === 'trial') {
              const trialEnd = new Date(subscription.trial_ends_at)
              isActive = trialEnd > now
              isExpired = trialEnd <= now
            } else if (subscription.status === 'active') {
              const periodEnd = new Date(subscription.current_period_end)
              isActive = periodEnd > now
              isExpired = periodEnd <= now
            } else if (subscription.status === 'expired' || subscription.status === 'cancelled') {
              isActive = false
              isExpired = true
            }

            if (isActive && !isExpired) {
              console.log('✅ Active subscription found:', subscription.subscription_plans.name)
              finalSubscription = subscription
              finalPlan = subscription.subscription_plans
              finalFeatures = await loadPlanFeatures(subscription.subscription_plans.id)
            } else if (subscription.status === 'trial' && isExpired) {
              console.log('Trial expired, transitioning to freemium')
              await handleExpiredTrial(subscription)
              
              const { data: freemiumPlan } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('name', 'freemium')
                .single()

              if (freemiumPlan) {
                finalPlan = freemiumPlan
                finalFeatures = await loadPlanFeatures(freemiumPlan.id)
              }
            } else if (isExpired) {
              console.log('Subscription expired, falling back to freemium')
              
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
            features: finalFeatures,
            majstorData: finalMajstorData // 🔥 NOVO
          }

          // Cache the result
          if (finalPlan || finalMajstorData) {
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
      setMajstorData(result.majstorData) // 🔥 NOVO

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
  }, [majstorId, handleExpiredTrial, loadPlanFeatures])

  // Load data on mount
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // 🎯 SMART AUTO-REFRESH LOGIC
  useEffect(() => {
    if (!majstorId) return

    // Proveri da li je korisnik upravo napravio plaćanje
    const checkIfJustPaid = () => {
      // 1. Proveri URL parametre (from Paddle success redirect)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('paddle_success') === 'true') {
          return true
        }
      }

      // 2. Proveri localStorage flag
      if (typeof window !== 'undefined') {
        const justPaidFlag = localStorage.getItem('paddle_just_paid')
        if (justPaidFlag) {
          const timestamp = parseInt(justPaidFlag)
          const age = Date.now() - timestamp
          // Flag važi 30 sekundi
          if (age < 30000) {
            return true
          } else {
            // Očisti stari flag
            localStorage.removeItem('paddle_just_paid')
          }
        }
      }

      return false
    }

    const isJustPaid = checkIfJustPaid()

    // Očisti postojeći interval/timeout
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      clearTimeout(intervalRef.current)
    }

    if (isJustPaid && !initialRefreshDoneRef.current) {
      // 🚀 INITIAL REFRESH - samo jedan put nakon 1 sekunde
      console.log('💳 Payment detected - scheduling ONE refresh after 1 second')
      
      const timeoutId = setTimeout(() => {
        console.log('🔄 Initial refresh after payment')
        loadSubscription(true)
        initialRefreshDoneRef.current = true
        
        // Očisti payment flag
        if (typeof window !== 'undefined') {
          localStorage.removeItem('paddle_just_paid')
          // Očisti URL parametar
          const url = new URL(window.location.href)
          url.searchParams.delete('paddle_success')
          window.history.replaceState({}, '', url.toString())
        }

        // Nakon initial refresh-a, postavi slow refresh interval
        console.log('🐌 Starting SLOW refresh mode (every 3 minutes)')
        intervalRef.current = setInterval(() => {
          console.log('🐌 Slow refresh')
          loadSubscription(true)
        }, SLOW_REFRESH_INTERVAL)

      }, INITIAL_REFRESH_DELAY)

      intervalRef.current = timeoutId

    } else {
      // 🐌 SPOR REFRESH - normalan rad
      console.log('🐌 Starting SLOW refresh mode (every 3 minutes)')
      intervalRef.current = setInterval(() => {
        console.log('🐌 Slow refresh')
        loadSubscription(true)
      }, SLOW_REFRESH_INTERVAL)
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        clearTimeout(intervalRef.current)
      }
    }
  }, [majstorId, loadSubscription])

  // Helper functions
  
  const hasFeatureAccess = useCallback((featureKey) => {
    // 🔥 NOVO: Trial ima pristup SVIM features
    // Proveri direktno bez pozivanja isInTrial() da izbegnemo circular dependency
    if (!subscription && plan === null && majstorData) {
      if (majstorData.subscription_status === 'trial' || 
          (majstorData.subscription_status === null && majstorData.subscription_ends_at)) {
        return true  // ✅ Trial = full access to all features
      }
    }
    
    const hasAccess = features.some(feature => feature.feature_key === featureKey)
    return hasAccess
  }, [features, subscription, plan, majstorData])

  const isInTrial = useCallback(() => {
    // 🔥 NOVO: Trial može biti 'trial' ili NULL sa subscription_ends_at
    if (!subscription && plan === null && majstorData) {
      // Proveri da li je trial status ili NULL sa end date
      if (majstorData.subscription_status === 'trial' || 
          (majstorData.subscription_status === null && majstorData.subscription_ends_at)) {
        return true
      }
    }
    if (!subscription || subscription.status !== 'trial') return false
    return new Date(subscription.trial_ends_at) > new Date()
  }, [subscription, plan, majstorData])

  const getTrialDaysRemaining = useCallback(() => {
    // 🔥 NOVO: 7-day trial (bez subscription unosa)
    if (!subscription && majstorData?.subscription_status === 'trial' && majstorData?.subscription_ends_at) {
      const now = new Date()
      const trialEnd = new Date(majstorData.subscription_ends_at)
      const diffTime = trialEnd.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return Math.max(0, diffDays)
    }
    
    // Original logic za subscription.trial
    if (!subscription || subscription.status !== 'trial') return 0
    
    const now = new Date()
    const trialEnd = new Date(subscription.trial_ends_at)
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }, [subscription, majstorData])

  const isActive = useCallback(() => {
    // 🔥 NOVO: 7-day trial (status='trial' ili NULL sa end date) je aktivan
    if (!subscription && majstorData) {
      if (majstorData.subscription_status === 'trial' ||
          (majstorData.subscription_status === null && majstorData.subscription_ends_at)) {
        if (!majstorData.subscription_ends_at) return true
        return new Date(majstorData.subscription_ends_at) > new Date()
      }
    }
    
    if (!subscription) {
      return plan?.name === 'freemium'
    }

    const now = new Date()
    
    if (subscription.status === 'trial') {
      return new Date(subscription.trial_ends_at) > now
    }
    
    if (subscription.status === 'active') {
      return new Date(subscription.current_period_end) > now
    }

    return false
  }, [subscription, plan, majstorData])

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
 * 💳 Helper: Označi da je korisnik upravo napravio plaćanje
 * Pozovi ovu funkciju ODMAH posle uspešnog Paddle checkout-a
 */
export function markPaymentJustCompleted() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('paddle_just_paid', Date.now().toString())
    console.log('💳 Payment marked - ONE refresh in 1 second')
  }
}

// Helper: Create trial subscription (for testing/onboarding)
export async function createTrialSubscription(majstorId, planName = 'pro') {
  try {
    clearSubscriptionCache(majstorId)
    
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', planName)
      .single()

    if (planError) throw planError

    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        majstor_id: majstorId,
        plan_id: plan.id,
        status: 'trial',
        trial_starts_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (error) throw error
    
    clearSubscriptionCache(majstorId)
    
    return data
  } catch (error) {
    console.error('Error creating trial subscription:', error)
    throw error
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

// Database function for automatic trial cleanup (optional)
export async function cleanupExpiredTrials() {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_trials')
    if (error) throw error
    console.log('Cleaned up expired trials:', data)
    return data
  } catch (error) {
    console.error('Failed to cleanup expired trials:', error)
    return null
  }
}