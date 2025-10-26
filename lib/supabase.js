// lib/supabase.js - FIXED VERSION with Turnstile support
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export { customersAPI } from './customers'

// Helper functions for auth
export const auth = {
  // Sign up new user
  async signUp(email, password, userData = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // additional user metadata
      }
    })
    return { data, error }
  },

  // 🔥 FIXED: Sign in existing user WITH captchaToken support
  async signIn(email, password, captchaToken = null) {
    const payload = {
      email,
      password
    }
    
    // Add captchaToken if provided
    if (captchaToken) {
      payload.options = {
        captchaToken: captchaToken
      }
    }
    
    const { data, error } = await supabase.auth.signInWithPassword(payload)
    return { data, error }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Request password reset email
  async resetPasswordRequest(email) {
    // Client-side: koristi trenutni origin
    // Server-side: koristi production URL kao fallback
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'https://pro-meister.de/reset-password'
    
    console.log('Password reset redirect URL:', redirectTo) // debug
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo
    })
    return { data, error }
  },

  // Update password (after clicking email link)
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  },
  
  // Listen to auth changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Helper functions for majstors table
export const majstorsAPI = {
  // Create new majstor profile
  async create(profileData) {
    const { data, error } = await supabase
      .from('majstors')
      .insert(profileData)
      .select()
      .single()
    return { data, error }
  },

  // Get majstor by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Update majstor profile
  async update(id, updates) {
    const { data, error } = await supabase
      .from('majstors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Get majstor by slug (for public business card)
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from('majstors')
      .select('*, business_cards(*)')
      .eq('slug', slug)
      .single()
    return { data, error }
  }
}