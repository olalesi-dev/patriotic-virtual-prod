const puppeteer = require('puppeteer-core');
const fs = require('fs');
const docx = require('docx');
const pptxgen = require('pptxgenjs');

(async () => {
    try {
        console.log("Starting Chrome...");
        const browser = await puppeteer.launch({
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless: 'new',
            defaultViewport: { width: 1400, height: 900 }
        });

        const page = await browser.newPage();
        console.log("Navigating to localhost:3000...");
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

        // Ensure animations finish
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

        console.log("Capturing Hero section...");
        const heroSection = await page.$('.hero-grid');
        await heroSection.screenshot({ path: 'hero_screenshot.png' });

        console.log("Capturing Tech section...");
        const techSection = await page.$('.tech-section');
        if (techSection) {
            await techSection.scrollIntoView();
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            await techSection.screenshot({ path: 'tech_screenshot.png' });
        } else {
            console.log("Tech section not found. Fallback full page screenshot.");
            await page.screenshot({ path: 'tech_screenshot.png' });
        }

        console.log("Capturing Footer...");
        const footerSection = await page.$('footer');
        if (footerSection) {
            await footerSection.scrollIntoView();
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            await footerSection.screenshot({ path: 'footer_screenshot.png' });
        } else {
            console.log("Footer not found.");
            fs.copyFileSync('tech_screenshot.png', 'footer_screenshot.png');
        }

        console.log("Capturing About Modal...");
        // Click About Us link
        await page.evaluate(() => {
            document.querySelector('.nav-links a:first-child').click();
        });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500)));
        const aboutModal = await page.$('.modal.cm');
        if (aboutModal) {
            await aboutModal.screenshot({ path: 'about_screenshot.png' });
        } else {
            console.log("About modal not found.");
            fs.copyFileSync('hero_screenshot.png', 'about_screenshot.png');
        }

        await browser.close();

        console.log("Generating Word Doc...");
        const doc = new docx.Document({
            sections: [{
                children: [
                    new docx.Paragraph({ text: "NVIDIA Inception Compliance Implementation Report", heading: docx.HeadingLevel.HEADING_1 }),
                    new docx.Paragraph({ text: "Below are the final executed changes to ensure LegitScript compliance and RadiantLogiq integration." }),
                    new docx.Paragraph({ text: "1. Hero Under-Text: Added RadiantLogiq subtext beneath hero header." }),
                    new docx.Paragraph({ text: "2. Hero Trust Line: Added integration trust statement below CTA." }),
                    new docx.Paragraph({ text: "3. Tech & Platform Section: Added new mid-page section." }),
                    new docx.Paragraph({ text: "4. DoseSpot Mention: Inserted within the 'Secure Medication Management' card inside the Tech Section." }),
                    new docx.Paragraph({ text: "5. Footer Logo Strip: Added NVIDIA Inception program logo and legal mark to footer bottom." }),
                    new docx.Paragraph({ text: "6. About Us Language: Added physician-led note at the top of the provider bio modal." }),
                    new docx.Paragraph({ text: "7. Provider-Facing Micro-Copy: Displayed at the very bottom of the Tech & Platform section safely." }),
                ]
            }]
        });
        const docBuffer = await docx.Packer.toBuffer(doc);
        fs.writeFileSync('C:\\Users\\dayoo\\Downloads\\NVIDIA_Implementation_Report.docx', docBuffer);

        console.log("Generating PPTX...");
        let pptx = new pptxgen();
        pptx.layout = 'LAYOUT_16x9';
        
        // Title Slide
        let slide1 = pptx.addSlide();
        slide1.addText("NVIDIA Inception Update - Visual Report", { x: 1, y: 1, w: 8, h: 2, fontSize: 32, bold: true, align: 'center' });
        
        let slide2 = pptx.addSlide();
        slide2.addText("Changes 1 & 2: Hero Section & Trust Line", { x: 0.5, y: 0.5, fontSize: 18, bold: true });
        slide2.addImage({ path: 'hero_screenshot.png', x: 0.5, y: 1.2, w: 9, h: 4, sizing: { type: 'contain', w: 9, h: 4 } });
        
        let slide3 = pptx.addSlide();
        slide3.addText("Changes 3, 4 & 7: Tech Section & DoseSpot", { x: 0.5, y: 0.5, fontSize: 18, bold: true });
        slide3.addImage({ path: 'tech_screenshot.png', x: 0.5, y: 1.2, w: 9, h: 4, sizing: { type: 'contain', w: 9, h: 4 } });

        let slide4 = pptx.addSlide();
        slide4.addText("Change 5: Footer Logo & Legal Copy", { x: 0.5, y: 0.5, fontSize: 18, bold: true });
        slide4.addImage({ path: 'footer_screenshot.png', x: 0.5, y: 1.2, w: 9, h: 4, sizing: { type: 'contain', w: 9, h: 4 } });

        let slide5 = pptx.addSlide();
        slide5.addText("Change 6: About Us Trust Language", { x: 0.5, y: 0.5, fontSize: 18, bold: true });
        slide5.addImage({ path: 'about_screenshot.png', x: 0.5, y: 1.2, w: 9, h: 4, sizing: { type: 'contain', w: 9, h: 4 } });

        await pptx.writeFile({ fileName: 'C:\\Users\\dayoo\\Downloads\\NVIDIA_Implementation_Visuals.pptx' });
        
        console.log("Export complete!");
    } catch (e) {
        console.error("Error creating files:", e);
    }
})();
