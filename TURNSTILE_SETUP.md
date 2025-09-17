# 🛡️ Cloudflare Turnstile Setup (Optional)

## What is Turnstile?

Cloudflare Turnstile is a free and privacy-friendly alternative to reCAPTCHA. It protects forms from spam and bots without bothering users.

## Activation steps

### 1. Create Turnstile site

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account and go to "Turnstile"
3. Click "Add Site"
4. Enter site information:
   - **Site Name**: Your site name (e.g., "Signature Form")
   - **Domain**: Your site domain (e.g., `example.com` or `localhost` for development)
   - **Widget Mode**: Choose "Managed"

### 2. Get the keys

After creating the site, you'll get:
- **Site Key** (public key): Used in frontend
- **Secret Key** (private key): Used on server

### 3. Update Worker settings

#### a. In `wrangler.toml`:
```toml
[vars]
# ... other settings
TURNSTILE_SECRET_KEY = "your_secret_key_here"
```

#### b. Or using wrangler secrets:
```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
# Enter the secret key when prompted
```

### 4. Update forms

#### For embedded forms (embed-code.js):
```javascript
FormCF.init('form-widget', 'https://your-worker.workers.dev', {
    language: 'en',
    theme: 'light',
    turnstileSiteKey: 'your_site_key_here'  // Add this line
});
```

#### For simple forms (simple-form.html):
Replace `YOUR_TURNSTILE_SITE_KEY` with your actual public key:
```html
<div class="cf-turnstile" 
     data-sitekey="your_actual_site_key" 
     data-theme="light" 
     data-language="en"></div>
```

## Customization options

### Available themes:
- `light`: Light theme (default)
- `dark`: Dark theme
- `auto`: Adapts to user's system

### Supported languages:
- `en`: English
- `fr`: French
- `de`: German
- And many more...

### Advanced example:
```html
<div class="cf-turnstile" 
     data-sitekey="your_site_key"
     data-theme="auto"
     data-language="en"
     data-size="compact"
     data-callback="onTurnstileSuccess"
     data-error-callback="onTurnstileError"></div>
```

## Test integration

### 1. Run locally:
```bash
npx wrangler dev
```

### 2. Test form:
- Open browser to `http://localhost:8787`
- Fill out form
- Make sure Turnstile appears (if enabled)
- Submit form

### 3. Check logs:
```bash
npx wrangler tail
```

## Troubleshooting

### Common issues:

#### 1. Turnstile doesn't appear:
- Make sure Site Key is correct
- Make sure domain is added in Turnstile settings
- Make sure script loads: `https://challenges.cloudflare.com/turnstile/v0/api.js`

#### 2. Verification fails:
- Make sure Secret Key is correct in environment variables
- Make sure domain matches
- Check Worker logs for errors

#### 3. For local development:
- Add `localhost` in domain settings in Turnstile
- Or use `127.0.0.1`

## Security settings

### Best practices:
1. **Never expose Secret Key** in frontend code
2. Use `wrangler secret` instead of `wrangler.toml` for production
3. Specify allowed domains precisely
4. Monitor hacking attempts through Cloudflare logs

### Secure production setup example:
```bash
# Setup keys securely
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
npx wrangler secret put ENC_KEY_B64 --env production
npx wrangler secret put ADMIN_BEARER --env production
```

## Optional integration

The system also works without Turnstile! If you don't set the keys, Turnstile verification will be skipped and rely on other methods to prevent spam:

- IP address checking
- Data validation
- Prevent duplicates with same email

## Support

If you encounter issues:
1. Review [Cloudflare Turnstile documentation](https://developers.cloudflare.com/turnstile/)
2. Make sure to update Worker to latest version
3. Check browser and Worker logs

---

📝 **Note**: Turnstile is free to use with Cloudflare and more privacy-friendly than other alternatives.