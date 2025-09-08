// lib/customers.js - FIXED VERSION bez problematičnih JOIN-ova

import { supabase } from './supabase'

export const customersAPI = {
  // =============================================
  // BASIC CRUD OPERATIONS
  // =============================================

  // Get all customers for majstor - FIXED
  async getAll(majstorId, options = {}) {
    try {
      console.log('🔍 Loading customers for majstor:', majstorId)
      
      // STEP 1: Get customers first (bez JOIN-a)
      let query = supabase
        .from('customers')
        .select('*')
        .eq('majstor_id', majstorId)

      // Search functionality
      if (options.search) {
        const searchTerm = `%${options.search}%`
        query = query.or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},company_name.ilike.${searchTerm}`)
      }

      // Filtering
      if (options.favorites) {
        query = query.eq('is_favorite', true)
      }

      // Sorting
      const sortBy = options.sortBy || 'created_at'
      const sortOrder = options.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Pagination
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data: customers, error } = await query

      if (error) {
        console.error('❌ Error fetching customers:', error)
        throw error
      }

      console.log('✅ Customers loaded:', customers?.length || 0)

      // STEP 2: Ako ima customers, učitaj njihove invoices separately
      if (customers && customers.length > 0) {
        const customerEmails = customers
          .map(c => c.email)
          .filter(email => email && email.trim()) // Ukloni null/empty emails

        console.log('📧 Customer emails found:', customerEmails.length)

        if (customerEmails.length > 0) {
          const { data: invoices, error: invoicesError } = await supabase
            .from('invoices')
            .select('id, invoice_number, quote_number, type, total_amount, status, issue_date, customer_email')
            .eq('majstor_id', majstorId)
            .in('customer_email', customerEmails)

          if (!invoicesError && invoices) {
            console.log('📋 Invoices loaded:', invoices.length)
            
            // Dodeli invoices svakom customer-u
            customers.forEach(customer => {
              customer.invoices = invoices.filter(inv => 
                inv.customer_email?.toLowerCase() === customer.email?.toLowerCase()
              ) || []
              
              // Izračunaj stats
              customer.total_invoices = customer.invoices.length
              customer.total_revenue = customer.invoices.reduce((sum, inv) => 
                sum + (inv.status === 'paid' ? (inv.total_amount || 0) : 0), 0
              )
            })
          } else {
            console.warn('⚠️ Error loading invoices:', invoicesError)
            // Dodeli prazne invoices ako je greška
            customers.forEach(customer => {
              customer.invoices = []
              customer.total_invoices = 0
              customer.total_revenue = 0
            })
          }
        } else {
          // Nema email adresa, dodeli prazne invoices
          customers.forEach(customer => {
            customer.invoices = []
            customer.total_invoices = 0
            customer.total_revenue = 0
          })
        }
      }

      return { data: customers || [], count: customers?.length || 0, error: null }

    } catch (error) {
      console.error('❌ Error in getAll customers:', error)
      return { data: [], count: 0, error }
    }
  },

  // Get customer by ID - SIMPLIFIED
  async getById(customerId) {
    try {
      console.log('🔍 Loading customer by ID:', customerId)
      
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (error) throw error

      // Get invoices separately
      if (customer?.email) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, quote_number, type, total_amount, status, issue_date, due_date')
          .eq('majstor_id', customer.majstor_id)
          .eq('customer_email', customer.email)
          .order('created_at', { ascending: false })

        customer.invoices = invoices || []
        console.log('✅ Customer loaded with', customer.invoices.length, 'invoices')
      } else {
        customer.invoices = []
      }

      return { data: customer, error: null }
    } catch (error) {
      console.error('❌ Error fetching customer by ID:', error)
      return { data: null, error }
    }
  },

  // Get customer invoices by email - NOVA FUNKCIJA
  async getCustomerInvoices(majstorId, customerEmail) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          type,
          invoice_number,
          quote_number,
          total_amount,
          status,
          issue_date,
          due_date,
          created_at
        `)
        .eq('majstor_id', majstorId)
        .eq('customer_email', customerEmail.toLowerCase().trim())
        .order('created_at', { ascending: false })

      return { data: data || [], error }
    } catch (error) {
      console.error('❌ Error fetching customer invoices:', error)
      return { data: [], error }
    }
  },

  // Create new customer
  async create(customerData) {
    try {
      console.log('➕ Creating new customer:', customerData.name)
      
      // Normalize email
      if (customerData.email) {
        customerData.email = customerData.email.toLowerCase().trim()
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      
      console.log('✅ Customer created:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error creating customer:', error)
      return { data: null, error }
    }
  },

  // Update customer
  async update(customerId, updates) {
    try {
      console.log('📝 Updating customer:', customerId)
      
      // Normalize email if provided
      if (updates.email) {
        updates.email = updates.email.toLowerCase().trim()
      }

      const { data, error } = await supabase
        .from('customers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single()

      if (error) throw error
      
      console.log('✅ Customer updated')
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error updating customer:', error)
      return { data: null, error }
    }
  },

  // Delete customer
  async delete(customerId) {
    try {
      console.log('🗑️ Deleting customer:', customerId)
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) throw error
      
      console.log('✅ Customer deleted')
      return { error: null }
    } catch (error) {
      console.error('❌ Error deleting customer:', error)
      return { error }
    }
  },

  // =============================================
  // AUTO-SAVE FROM INVOICES
  // =============================================

  // Auto-save customer when creating invoice/quote
  async autoSaveFromInvoice(invoiceData) {
    try {
      if (!invoiceData.customer_email || !invoiceData.majstor_id) {
        return { data: null, error: 'Missing required data' }
      }

      console.log('🔄 Auto-saving customer from invoice:', invoiceData.customer_email)

      // Check if customer already exists
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('majstor_id', invoiceData.majstor_id)
        .eq('email', invoiceData.customer_email.toLowerCase().trim())
        .maybeSingle() // Use maybeSingle instead of single

      if (existing) {
        console.log('✅ Customer already exists, updating last contact')
        // Customer exists, just update last contact and return
        await this.update(existing.id, {
          last_contact_date: invoiceData.issue_date || new Date().toISOString().split('T')[0]
        })
        return { data: existing, error: null }
      }

      console.log('➕ Creating new customer from invoice')
      // Create new customer
      const customerData = {
        majstor_id: invoiceData.majstor_id,
        name: invoiceData.customer_name || 'Unknown',
        email: invoiceData.customer_email.toLowerCase().trim(),
        phone: invoiceData.customer_phone || null,
        street: this.parseAddress(invoiceData.customer_address)?.street || null,
        city: this.parseAddress(invoiceData.customer_address)?.city || null,
        postal_code: this.parseAddress(invoiceData.customer_address)?.postalCode || null,
        source: 'invoice',
        last_contact_date: invoiceData.issue_date || new Date().toISOString().split('T')[0]
      }

      return await this.create(customerData)
    } catch (error) {
      console.error('❌ Error auto-saving customer:', error)
      return { data: null, error }
    }
  },

  // =============================================
  // SEARCH & AUTOCOMPLETE
  // =============================================

  // Search customers for autocomplete
  async search(majstorId, searchTerm, limit = 10) {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return { data: [], error: null }
      }

      console.log('🔍 Searching customers:', searchTerm)

      const term = `%${searchTerm}%`
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, company_name, city')
        .eq('majstor_id', majstorId)
        .or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term},company_name.ilike.${term}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      return { data: data || [], error }
    } catch (error) {
      console.error('❌ Error searching customers:', error)
      return { data: [], error }
    }
  },

  // =============================================
  // BULK OPERATIONS
  // =============================================

  // Bulk import customers
  async bulkImport(majstorId, customersData) {
    try {
      console.log('📥 Bulk importing', customersData.length, 'customers')
      
      const processedData = customersData.map(customer => ({
        majstor_id: majstorId,
        name: customer.name || customer.Name || customer['Name'] || 'Unknown',
        email: (customer.email || customer.Email || customer['E-Mail'] || '').toLowerCase().trim() || null,
        phone: customer.phone || customer.Phone || customer.Telefon || customer['Telefon'] || null,
        company_name: customer.company_name || customer.Company || customer.Firma || customer['Firma'] || null,
        street: customer.street || customer.Street || customer.Straße || customer['Straße'] || null,
        city: customer.city || customer.City || customer.Stadt || customer['Stadt'] || null,
        postal_code: customer.postal_code || customer.PLZ || customer['PLZ'] || null,
        notes: customer.notes || customer.Notes || customer.Notizen || customer['Notizen'] || null,
        source: 'import',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Filter out records without name
      const validData = processedData.filter(customer => 
        customer.name && customer.name !== 'Unknown'
      )

      console.log('✅ Valid records for import:', validData.length)

      if (validData.length === 0) {
        return { data: [], error: 'No valid customer data found' }
      }

      const { data, error } = await supabase
        .from('customers')
        .insert(validData)
        .select()

      return { 
        data: data || [], 
        error,
        imported: data?.length || 0,
        skipped: customersData.length - validData.length
      }
    } catch (error) {
      console.error('❌ Error bulk importing customers:', error)
      return { data: [], error }
    }
  },

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  // Parse address string into components
  parseAddress(addressString) {
    if (!addressString) return {}

    // Simple German address parsing
    // "Musterstraße 123, 10115 Berlin" → { street: "Musterstraße 123", postalCode: "10115", city: "Berlin" }
    const parts = addressString.split(',').map(part => part.trim())
    
    if (parts.length >= 2) {
      const street = parts[0]
      const cityPart = parts[parts.length - 1]
      
      // Try to extract postal code and city
      const postalCodeMatch = cityPart.match(/^(\d{5})\s+(.+)$/)
      if (postalCodeMatch) {
        return {
          street,
          postalCode: postalCodeMatch[1],
          city: postalCodeMatch[2]
        }
      }
      
      return { street, city: cityPart }
    }
    
    return { street: addressString }
  },

  // Get customer statistics - SIMPLIFIED
  async getStats(majstorId) {
    try {
      console.log('📊 Loading customer stats for majstor:', majstorId)
      
      // Get customers count - SIMPLE query
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, created_at')
        .eq('majstor_id', majstorId)

      if (customersError) {
        console.error('❌ Error loading customers for stats:', customersError)
        throw customersError
      }

      // Get paid invoices for revenue calculation - SEPARATE query
      const { data: paidInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('customer_email, total_amount')
        .eq('majstor_id', majstorId)
        .eq('status', 'paid')

      if (invoicesError) {
        console.warn('⚠️ Error loading invoices for stats:', invoicesError)
      }

      const totalCustomers = customers.length
      const totalRevenue = paidInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
      const avgRevenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0
      
      // Customers this month
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const newThisMonth = customers.filter(customer => 
        new Date(customer.created_at) >= thisMonth
      ).length

      const stats = {
        totalCustomers,
        totalRevenue,
        avgRevenuePerCustomer,
        newThisMonth
      }

      console.log('✅ Customer stats loaded:', stats)

      return {
        data: stats,
        error: null
      }
    } catch (error) {
      console.error('❌ Error getting customer stats:', error)
      return { data: null, error }
    }
  },

  // Toggle favorite status
  async toggleFavorite(customerId) {
    try {
      console.log('⭐ Toggling favorite for customer:', customerId)
      
      // Get current status
      const { data: customer } = await supabase
        .from('customers')
        .select('is_favorite')
        .eq('id', customerId)
        .single()

      if (!customer) throw new Error('Customer not found')

      // Toggle status
      const { data, error } = await supabase
        .from('customers')
        .update({ 
          is_favorite: !customer.is_favorite,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single()

      if (error) throw error
      
      console.log('✅ Favorite status toggled')
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error)
      return { data: null, error }
    }
  }
}