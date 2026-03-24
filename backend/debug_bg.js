const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
app.use(express.static('public'));

const server = app.listen(5009, async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('http://localhost:5009/', { waitUntil: 'networkidle0' });

    const info = await page.evaluate(() => {
        const disclaimer = document.querySelector('.med-disclaimer');
        let bg = window.getComputedStyle(disclaimer.parentElement).backgroundColor;
        let parentBg = window.getComputedStyle(disclaimer.parentElement.parentElement).backgroundColor;
        let p3Bg = window.getComputedStyle(disclaimer.parentElement.parentElement.parentElement).backgroundColor;

        // Find the node that has the white background
        let curr = disclaimer;
        let path = [];
        while (curr && curr.tagName) {
            let color = window.getComputedStyle(curr).backgroundColor;
            path.push({ tag: curr.tagName, id: curr.id, 'class': curr.className, bg: color });
            curr = curr.parentElement;
        }

        return path;
    });

    console.log(JSON.stringify(info, null, 2));

    await browser.close();
    server.close();
    process.exit(0);
});
