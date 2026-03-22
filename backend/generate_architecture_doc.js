const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } = require('docx');

// Create a helper for styled table headers
const createHeaderCell = (text) => new TableCell({
    children: [new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF" })],
        alignment: AlignmentType.CENTER,
    })],
    shading: { fill: "1E3A8A" }, // Navy blue
    width: { size: 100, type: WidthType.AUTO },
    margins: { top: 100, bottom: 100, left: 100, right: 100 }
});

const createCell = (text, bold = false) => new TableCell({
    children: [new Paragraph({
        children: [new TextRun({ text, bold })],
    })],
    margins: { top: 100, bottom: 100, left: 100, right: 100 }
});

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "Architectural Review: Firebase Workspace Structure",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                text: "Patriotic Virtual EMR & Public Telehealth Platform",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // OVERVIEW
            new Paragraph({
                text: "1. Current Infrastructure (Monorepo Workspace)",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "Currently, both patriotictelehealth.com (the public-facing marketing and landing site) and patriotic-virtual-emr.web.app (the internal provider/patient portal) operate within the exact same Firebase project workspace ('patriotic-virtual-prod'). This is accomplished using a feature named Firebase Multi-Site Hosting. It allows the applications to have distinctly different frontend domains while sharing the same backend ecosystem.",
                spacing: { after: 200 }
            }),

            // WHY WE SHOULD NOT SPLIT THE APPS
            new Paragraph({
                text: "2. Why Splitting Projects is Anti-Pattern for this Setup",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "While it might superficially seem cleaner to give the EMR its own Firebase project, taking this action would break severe structural ties between the marketing front-end and the clinical back-end. Specifically:",
                spacing: { after: 200 }
            }),

            new Paragraph({
                text: "• Shared Identity Platform (Authentication):",
                heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
                text: "Because both sites live in 'patriotic-virtual-prod', they share the exact same Firebase Authentication tenant. This powers the Seamless Single-Sign-On (SSO) previously implemented. A patient can log in or buy a membership directly on the public domain, click 'Dashboard', and be securely navigated directly to the private .web.app portal without re-authentication. Splitting into two different projects would require building incredibly complex OIDC (Custom Identity) tokens to pass authentication state securely between two completely isolated user pools.",
                spacing: { after: 200 }
            }),

            new Paragraph({
                text: "• Single Source of Truth (Firestore Database):",
                heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
                text: "When a user submits health information or pays for a consultation on the public site, that data is structured into Firestore (e.g., 'users' and 'assessments' collections). Since the EMR is tethered to the same workspace, providers can instantly pull that precise live data securely. Splitting into two separate projects forces data duplication. You would require Google Cloud Pub/Sub or third-party webhooks to 'sync' information from the Public Database to the EMR Database continually.",
                spacing: { after: 200 }
            }),

            new Paragraph({
                text: "• Consolidated Security & Compliance:",
                heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
                text: "Currently, there is a single centralized layer of backend Cloud Functions, DoseSpot API integrations, and Stripe API configurations. Separating the projects would mean duplicating sensitive secrets and attempting to manage dual sets of interconnected Firestore Security Rules.",
                spacing: { after: 200 }
            }),

            new Paragraph({
                text: "3. Conclusion & Final Recommendation",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "From a strict cloud architecture standpoint, maintaining both domains within the single 'patriotic-virtual-prod' workspace is absolutely the most standardized, secure, and highly-recommended approach. The separation of concerns is correctly handled at the Hosting level (meaning the public code and private code are 100% separate servers) while gracefully enabling both codebases to talk to the same database safely.",
                spacing: { after: 200 }
            }),
        ],
    }],
});

const outputPath = "C:\\Users\\dayoo\\Downloads\\Firebase_Architecture_Review.docx";
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(outputPath, buffer);
    console.log("Document successfully exported to: " + outputPath);
}).catch(console.error);
