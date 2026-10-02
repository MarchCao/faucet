# HAICE Faucet inquiry backend (Cloudflare Worker)

Server-side handler for the contact form on `faucet.haice.top`.
Receives the form POST, then via the Resend API sends:

1. the inquiry to `sales@haice.top`
2. an auto-reply confirmation to the customer's email (JA/ZH/EN/KO)

## Secrets

The Resend API key lives **only** as a Worker secret (a Worker env var),
set with the CLI below. It is never in this repo, never in frontend code.

```
wrangler secret put RESEND_API_KEY
```

Non-secret config (`FROM_EMAIL`, `INQUIRY_TO`) is in `wrangler.toml`.

## One-time setup

1. Create a free Resend account at resend.com, add domain `haice.top`
   (Domains → Add). Resend shows 3 DNS records (SPF / DKIM / DMARC):
   add them at the DNS provider.
   - The root domain already has an SPF record
     (`v=spf1 include:spf.mail.qq.com ~all` for QQ enterprise mail):
     do NOT create a second one — merge into a single record, e.g.
     `v=spf1 include:spf.mail.qq.com include:amazonses.com ~all`.
   - DKIM is a new TXT record, no conflict.
2. Wait for the domain status to show "Verified" in Resend.
3. Create an API key (API Keys → Create, "Sending access" is enough).
4. Deploy:
   ```
   cd worker
   npx -y wrangler@latest deploy
   wrangler secret put RESEND_API_KEY   # paste the key when prompted
   ```
   The Worker is served at `https://haice-apparel-inquiry.<account>.workers.dev`.
5. Put that URL into `src/assets/js/main.js` (`INQUIRY_ENDPOINT`),
   rebuild (`node build.js`), republish `gh-pages`.

## Test

```
curl -X POST https://haice-apparel-inquiry.<account>.workers.dev/api/inquiry \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"you@example.com","message":"hello","lang":"en"}'
# -> {"ok":true}
```

## Notes

- CORS allows only `https://faucet.haice.top`.
- Honeypot field `website`: bots get a silent fake success.
- Best-effort rate limit: 5 submissions / hour / IP.
- Resend free tier: 3,000 emails/month, 100/day — plenty for an inquiry form.
