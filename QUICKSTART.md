# 📝 Form CF - Quick Usage Example

## Quick Test (3 minutes)

### 1. Clone and install
```bash
git clone https://github.com/YOUR-USERNAME/form-cf.git
cd form-cf
npm install
```

### 2. Cloudflare setup
```bash
# Login
npx wrangler login

# Create database
npx wrangler d1 create form_db
```

**Copy `database_id` and put it in `wrangler.toml`**

### 3. Database setup
```bash
# Apply schema
npx wrangler d1 migrations apply form_db

# Verify
npx wrangler d1 execute form_db --command="SELECT COUNT(*) FROM submissions;"
```

### 4. Deploy
```bash
npm run deploy
```

## 🎯 Quick usage examples

### Simple embedding
```html
<form action="https://YOUR-WORKER.workers.dev/api/submissions" method="post">
    <input name="name" placeholder="Name" required>
    <input name="email" placeholder="Email" type="email" required>
    <textarea name="comment" placeholder="Comment"></textarea>
    <label><input name="consent_public" type="checkbox" value="1"> Public display</label>
    <button>Submit</button>
</form>
```

### JavaScript widget
```html
<div id="form"></div>
<script src="embed-code.js"></script>
<script>
FormCF.init('form', 'https://YOUR-WORKER.workers.dev');
</script>
```

### Display signatures
```javascript
fetch('https://YOUR-WORKER.workers.dev/api/signatories')
    .then(res => res.json())
    .then(data => console.log(data.signatories));
```

## 🔧 Quick customization

### Add new field
1. Edit SQL in `migrations/`
2. Update `validateSubmission()` in `worker.ts`
3. Add field in HTML

### Change design
- Edit CSS in `embed-code.js`
- Or use examples in `public/examples/`

## 📊 Monitoring

```bash
# Live logs
npm run tail

# Statistics
curl https://YOUR-WORKER.workers.dev/api/stats

# Data (for admin)
curl -H "Authorization: Bearer YOUR-TOKEN" \
     https://YOUR-WORKER.workers.dev/api/submissions
```

---

**🚀 Ready in 3 minutes!**