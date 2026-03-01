const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function sync() {
    const profilePath = process.argv[2];
    const cookiesJsonPath = process.argv[3];

    if (!profilePath || !cookiesJsonPath) {
        process.exit(1);
    }

    const configCookies = JSON.parse(fs.readFileSync(cookiesJsonPath, 'utf8'));
    const playwrightCookies = [];

    // Mapping for Twitter
    if (configCookies.twitter_auth_token && configCookies.twitter_ct0) {
        const domains = ['.twitter.com', '.x.com'];
        for (const domain of domains) {
            playwrightCookies.push(
                { name: 'auth_token', value: configCookies.twitter_auth_token, domain, path: '/', secure: true, httpOnly: true },
                { name: 'ct0', value: configCookies.twitter_ct0, domain, path: '/', secure: true, httpOnly: false }
            );
        }
    }

    // Mapping for Reddit
    if (configCookies.reddit_cookies) {
        const redditDomain = '.reddit.com';
        const parts = configCookies.reddit_cookies.split(';');
        for (const part of parts) {
            if (part.includes('=')) {
                const [innerPart] = part.trim().split(' ');
                const [name, value] = innerPart.split('=', 2);
                if (name && value) {
                    playwrightCookies.push({ name: name.trim(), value: value.trim(), domain: redditDomain, path: '/' });
                }
            }
        }
    }

    // Mapping for Bilibili
    if (configCookies.bilibili_sessdata) {
        const domains = ['.bilibili.com'];
        for (const domain of domains) {
            playwrightCookies.push({ name: 'SESSDATA', value: configCookies.bilibili_sessdata, domain, path: '/', secure: true, httpOnly: true });
            if (configCookies.bilibili_csrf) {
                playwrightCookies.push({ name: 'bili_jct', value: configCookies.bilibili_csrf, domain, path: '/', secure: true });
            }
        }
    }

    if (playwrightCookies.length === 0) {
        console.error('No cookies to sync.');
        process.exit(1);
    }

    try {
        const context = await chromium.launchPersistentContext(profilePath, {
            headless: true,
            args: ['--disable-extensions', '--no-sandbox']
        });
        await context.addCookies(playwrightCookies);
        await context.close();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

sync();
