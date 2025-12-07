// test-webhook-local.js
// Test FastSpring webhook lokalno

// 🔧 KONFIGURIŠI OVO PRE POKRETANJA:
const YOUR_MAJSTOR_ID = 'd5751ee7-595d-406f-91f4-ddd265e50ab0' // Uzmi iz Supabase → majstors tabele

// Mock FastSpring event
const mockSubscriptionActivated = {
  events: [{
    id: 'test-event-123',
    type: 'subscription.activated',
    data: {
      subscription: {
        id: 'test-sub-fastspring-123',
        product: 'promeister-monthly',
        state: 'active',
        autoRenew: true,
        inTrial: false,
        intervalUnit: 'month',
        intervalLength: 1,
        nextChargeDate: '2025-12-14T00:00:00Z',
        tags: {
          majstor_id: YOUR_MAJSTOR_ID  // ← VAŽNO!
        }
      },
      account: {
        id: 'test-account-fastspring-123'
      }
    }
  }]
}

// Test funkcija
async function testWebhook() {
  console.log('🧪 Testing FastSpring Webhook...\n')
  
  if (YOUR_MAJSTOR_ID === 'STAVI-OVDE-SVOJ-MAJSTOR-ID') {
    console.error('❌ ERROR: You need to set YOUR_MAJSTOR_ID first!')
    console.log('   1. Go to Supabase → Table Editor → majstors')
    console.log('   2. Copy your ID')
    console.log('   3. Paste it in this file (line 5)\n')
    return
  }

  try {
    console.log('📤 Sending mock event to webhook...')
    console.log('   URL: http://localhost:8888/.netlify/functions/fastspring-webhook')
    console.log('   Event: subscription.activated')
    console.log('   Majstor ID:', YOUR_MAJSTOR_ID)
    console.log('')

    const response = await fetch('http://localhost:8888/.netlify/functions/fastspring-webhook', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockSubscriptionActivated)
    })

    console.log('📥 Response Status:', response.status)
    
    const data = await response.json()
    console.log('📋 Response Data:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('\n✅ SUCCESS! Webhook processed the event!')
      console.log('   Check Supabase → user_subscriptions table')
      console.log('   You should see a new row with:')
      console.log('   - payment_provider: fastspring')
      console.log('   - provider_subscription_id: test-sub-fastspring-123')
      console.log('   - status: active')
    } else {
      console.log('\n❌ FAILED! Check the error above')
    }

  } catch (error) {
    console.error('\n💥 ERROR:', error.message)
    console.log('\n⚠️  Make sure:')
    console.log('   1. Dev server is running (npm run dev)')
    console.log('   2. Webhook function exists in netlify/functions/')
    console.log('   3. Environment variables are set in .env.local')
  }
}

// Pokreni test
testWebhook()