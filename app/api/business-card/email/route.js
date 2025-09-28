// app/api/business-card/email/route.js
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { 
      to_email, 
      to_name, 
      personal_message, 
      majstor_id,
      business_card_data 
    } = await request.json()

    console.log('📧 Processing business card email request:', {
      to_email,
      to_name,
      majstor_id: majstor_id ? 'provided' : 'missing',
      has_personal_message: !!personal_message
    })

    // Validation
    if (!to_email || !majstor_id) {
      return NextResponse.json({
        success: false,
        error: 'E-Mail-Adresse und Majstor-ID sind erforderlich'
      }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to_email)) {
      return NextResponse.json({
        success: false,
        error: 'Ungültige E-Mail-Adresse'
      }, { status: 400 })
    }

    // Load majstor data
    const { data: majstor, error: majstorError } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', majstor_id)
      .single()

    if (majstorError || !majstor) {
      console.error('❌ Majstor not found:', majstorError)
      return NextResponse.json({
        success: false,
        error: 'Handwerker-Profil nicht gefunden'
      }, { status: 404 })
    }

    // Generate business card link
    const businessCardLink = `https://pro-meister.de/m/${majstor.slug}`

    // Use data from request or fallback to majstor data
    const cardName = business_card_data?.card_name || majstor.full_name || 'Handwerker'
    const cardBusinessName = business_card_data?.card_business_name || majstor.business_name || ''
    const cardPhone = business_card_data?.card_phone || majstor.phone || ''
    const cardEmail = business_card_data?.card_email || majstor.email || ''
    const cardCity = business_card_data?.card_city || majstor.city || ''

    // Email content
    const fromName = cardBusinessName || cardName
    const recipientName = to_name || 'Liebe/r Interessent/in'

    // Generate HTML email content
    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digitale Visitenkarte von ${cardName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    
    <!-- Main Container -->
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                📱 Digitale Visitenkarte
            </h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
                ${cardName} möchte seine Kontaktdaten mit Ihnen teilen
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            
            <!-- Greeting -->
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">
                Hallo ${recipientName}!
            </h2>
            
            ${personal_message ? `
            <!-- Personal Message -->
            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 30px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #374151; margin: 0; font-size: 16px; line-height: 1.6; font-style: italic;">
                    "${personal_message}"
                </p>
            </div>
            ` : ''}
            
            <p style="color: #6b7280; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                ${fromName} hat Ihnen seine digitale Visitenkarte gesendet. 
                Klicken Sie auf den Link unten, um alle Kontaktdaten zu sehen und direkt eine Anfrage zu stellen.
            </p>

            <!-- Business Card Preview -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: #ffffff; padding: 30px; border-radius: 12px; text-align: center; margin: 0 0 30px 0;">
                
                <h3 style="margin: 0 0 5px 0; font-size: 20px; font-weight: bold; color: #ffffff;">
                    ${cardName}
                </h3>
                
                ${cardBusinessName ? `
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #cbd5e1;">
                    ${cardBusinessName}
                </p>
                ` : ''}
                
                <div style="text-align: left; max-width: 300px; margin: 0 auto;">
                    ${cardPhone ? `
                    <div style="margin: 8px 0; font-size: 14px; color: #e2e8f0;">
                        📞 ${cardPhone}
                    </div>
                    ` : ''}
                    
                    <div style="margin: 8px 0; font-size: 14px; color: #e2e8f0;">
                        ✉️ ${cardEmail}
                    </div>
                    
                    ${cardCity ? `
                    <div style="margin: 8px 0; font-size: 14px; color: #e2e8f0;">
                        📍 ${cardCity}
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 0 0 30px 0;">
                <a href="${businessCardLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                    🔗 Visitenkarte öffnen
                </a>
            </div>

            <!-- Features -->
            <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin: 0 0 30px 0;">
                <h4 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
                    💡 Was Sie erwartet:
                </h4>
                <ul style="color: #6b7280; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                    <li>Komplette Kontaktdaten zum Speichern</li>
                    <li>Direkte Anfrage mit Foto-Upload möglich</li>
                    <li>Übersicht aller angebotenen Dienstleistungen</li>
                    <li>Galerie mit Arbeitsbeispielen</li>
                </ul>
            </div>

            <!-- Footer Message -->
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
                Beste Grüße,<br>
                <strong style="color: #374151;">${cardName}</strong>
                ${cardBusinessName ? `<br><span style="color: #9ca3af;">${cardBusinessName}</span>` : ''}
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Diese E-Mail wurde über 
                <a href="https://pro-meister.de" style="color: #3b82f6; text-decoration: none;">pro-meister.de</a> 
                versendet - Die Handwerker-Plattform
            </p>
            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
                Link funktioniert nicht? Kopieren Sie diese URL in Ihren Browser:<br>
                <span style="word-break: break-all;">${businessCardLink}</span>
            </p>
        </div>
    </div>
</body>
</html>
    `

    // Plain text version
    const textContent = `
Digitale Visitenkarte von ${cardName}

Hallo ${recipientName}!

${personal_message ? `"${personal_message}"\n\n` : ''}

${fromName} hat Ihnen seine digitale Visitenkarte gesendet.

Kontaktdaten:
${cardName}
${cardBusinessName ? `${cardBusinessName}\n` : ''}${cardPhone ? `📞 ${cardPhone}\n` : ''}✉️ ${cardEmail}
${cardCity ? `📍 ${cardCity}\n` : ''}

Besuchen Sie die vollständige Visitenkarte:
${businessCardLink}

Dort können Sie:
- Kontaktdaten direkt speichern
- Eine Anfrage mit Fotos stellen
- Alle Dienstleistungen einsehen
- Arbeitsbeispiele ansehen

Beste Grüße,
${cardName}
${cardBusinessName ? cardBusinessName : ''}

---
Gesendet über pro-meister.de - Die Handwerker-Plattform
    `

    // Send email via Resend
    console.log('📤 Sending business card email via Resend...')
    
    const emailResult = await resend.emails.send({
      from: 'Pro-Meister <noreply@pro-meister.de>',
      to: [to_email],
      subject: `📱 Digitale Visitenkarte von ${cardName}`,
      html: htmlContent,
      text: textContent,
      reply_to: cardEmail || 'noreply@pro-meister.de'
    })

    if (emailResult.error) {
      console.error('❌ Resend API error:', emailResult.error)
      throw new Error('E-Mail konnte nicht gesendet werden')
    }

    console.log('✅ Business card email sent successfully:', emailResult.data?.id)

    // Optional: Log email send event
    try {
      await supabase
        .from('email_logs')
        .insert({
          majstor_id,
          email_type: 'business_card_share',
          recipient_email: to_email,
          recipient_name: to_name,
          status: 'sent',
          resend_id: emailResult.data?.id,
          metadata: {
            business_card_link: businessCardLink,
            has_personal_message: !!personal_message
          }
        })
    } catch (logError) {
      console.warn('⚠️ Failed to log email send event:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich gesendet',
      email_id: emailResult.data?.id
    })

  } catch (error) {
    console.error('💥 Business card email API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ein unerwarteter Fehler ist aufgetreten'
    }, { status: 500 })
  }
}