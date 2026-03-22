const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

admin.initializeApp();
const db = admin.firestore();

// API key needs to be configured in environment or secrets
// For this environment, we expect GEMINI_API_KEY in process.env
// Or fallback to a config variable if deploying for real
const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key || "";
const genAI = new GoogleGenerativeAI(apiKey);

exports.onComplianceDocumentUploaded = functions.storage.object().onFinalize(async (object) => {
    const filePath = object.name;
    // Expected path: compliance-documents/{category}/{docId}/{filename} (or similar)
    if (!filePath || !filePath.startsWith('compliance-documents/')) {
        return null;
    }

    const fileBucket = object.bucket;
    const bucket = admin.storage().bucket(fileBucket);
    const file = bucket.file(filePath);

    // Get the docId from metadata if passed, or extract from path
    // Let's assume the client sets metadata.docId
    // Or we parse the filename or path.
    const metadataOptions = (await file.getMetadata())[0];
    const customMeta = metadataOptions.metadata || {};
    const docId = customMeta.docId;
    if (!docId) {
        console.warn('No docId found in file custom metadata, cannot update Firestore.');
        return null;
    }

    const docRef = db.collection('crm-compliance').doc('data').collection('document-records').doc(docId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) {
        // Document might be in a different path if the front-end created it elsewhere
        // But adhering strictly to: top-level collection crm-compliance with subcollection document-records
        console.warn(`Doc ${docId} not found in crm-compliance/data/document-records`);
        return null;
    }

    try {
        console.log(`Starting extraction for ${filePath}...`);
        
        // 1. Download file content
        const [buffer] = await file.download();
        let extractedText = '';

        // 2. Extract text based on content type
        if (filePath.toLowerCase().endsWith('.pdf') || object.contentType === 'application/pdf') {
            const data = await pdfParse(buffer);
            extractedText = data.text;
        } else if (filePath.toLowerCase().endsWith('.docx') || object.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
        } else if (object.contentType && object.contentType.startsWith('image/')) {
            // For images, we can pass inline data directly to Gemini instead of text
            extractedText = null; 
        } else {
            console.log('Unsupported file type for raw text extraction.');
            throw new Error('Unsupported file type for automated extraction');
        }

        if (extractedText && extractedText.length > 50000) {
            extractedText = extractedText.substring(0, 50000); // Limit to prevent massive inputs
        }
        
        // 3. Call Gemini
        if (!apiKey) {
            console.error('No GEMINI_API_KEY found. Skipping AI Extraction.');
            throw new Error('Missing API Key');
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are a compliance officer for a telehealth platform. Analyze the following document and extract key metadata into a structured JSON object. 
    
    Fields to extract (return null if not found):
    - title (string): The title of the document.
    - category (string): Match strictly to one of exactly these fifteen categories: "Business Associate Agreements", "HIPAA Privacy Policy", "HIPAA Security Policy", "Patient Consent Forms", "Informed Consent for Treatment", "State-Specific Telehealth Compliance Documents", "Notice of Privacy Practices", "Data Breach Notification Policy", "Record Retention Policy", "Accessibility and Nondiscrimination Policy", "Telehealth Provider Licensure Documentation", "ONC Certification", "E-Prescribing Compliance", "Telehealth Platform Terms of Service", "Emergency Protocol Documentation".
    - effectiveDate (string): YYYY-MM-DD format if possible or raw date string.
    - expirationDate (string): YYYY-MM-DD format if clearly stated. If explicitly stated as no expiration, leave null.
    - version (string): Version number or identifier.
    - parties (array of strings): Names of any parties or signatories (vendor names, providers, states, etc).
    - summary (string): A brief one to two sentence plain-English summary of what the document covers.
    - criticalDates (string): Any critical dates or deadlines mentioned beyond the primary expiration date (e.g. review dates, audit deadlines).
    
    IMPORTANT: Respond ONLY with a valid JSON object. Do not include markdown blocks or any other text outside the JSON.
    `;

        let contents;
        if (extractedText !== null) {
            contents = [prompt + "\n\nDOCUMENT TEXT:\n" + extractedText];
        } else {
            // It's an image
            contents = [
                prompt,
                {
                    inlineData: {
                        data: buffer.toString('base64'),
                        mimeType: object.contentType
                    }
                }
            ];
        }

        const result = await model.generateContent(contents);
        let responseText = result.response.text().trim();
        
        if (responseText.startsWith('```json')) responseText = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
        else if (responseText.startsWith('```')) responseText = responseText.replace(/```/g, '').trim();

        const extractedData = JSON.parse(responseText);
        console.log('Gemini extracted JSON:', extractedData);

        const updates = {};
        const currentData = docSnap.data() || {};
        
        // Only update empty or placeholder fields
        if (!currentData.title && extractedData.title) updates.title = extractedData.title;
        if (!currentData.category && extractedData.category) updates.category = extractedData.category;
        if (!currentData.effectiveDate && extractedData.effectiveDate) updates.effectiveDate = extractedData.effectiveDate;
        if (!currentData.expirationDate && extractedData.expirationDate) updates.expirationDate = extractedData.expirationDate;
        if (!currentData.version && extractedData.version) updates.version = extractedData.version;
        if ((!currentData.parties || currentData.parties.length === 0) && extractedData.parties) updates.parties = extractedData.parties;
        if (!currentData.summary && extractedData.summary) updates.summary = extractedData.summary;
        if (!currentData.criticalDates && extractedData.criticalDates) updates.criticalDates = extractedData.criticalDates;

        // Automatically computed status logic based on expiration date (if we just extracted it or had it)
        let expDateStr = updates.expirationDate || currentData.expirationDate;
        if (expDateStr) {
            const expDate = new Date(expDateStr);
            const now = new Date();
            const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
            
            if (diffDays > 90) updates.status = 'Active';
            else if (diffDays > 60) updates.status = 'Expiring Soon';
            else if (diffDays >= 0) updates.status = 'Expiring Critical';
            else updates.status = 'Expired';
        } else {
            updates.status = 'Active'; // No expiration
        }

        updates.aiExtractionStatus = 'success';
        updates.aiExtractedFields = Object.keys(updates).filter(k => k !== 'aiExtractionStatus' && k !== 'status');

        await docRef.update(updates);

        // Log AI Activity
        await docRef.collection('activity-log').add({
            action: 'AI Extraction',
            actor: 'System',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            note: 'AI successfully analyzed the uploaded document and populated missing fields.',
            fieldsUpdated: updates.aiExtractedFields
        });

    } catch (error) {
        console.error('Error during AI extraction:', error);
        await docRef.update({
            aiExtractionStatus: 'failed',
            aiExtractionError: error.message
        });
        
        await docRef.collection('activity-log').add({
            action: 'AI Extraction Failed',
            actor: 'System',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            note: `AI extraction encountered an error: ${error.message}`
        });
    }
});


exports.dailyComplianceExpirationCheck = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    console.log('Starting daily compliance expiration check...');
    const snapshot = await db.collection('crm-compliance').doc('data').collection('document-records').get();
    
    const now = new Date();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.expirationDate) continue;

        const expDate = new Date(data.expirationDate);
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let newStatus = null;
        let notificationType = null;
        let priority = 'high';

        if (diffDays < 0 && data.status !== 'Expired') {
            newStatus = 'Expired';
            notificationType = 'urgent';
        } else if (diffDays >= 0 && diffDays <= 60 && data.status !== 'Expiring Critical') {
            newStatus = 'Expiring Critical';
            notificationType = 'escalated';
        } else if (diffDays > 60 && diffDays <= 90 && data.status !== 'Expiring Soon') {
            newStatus = 'Expiring Soon';
            notificationType = 'standard';
        }

        if (newStatus) {
            await doc.ref.update({ status: newStatus });
            
            const assignee = data.owner || data.assignedOwner;
            const notificationMsg = diffDays < 0 ? 
                `URGENT: ${data.title} expired on ${data.expirationDate}!` : 
                `Alert: ${data.title} is expiring in ${diffDays} days (${data.expirationDate})`;

            const logEntry = {
                documentId: doc.id,
                title: data.title,
                category: data.category,
                expirationDate: data.expirationDate,
                message: notificationMsg,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                type: notificationType
            };

            await db.collection('crm-compliance').doc('data').collection('notification-log').add(logEntry);

            // Fetch admin users
            const adminUsers = [];
            const usersSnap = await db.collection('patients').where('role', '==', 'admin').get();
            usersSnap.forEach(u => adminUsers.push(u.id));

            // Notify Assignee and Admins
            const usersToNotify = new Set([...adminUsers]);
            if (assignee) usersToNotify.add(assignee);

            for (const uid of usersToNotify) {
                await db.collection('notifications').add({
                    userId: uid,
                    title: 'Compliance Document Expiring',
                    message: notificationMsg,
                    type: 'compliance_alert',
                    status: 'unread',
                    priority: priority,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    link: `/admin/crm/compliance/${doc.id}`
                });
            }
        } else if (diffDays < 0) {
            // Already expired, send DALIY urgent
            const assignee = data.owner || data.assignedOwner;
            const notificationMsg = `URGENT: ${data.title} expired on ${data.expirationDate} and requires immediate renewal!`;
            
            const adminUsers = [];
            const usersSnap = await db.collection('patients').where('role', '==', 'admin').get();
            usersSnap.forEach(u => adminUsers.push(u.id));

            const usersToNotify = new Set([...adminUsers]);
            if (assignee) usersToNotify.add(assignee);

            for (const uid of usersToNotify) {
                await db.collection('notifications').add({
                    userId: uid,
                    title: 'Compliance Document Expired',
                    message: notificationMsg,
                    type: 'compliance_alert',
                    status: 'unread',
                    priority: 'high',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    link: `/admin/crm/compliance/${doc.id}`
                });
            }
        }
    }
});
