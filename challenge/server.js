const express = require('express');
const path = require('path');
const { visitUrl } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Strict CSP Implementation
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none';"
    );
    // Anti-MIME sniffing header
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

// Serve static files from 'public' directory
app.use(express.static('public'));

// JSONP Endpoint (Vulnerable by Design for the challenge)
app.get('/api/stats', (req, res) => {
    const callback = req.query.callback;

    // Strict validation of the callback parameter to prevent simple XSS.
    // It only allows alphanumeric characters, underscores, and dots.
    if (!callback || !/^[a-zA-Z0-9_\.]+$/.test(callback)) {
        return res.status(400).json({ error: "Invalid callback identifier" });
    }

    const data = {
        users: 1337,
        active: 42,
        status: 'Operational'
    };

    // Construct the JSONP response
    const payload = `${callback}(${JSON.stringify(data)});`;

    res.type('application/javascript');
    res.send(payload);
});


// Report Endpoint for the Admin Bot
app.post('/report', async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
        return res.status(400).send('Invalid URL provided.');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).send('URL must start with http:// or https://');
    }

    // Acknowledge receipt immediately
    res.send('Admin bot is visiting the URL...');

    // Asynchronously visit the URL
    try {
        await visitUrl(url);
    } catch (e) {
        console.error('Error in bot visitation:', e);
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
