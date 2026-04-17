const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType } = docx;

// Color palette
const PRIMARY = "0f172a"; 
const TEXT = "334155";
const RED = "b91c1c";

const main = async () => {
    // Attempt to load the exact service account downloaded by user
    const downloadFolder = "C:/Users/dayoo/Downloads/";
    const adminKeyFileName = "patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json";
    
    let keyData = {};
    try {
        const raw = fs.readFileSync(downloadFolder + adminKeyFileName, 'utf-8');
        keyData = JSON.parse(raw);
    } catch(e) {
        console.error("Could not read original json file, falling back to read values");
    }

    const projectId = keyData.project_id || "patriotic-virtual-prod";
    const clientEmail = keyData.client_email || "firebase-adminsdk-fbsvc@patriotic-virtual-prod.iam.gserviceaccount.com";
    const privateKey = keyData.private_key || "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n";

    const doc = new Document({
        creator: "Patriotic Virtual Telehealth Architect",
        title: "Firebase Admin Credentials",
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    children: [
                        new TextRun({ text: "FIREBASE ADMIN CREDENTIALS", bold: true, size: 36, color: PRIMARY }),
                    ]
                }),
                new Paragraph({
                    spacing: { after: 300 },
                    children: [
                        new TextRun({
                            text: "The following values must be placed in your local .env file. They are required to authenticate the Firebase Admin SDK locally to bypass the 'Firebase Admin disabled' error.",
                            size: 22,
                            color: TEXT,
                            font: "Inter",
                        }),
                    ]
                }),
                new Paragraph({
                    spacing: { after: 300 },
                    children: [
                        new TextRun({
                            text: "CRITICAL: Do not commit these values to version control. They are production-grade Service Account credentials.",
                            size: 22,
                            color: RED,
                            bold: true,
                            font: "Inter",
                        }),
                    ]
                }),
                
                new Paragraph({ text: "Required .env Variables", heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
                
                new Paragraph({
                    children: [
                        new TextRun({ text: "FIREBASE_PROJECT_ID=", font: "Courier New", size: 20, bold: true }),
                        new TextRun({ text: projectId, font: "Courier New", size: 20 })
                    ]
                }),
                new Paragraph({
                    spacing: { before: 100 },
                    children: [
                        new TextRun({ text: "FIREBASE_CLIENT_EMAIL=", font: "Courier New", size: 20, bold: true }),
                        new TextRun({ text: clientEmail, font: "Courier New", size: 20 })
                    ]
                }),
                new Paragraph({
                    spacing: { before: 100 },
                    children: [
                        new TextRun({ text: "FIREBASE_PRIVATE_KEY=", font: "Courier New", size: 20, bold: true })
                    ]
                }),
                new Paragraph({
                    spacing: { before: 50, after: 200 },
                    children: [
                        new TextRun({ text: `"${privateKey.replace(/\n/g, '\\n')}"`, font: "Courier New", size: 18 })
                    ]
                }),
                
                new Paragraph({ text: "Alternative: Direct JSON Import", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Alternatively, you can save the raw JSON representation locally and set ", size: 22, font: "Inter" }),
                        new TextRun({ text: "FIREBASE_SERVICE_ACCOUNT_JSON", size: 22, font: "Courier New", bold: true }),
                        new TextRun({ text: " to point to the file path.", size: 22, font: "Inter" })
                    ]
                })

            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = "C:/Users/dayoo/Downloads/Firebase_Admin_Credentials_Handoff.docx";
    fs.writeFileSync(outputPath, buffer);
    console.log(`Document saved successfully to ${outputPath}`);
};

main().catch(err => { console.error(err); });
