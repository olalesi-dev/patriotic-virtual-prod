const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

// Initialize services with environment variables
const {
    SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_PHONE,
    ADMIN_EMAIL,
    ADMIN_PHONE
} = process.env;

if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('📧 SendGrid properly initialized.');
}

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('📱 Twilio properly initialized.');
}

/**
 * Send an email using SendGrid
 */
const sendEmail = async (to, subject, html) => {
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
        console.warn(`[Mock Email] To: ${to} | Subject: ${subject}`);
        return;
    }
    try {
        await sgMail.send({
            to,
            from: SENDGRID_FROM_EMAIL,
            subject,
            html
        });
        console.log(`Email sent successfully to ${to}`);
    } catch (error) {
        console.error('SendGrid email error:', error.response ? error.response.body : error);
    }
};

/**
 * Send an SMS using Twilio
 */
const sendSMS = async (to, body) => {
    if (!twilioClient || !TWILIO_FROM_PHONE) {
        console.warn(`[Mock SMS] To: ${to} | Body: ${body}`);
        return;
    }

    // Ensure E.164 format (e.g. +15551234567)
    let formattedPhone = to.trim();
    if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+1' + formattedPhone.replace(/\D/g, '');
    }

    try {
        await twilioClient.messages.create({
            body,
            from: TWILIO_FROM_PHONE,
            to: formattedPhone
        });
        console.log(`SMS sent successfully to ${formattedPhone}`);
    } catch (error) {
        console.error('Twilio SMS error:', error);
    }
};

/**
 * Notify Patient and Admin when a Consultation is placed on the waitlist
 */
const notifyWaitlist = async (patientData, serviceName) => {
    const pName = patientData.firstName ? `${patientData.firstName} ${patientData.lastName || ''}`.trim() : 'Patient';

    // 1. Notify Patient via Email
    if (patientData.email) {
        await sendEmail(
            patientData.email,
            'Your Visit Request has been Submitted - Patriotic Telehealth',
            `<div style="text-align: center; margin-bottom: 20px;">
               <img src="https://patriotictelehealth.com/assets/logo.png" alt="Patriotic Virtual Telehealth" width="200" style="max-width: 100%; height: auto;">
             </div>
             <h3>Hi ${patientData.firstName || 'there'},</h3>
             <p>Your request for <b>${serviceName}</b> has been received and you are currently on our waitlist. Our clinical team is reviewing your intake details.</p>
             <p>You can track the status by logging into your Patient Dashboard:</p>
             <p><a href="https://patriotictelehealth.com/#patient" style="display:inline-block;padding:10px 20px;background-color:#0a2540;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Log in to Patient Dashboard</a></p>
             <br/>
             <p>Thank you,<br/>Patriotic Virtual Telehealth Team</p>`
        );
    }

    // 2. Notify Patient via SMS
    if (patientData.phone) {
        await sendSMS(
            patientData.phone,
            `Patriotic Telehealth: Your visit request for ${serviceName} is submitted & pending clinical review. Check your portal for updates!`
        );
    }

    // 3. Notify Admin via Email
    if (ADMIN_EMAIL) {
        const emails = ADMIN_EMAIL.split(',').map(e => e.trim()).filter(e => e);
        const emailPromises = emails.map(email => sendEmail(
            email,
            `New Patient Visit Submitted: ${serviceName}`,
            `<div style="text-align: center; margin-bottom: 20px;">
               <img src="https://patriotictelehealth.com/assets/logo.png" alt="Patriotic Virtual Telehealth" width="200" style="max-width: 100%; height: auto;">
             </div>
             <h3>New Visit Request (Waitlist)</h3>
             <p><b>Patient:</b> ${pName}</p>
             <p><b>Service:</b> ${serviceName}</p>
             <p><b>Email:</b> ${patientData.email || 'N/A'}</p>
             <p><b>Phone:</b> ${patientData.phone || 'N/A'}</p>
             <p>Please log in to the Provider Portal to review & schedule this clinical visit.</p>
             <p><a href="https://patriotictelehealth.com/#provider" style="display:inline-block;padding:10px 20px;background-color:#0a2540;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Log in to Provider Portal</a></p>`
        ));
        await Promise.all(emailPromises);
    }

    // 4. Notify Admin via SMS
    if (ADMIN_PHONE) {
        const phones = ADMIN_PHONE.split(',').map(p => p.trim()).filter(p => p);
        const phonePromises = phones.map(phone => sendSMS(
            phone,
            `New Visit: ${pName} requested ${serviceName}. Pending review in the Provider Portal.`
        ));
        await Promise.all(phonePromises);
    }
};

module.exports = {
    sendEmail,
    sendSMS,
    notifyWaitlist
};
