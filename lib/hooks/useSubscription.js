// lib/hooks/useSubscription.js - FIXED WITH FASTER CACHE
'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Cache + Request Deduplication
const subscriptionCache = new Map()
const pendingRequests = new Map()
const cacheExpiry = 5 * 1000 // 5 seconds (was 30 seconds)

/**
 * Hook za upravljanje pretplatama korisnika
 * FIXED: Faster cache refresh + auto-update detection
 */
export function useSubscription(majstorId) {
  const [subscription, setSubscription] = useState(null)
  const [plan, setPlan] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
          console.log('Using cached subscription data for:', majstorId)
          setSubscription(cached.subscription)
          setPlan(cached.plan) 
          setFeatures(cached.features)
          setLoading(false)
          return
        }
      } else {
        console.log('Force refresh - skipping cache for:', majstorId)
      }

      // Check if request already in progress
      const cacheKey = majstorId
      if (pendingRequests.has(cacheKey) && !forceRefresh) {
        console.log('Waiting for existing request for:', majstorId)
        const existingPromise = pendingRequests.get(cacheKey)
        const result = await existingPromise
        
        setSubscription(result.subscription)
        setPlan(result.plan)
        setFeatures(result.features)
        setLoading(false)
        return
      }

      // Create new request
      console.log('Starting new subscription request for:', majstorId)
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
              console.log('Active subscription found:', subscription.subscription_plans.name)
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
            features: finalFeatures
          }

          // Cache the result (5 second expiry)
          if (finalPlan) {
            subscriptionCache.set(cacheKey, {
              ...result,
              timestamp: Date.now()
            })
            console.log('Cached subscription data for:', majstorId, '(expires in 5s)')
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
  }, [majstorId, handleExpiredTrial, loadPlanFeatures])

  // Load data on mount
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // Auto-refresh every 5 seconds to catch webhook updates
  useEffect(() => {
    if (!majstorId) return

    const interval = setInterval(() => {
      console.log('Auto-refreshing subscription data...')
      loadSubscription(true) // Force refresh
    }, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [majstorId, loadSubscription])

  // Helper functions
  
  const hasFeatureAccess = useCallback((featureKey) => {
    const hasAccess = features.some(feature => feature.feature_key === featureKey)
    return hasAccess
  }, [features])

  const isInTrial = useCallback(() => {
    if (!subscription || subscription.status !== 'trial') return false
    return new Date(subscription.trial_ends_at) > new Date()
  }, [subscription])

  const getTrialDaysRemaining = useCallback(() => {
    if (!subscription || subscription.status !== 'trial') return 0
    
    const now = new Date()
    const trialEnd = new Date(subscription.trial_ends_at)
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }, [subscription])

  const isActive = useCallback(() => {
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
  }, [subscription, plan])

  const getPlanLimit = useCallback((featureKey) => {
    const feature = features.find(f => f.feature_key === featureKey)
    return feature?.limit_value || null
  }, [features])

  // Force refresh function
  const refresh = useCallback(() => {
    if (majstorId) {
      console.log('Manual refresh requested for:', majstorId)
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