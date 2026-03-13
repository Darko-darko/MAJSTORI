// app/api/support/route.js
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { incrementEmailCount } from '@/lib/emailCounter'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { name, email, subject, message, category } = await request.json()

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      )
    }

    // Category mapping
    const categoryEmojis = {
      general: '❓',
      technical: '🔧',
      billing: '💳',
      feature: '✨',
      bug: '🐛'
    }

    const categoryLabels = {
      general: 'Allgemeine Frage',
      technical: 'Technisches Problem',
      billing: 'Abrechnung & Zahlung',
      feature: 'Feature-Anfrage',
      bug: 'Bug Report'
    }

    const emoji = categoryEmojis[category] || '💬'
    const categoryLabel = categoryLabels[category] || category

    // Send email to support
    const { data, error } = await resend.emails.send({
      from: 'ProMeister Support <support@pro-meister.de>',
      to: ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com'], // TVOJ PRAVI EMAIL
      replyTo: email,
      subject: `${emoji} [${categoryLabel}] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📨 Neue Support-Anfrage</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3B82F6;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">
                ${emoji} ${categoryLabel}
              </h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>Betreff:</strong> ${subject}
              </p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">👤 Kontaktdaten</h3>
              <p style="margin: 5px 0; color: #4b5563;">
                <strong>Name:</strong> ${name}
              </p>
              <p style="margin: 5px 0; color: #4b5563;">
                <strong>E-Mail:</strong> <a href="mailto:${email}" style="color: #3B82F6;">${email}</a>
              </p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">💬 Nachricht</h3>
              <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">
                ${message}
              </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                ⏰ Gesendet am ${new Date().toLocaleString('de-DE', { 
                  dateStyle: 'full', 
                  timeStyle: 'short' 
                })}
              </p>
            </div>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Fehler beim Senden der E-Mail' },
        { status: 500 }
      )
    }

    incrementEmailCount()

    // Send confirmation to user
    await resend.emails.send({
      from: 'ProMeister Support <support@pro-meister.de>',
      to: email,
      subject: `✅ Ihre Support-Anfrage wurde empfangen`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #3B82F6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Anfrage empfangen</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
              Hallo ${name},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
              vielen Dank für Ihre Nachricht. Wir haben Ihre Support-Anfrage erhalten und werden uns 
              <strong>innerhalb von 24 Stunden</strong> (Mo-Fr) bei Ihnen melden.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">📋 Ihre Anfrage:</h3>
              <p style="margin: 5px 0; color: #6b7280;">
                <strong>Betreff:</strong> ${subject}
              </p>
              <p style="margin: 5px 0; color: #6b7280;">
                <strong>Kategorie:</strong> ${categoryLabel}
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
              Mit freundlichen Grüßen,<br>
              <strong style="color: #1f2937;">Ihr ProMeister Support-Team</strong>
            </p>
          </div>
        </div>
      `
    })

    incrementEmailCount()
    console.log('✅ Support email sent:', data)

    return NextResponse.json({
      success: true,
      message: 'Nachricht erfolgreich gesendet'
    })

  } catch (error) {
    console.error('Support API error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}