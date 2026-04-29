const fs = require('fs');
const path = require('path');
const express = require('express');
const puppeteer = require('puppeteer');
const PptxGenJS = require('pptxgenjs');

const app = express();
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

const port = 5006;
const server = app.listen(port, async () => {
    try {
        console.log("Local server running at http://localhost:" + port);
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1080 });

        // Helper to highlight elements
        const applyHighlight = async (textToFind, tagName = 'p') => {
            await page.evaluate(({ textToFind, tagName }) => {
                const els = Array.from(document.querySelectorAll(tagName));
                const el = els.find(e => e.textContent.includes(textToFind));
                if (el) {
                    // Remove existing highlights
                    document.querySelectorAll('.highlight-box').forEach(e => {
                        e.style.outline = 'none';
                        e.style.backgroundColor = '';
                        e.classList.remove('highlight-box');
                    });
                    
                    el.style.outline = '4px solid #ef4444';
                    el.style.outlineOffset = '6px';
                    el.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    el.style.borderRadius = '4px';
                    el.classList.add('highlight-box');
                    el.scrollIntoView({ behavior: 'instant', block: 'center' });
                }
            }, { textToFind, tagName });
            await new Promise(r => setTimeout(r, 800)); // wait for scroll
        };

        // Change 1
        await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
        await applyHighlight('Powered by RadiantLogiq, an AI-driven clinical platform', 'p');
        await page.screenshot({ path: 'change1.png', clip: { x: 0, y: 150, width: 1280, height: 600 } });

        // Change 2
        await applyHighlight('Our platform integrates advanced clinical software', 'p');
        await page.screenshot({ path: 'change2.png', clip: { x: 0, y: 350, width: 1280, height: 600 } });

        // Change 3
        await applyHighlight('Patriotic Virtual Telehealth is powered by RadiantLogiq, a physician-founded', 'p');
        await page.screenshot({ path: 'change3.png', clip: { x: 0, y: 300, width: 1280, height: 600 } });

        // Change 4
        await applyHighlight('We utilize a secure, integrated e-prescribing platform (DoseSpot)', 'span');
        await page.evaluate(() => {
            const el = document.querySelector('.highlight-box');
            if(el) el.parentElement.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: 'change4.png', clip: { x: 0, y: 350, width: 1280, height: 600 } });

        // Change 7 (since it's right in the same section)
        await applyHighlight('For providers and health systems, RadiantLogiq', 'p');
        await page.screenshot({ path: 'change7.png', clip: { x: 0, y: 500, width: 1280, height: 600 } });

        // Change 5
        await applyHighlight('Member, NVIDIA Inception Program', 'p'); // Or maybe the div
        // the footer area
        await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('div')).filter(d => d.textContent.includes('Powered by RadiantLogiq') && d.textContent.includes('Member, NVIDIA')).pop();
            if(el) {
                document.querySelectorAll('.highlight-box').forEach(e => {
                    e.style.outline = 'none';
                    e.style.backgroundColor = '';
                    e.classList.remove('highlight-box');
                });
                el.style.outline = '4px solid #ef4444';
                el.style.outlineOffset = '6px';
                el.classList.add('highlight-box');
                el.scrollIntoView({ behavior: 'instant', block: 'end' });
            }
        });
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: 'change5.png', clip: { x: 0, y: 780, width: 1280, height: 300 } });

        // Change 6
        await page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
            if (typeof openAboutUs === 'function') openAboutUs();
        });
        await new Promise(r => setTimeout(r, 1000));
        await applyHighlight('Built by a physician-led team, RadiantLogiq is designed to improve', 'p');
        await page.screenshot({ path: 'change6.png', clip: { x: 200, y: 150, width: 880, height: 800 } });

        await browser.close();
        console.log("Screenshots generated with highlights.");

        // Build Presentation
        let pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        const addChangeSlide = (title, imgPath, desc) => {
            let slide = pptx.addSlide();
            slide.addText(title, { x: 0.5, y: 0.5, w: '90%', fontSize: 22, bold: true, color: '1E3A8A' });
            slide.addText(desc, { x: 0.5, y: 1.0, w: '90%', fontSize: 13, color: '475569' });
            slide.addImage({ path: imgPath, x: 0.5, y: 1.5, w: 9, h: 4.2, sizing: { type: 'contain', w: 9, h: 4.2 } });
        };

        // Slide 0: Title
        let slide0 = pptx.addSlide();
        slide0.background = { color: '1E3A8A' }; // Navy
        slide0.addText("Implementation Validation: 7 Changes", { x: 1, y: 2.5, w: '80%', color: 'FFFFFF', fontSize: 32, bold: true });
        slide0.addText("RadiantLogiq & NVIDIA Inception Additions", { x: 1, y: 3.5, w: '80%', color: 'E2E8F0', fontSize: 20 });

        addChangeSlide(
            "Change 1: Hero RadiantLogiq Under-Text", 
            'change1.png', 
            "Action: Added 'Powered by RadiantLogiq' + NVIDIA Inception text below the main hero."
        );
        addChangeSlide(
            "Change 2: Platform Trust Line", 
            'change2.png', 
            "Action: Added context on integrating advanced clinical software and AI near the hero CTA."
        );
        addChangeSlide(
            "Change 3: 'Technology & Platform' Section", 
            'change3.png', 
            "Action: Inserted the primary RadiantLogiq descriptive paragraph in the new middle section."
        );
        addChangeSlide(
            "Change 4: DoseSpot Trust Sentence", 
            'change4.png', 
            "Action: Embed 'integrated e-prescribing platform (DoseSpot)' statement inside the new Tech section."
        );
        addChangeSlide(
            "Change 5: Footer Credibility Strip", 
            'change5.png', 
            "Action: Injected the exact requested text, NVIDIA Inception badge, and required legal trademark."
        );
        addChangeSlide(
            "Change 6: About/Trust Section", 
            'change6.png', 
            "Action: Placed the physician-led language directly into the established About Us Modal under 'Partnerships'."
        );
        addChangeSlide(
            "Change 7: Provider-Facing Micro-Copy", 
            'change7.png', 
            "Action: Safely tucked the secondary text below the main Technology block."
        );

        await pptx.writeFile({ fileName: "C:\\Users\\dayoo\\Downloads\\NVIDIA_7_Changes_Validation_Report.pptx" });
        console.log("PowerPoint successfully written format: 7 slides + highlights.");

        // Cleanup
        for (let i = 1; i <= 7; i++) {
            if (fs.existsSync(`change${i}.png`)) fs.unlinkSync(`change${i}.png`);
        }

    } catch (e) {
        console.error("Error generating pptx:", e);
    } finally {
        server.close();
        process.exit(0);
    }
});
