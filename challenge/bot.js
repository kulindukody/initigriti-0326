const puppeteer = require('puppeteer');

const COOKIE_DOMAIN = 'localhost'; // In a real challenge, this would be the actual domain
const FLAG = process.env.FLAG || 'INTIGRITI{fake_flag_for_testing}';

async function visitUrl(urlToVisit) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
        ],
        headless: 'new'
    });

    try {
        const page = await browser.newPage();

        page.on('console', msg => console.log('[Browser]', msg.text()));

        // Set the admin cookie
        await page.setCookie({
            name: 'FLAG',
            value: FLAG,
            domain: COOKIE_DOMAIN,
            path: '/',
            httpOnly: false, // Must be accessible via JS
            secure: false, // For local testing
            sameSite: 'Lax'
        });

        console.log(`[Bot] Visiting: ${urlToVisit}`);

        // Visit the URL, waiting for network to be idle
        await page.goto(urlToVisit, {
            waitUntil: 'networkidle2',
            timeout: 5000 // 5 seconds timeout
        });

        // Add an extra wait just in case of delayed executions
        await new Promise(r => setTimeout(r, 2000));

        console.log(`[Bot] Successfully visited: ${urlToVisit}`);
    } catch (e) {
        console.error(`[Bot] Error visiting ${urlToVisit}:`, e.message);
    } finally {
        await browser.close();
    }
}

module.exports = { visitUrl };
