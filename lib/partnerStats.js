// lib/partnerStats.js — shared utility for partner commission calculations

/**
 * Computes 12-month stats for a partner's referred users.
 * @param {Array} referred - majstor objects with user_subscriptions nested
 * @param {Array} history - subscription_history records for referred user IDs
 * @param {number} commissionRate - € per active user per month
 * @returns {Array} 12 months newest-first: { month, activeCount, amount, registrations, isCurrent }
 */
export function computeMonthlyStats(referred, history, commissionRate) {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999)
    const isCurrent = i === 0

    const registrations = referred.filter(u => {
      const c = new Date(u.created_at)
      return c.getFullYear() === year && c.getMonth() === month
    }).length

    let activeCount
    if (isCurrent) {
      activeCount = referred.filter(u => {
        const subs = u.user_subscriptions || []
        const latest = [...subs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0]
        return latest?.status === 'active'
      }).length
    } else {
      activeCount = referred.filter(u => {
        const userHistory = history
          .filter(h => h.majstor_id === u.id && new Date(h.changed_at) <= lastDay)
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
        if (userHistory.length === 0) return false
        return userHistory[0].status === 'active'
      }).length
    }

    months.push({ month: monthKey, activeCount, amount: activeCount * commissionRate, registrations, isCurrent })
  }
  return months
}

/**
 * Merges direct referral stats with sub-partner referral stats.
 * @param {Array} directStats - computeMonthlyStats result for direct referrals
 * @param {Array} subPartnerStatsList - [{ stats, subRate }] per sub-partner
 * @param {number} partnerRate - top-level partner's commission_rate
 * @param {'net'|'gross'} mode
 *   'net' → partner view: direct×rate + subReferrals×(rate - subRate)
 *   'gross' → admin view: (direct + subReferrals) × rate
 * @returns {Array} merged 12 months with breakdown fields
 */
export function mergeMonthlyStats(directStats, subPartnerStatsList, partnerRate, mode = 'net') {
  return directStats.map((directMonth, i) => {
    let subActiveCount = 0
    let subAmount = 0

    for (const { stats, subRate } of subPartnerStatsList) {
      const subMonth = stats[i]
      if (!subMonth) continue
      subActiveCount += subMonth.activeCount
      if (mode === 'gross') {
        subAmount += subMonth.activeCount * partnerRate
      } else {
        subAmount += subMonth.activeCount * (partnerRate - subRate)
      }
    }

    return {
      ...directMonth,
      activeCount: directMonth.activeCount + subActiveCount,
      amount: directMonth.amount + subAmount,
      directActiveCount: directMonth.activeCount,
      directAmount: directMonth.amount,
      subActiveCount,
      subAmount,
    }
  })
}

/**
 * Fetches sub-partner data with their referred users and stats.
 * @param {object} admin - Supabase service-role client
 * @param {string} parentId - top-level partner's ID
 * @returns {Array} sub-partners with referred[] and monthlyStats[]
 */
export async function fetchSubPartnerData(admin, parentId) {
  const { data: subPartnerRows } = await admin
    .from('majstors')
    .select('id, full_name, email, ref_code, commission_rate')
    .eq('parent_partner_id', parentId)

  if (!subPartnerRows?.length) return []

  return Promise.all(subPartnerRows.map(async (sp) => {
    const { data: spReferred } = await admin
      .from('majstors')
      .select('id, full_name, email, created_at, user_subscriptions(status, created_at)')
      .eq('referred_by', sp.ref_code)
      .order('created_at', { ascending: false })

    const spReferredIds = (spReferred || []).map(u => u.id)
    let spHistory = []
    if (spReferredIds.length > 0) {
      try {
        const { data: h } = await admin
          .from('subscription_history')
          .select('majstor_id, status, changed_at')
          .in('majstor_id', spReferredIds)
          .order('changed_at', { ascending: true })
        spHistory = h || []
      } catch { spHistory = [] }
    }

    const monthlyStats = computeMonthlyStats(spReferred || [], spHistory, sp.commission_rate || 0)

    // Click stats
    const { data: clicks } = await admin
      .from('ref_clicks')
      .select('source')
      .eq('ref_code', sp.ref_code)

    const totalClicks = clicks?.length || 0
    const qrClicks = clicks?.filter(c => c.source === 'qr').length || 0
    const conversions = (spReferred || []).length
    const clickStats = {
      total: totalClicks,
      qr: qrClicks,
      link: totalClicks - qrClicks,
      conversions,
      conversionRate: totalClicks ? Math.round(conversions / totalClicks * 100) : 0,
    }

    // Payouts (for partner→sub-partner payment tracking)
    const { data: payouts } = await admin
      .from('partner_payouts')
      .select('month, amount, active_count, paid_at, confirmed_at')
      .eq('partner_id', sp.id)

    return { ...sp, referred: spReferred || [], monthlyStats, clickStats, payouts: payouts || [] }
  }))
}
