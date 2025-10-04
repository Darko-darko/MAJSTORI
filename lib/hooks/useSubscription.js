// lib/hooks/useSubscription.js - DETECT cancelled_at field
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const subscriptionCache = new Map()
const pendingRequests = new Map()
const cacheExpiry = 5 * 1000 // 5 seconds

export function useSubscription(majstorId) {
  const [subscription, setSubscription] = useState(null)
  const [plan, setPlan] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const intervalRef = useRef(null)

  const handleExpiredSubscription = useCallback(async (expiredSub) => {
    try {
      console.log('⚠️ Handling expired subscription for user:', majstorId)
      
      await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', expiredSub.id)

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

  const loadSubscription = useCallback(async (forceRefresh = false) => {
    if (!majstorId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      
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

      console.log('🚀 Starting new subscription request')
      setLoading(true)

      const requestPromise = (async () => {
        try {
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
            const now = new Date()
            const subscription = latestSubscription
            const periodEnd = new Date(subscription.current_period_end)
            
            let isActive = false
            let isExpired = false

            // 🔥 KRITIČNO: Detektuj cancelled_at pre svega!
            if (subscription.cancelled_at) {
              const cancelledDate = new Date(subscription.cancelled_at)
              
              // Ako je otkazano (ima cancelled_at)
              if (cancelledDate <= now) {
                console.log('🔥 DETECTED cancelled_at field!')
                console.log('Cancelled at:', subscription.cancelled_at)
                console.log('Current status in DB:', subscription.status)
                
                // 🔥 FORSIRAJ status na 'cancelled'
                subscription.status = 'cancelled'
                
                console.log('✅ Forcing status to "cancelled" due to cancelled_at field')
                
                // Proveri da li još važi
                isActive = periodEnd > now
                isExpired = periodEnd <= now
                
                console.log('Period end:', subscription.current_period_end)
                console.log('Is active (still valid):', isActive)
                console.log('Is expired:', isExpired)
              }
            }
            
            // Ako nije forsirano cancelled_at gore, proveri normalni status
            if (!subscription.cancelled_at) {
              if (subscription.status === 'trial') {
                isActive = periodEnd > now
                isExpired = periodEnd <= now
                console.log('🎯 Trial subscription:', {
                  active: isActive,
                  expired: isExpired,
                  daysLeft: Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
                })
              }
              else if (subscription.status === 'active') {
                isActive = periodEnd > now
                isExpired = periodEnd <= now
                console.log('💳 Active subscription:', {
                  active: isActive,
                  expired: isExpired
                })
              }
              else if (subscription.status === 'cancelled') {
                isActive = periodEnd > now
                isExpired = periodEnd <= now
                console.log('🚫 Cancelled subscription:', {
                  stillActive: isActive,
                  expired: isExpired,
                  daysLeft: Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
                })
              }
              else if (subscription.status === 'expired') {
                isActive = false
                isExpired = true
              }
            }

            if (isActive && !isExpired) {
              console.log('✅ Active subscription found:', subscription.subscription_plans.name)
              finalSubscription = subscription
              finalPlan = subscription.subscription_plans
              finalFeatures = await loadPlanFeatures(subscription.subscription_plans.id)
            } 
            else if (isExpired) {
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
            } 
            else {
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

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  useEffect(() => {
    if (!majstorId) return

    const urlParams = new URLSearchParams(window.location.search)
    const justPaid = urlParams.get('paddle_success') === 'true'
    
    if (justPaid) {
      console.log('💳 Payment detected - refreshing subscription...')
      
      setTimeout(() => loadSubscription(true), 1000)
      setTimeout(() => loadSubscription(true), 3000)
      setTimeout(() => loadSubscription(true), 6000)
      setTimeout(() => loadSubscription(true), 10000)
      
      const url = new URL(window.location.href)
      url.searchParams.delete('paddle_success')
      window.history.replaceState({}, '', url.toString())
    }

    const interval = setInterval(() => {
      console.log('🔄 Periodic subscription refresh')
      loadSubscription(true)
    }, 3 * 60 * 1000)

    return () => clearInterval(interval)
  }, [majstorId, loadSubscription])

  const hasFeatureAccess = useCallback((featureKey) => {
    return features.some(feature => feature.feature_key === featureKey)
  }, [features])

  const isInTrial = useCallback(() => {
    if (!subscription) return false
    
    const now = new Date()
    const periodEnd = new Date(subscription.current_period_end)
    
    return subscription.status === 'trial' && periodEnd > now
  }, [subscription])

  const getTrialDaysRemaining = useCallback(() => {
    if (!subscription || subscription.status !== 'trial') return 0
    
    const now = new Date()
    const periodEnd = new Date(subscription.current_period_end)
    const diffTime = periodEnd.getTime() - now.getTime()
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return daysLeft > 0 ? daysLeft : 0
  }, [subscription])

  const isActive = useCallback(() => {
    if (!subscription) {
      return plan?.name === 'freemium'
    }

    const now = new Date()
    const periodEnd = new Date(subscription.current_period_end)
    
    if (subscription.status === 'trial') {
      return periodEnd > now
    }
    
    if (subscription.status === 'active') {
      return periodEnd > now
    }
    
    if (subscription.status === 'cancelled') {
      return periodEnd > now
    }

    return false
  }, [subscription, plan])

  const getPlanLimit = useCallback((featureKey) => {
    const feature = features.find(f => f.feature_key === featureKey)
    return feature?.limit_value || null
  }, [features])

  const refresh = useCallback(() => {
    if (majstorId) {
      console.log('🔄 Manual refresh requested')
      subscriptionCache.delete(majstorId)
      pendingRequests.delete(majstorId)
      loadSubscription(true)
    }
  }, [majstorId, loadSubscription])

  return {
    subscription,
    plan,
    features,
    loading,
    error,

    isActive: isActive(),
    isInTrial: isInTrial(),
    trialDaysRemaining: getTrialDaysRemaining(),
    isPaid: subscription?.status === 'active',
    isFreemium: !subscription || plan?.name === 'freemium',
    isCancelled: subscription?.status === 'cancelled',
    isExpired: subscription?.status === 'expired',

    hasFeatureAccess,
    getPlanLimit,

    refresh
  }
}

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

export function markPaymentJustCompleted() {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.set('paddle_success', 'true')
    window.history.replaceState({}, '', url.toString())
    console.log('💳 Payment marked - subscription will refresh')
  }
}