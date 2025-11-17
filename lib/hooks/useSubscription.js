// lib/hooks/useSubscription.js - FINAL FIXED VERSION

'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const subscriptionCache = new Map()
const pendingRequests = new Map()
const cacheExpiry = 30 * 1000

// 🔥 GLOBAL FLAGS - shared across ALL hook instances!
const realtimeSetupFlags = new Map()

export function useSubscription(majstorId) {
  const [subscription, setSubscription] = useState(null)
  const [plan, setPlan] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleExpiredSubscription = useCallback(async (expiredSub) => {
    try {
      console.log('âš ï¸ Handling expired subscription for user:', majstorId)
      
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
        const fallbackFeatures = await loadPlanFeatures(freemiumPlan.id)
        setFeatures(fallbackFeatures)
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

      if (featuresError) throw featuresError

      return featuresData || []
    } catch (err) {
      console.error('Error loading plan features:', err)
      return []
    }
  }, [])

  const hasFeatureAccess = useCallback((featureKey) => {
    if (!plan) return false
    
    if (plan.name === 'freemium') {
      const freemiumFeatures = ['basic_dashboard', 'basic_profile']
      return freemiumFeatures.includes(featureKey)
    }

    const feature = features.find(f => f.feature_key === featureKey)
    return feature ? feature.is_enabled : false
  }, [plan, features])

  const loadSubscription = useCallback(async (forceRefresh = false) => {
    if (!majstorId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const cacheKey = majstorId

      if (!forceRefresh && subscriptionCache.has(cacheKey)) {
        const cached = subscriptionCache.get(cacheKey)
        const now = Date.now()
        
        if (now - cached.timestamp < cacheExpiry) {
          console.log('📦 Using cached subscription data')
          setSubscription(cached.subscription)
          setPlan(cached.plan)
          setFeatures(cached.features)
          setLoading(false)
          return
        }
      }

      if (forceRefresh) {
        console.log('💨 Force refresh - clearing cache')
        subscriptionCache.delete(cacheKey)
        pendingRequests.delete(cacheKey)
      }

      if (pendingRequests.has(cacheKey)) {
        console.log('⏳ Request already pending, waiting...')
        const result = await pendingRequests.get(cacheKey)
        setSubscription(result.subscription)
        setPlan(result.plan)
        setFeatures(result.features)
        setLoading(false)
        return
      }

      const requestPromise = (async () => {
        try {
          const { data: subscriptions, error: subError } = await supabase
            .from('user_subscriptions')
            .select('*, subscription_plans(*)')
            .eq('majstor_id', majstorId)
            .order('created_at', { ascending: false })
            .limit(1)

          if (subError) throw subError

          let finalSubscription = null
          let finalPlan = null
          let finalFeatures = []

          if (subscriptions && subscriptions.length > 0) {
            const subscription = subscriptions[0]
            const now = new Date()
            const periodEnd = new Date(subscription.current_period_end)

            let isActive = false
            let isExpired = false

            const isCancelled = subscription.cancel_at_period_end === true

            if (subscription.status === 'trial') {
              const trialEnd = new Date(subscription.trial_ends_at)
              if (trialEnd > now) {
                isActive = true
              } else {
                isExpired = true
              }
            }
            else if (subscription.status === 'active') {
              if (periodEnd > now) {
                isActive = true
              } else {
                isExpired = true
              }
            }
            else if (subscription.status === 'cancelled') {
              if (periodEnd > now) {
                isActive = true
              } else {
                isExpired = true
              }
            }
            else if (subscription.status === 'expired') {
              isActive = false
              isExpired = true
            }

            if (isActive && !isExpired) {
              console.log('✅… Active subscription found:', subscription.subscription_plans.name)
              console.log('🔥 Cancel at period end:', isCancelled)
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
          } else {
            console.log('No subscription found, falling back to freemium')
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

  // 🔥🔥🔥 FIXED REALTIME LISTENER 🔥🔥🔥
  useEffect(() => {
    if (!majstorId) return
    
    if (realtimeSetupFlags.get(majstorId)) {
      console.log('⭐ Realtime already setup globally, skipping...')
      return
    }

    console.log('🔔 Setting up Realtime listener for majstor:', majstorId)
    realtimeSetupFlags.set(majstorId, true)

    const channel = supabase
      .channel(`subscription-changes-${majstorId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `majstor_id=eq.${majstorId}`
        },
        (payload) => {
          console.log('🔔 REALTIME: Subscription updated!', payload)
          
          const oldStatus = payload.old?.status
          const newStatus = payload.new?.status
          const oldCancelFlag = payload.old?.cancel_at_period_end
          const newCancelFlag = payload.new?.cancel_at_period_end

          console.log(`📊 Status change: ${oldStatus} â†’ ${newStatus}`)
          console.log(`🔄… Cancel flag: ${oldCancelFlag} â†’ ${newCancelFlag}`)


          // 🛑 IGNORE: expired status updates when already expired (prevents infinite loop)
          if (newStatus === 'expired' && oldStatus !== 'active' && oldStatus !== 'trial' && oldStatus !== 'cancelled') {
            console.log('⏭️ Ignoring redundant expired status update (prevents loop)')
            return
          }
          // 🔥 DETECT CANCEL - bilo koji transition ka true
          if (newCancelFlag === true && oldCancelFlag !== true) {
            console.log('🚫 CANCEL CONFIRMED via Realtime!')
            console.log('🔔 Dispatching subscription-cancelled event...')
            window.dispatchEvent(new CustomEvent('subscription-cancelled', {
              detail: { 
                action: 'cancelled',
                timestamp: Date.now() 
              }
            }))
          }

          // 🔥 DETECT REACTIVATE - bilo koji transition ka false (ALI NE initial create!)
          // oldCancelFlag moÅ¾e biti true ili undefined (ako webhook ne Å¡alje old values)
          if (newCancelFlag === false && (oldCancelFlag === true || (oldCancelFlag === undefined && newStatus === 'active'))) {
            console.log('✅… REACTIVATE CONFIRMED via Realtime!')
            console.log('🔔 Dispatching subscription-reactivated event...')
            window.dispatchEvent(new CustomEvent('subscription-reactivated', {
              detail: { 
                action: 'reactivated',
                timestamp: Date.now() 
              }
            }))
          }

          // Force refresh
          console.log('🔄 Force refreshing subscription data...')
          subscriptionCache.delete(majstorId)
          pendingRequests.delete(majstorId)
          
          loadSubscription(true)

          // Dispatch trial â†’ active event
          if (oldStatus === 'trial' && newStatus === 'active') {
            console.log('🎉 TRIAL → ACTIVE! Dispatching celebration event!')
            window.dispatchEvent(new CustomEvent('subscription-activated', {
              detail: { 
                from: 'trial', 
                to: 'active',
                timestamp: Date.now() 
              }
            }))
          }

          // UVEK dispatche generic event
          console.log('🔔 Dispatching generic subscription-changed event...')
          window.dispatchEvent(new CustomEvent('subscription-changed', {
            detail: { 
              oldStatus, 
              newStatus,
              oldCancelFlag,
              newCancelFlag,
              timestamp: Date.now() 
            }
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `majstor_id=eq.${majstorId}`
        },
        (payload) => {
          console.log('🔔 REALTIME: New subscription created!', payload)
          
          subscriptionCache.delete(majstorId)
          pendingRequests.delete(majstorId)
          loadSubscription(true)

          window.dispatchEvent(new CustomEvent('subscription-changed', {
            detail: { 
              event: 'created',
              status: payload.new?.status,
              timestamp: Date.now() 
            }
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `majstor_id=eq.${majstorId}`
        },
        (payload) => {
          console.log('🔔 REALTIME: Subscription DELETED!', payload)
          console.log('🚫 Trial cancelled - subscription removed from database')
          
          subscriptionCache.delete(majstorId)
          pendingRequests.delete(majstorId)
          loadSubscription(true)

          window.dispatchEvent(new CustomEvent('subscription-deleted', {
            detail: { 
              event: 'deleted',
              reason: 'trial_cancelled',
              timestamp: Date.now() 
            }
          }))

          window.dispatchEvent(new CustomEvent('subscription-changed', {
            detail: { 
              event: 'deleted',
              timestamp: Date.now() 
            }
          }))
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅… Realtime listener active!')
        }
      })

    return () => {
      console.log('🧹 Cleaning up Realtime listener')
      supabase.removeChannel(channel)
      realtimeSetupFlags.delete(majstorId)
    }
  }, [majstorId, loadSubscription])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  const isInTrial = useCallback(() => {
    if (!subscription) return false
    
    if (subscription.status !== 'trial' && subscription.status !== 'active') {
      return false
    }

    const now = new Date()
    
    if (subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at)
      return trialEnd > now
    }
    
    if (subscription.trial_starts_at) {
      const trialStart = new Date(subscription.trial_starts_at)
      const estimatedTrialEnd = new Date(trialStart)
      estimatedTrialEnd.setDate(estimatedTrialEnd.getDate() + 1)
      return estimatedTrialEnd > now
    }

    const createdAt = new Date(subscription.created_at)
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)
    const periodEnd = new Date(subscription.current_period_end)
    const daysLeft = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
    
    return hoursSinceCreation < 48 && daysLeft <= 1
  }, [subscription])

  const getTrialDaysRemaining = useCallback(() => {
    if (!isInTrial()) return 0

    const now = new Date()
    const trialEnd = subscription.trial_ends_at 
      ? new Date(subscription.trial_ends_at)
      : new Date(subscription.current_period_end)
    
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
    return daysLeft > 0 ? daysLeft : 0
  }, [subscription, isInTrial])

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

  const refresh = useCallback((forceRefresh = false) => {
    if (majstorId) {
      console.log('🔄 Manual refresh requested', { forceRefresh })
      
      if (forceRefresh) {
        subscriptionCache.delete(majstorId)
        pendingRequests.delete(majstorId)
        console.log('👨 Cache cleared for force refresh')
      }
      
      loadSubscription(forceRefresh)
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
    isCancelled: subscription?.cancel_at_period_end === true,
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
    console.log('💳 Payment marked - dashboard will show upgrade modal')
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeSetupFlags.clear()
  })
}