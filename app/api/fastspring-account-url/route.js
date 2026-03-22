// app/api/fastspring-account-url/route.js

const FASTSPRING_USERNAME = process.env.FASTSPRING_USERNAME
const FASTSPRING_PASSWORD = process.env.FASTSPRING_PASSWORD
const FASTSPRING_API_URL = 'https://api.fastspring.com'

export async function POST(request) {
  try {
    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      return Response.json({ error: 'Missing customerId' }, { status: 400 })
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
      return Response.json({
        error: 'FastSpring authentication failed',
        details: errorText?.slice(0, 300) || null,
      }, { status: fsResponse.status })
    }

    const data = await fsResponse.json()
    console.log('✅ FastSpring auth response:', JSON.stringify(data))

    // Try all known FastSpring response shapes
    let accountUrl = null

    if (data.accounts && data.accounts[customerId]) {
      accountUrl = data.accounts[customerId].url ||
        (data.accounts[customerId].token
          ? `https://promeister.onfastspring.com/account/${customerId}/${data.accounts[customerId].token}`
          : null)
    } else if (data.url) {
      accountUrl = data.url
    } else if (data.token) {
      accountUrl = `https://promeister.onfastspring.com/account/${customerId}/${data.token}`
    } else if (Array.isArray(data.accounts) && data.accounts.length > 0) {
      const acc = data.accounts[0]
      accountUrl = acc.url || (acc.token ? `https://promeister.onfastspring.com/account/${customerId}/${acc.token}` : null)
    }

    if (!accountUrl) {
      console.error('❌ No URL in FastSpring response. Raw:', JSON.stringify(data))
      return Response.json({
        error: 'No account URL returned from FastSpring',
        raw: data,
      }, { status: 500 })
    }

    return Response.json({ url: accountUrl })
  } catch (error) {
    console.error('💥 Get account URL error:', error)
    return Response.json({
      error: 'Failed to get account URL',
      message: error.message,
    }, { status: 500 })
  }
}
