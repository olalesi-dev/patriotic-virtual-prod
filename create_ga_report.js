const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Header } = require('docx');

async function createReport() {
    const logoBuffer = fs.readFileSync('emr-portal/public/assets/logo.png');

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "Inter",
                        size: 24, // 12pt
                        color: "333333",
                    },
                    paragraph: {
                        spacing: {
                            line: 360,
                            after: 200,
                        },
                    },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1000,
                            bottom: 1000,
                            left: 1000,
                            right: 1000,
                        },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new ImageRun({
                                        data: logoBuffer,
                                        transformation: {
                                            width: 150,
                                            height: 50,
                                        },
                                    }),
                                ],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: "Patriotic Virtual Telehealth - Engineering Report",
                                        bold: true,
                                        color: "1e3a8a", // Navy blue
                                        size: 20, // 10pt
                                    }),
                                ],
                                spacing: { after: 400 },
                            }),
                        ],
                    }),
                },
                children: [
                    new Paragraph({
                        text: "Google Analytics 4 Implementation Summary",
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 400 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Executive Summary", bold: true, size: 32, color: "1e3a8a" }),
                        ],
                        spacing: { before: 200, after: 100 },
                    }),
                    new Paragraph({
                        text: "Google Analytics 4 (Measurement ID: G-FY48JCRQ4D) has been successfully, safely, and natively integrated into the primary frontend that powers patriotictelehealth.com. The implementation was cleanly configured to adhere strictly to LegitScript compliance and preserve existing functionality while supporting advanced Next.js SPA routing out-of-the-box.",
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Key Advancements", bold: true, size: 28, color: "1e3a8a" }),
                        ],
                        spacing: { before: 300, after: 100 },
                    }),
                    new Paragraph({
                        text: "1. Advanced SPA Tracking: The architecture leverages GA4's Enhanced Measurement over explicit effect-based listeners. This securely captures all Single Page Application (SPA) navigations natively through the History API.",
                        bullet: { level: 0 }
                    }),
                    new Paragraph({
                        text: "2. Zero Duplicate Pageviews: By avoiding redundant React-level listeners, the notorious 'duplicate trigger' issue endemic to React GA integrations was structurally prevented.",
                        bullet: { level: 0 }
                    }),
                    new Paragraph({
                        text: "3. Total Compliance: The implementation does not interact with, intercept, or modify PHI pathways, user authentication flows, LegitScript claims, or existing HIPAA Consent Banner mechanisms.",
                        bullet: { level: 0 }
                    }),
                    new Paragraph({
                        text: "4. No Extraneous Dependencies: Rather than introducing new third-party libraries that add dependency bloat, native Next.js asynchronous '<Script>' tag configurations were used.",
                        bullet: { level: 0 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Technical Architecture", bold: true, size: 28, color: "1e3a8a" }),
                        ],
                        spacing: { before: 300, after: 100 },
                    }),
                    new Paragraph({
                        text: "A new internal component, 'GoogleAnalytics.tsx', was securely constructed inside 'src/components/common'. This logic dictates the invocation of 'gtag.js' dynamically. The component was injected into the root routing layout ('src/app/layout.tsx') immediately subsequent to the <body> definition, universally instrumenting all client operations optimally.",
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Deployment Assurance", bold: true, size: 28, color: "1e3a8a" }),
                        ],
                        spacing: { before: 300, after: 100 },
                    }),
                    new Paragraph({
                        text: "All local compilation validations successfully passed (Exit Code 0). Verification on live environments can be performed securely using the standard Google Tag Assistant overlay to observe clean data payloads.",
                    }),
                    new Paragraph({
                        text: "---\nPrepared by Patriotic Telehealth Engineering Team",
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 500, after: 200 },
                    }),
                ],
            },
        ],
    });

    try {
        const buffer = await Packer.toBuffer(doc);
        const outputPath = 'C:\\Users\\dayoo\\Downloads\\GA4_Implementation_Summary.docx';
        fs.writeFileSync(outputPath, buffer);
        console.log('Premium Report Document created successfully at: ' + outputPath);
    } catch (error) {
        console.error('Failed to create document:', error);
    }
}

createReport();
