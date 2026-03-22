const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, WidthType } = require('docx');

const createHeaderCell = (text) => new TableCell({
    children: [new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF" })],
        alignment: AlignmentType.CENTER,
    })],
    shading: { fill: "1E3A8A" }, // Navy blue
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
                text: "LegitScript Certification Standards Analysis",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                text: "Patriotic Virtual Telehealth - Compliance Audit & Gap Analysis",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: "", spacing: { after: 200 } }),

            // COMPLIANCE VERIFICATION TABLE
            new Paragraph({
                text: "1. Certification Standards Verification (Current Codebase)",
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
                text: "The following table verifies how the current project infrastructure (Phases 1-3) satisfies the 9 core LegitScript Healthcare Certification Standards.",
                spacing: { after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [createHeaderCell("Standard"), createHeaderCell("Requirement Overview"), createHeaderCell("Project Compliance Status")] }),
                    new TableRow({ children: [createCell("1. Licensure"), createCell("Merchants must be adequately licensed in the jurisdictions they serve."), createCell("✅ Verified: The platform exclusively enforces patient intake for Florida residents via state dropdown matching and confirmation toggles.")] }),
                    new TableRow({ children: [createCell("2. Legal Compliance"), createCell("Must hold necessary authorizations to prescribe/dispense drugs."), createCell("✅ Verified: Platform operates compliantly with FL telemedicine laws, and exclusively utilizes licensed PCAB/NABP pharmacies.")] }),
                    new TableRow({ children: [createCell("3. Prior Discipline"), createCell("Must disclose any prior criminal or regulatory violations in the past 10 years."), createCell("⚠️ Operational: No code changes required. The business owner must truthfully disclose any legal history during the LegitScript application.")] }),
                    new TableRow({ children: [createCell("4. Affiliates & Partners"), createCell("Partner pharmacies must be LegitScript certified or recognized."), createCell("✅ Verified: Disclosures updated to name Strive Pharmacy (LegitScript certified) and Empower. Removed uncertified partners like Orosun.")] }),
                    new TableRow({ children: [createCell("5. Patient Services"), createCell("Websites must clearly disclose all states where services are available."), createCell("✅ Verified: 'Florida only' disclaimers successfully hardcoded to Hero sections, eyebrows, and Patient Intake flows.")] }),
                    new TableRow({ children: [createCell("6. Privacy"), createCell("Must comply with HIPAA and post a privacy policy on the website (SSL enforced)."), createCell("✅ Verified: Standalone /privacy-policy page built. HIPAA compliance terms added. Cloudflare HTTPS handles SSL encryption.")] }),
                    new TableRow({ children: [createCell("7. Validity of Prescription"), createCell("Prescriptions cannot be dispensed prior to the provision of care by a professional."), createCell("✅ Verified: Hardcoded addendum in intake explicitly stating that no prescriptions are generated prior to a clinical encounter.")] }),
                    new TableRow({ children: [createCell("8. Transparency"), createCell("Must not be misleading. No unapproved benefits or false claims."), createCell("✅ Verified: Stripped 'FDA-Approved' language from compounded drugs (replaced with Rx). Added 'Educational Purposes Only' to AI Imaging.")] }),
                    new TableRow({ children: [createCell("9. Advertising"), createCell("Advertisements must be transparent and comply with platform terms of service."), createCell("⚠️ Operational: Pending project owner verification to pause active Google/Meta ads until authorization is granted.")] })
                ]
            }),

            new Paragraph({ text: "", spacing: { after: 400 } }),

            // GAP ANALYSIS & PROMTPING SECTION
            new Paragraph({
                text: "2. Gap Analysis & Future Prompting Backlog",
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
                text: "While the primary triggers for rejection have been addressed, a strict LegitScript review may flag the following edge-case gaps based on Standard 6 (Privacy) and Standard 8 (Transparency). You can copy the descriptions below and paste them to Antigravity as future prompts to implement.",
                spacing: { after: 200 }
            }),
            
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [createHeaderCell("Gap Discovered"), createHeaderCell("LegitScript Standard"), createHeaderCell("Actionable Prompt for Antigravity")] }),
                    new TableRow({ children: [
                        createCell("Missing Dedicated Telehealth Consent Form", true), 
                        createCell("Standard 7 & 8"), 
                        createCell("Prompt: 'We need to create a dedicated \"Informed Consent for Telehealth Services\" document. Please generate a new modal or dedicated page outlining telehealth risks, benefits, and emergency protocols, and add a mandatory checkbox for it in the Patient Registration/Intake flow of the EMR portal.'")
                    ]}),
                    new TableRow({ children: [
                        createCell("Provider Transparency & Credentials Roster", true), 
                        createCell("Standard 8 (Transparency)"), 
                        createCell("Prompt: 'LegitScript requires full transparency of our medical staff. Please create an \"Our Providers\" section on the landing page that lists Dr. Olalesi Osunsade (and any other providers) along with a mention of their active Florida Medical License, so patients know exactly who is treating them.'")
                    ]}),
                    new TableRow({ children: [
                        createCell("Missing HIPAA Notice of Privacy Practices (NPP)", true), 
                        createCell("Standard 6 (Privacy)"), 
                        createCell("Prompt: 'Standard website privacy policies are not enough. Please create a dedicated HIPAA \"Notice of Privacy Practices\" (NPP) page. Add a link to it in our footer, and add a mandatory checkbox in our intake flow that says \"I acknowledge receipt of the Notice of Privacy Practices\".'")
                    ]}),
                    new TableRow({ children: [
                        createCell("Pharmacy Contact Transparency", true), 
                        createCell("Standard 4 & 8"), 
                        createCell("Prompt: 'Please update the pharmacy disclosure blocks in the Rx Weight Loss pages. Along with stating it is Strive Pharmacy, please add their official patient support phone number or address so patients have direct contact transparency with the compounder.'")
                    ]})
                ]
            })
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("C:\\Users\\dayoo\\Downloads\\LegitScript_Alignment_and_Gap_Analysis.docx", buffer);
    console.log("Document successfully written.");
}).catch(console.error);
