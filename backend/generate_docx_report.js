const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType, NumberFormat, LevelFormatType } = require('docx');

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
                text: "LegitScript Compliance Complete Report",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                text: "Phase 1 - 3 Implementation Summary for patriotictelehealth.com",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // DEMO CREDENTIALS SECTION
            new Paragraph({
                text: "1. LegitScript Reviewer Demo Credentials",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "Please provide the following credentials privately to your LegitScript reviewers in the application payload. This user may log into the portal to review the UX without triggering clinical reviews or Stripe billing.",
                spacing: { after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [createHeaderCell("Field"), createHeaderCell("Value")] }),
                    new TableRow({ children: [createCell("Role", true), createCell("Test Patient", false)] }),
                    new TableRow({ children: [createCell("Email", true), createCell("legitscript-reviewer@patriotictelehealth.com", false)] }),
                    new TableRow({ children: [createCell("Password", true), createCell("TestUser123!", false)] }),
                    new TableRow({ children: [createCell("Special Notes", true), createCell("This account triggers no live production Webhooks and bypasses Stripe/DoseSpot requirements.", false)] })
                ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // CODE IMPLEMENTATION CHECKLIST SECTION
            new Paragraph({
                text: "2. Front-End / Back-End Code Changes (Implemented & Deployed)",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "The following specific components were patched in Phase 1-3 to satisfy LegitScript Transparency and Advertising Standards.",
                spacing: { after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [createHeaderCell("Status"), createHeaderCell("LegitScript Standard"), createHeaderCell("Developer Action Taken / Implemented")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standard 5: Service Scope"), createCell("Added visible 'Florida-only' service statements across Hero and EMR eyebrow sections.")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standard 5: Service Scope"), createCell("Created explicit Florida Residency Confirmation dropdown mandatory before Patient Intake forms are submitted.")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standard 6: Privacy"), createCell("Created HIPAA-compliant standalone /privacy-policy page. Appended hyperlink globally to footer and intake consent modal.")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standard 8: Transparency"), createCell("Overhauled AI Imaging text to clearly state it is 'for educational/informational purposes only... does not constitute a clinical diagnosis'.")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standard 8: Transparency"), createCell("Deleted 'proven to' and guaranteed result language site-wide. Added overarching Medical Disclaimers noting 'individual results vary'.")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standard 4: Affiliates"), createCell("Purged 'Orosun Health' and 'Sterling Union'. Formally added Strive Pharmacy & Empower Pharmacy as the sole dispensing compounders.")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standards 2 & 7: FDA Law"), createCell("Updated GLP-1 headers to distinguish generic/branded FDA lines from 'Compounded Medications'. Disclaimed compounding medications are not evaluated by the FDA.")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standards 2 & 7: FDA Law"), createCell("Integrated compounding pharmacy badge for Strive Pharmacy (LegitScript/NABP) directly on Rx pages.")] }),
                    new TableRow({ children: [createCell("✅ DONE"), createCell("Standard 7: Prescribing"), createCell("Hardcoded an addendum directly into the intake form: 'No prescription will be generated prior to a clinical encounter, and a licensed provider must review...'.")] })
                ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // PROJECT MANAGER ACTION SECTION
            new Paragraph({
                text: "3. Pending Operational Requirements (Project Owner Sign-Off Required)",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "These final compliance tasks cannot be done in the code and must be manually verified or enacted via operational workflows prior to application submission.",
                spacing: { after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [createHeaderCell("Checklist"), createHeaderCell("Task details / Owner Actions")] }),
                    new TableRow({ children: [createCell("☐  To Be Verified", true), createCell("Verify all SSL/HTTPS strict paths are currently Enforced and routed properly through Cloudflare.")] }),
                    new TableRow({ children: [createCell("☐  To Be Verified", true), createCell("Pause ALL Paid Google Ads, Meta Ads (Facebook/Instagram), and TikTok campaigns until official LegitScript grant is received. Organic posts remain fine.")] }),
                    new TableRow({ children: [createCell("☐  To Be Verified", true), createCell("Audit all historical Instagram/Social Media accounts internally or via VA to ensure no rogue statements guaranteeing specific weight loss values or claiming multi-state expansion were made.")] }),
                    new TableRow({ children: [createCell("☐  To Be Verified", true), createCell("Verify that no internal documents (DEA files, medical license scans, NPDB abstracts) have been requested to be published publicly. Supply these securely via the LegitScript Web Portal exclusively.")] }),
                    new TableRow({ children: [createCell("☐  To Be Verified", true), createCell("Manually click through the new `/privacy-policy` and `/terms` using the Demo Credentials to ensure you are comfortable with the final presentation for reviewers.")] })
                ]
            }),

        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("C:\\Users\\dayoo\\Downloads\\LegitScript_Phase1_to_3_Compliance_Tracker.docx", buffer);
    console.log("Document created successfully at C:\\Users\\dayoo\\Downloads\\LegitScript_Phase1_to_3_Compliance_Tracker.docx");
}).catch(console.error);
