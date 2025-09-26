// lib/hooks/useSubscription.js - FIXED VERSION
'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Hook za upravljanje pretplatama korisnika
 * FIXED: Correct plan name for trial creation
 */
export function useSubscription(majstorId) {
  const [subscription, setSubscription] = useState(null)
  const [plan, setPlan] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 🔥 NEW: Handle expired trial transition
  const handleExpiredTrial = useCallback(async (expiredSubscription) => {
    try {
      console.log('🕐 Handling expired trial for user:', majstorId)
      
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
        setSubscription(null) // Clear expired subscription
        
        // Load freemium features
        await loadPlanFeatures(freemiumPlan.id)
      }

    } catch (err) {
      console.error('Error handling expired trial:', err)
    }
  }, [majstorId])

  // 🔥 IMPROVED: Load plan features
  const loadPlanFeatures = useCallback(async (planId) => {
    if (!planId) return

    try {
      const { data: featuresData, error: featuresError } = await supabase
        .from('subscription_features')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_enabled', true)

      if (!featuresError) {
        setFeatures(featuresData || [])
        console.log(`📋 Loaded ${featuresData?.length || 0} features for plan ${planId}`)
      }
    } catch (err) {
      console.error('Error loading plan features:', err)
    }
  }, [])

  // 🔥 IMPROVED: Load subscription data with expired trial handling
  const loadSubscription = useCallback(async () => {
    if (!majstorId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Loading subscription for user:', majstorId)

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
        .maybeSingle() // Use maybeSingle to avoid errors when no data found

      if (latestError && latestError.code !== 'PGRST116') {
        throw latestError
      }

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
          setPlan(freemiumPlan)
          setSubscription(null)
          await loadPlanFeatures(freemiumPlan.id)
        }
        return
      }

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
        setSubscription(subscription)
        setPlan(subscription.subscription_plans)
        await loadPlanFeatures(subscription.subscription_plans.id)
        return
      }

      // Step 5: Handle expired trial specifically
      if (subscription.status === 'trial' && isExpired) {
        console.log('🕐 Trial expired, transitioning to freemium')
        await handleExpiredTrial(subscription)
        return
      }

      // Step 6: Handle other expired subscriptions
      if (isExpired) {
        console.log('💳 Subscription expired, falling back to freemium')
        
        // Get freemium plan
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
        return
      }

      // Step 7: Fallback to freemium for unknown states
      console.log('❓ Unknown subscription state, falling back to freemium')
      const { data: freemiumPlan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'freemium')
        .single()

      if (freemiumPlan) {
        setPlan(freemiumPlan)
        setSubscription(null)
        await loadPlanFeatures(freemiumPlan.id)
      }

    } catch (err) {
      console.error('❌ Error loading subscription:', err)
      setError(err.message)
      
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
          await loadPlanFeatures(freemiumPlan.id)
        }
      } catch (fallbackErr) {
        console.error('Failed to load freemium fallback:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }, [majstorId])

  // Load data on mount and majstor change
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // 🔥 IMPROVED: Helper functions with better expired trial handling
  
  // Check if user has access to specific feature
  const hasFeatureAccess = useCallback((featureKey) => {
    const hasAccess = features.some(feature => feature.feature_key === featureKey)
    console.log(`🔍 Feature access check: ${featureKey} = ${hasAccess}`, { 
      planName: plan?.name, 
      featuresCount: features.length 
    })
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
    refresh: loadSubscription
  }
}

// Existing helper functions...
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

// 🔥 FIXED: Correct plan name for trial
export async function createTrialSubscription(majstorId, planName = 'pro') {
  try {
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