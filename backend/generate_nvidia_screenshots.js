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
                                transformation: { width: 450, height: 270 }
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

const port = 5002;
const server = app.listen(port, async () => {
    try {
        console.log("Local server running at http://localhost:" + port);
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1080 });

        // 1. Screenshot Hero Area (Changes 1 & 2)
        await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'hero_trust.png', clip: { x: 0, y: 150, width: 1280, height: 600 } });

        // 2. Screenshot Technology & Platform Section (Changes 3, 4, 7)
        await page.evaluate(() => {
            const el = document.getElementById('technology-platform');
            if(el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'tech_platform.png', clip: { x: 0, y: 300, width: 1280, height: 600 } });

        // 3. Screenshot Footer Credibility Strip (Change 5)
        await page.evaluate(() => {
            const el = document.querySelector('footer');
            if(el) el.scrollIntoView({ behavior: 'instant', block: 'end' });
        });
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'footer_strip.png', clip: { x: 0, y: 780, width: 1280, height: 300 } });

        // 4. Screenshot About/Trust Section (Change 6)
        await page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
            if (typeof openAboutUs === 'function') openAboutUs();
        });
        await new Promise(r => setTimeout(r, 1500));
        // The modal is centered usually, clip the modal bounds
        await page.screenshot({ path: 'about_modal.png', clip: { x: 200, y: 100, width: 880, height: 800 } });

        await browser.close();
        console.log("Screenshots generated.");

        // Build Document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: "Implementation Report: NVIDIA Inception & RadiantLogiq Integration",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({
                        text: "Detailed Code Additions & Visual Evidence",
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({ text: "This report formally catalogs the implementation of the 7 exact text and copy additions mandated by the RadiantLogiq / NVIDIA Inception developer brief onto the main landing page (https://patriotictelehealth.com/).", spacing: { before: 200, after: 200 } }),

                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                        rows: [
                            new TableRow({ children: [createHeaderCell("Changes Implemented"), createHeaderCell("Implementation Narrative"), createHeaderCell("Visual Screenshot Evidence")] }),
                            
                            createImageRow(
                                'hero_trust.png', 
                                "Changes 1 & 2: Homepage Hero & Trust Line", 
                                "Integrated 'Powered by RadiantLogiq...' directly below the hero subheadline and inserted the 'advanced clinical software' trust line directly underneath the security badges."
                            ),

                            createImageRow(
                                'tech_platform.png', 
                                "Changes 3, 4 & 7: Technology & Platform Section", 
                                "Added a new consistent section titled 'Technology & Platform' outlining RadiantLogiq's physician-founded nature. Embedded the DoseSpot trust line within an Rx badge block and included the Provider Micro-Copy below."
                            ),

                            createImageRow(
                                'footer_strip.png', 
                                "Change 5: Footer NVIDIA Credibility Strip", 
                                "Added the 'Powered by RadiantLogiq' and 'Member, NVIDIA Inception Program' line dynamically in the footer, complete with the requested NVIDIA Inception logo and copyright string."
                            ),

                            createImageRow(
                                'about_modal.png', 
                                "Change 6: About/Trust Section", 
                                "Updated the active 'About Us' modal (Partnership section) to include the physician-led team sentence describing RadiantLogiq's efficiency goals in healthcare delivery without breaking the modal state logic."
                            )
                        ]
                    })
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync("C:\\Users\\dayoo\\Downloads\\NVIDIA_Implementation_Validation_Report.docx", buffer);
        console.log("Document successfully written.");

        // Cleanup
        fs.unlinkSync('hero_trust.png');
        fs.unlinkSync('tech_platform.png');
        fs.unlinkSync('footer_strip.png');
        fs.unlinkSync('about_modal.png');

    } catch (e) {
        console.error("Error generating report:", e);
    } finally {
        server.close();
        process.exit(0);
    }
});
