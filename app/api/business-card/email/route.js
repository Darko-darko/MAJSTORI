// app/api/business-card/email/route.js - FIXED SUBSCRIPTION CHECK
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

    // 🔥 FIXED: Improved subscription check logic matching frontend useSubscription
    console.log('🔍 Starting subscription check for majstor:', majstor_id)
    
    let canReceiveInquiries = false
    
    try {
      // Get user's latest subscription (matching frontend logic)
      const { data: latestSubscription, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            display_name
          )
        `)
        .eq('majstor_id', majstor_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('🔍 Subscription query result:', {
        hasData: !!latestSubscription,
        error: subscriptionError?.message,
        status: latestSubscription?.status,
        planName: latestSubscription?.subscription_plans?.name
      })

      if (latestSubscription && !subscriptionError) {
        const now = new Date()
        let isActive = false

        // Check if subscription is active
        if (latestSubscription.status === 'trial') {
          const trialEnd = new Date(latestSubscription.trial_ends_at)
          isActive = trialEnd > now
          console.log('🎯 Trial subscription:', { 
            trialEnd: trialEnd.toISOString(), 
            now: now.toISOString(), 
            isActive 
          })
        } else if (latestSubscription.status === 'active') {
          const periodEnd = new Date(latestSubscription.current_period_end)
          isActive = periodEnd > now
          console.log('🎯 Active subscription:', { 
            periodEnd: periodEnd.toISOString(), 
            now: now.toISOString(), 
            isActive 
          })
        }

        if (isActive) {
          // Check if plan has customer_inquiries feature
          const { data: features, error: featuresError } = await supabase
            .from('subscription_features')
            .select('*')
            .eq('plan_id', latestSubscription.subscription_plans.id)
            .eq('feature_key', 'customer_inquiries')
            .eq('is_enabled', true)
            .maybeSingle()

          console.log('🔍 Features query result:', {
            hasFeature: !!features,
            error: featuresError?.message,
            planId: latestSubscription.subscription_plans.id,
            featureKey: 'customer_inquiries'
          })

          if (features && !featuresError) {
            canReceiveInquiries = true
            console.log('✅ Majstor has customer_inquiries feature')
          } else {
            console.log('❌ Majstor does not have customer_inquiries feature')
          }
        } else {
          console.log('❌ Subscription is not active')
        }
      } else {
        console.log('❌ No subscription found, checking if freemium user...')
        
        // For freemium users (no subscription), they should NOT have inquiry feature
        canReceiveInquiries = false
        console.log('📱 Freemium user - will not include inquiry button')
      }
    } catch (subscriptionCheckError) {
      console.error('⚠️ Subscription check failed:', subscriptionCheckError)
      // Default to false for safety
      canReceiveInquiries = false
    }

    console.log('🎯 Final subscription check result:', { 
      canReceiveInquiries,
      majstorId: majstor_id,
      emailWillIncludeInquiryButton: canReceiveInquiries
    })

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

    // 🔥 IMPROVED: HTML with better conditional logic and debugging
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
                Klicken Sie auf den Link unten, um alle Kontaktdaten zu sehen${canReceiveInquiries ? ' und direkt eine Anfrage zu stellen' : ''}.
            </p>

            <!-- Simple Contact Info -->
            <div style="text-align: center; margin: 0 0 30px 0;">
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; max-width: 400px; margin: 0 auto;">
                    <h3 style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #1f2937;">
                        ${cardName}
                    </h3>
                    ${cardBusinessName ? `
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #6b7280;">
                        ${cardBusinessName}
                    </p>
                    ` : ''}
                    <div style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                        ${cardPhone ? `📞 ${cardPhone}<br>` : ''}
                        ✉️ ${cardEmail}<br>
                        ${cardCity ? `📍 ${cardCity}` : ''}
                    </div>
                </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 0 0 30px 0;">
                <a href="${businessCardLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                    🔗 Vollständige Visitenkarte öffnen
                </a>
            </div>

            <!-- Features -->
            <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin: 0 0 30px 0;">
                <h4 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
                    💡 Was Sie erwartet:
                </h4>
                <ul style="color: #6b7280; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                    <li>Komplette Kontaktdaten zum Speichern</li>
                    ${canReceiveInquiries ? '<li>Direkte Anfrage mit Foto-Upload möglich</li>' : ''}
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

    // Plain text version with conditional content
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
- Kontaktdaten direkt speichern${canReceiveInquiries ? '\n- Eine Anfrage mit Fotos stellen' : ''}
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
    console.log('📤 Email will include inquiry button:', canReceiveInquiries)
    console.log('📤 Email will include inquiry text feature:', canReceiveInquiries)
    
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
            has_personal_message: !!personal_message,
            can_receive_inquiries: canReceiveInquiries,
            subscription_checked: true
          }
        })
    } catch (logError) {
      console.warn('⚠️ Failed to log email send event:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich gesendet',
      email_id: emailResult.data?.id,
      debug: {
        can_receive_inquiries: canReceiveInquiries,
        subscription_check_completed: true
      }
    })

  } catch (error) {
    console.error('💥 Business card email API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ein unerwarteter Fehler ist aufgetreten'
    }, { status: 500 })
  }
}