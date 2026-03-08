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
const sendEmail = async (to, subject, html, attachments = []) => {
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
        console.warn(`[Mock Email] To: ${to} | Subject: ${subject}`);
        return;
    }
    try {
        const msg = {
            to,
            from: SENDGRID_FROM_EMAIL,
            replyTo: SENDGRID_FROM_EMAIL,
            subject,
            html,
        };
        if (attachments && attachments.length > 0) {
            msg.attachments = attachments;
        }
        await sgMail.send(msg);
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

/**
 * Notify Patient and Admin when an Appointment is Scheduled
 */
const notifyScheduled = async (patientData, serviceName, scheduledDate, meetingUrl, intakeData = {}) => {
    const pName = patientData.firstName ? `${patientData.firstName} ${patientData.lastName || ''}`.trim() : 'Patient';

    // Format Times
    const startDate = new Date(scheduledDate);
    const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 mins later

    // Formatter for humans
    const humanDateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
    const dateStr = startDate.toLocaleDateString('en-US', humanDateOptions);

    // Formatter for URL links
    const isoStartStr = startDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const isoEndStr = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const summaryEnc = encodeURIComponent(`Telehealth Visit: ${serviceName}`);
    const locEnc = encodeURIComponent(`Video Call Link: ${meetingUrl}`);
    const googleLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${summaryEnc}&dates=${isoStartStr}/${isoEndStr}&details=${locEnc}&location=${locEnc}`;
    const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${summaryEnc}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${locEnc}&location=${locEnc}`;

    // ICS attachment for Apple/Outlook Desktop
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Patriotic Telehealth//EN
BEGIN:VEVENT
UID:${Date.now()}@patriotictelehealth.com
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, '')}
DTSTART:${isoStartStr}
DTEND:${isoEndStr}
SUMMARY:Telehealth Visit: ${serviceName}
DESCRIPTION:Video Call Link: ${meetingUrl}
LOCATION:${meetingUrl}
END:VEVENT
END:VCALENDAR`;

    const attachments = [{
        content: Buffer.from(icsContent).toString('base64'),
        filename: 'appointment.ics',
        type: 'text/calendar',
        disposition: 'attachment'
    }];

    // Intake formatting
    let intakeHtml = '';
    if (Object.keys(intakeData).length > 0) {
        intakeHtml = `<h4 style="margin-top: 20px;">Patient Intake Context</h4><table style="width:100%; border-collapse: collapse;">`;
        for (const [k, v] of Object.entries(intakeData)) {
            intakeHtml += `<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><b>${k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</b></td><td style="padding: 8px; border: 1px solid #ddd;">${typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v}</td></tr>`;
        }
        intakeHtml += `</table>`;
    }

    // 1. Notify Patient via Email
    if (patientData.email) {
        await sendEmail(
            patientData.email,
            'Your Telehealth Visit is Scheduled - Patriotic Telehealth',
            `<div style="text-align: center; margin-bottom: 20px;">
               <img src="https://patriotictelehealth.com/assets/logo.png" alt="Patriotic Virtual Telehealth" width="200" style="max-width: 100%; height: auto;">
             </div>
             <h3>Hi ${patientData.firstName || 'there'},</h3>
             <p>Your telehealth appointment for <b>${serviceName}</b> has been officially scheduled!</p>
             <div style="background-color: #f7f9fc; padding: 15px; border-radius: 8px; margin-top: 15px; margin-bottom: 15px; text-align: center;">
                <h4 style="margin: 0; color: #0a2540;">When</h4>
                <p style="margin: 5px 0 15px 0; font-size: 16px;"><b>${dateStr}</b></p>
                <h4 style="margin: 0; color: #0a2540;">Where</h4>
                <p style="margin: 5px 0 0 0;"><a href="${meetingUrl}" style="display:inline-block;padding:12px 24px;background-color:#02c39a;color:white;text-decoration:none;border-radius:5px;font-weight:bold;font-size:16px;">Join Video Consult Room</a></p>
             </div>
             <p>Add to your calendar:</p>
             <p>
               👉 <a href="${googleLink}">Add to Google Calendar</a><br><br>
               👉 <a href="${outlookLink}">Add to Outlook</a><br><br>
               📅 <i>An Apple/Outlook .ICS file is attached to this email.</i>
             </p>
             <p>Thank you,<br/>Patriotic Virtual Telehealth Team</p>`,
            attachments
        );
    }

    // 2. Notify Patient via SMS
    if (patientData.phone) {
        await sendSMS(
            patientData.phone,
            `Patriotic Telehealth: Your visit for ${serviceName} is scheduled for ${dateStr}. Video link: ${meetingUrl}`
        );
    }

    // 3. Notify Admin via Email
    if (ADMIN_EMAIL) {
        const emails = ADMIN_EMAIL.split(',').map(e => e.trim()).filter(e => e);
        const emailPromises = emails.map(email => sendEmail(
            email,
            `Scheduled Appointment: ${pName} - ${serviceName}`,
            `<div style="text-align: center; margin-bottom: 20px;">
               <img src="https://patriotictelehealth.com/assets/logo.png" alt="Patriotic Virtual Telehealth" width="200" style="max-width: 100%; height: auto;">
             </div>
             <h3>New Scheduled Visit</h3>
             <p>An appointment has been successfully booked on calendar.</p>
             <div style="background-color: #f7f9fc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                 <p><b>Time:</b> ${dateStr}</p>
                 <p><b>Patient:</b> ${pName}</p>
                 <p><b>Email:</b> ${patientData.email || 'N/A'}</p>
                 <p><b>Phone:</b> ${patientData.phone || 'N/A'}</p>
                 <p><b>Service:</b> ${serviceName}</p>
             </div>
             ${intakeHtml}
             <p style="margin-top: 20px;"><a href="https://patriotictelehealth.com/#provider" style="display:inline-block;padding:10px 20px;background-color:#0a2540;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Log in to Provider Portal</a></p>`,
            attachments
        ));
        await Promise.all(emailPromises);
    }

    // 4. Notify Admin via SMS
    if (ADMIN_PHONE) {
        const phones = ADMIN_PHONE.split(',').map(p => p.trim()).filter(p => p);
        const phonePromises = phones.map(phone => sendSMS(
            phone,
            `Scheduled: ${pName} for ${serviceName} at ${dateStr}. Review in Provider Portal.`
        ));
        await Promise.all(phonePromises);
    }
};

module.exports = {
    sendEmail,
    sendSMS,
    notifyWaitlist,
    notifyScheduled
};
