// lib/hooks/useSubscription.js - OPTIMIZED WITH REQUEST DEDUPLICATION
'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// 🚀 CACHE + REQUEST DEDUPLICATION to prevent race conditions
const subscriptionCache = new Map()
const pendingRequests = new Map() // Track in-flight requests
const cacheExpiry = 5 * 60 * 1000 // 5 minutes

/**
 * Hook za upravljanje pretplatama korisnika
 * OPTIMIZED: Cached + deduplicated version to prevent multiple API calls
 */
export function useSubscription(majstorId) {
  const [subscription, setSubscription] = useState(null)
  const [plan, setPlan] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 🔥 Handle expired trial transition
  const handleExpiredTrial = useCallback(async (expiredSubscription) => {
    try {
      console.log('🕒 Handling expired trial for user:', majstorId)
      
      // Update expired trial status in database
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', expiredSubscription.id)

      if (updateError) {
        console.error('Failed to update expired trial:', updateError)
      } else {
        console.log('✅ Trial marked as expired in database')
      }

      // Get freemium plan for fallback
      const { data: freemiumPlan, error: freemiumError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'freemium')
        .single()

      if (!freemiumError && freemiumPlan) {
        console.log('📱 Falling back to freemium plan')
        setPlan(freemiumPlan)
        setSubscription(null)
        
        // Load freemium features
        await loadPlanFeatures(freemiumPlan.id)
      }

    } catch (err) {
      console.error('Error handling expired trial:', err)
    }
  }, [majstorId])

  // 🔥 Load plan features
  const loadPlanFeatures = useCallback(async (planId) => {
    if (!planId) return []

    try {
      const { data: featuresData, error: featuresError } = await supabase
        .from('subscription_features')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_enabled', true)

      if (!featuresError) {
        console.log(`📋 Loaded ${featuresData?.length || 0} features for plan ${planId}`)
        return featuresData || []
      }
      return []
    } catch (err) {
      console.error('Error loading plan features:', err)
      return []
    }
  }, [])

  // 🚀 DEDUPLICATED: Load subscription data with request deduplication
  const loadSubscription = useCallback(async () => {
    if (!majstorId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      // 🚀 CHECK CACHE FIRST
      const cacheKey = majstorId
      const cached = subscriptionCache.get(cacheKey)
      
      if (cached && (Date.now() - cached.timestamp < cacheExpiry)) {
        console.log('🚀 Using cached subscription data for:', majstorId)
        setSubscription(cached.subscription)
        setPlan(cached.plan) 
        setFeatures(cached.features)
        setLoading(false)
        return
      }

      // 🚀 CHECK IF REQUEST IS ALREADY IN PROGRESS
      if (pendingRequests.has(cacheKey)) {
        console.log('⏳ Waiting for existing request for:', majstorId)
        const existingPromise = pendingRequests.get(cacheKey)
        const result = await existingPromise
        
        // Set states from the shared result
        setSubscription(result.subscription)
        setPlan(result.plan)
        setFeatures(result.features)
        setLoading(false)
        return
      }

      // 🚀 CREATE NEW REQUEST AND STORE PROMISE
      console.log('🔄 Starting new subscription request for:', majstorId)
      setLoading(true)

      const requestPromise = (async () => {
        try {
          // Step 1: Get user's latest subscription (including expired ones)
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

          // Step 2: Check if we have any subscription
          if (!latestSubscription) {
            console.log('👤 No subscription found - using freemium')
            
            // Load freemium plan
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
            // Step 3: Check subscription status and expiration
            const now = new Date()
            const subscription = latestSubscription
            let isActive = false
            let isExpired = false

            if (subscription.status === 'trial') {
              const trialEnd = new Date(subscription.trial_ends_at)
              isActive = trialEnd > now
              isExpired = trialEnd <= now
              
              console.log('⏱️ Trial status:', { 
                trialEnd: trialEnd.toISOString(), 
                now: now.toISOString(), 
                isActive, 
                isExpired 
              })
            } else if (subscription.status === 'active') {
              const periodEnd = new Date(subscription.current_period_end)
              isActive = periodEnd > now
              isExpired = periodEnd <= now
            } else if (subscription.status === 'expired' || subscription.status === 'cancelled') {
              isActive = false
              isExpired = true
            }

            // Step 4: Handle active subscription
            if (isActive && !isExpired) {
              console.log('✅ Active subscription found:', subscription.subscription_plans.name)
              finalSubscription = subscription
              finalPlan = subscription.subscription_plans
              finalFeatures = await loadPlanFeatures(subscription.subscription_plans.id)
            } else if (subscription.status === 'trial' && isExpired) {
              // Step 5: Handle expired trial specifically
              console.log('🕒 Trial expired, transitioning to freemium')
              await handleExpiredTrial(subscription)
              
              // Get freemium after trial expiry
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
              // Step 6: Handle other expired subscriptions
              console.log('💳 Subscription expired, falling back to freemium')
              
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
              // Step 7: Fallback to freemium for unknown states
              console.log('❓ Unknown subscription state, falling back to freemium')
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

          // 🚀 CACHE THE RESULT
          if (finalPlan) {
            subscriptionCache.set(cacheKey, {
              ...result,
              timestamp: Date.now()
            })
            console.log('🚀 Cached subscription data for:', majstorId)
          }

          return result
        } finally {
          // Always clean up the pending request
          pendingRequests.delete(cacheKey)
        }
      })()

      // Store the promise so other calls can wait for it
      pendingRequests.set(cacheKey, requestPromise)

      // Await the result
      const result = await requestPromise

      // Set states from result
      setSubscription(result.subscription)
      setPlan(result.plan)
      setFeatures(result.features)

    } catch (err) {
      console.error('❌ Error loading subscription:', err)
      setError(err.message)
      
      // Clean up pending request on error
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

  // Load data on mount and majstor change
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // 🔥 Helper functions
  
  // Check if user has access to specific feature
  const hasFeatureAccess = useCallback((featureKey) => {
    const hasAccess = features.some(feature => feature.feature_key === featureKey)
    // Reduced logging to avoid spam
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Feature access check: ${featureKey} = ${hasAccess}`, { 
        planName: plan?.name, 
        featuresCount: features.length 
      })
    }
    return hasAccess
  }, [features, plan])

  // Check if subscription is in trial period
  const isInTrial = useCallback(() => {
    if (!subscription || subscription.status !== 'trial') return false
    return new Date(subscription.trial_ends_at) > new Date()
  }, [subscription])

  // Get remaining trial days
  const getTrialDaysRemaining = useCallback(() => {
    if (!subscription || subscription.status !== 'trial') return 0
    
    const now = new Date()
    const trialEnd = new Date(subscription.trial_ends_at)
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }, [subscription])

  // Check if subscription is active (not expired)
  const isActive = useCallback(() => {
    // If no subscription, check if we're on freemium
    if (!subscription) {
      return plan?.name === 'freemium'
    }

    // Check subscription status and expiration
    const now = new Date()
    
    if (subscription.status === 'trial') {
      return new Date(subscription.trial_ends_at) > now
    }
    
    if (subscription.status === 'active') {
      return new Date(subscription.current_period_end) > now
    }

    return false
  }, [subscription, plan])

  // Get plan limits
  const getPlanLimit = useCallback((featureKey) => {
    const feature = features.find(f => f.feature_key === featureKey)
    return feature?.limit_value || null
  }, [features])

  // 🚀 Clear cache function for manual refresh
  const refresh = useCallback(() => {
    if (majstorId) {
      subscriptionCache.delete(majstorId)
      pendingRequests.delete(majstorId) // Also clear any pending requests
      loadSubscription()
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

// 🚀 CACHE MANAGEMENT
export function clearSubscriptionCache(majstorId = null) {
  if (majstorId) {
    subscriptionCache.delete(majstorId)
    pendingRequests.delete(majstorId) // Also clear pending requests
    console.log('🚀 Cleared cache for user:', majstorId)
  } else {
    subscriptionCache.clear()
    pendingRequests.clear() // Clear all pending requests
    console.log('🚀 Cleared all subscription cache')
  }
}

// Export cache stats for debugging
export function getSubscriptionCacheStats() {
  return {
    cacheSize: subscriptionCache.size,
    pendingRequests: pendingRequests.size,
    cachedUsers: Array.from(subscriptionCache.keys()),
    pendingUsers: Array.from(pendingRequests.keys())
  }
}

// 🔥 Database function for automatic trial cleanup (optional)
export async function cleanupExpiredTrials() {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_trials')
    if (error) throw error
    console.log('✅ Cleaned up expired trials:', data)
    return data
  } catch (error) {
    console.error('Failed to cleanup expired trials:', error)
    return null
  }
}

// Existing helper functions remain the same...
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

export async function createTrialSubscription(majstorId, planName = 'pro') {
  try {
    // Clear cache when creating new subscription
    clearSubscriptionCache(majstorId)
    
    // Get plan ID
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', planName)
      .single()

    if (planError) throw planError

    // Create subscription
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
    return data
  } catch (error) {
    console.error('Error creating trial subscription:', error)
    throw error
  }
}