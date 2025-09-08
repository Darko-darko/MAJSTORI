// lib/supabase.js
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

  // Sign in existing user
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
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