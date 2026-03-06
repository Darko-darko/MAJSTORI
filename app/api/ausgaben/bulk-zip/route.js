// app/api/ausgaben/bulk-zip/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import JSZip from 'jszip'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ausgabenIds, majstorId, zipFilename } = await request.json()
    if (!ausgabenIds?.length || !majstorId) {
      return NextResponse.json({ error: 'ausgabenIds and majstorId required' }, { status: 400 })
    }
    if (user.id !== majstorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch ausgaben records
    const { data: ausgaben, error: fetchError } = await admin
      .from('ausgaben')
      .select('id, filename, storage_path')
      .in('id', ausgabenIds)
      .eq('majstor_id', majstorId)

    if (fetchError || !ausgaben?.length) {
      return NextResponse.json({ error: 'No ausgaben found' }, { status: 404 })
    }

    // Download all files in parallel
    const fileResults = await Promise.all(
      ausgaben.map(async (a, index) => {
        try {
          const { data, error } = await admin.storage
            .from('ausgaben')
            .download(a.storage_path)
          if (error || !data) return null
          const ext = a.storage_path.split('.').pop() || 'jpg'
          const filename = a.filename || `Beleg_${String(index + 1).padStart(3, '0')}.${ext}`
          return { filename, buffer: await data.arrayBuffer() }
        } catch {
          return null
        }
      })
    )

    const validFiles = fileResults.filter(Boolean)
    if (!validFiles.length) {
      return NextResponse.json({ error: 'No files could be loaded' }, { status: 500 })
    }

    // Build ZIP
    const zip = new JSZip()
    validFiles.forEach(({ filename, buffer }) => zip.file(filename, buffer))

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    // Upload ZIP to storage (use invoice-pdfs bucket — ausgaben bucket restricts ZIP mime type)
    const timestamp = Date.now()
    const zipPath = `temp-zips-ausgaben/${majstorId}/${timestamp}_ausgaben.zip`

    const { error: uploadError } = await admin.storage
      .from('invoice-pdfs')
      .upload(zipPath, zipBuffer, { contentType: 'application/zip', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: 'ZIP upload failed: ' + uploadError.message }, { status: 500 })
    }

    // Signed URL (14 days)
    const downloadFilename = zipFilename || `${timestamp}_ausgaben.zip`
    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from('invoice-pdfs')
      .createSignedUrl(zipPath, 60 * 60 * 24 * 14, { download: downloadFilename })

    if (signedUrlError) {
      return NextResponse.json({ error: 'Signed URL failed: ' + signedUrlError.message }, { status: 500 })
    }

    // Create short link
    let shortUrl = null
    try {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      let code = ''
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
      const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 14 * 1000).toISOString()
      const { error: insertError } = await admin
        .from('short_links')
        .insert({ code, url: signedUrlData.signedUrl, type: 'aus', expires_at: expiresAt })
      if (!insertError) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pro-meister.de'
        shortUrl = `${baseUrl}/aus/${code}`
      }
    } catch {
      // not critical
    }

    return NextResponse.json({
      success: true,
      zipUrl: signedUrlData.signedUrl,
      shortUrl,
      count: validFiles.length,
      skipped: ausgaben.length - validFiles.length
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
