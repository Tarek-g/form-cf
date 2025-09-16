# 📝 Form CF - مثال سريع للاستخدام

## تجربة سريعة (3 دقائق)

### 1. النسخ والتثبيت
```bash
git clone https://github.com/YOUR-USERNAME/form-cf.git
cd form-cf
npm install
```

### 2. إعداد Cloudflare
```bash
# تسجيل دخول
npx wrangler login

# إنشاء قاعدة بيانات
npx wrangler d1 create form_db
```

**انسخ `database_id` وضعه في `wrangler.toml`**

### 3. إعداد قاعدة البيانات
```bash
# تطبيق المخطط
npx wrangler d1 migrations apply form_db

# التحقق
npx wrangler d1 execute form_db --command="SELECT COUNT(*) FROM submissions;"
```

### 4. النشر
```bash
npm run deploy
```

## 🎯 أمثلة سريعة للاستخدام

### تضمين بسيط
```html
<form action="https://YOUR-WORKER.workers.dev/api/submissions" method="post">
    <input name="name" placeholder="الاسم" required>
    <input name="email" placeholder="البريد" type="email" required>
    <textarea name="comment" placeholder="تعليق"></textarea>
    <label><input name="consent_public" type="checkbox" value="1"> عرض علني</label>
    <button>إرسال</button>
</form>
```

### ويدجت JavaScript
```html
<div id="form"></div>
<script src="embed-code.js"></script>
<script>
FormCF.init('form', 'https://YOUR-WORKER.workers.dev');
</script>
```

### عرض التوقيعات
```javascript
fetch('https://YOUR-WORKER.workers.dev/api/signatories')
    .then(res => res.json())
    .then(data => console.log(data.signatories));
```

## 🔧 تخصيص سريع

### إضافة حقل جديد
1. عدّل SQL في `migrations/`
2. حدّث `validateSubmission()` في `worker.ts`
3. أضف الحقل في HTML

### تغيير التصميم
- عدّل CSS في `embed-code.js`
- أو استخدم الأمثلة في `public/examples/`

## 📊 مراقبة

```bash
# اللوجات المباشرة
npm run tail

# الإحصائيات
curl https://YOUR-WORKER.workers.dev/api/stats

# البيانات (للمشرف)
curl -H "Authorization: Bearer YOUR-TOKEN" \
     https://YOUR-WORKER.workers.dev/api/submissions
```

---

**🚀 جاهز في 3 دقائق!**