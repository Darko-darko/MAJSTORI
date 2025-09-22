require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log('API Key loaded:', process.env.RESEND_API_KEY ? 'Yes' : 'No');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'rechnungen@pro-meister.de',
      to: ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com'],
      subject: 'Pro-Meister Test Email',
      html: `
        <h1>Test Email</h1>
        <p>Ovo je test email sa pro-meister.de domena.</p>
        <p>Ako si dobio ovaj email, spreman si da postaneš miloner!</p>
      `
    });

    if (error) {
      console.error('Email error:', error);
      return;
    }

    console.log('Email sent successfully!');
    console.log('Email ID:', data.id);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEmail();