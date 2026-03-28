// lib/hooks/useFavorites.js — Favorites system for sidebar + dashboard
'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'prm_favorites'
const MAX_FAVORITES = 4

// All available quick-access items (shared between sidebar + dashboard)
export const ALL_QUICK_ITEMS = [
  { key: 'rechnungen', name: 'Rechnungen', icon: '📄', href: '/dashboard/invoices?tab=invoices', feature: 'invoicing', protected: true },
  { key: 'ausgaben', name: 'Ausgaben', icon: '🧾', href: '/dashboard/ausgaben', feature: 'invoicing', protected: true },
  { key: 'buchhalter', name: 'Buchhalter', icon: '🗂️', href: '/dashboard/pdf-archive', feature: 'pdf_archive', protected: true },
  { key: 'visitenkarte', name: 'Visitenkarte', icon: '📱', href: '/dashboard/business-card/create', protected: false },
  { key: 'kundenanfragen', name: 'Kundenanfragen', icon: '📩', href: '/dashboard/inquiries', protected: false },
  { key: 'kunden', name: 'Meine Kunden', icon: '👥', href: '/dashboard/customers', feature: 'customer_management', protected: true },
  { key: 'services', name: 'Meine Services', icon: '🔧', href: '/dashboard/services', feature: 'services_management', protected: true },
  { key: 'aufmass', name: 'Aufmaß', icon: '📐', href: '/dashboard/aufmass', feature: 'invoicing', protected: true },
  { key: 'team', name: 'Mitglieder', icon: '👷', href: '/dashboard/team', feature: 'team', protected: true },
  { key: 'feed', name: 'Feed', icon: '📡', href: '/dashboard/team/feed', feature: 'team', protected: true },
  { key: 'aufgaben', name: 'Offen', icon: '📋', href: '/dashboard/team/aufgaben', feature: 'team', protected: true },
  { key: 'berichte', name: 'Erledigt', icon: '📝', href: '/dashboard/team/berichte', feature: 'team', protected: true },
  { key: 'mitgliedschaft', name: 'Mitgliedschaft', icon: '💎', href: '/dashboard/subscription', protected: false },
  { key: 'einstellungen', name: 'Einstellungen', icon: '⚙️', href: '/dashboard/settings', protected: false },
]

const DEFAULT_FAVORITES = ['rechnungen', 'aufmass', 'kunden', 'feed']

export function useFavorites() {
  const [favorites, setFavorites] = useState(DEFAULT_FAVORITES)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFavorites(parsed)
        }
      }
    } catch {}
  }, [])

  const saveFavorites = useCallback((newFavs) => {
    setFavorites(newFavs)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavs))
    } catch {}
  }, [])

  const toggleFavorite = useCallback((key) => {
    setFavorites(prev => {
      let next
      if (prev.includes(key)) {
        next = prev.filter(k => k !== key)
      } else {
        if (prev.length >= MAX_FAVORITES) return prev
        next = [...prev, key]
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const isFavorite = useCallback((key) => favorites.includes(key), [favorites])

  const getFavoriteItems = useCallback(() => {
    return favorites
      .map(key => ALL_QUICK_ITEMS.find(item => item.key === key))
      .filter(Boolean)
  }, [favorites])

  const getNonFavoriteItems = useCallback(() => {
    return ALL_QUICK_ITEMS.filter(item => !favorites.includes(item.key))
  }, [favorites])

  return {
    favorites,
    editMode,
    setEditMode,
    toggleFavorite,
    isFavorite,
    getFavoriteItems,
    getNonFavoriteItems,
    MAX_FAVORITES,
  }
}
