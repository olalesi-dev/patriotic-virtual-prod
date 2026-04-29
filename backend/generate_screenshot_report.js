const fs = require('fs');
const path = require('path');
const express = require('express');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, ImageRun } = require('docx');

const app = express();
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

const createHeaderCell = (text) => new TableCell({
    children: [new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF" })],
        alignment: AlignmentType.CENTER,
    })],
    shading: { fill: "1E3A8A" }, // Navy blue
    margins: { top: 100, bottom: 100, left: 100, right: 100 }
});

const createCell = (text, isBold = false) => new TableCell({
    children: [new Paragraph({
        children: [new TextRun({ text, bold: isBold })],
    })],
    margins: { top: 100, bottom: 100, left: 100, right: 100 }
});

// Helper to create an image row in the doc
const createImageRow = (imagePath, standardTitle, descText) => {
    return new TableRow({
        children: [
            createCell(standardTitle, true),
            createCell(descText),
            new TableCell({
                children: [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: fs.readFileSync(imagePath),
                                transformation: { width: 500, height: 300 }
                            })
                        ],
                        alignment: AlignmentType.CENTER
                    })
                ],
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
            })
        ]
    });
};

const port = 4999;
const server = app.listen(port, async () => {
    try {
        console.log("Local server running at http://localhost:" + port);
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1080 });

        // 1. Screenshot Cookie Banner
        await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
        // wait for banner
        await page.waitForSelector('#cookie-banner');
        await page.screenshot({ path: 'cookie_banner.png', clip: { x: 0, y: 1080 - 150, width: 1280, height: 150 } });

        // 2. Screenshot Providers Roster
        await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('Our Providers'));
            if(el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: 'providers_roster.png', clip: { x: 0, y: 300, width: 1280, height: 600 } });

        // 3. Screenshot Weight Loss Controlled Substance Disclaimer
        await page.goto(`http://localhost:${port}/weight-loss`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('strong')).find(el => el.textContent.includes('Controlled Substances Disclaimer'));
            if(el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: 'controlled_substances.png', clip: { x: 200, y: 350, width: 880, height: 400 } });

        // 4. Screenshot FAQ Page
        await page.goto(`http://localhost:${port}/faq`, { waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'faq_page.png', clip: { x: 0, y: 0, width: 1280, height: 800 } });

        // 5. Screenshot TOS LegitScript Clause
        await page.goto(`http://localhost:${port}/terms`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('11. Compliance & Certification'));
            if(el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: 'tos_clause.png', clip: { x: 0, y: 400, width: 1280, height: 400 } });

        await browser.close();
        console.log("Screenshots generated.");

        // Build Document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: "LegitScript Comprehensive Implementation Logs (w/ Evidence)",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({
                        text: "Patriotic Virtual Telehealth - Visual Audit Defensibility",
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({ text: "This report formally catalogs the major technical safety checks built to satisfy LegitScript's 9 Standards, alongside verifiable visual screenshots of how they render dynamically to the patient.", spacing: { before: 200, after: 200 } }),

                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                        rows: [
                            new TableRow({ children: [createHeaderCell("LegitScript Standard"), createHeaderCell("Implementation Narrative"), createHeaderCell("Visual Screenshot Evidence")] }),
                            
                            createImageRow(
                                'cookie_banner.png', 
                                "Standard 6: Privacy (HIPAA)", 
                                "Engineered a persistent, bottom-docked global HIPAA Cookie Consent Banner enforcing an explicit 'Accept All' gate prior to activating Google/Meta tracking pixels."
                            ),

                            createImageRow(
                                'providers_roster.png', 
                                "Standards 1 & 5: Licensure & Transparency", 
                                "Added a dedicated 'Our Providers' section explicitly naming the Medical Director and NP, detailing their credentials, and mapping their active Florida Medical Licenses onto the homepage."
                            ),

                            createImageRow(
                                'controlled_substances.png', 
                                "Standard 2 & 8: Legal Compliance & Misbranding", 
                                "Built a severe red visual warning block directly beneath the Pharmacy Disclosure stating: 'No DEA-Scheduled Controlled Substances (such as Adderall, Xanax, or Phentermine) will be prescribed under any circumstances'."
                            ),

                            createImageRow(
                                'faq_page.png', 
                                "Standard 8: Transparency", 
                                "Configured a fully static, linked /faq page addressing pivotal LegitScript queries, preventing the appearance of a 'rogue pharmacy' by cementing strict clinical standards."
                            ),

                            createImageRow(
                                'tos_clause.png', 
                                "Standards 4, 7, 8: Affiliates & Prescriptions", 
                                "Aligned the site's Terms of Service (/terms) to match the LegistScript application narrative strictly by injecting a dedicated 'Compliance & Certification' clause verifying NABP partners."
                            )
                        ]
                    })
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync("C:\\Users\\dayoo\\Downloads\\LegitScript_Implementation_Log_Screenshots.docx", buffer);
        console.log("Document successfully written.");

        // Cleanup
        fs.unlinkSync('cookie_banner.png');
        fs.unlinkSync('providers_roster.png');
        fs.unlinkSync('controlled_substances.png');
        fs.unlinkSync('faq_page.png');
        fs.unlinkSync('tos_clause.png');

    } catch (e) {
        console.error(e);
    } finally {
        server.close();
        process.exit(0);
    }
});
