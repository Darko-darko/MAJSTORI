// netlify/functions/fastspring-get-account-url.js
// Returns an authenticated FastSpring account management URL for the given customer ID.

const FASTSPRING_USERNAME = process.env.FASTSPRING_USERNAME
const FASTSPRING_PASSWORD = process.env.FASTSPRING_PASSWORD
const FASTSPRING_API_URL = 'https://api.fastspring.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { customerId } = body

    if (!customerId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing customerId' }),
      }
    }

    console.log('🔑 Getting authenticated URL for customer:', customerId)

    const authString = Buffer.from(
      `${FASTSPRING_USERNAME}:${FASTSPRING_PASSWORD}`
    ).toString('base64')

    const fsResponse = await fetch(
      `${FASTSPRING_API_URL}/accounts/${customerId}/authenticate`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authString}`,
          Accept: 'application/json',
        },
      }
    )

    console.log('🔢 FS status:', fsResponse.status)

    if (!fsResponse.ok) {
      const errorText = await fsResponse.text()
      console.error('❌ FastSpring API error:', errorText)
      return {
        statusCode: fsResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'FastSpring authentication failed',
          details: errorText?.slice(0, 300) || null,
        }),
      }
    }

    const data = await fsResponse.json()
    console.log('✅ FastSpring auth URL received')

    // FastSpring returns: { accounts: { <id>: { token: "...", url: "..." } } }
    // or directly { token: "...", url: "..." } - handle both shapes
    let accountUrl = null

    if (data.accounts && data.accounts[customerId]) {
      accountUrl = data.accounts[customerId].url
    } else if (data.url) {
      accountUrl = data.url
    } else if (data.token) {
      // Build URL manually if only token is returned
      accountUrl = `https://promeister.onfastspring.com/account/${customerId}/${data.token}`
    }

    if (!accountUrl) {
      console.error('❌ No URL in FastSpring response:', JSON.stringify(data))
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'No account URL returned from FastSpring',
          raw: data,
        }),
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ url: accountUrl }),
    }
  } catch (error) {
    console.error('💥 Get account URL error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to get account URL',
        message: error.message,
      }),
    }
  }
}
