# 🚀 Deployment Guide - Form CF

This guide explains how to deploy Form CF project on Cloudflare Workers step by step.

## 📋 Prerequisites

### 1. Create Cloudflare account (free)
- Go to [cloudflare.com](https://cloudflare.com)
- Create new account or sign in
- Activate account via email

### 2. Install Node.js
- Download [Node.js](https://nodejs.org) version 18 or newer
- Verify installation: `node --version`

### 3. Install Git
- Download [Git](https://git-scm.com)
- Verify installation: `git --version`

## 🛠️ Project setup

### 1. Clone the project
```bash
git clone https://github.com/YOUR-USERNAME/form-cf.git
cd form-cf
```

### 2. Install dependencies
```bash
npm install
```

### 3. Login to Wrangler
```bash
npx wrangler login
```
Browser will open to confirm login.

## 🗄️ D1 Database setup

### 1. Create database
```bash
npx wrangler d1 create form_db
```

**Important:** Save the `database_id` from the result!

### 2. Update wrangler.toml
Open `wrangler.toml` and update:
```toml
[[d1_databases]]
binding = "DB"
database_name = "form_db"
database_id = "YOUR-DATABASE-ID-HERE"  # Put the correct ID here
```

### 3. Apply Migration
```bash
npx wrangler d1 migrations apply form_db
```

### 4. Verify table creation
```bash
npx wrangler d1 execute form_db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

You should see the `submissions` table.

## 🔐 Environment variables setup

### 1. Update secret tokens
In `wrangler.toml`:
```toml
[vars]
ADMIN_BEARER = "your-super-secret-admin-token-2024-xyz"
ALLOWED_ORIGINS = "https://yoursite.com,https://anotherdomain.com"
```

⚠️ **Important:** Change `ADMIN_BEARER` to a strong and unique token!

### 2. Different environment settings
```toml
# For production
[env.production]
vars = { ENVIRONMENT = "production" }

# For development  
[env.development]
vars = { ENVIRONMENT = "development" }
```

## 🚀 Deployment

### 1. Deploy to production
```bash
npm run deploy
```

Or:
```bash
npx wrangler deploy
```

### 2. Deploy to specific environment
```bash
npx wrangler deploy --env production
```

### 3. Deploy with local development
```bash
npm run dev
```

## ✅ Verify deployment

### 1. Visit the website
After deployment, you'll get a URL like:
```
https://form-cf.YOUR-SUBDOMAIN.workers.dev
```

### 2. Test endpoints

**Home page:**
```
GET https://your-worker.workers.dev/
```

**Submit form:**
```bash
curl -X POST https://your-worker.workers.dev/api/submissions \
  -d "name=Test User&email=test@example.com&consent_public=1"
```

**View signatures:**
```bash
curl https://your-worker.workers.dev/api/signatories
```

**Statistics:**
```bash
curl https://your-worker.workers.dev/api/stats
```

**View data (admin):**
```bash
curl -H "Authorization: Bearer your-admin-token" \
  https://your-worker.workers.dev/api/submissions
```

## 🔧 Project management

### 1. Monitor live logs
```bash
npm run tail
```

### 2. Redeploy
```bash
npm run deploy
```

### 3. Update database
```bash
# Add new migration
npx wrangler d1 migrations create add_new_field

# Apply new migrations
npx wrangler d1 migrations apply form_db
```

### 4. Backups
```bash
# Full export
npx wrangler d1 execute form_db --command=".dump" > backup-$(date +%Y%m%d).sql

# Data only export
npx wrangler d1 execute form_db --command="SELECT * FROM submissions;" --format=table > submissions-backup.txt
```

## 🌐 Connect custom domain

### 1. Add domain in Cloudflare
- Go to Cloudflare Dashboard
- Add your site (Add Site)
- Follow instructions to update DNS

### 2. Connect Worker to domain
In `wrangler.toml`:
```toml
[env.production]
routes = [
  { pattern = "forms.yoursite.com/*", zone_name = "yoursite.com" }
]
```

Or from Dashboard:
- Workers & Pages → form-cf → Settings → Triggers
- Add Custom Domain

## 📊 Performance monitoring

### 1. Cloudflare Analytics
- Go to Workers & Pages
- Select `form-cf`
- View usage statistics

### 2. Limit alerts
- Go to Notifications
- Add alert when reaching certain request limit

## 🔒 Security and maintenance

### 1. Update secret tokens regularly
```bash
# Update ADMIN_BEARER in wrangler.toml
# Then redeploy
npm run deploy
```

### 2. Review logs
```bash
npm run tail
```

### 3. Update dependencies
```bash
npm update
```

## 🐛 Common issues troubleshooting

### "Database not found" error
```bash
# Make sure database_id is correct in wrangler.toml
npx wrangler d1 list
```

### "Unauthorized" error
- Check `ADMIN_BEARER` in `wrangler.toml`
- Make sure to redeploy after update

### CORS error
- Add your domain in `ALLOWED_ORIGINS`
- Redeploy

### Slow response
- Check Cloudflare Analytics
- Review query optimization in `worker.ts`

## 💰 Cost estimation

### Cloudflare Workers (free up to 100,000 requests/day)
- **Free tier:** 100,000 daily requests
- **Pay as you go:** $0.50 per million additional requests

### D1 Database (free up to 5GB)
- **Storage:** Free up to 5GB
- **Reads:** 25 million requests/month free
- **Writes:** 50,000 operations/day free

### Estimate for average usage
- **Small site (100 submissions/day):** Completely free
- **Medium site (1000 submissions/day):** Completely free  
- **Large site (10,000 submissions/day):** About $1-2/month

## 📞 Technical support

If you encounter issues:

1. **Check logs:** `npm run tail`
2. **Check documentation:** [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
3. **Open issue:** In [GitHub Repository](https://github.com/YOUR-USERNAME/form-cf/issues)

---

🎉 **Congratulations! Your project is now ready and deployed!** 🎉