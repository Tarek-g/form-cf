# 🚀 دليل النشر - Form CF

هذا الدليل يوضح كيفية نشر مشروع Form CF على Cloudflare Workers خطوة بخطوة.

## 📋 المتطلبات الأساسية

### 1. إنشاء حساب Cloudflare (مجاني)
- اذهب إلى [cloudflare.com](https://cloudflare.com)
- أنشئ حساب جديد أو سجل دخول
- فعّل الحساب عبر البريد الإلكتروني

### 2. تثبيت Node.js
- حمّل [Node.js](https://nodejs.org) الإصدار 18 أو أحدث
- تحقق من التثبيت: `node --version`

### 3. تثبيت Git
- حمّل [Git](https://git-scm.com)
- تحقق من التثبيت: `git --version`

## 🛠️ إعداد المشروع

### 1. استنساخ المشروع
```bash
git clone https://github.com/YOUR-USERNAME/form-cf.git
cd form-cf
```

### 2. تثبيت التبعيات
```bash
npm install
```

### 3. تسجيل الدخول في Wrangler
```bash
npx wrangler login
```
سيفتح المتصفح لتأكيد تسجيل الدخول.

## 🗄️ إعداد قاعدة البيانات D1

### 1. إنشاء قاعدة البيانات
```bash
npx wrangler d1 create form_db
```

**مهم:** احفظ `database_id` من النتيجة!

### 2. تحديث wrangler.toml
افتح `wrangler.toml` وحدث:
```toml
[[d1_databases]]
binding = "DB"
database_name = "form_db"
database_id = "YOUR-DATABASE-ID-HERE"  # ضع المعرف الصحيح هنا
```

### 3. تطبيق Migration
```bash
npx wrangler d1 migrations apply form_db
```

### 4. التحقق من إنشاء الجداول
```bash
npx wrangler d1 execute form_db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

يجب أن ترى جدول `submissions`.

## 🔐 إعداد المتغيرات البيئية

### 1. تحديث الرموز السرية
في `wrangler.toml`:
```toml
[vars]
ADMIN_BEARER = "your-super-secret-admin-token-2024-xyz"
ALLOWED_ORIGINS = "https://yoursite.com,https://anotherdomain.com"
```

⚠️ **مهم:** غيّر `ADMIN_BEARER` لرمز قوي وفريد!

### 2. إعدادات البيئات المختلفة
```toml
# للإنتاج
[env.production]
vars = { ENVIRONMENT = "production" }

# للتطوير  
[env.development]
vars = { ENVIRONMENT = "development" }
```

## 🚀 النشر

### 1. النشر للإنتاج
```bash
npm run deploy
```

أو:
```bash
npx wrangler deploy
```

### 2. نشر لبيئة معينة
```bash
npx wrangler deploy --env production
```

### 3. النشر مع التطوير المحلي
```bash
npm run dev
```

## ✅ التحقق من النشر

### 1. زيارة الموقع
بعد النشر، ستحصل على رابط مثل:
```
https://form-cf.YOUR-SUBDOMAIN.workers.dev
```

### 2. اختبار النقاط النهائية

**الصفحة الرئيسية:**
```
GET https://your-worker.workers.dev/
```

**إرسال نموذج:**
```bash
curl -X POST https://your-worker.workers.dev/api/submissions \
  -d "name=Test User&email=test@example.com&consent_public=1"
```

**عرض التوقيعات:**
```bash
curl https://your-worker.workers.dev/api/signatories
```

**الإحصائيات:**
```bash
curl https://your-worker.workers.dev/api/stats
```

**عرض البيانات (للمشرف):**
```bash
curl -H "Authorization: Bearer your-admin-token" \
  https://your-worker.workers.dev/api/submissions
```

## 🔧 إدارة المشروع

### 1. مراقبة اللوجات المباشرة
```bash
npm run tail
```

### 2. إعادة النشر
```bash
npm run deploy
```

### 3. تحديث قاعدة البيانات
```bash
# إضافة migration جديد
npx wrangler d1 migrations create add_new_field

# تطبيق migrations جديدة
npx wrangler d1 migrations apply form_db
```

### 4. نسخ احتياطية
```bash
# تصدير كامل
npx wrangler d1 execute form_db --command=".dump" > backup-$(date +%Y%m%d).sql

# تصدير البيانات فقط
npx wrangler d1 execute form_db --command="SELECT * FROM submissions;" --format=table > submissions-backup.txt
```

## 🌐 ربط نطاق مخصص

### 1. إضافة النطاق في Cloudflare
- اذهب إلى Cloudflare Dashboard
- أضف موقعك (Add Site)
- اتبع التعليمات لتحديث DNS

### 2. ربط Worker بالنطاق
في `wrangler.toml`:
```toml
[env.production]
routes = [
  { pattern = "forms.yoursite.com/*", zone_name = "yoursite.com" }
]
```

أو من الـ Dashboard:
- Workers & Pages → form-cf → Settings → Triggers
- أضف Custom Domain

## 📊 مراقبة الأداء

### 1. Cloudflare Analytics
- اذهب إلى Workers & Pages
- اختر `form-cf`
- اطلع على إحصائيات الاستخدام

### 2. تنبيهات الحدود
- اذهب إلى Notifications
- أضف تنبيه عند الوصول لحد معين من الطلبات

## 🔒 الأمان والصيانة

### 1. تحديث الرموز السرية دورياً
```bash
# تحديث ADMIN_BEARER في wrangler.toml
# ثم إعادة النشر
npm run deploy
```

### 2. مراجعة السجلات
```bash
npm run tail
```

### 3. تحديث التبعيات
```bash
npm update
```

## 🐛 حل المشاكل الشائعة

### خطأ "Database not found"
```bash
# تأكد من صحة database_id في wrangler.toml
npx wrangler d1 list
```

### خطأ "Unauthorized"
- تحقق من `ADMIN_BEARER` في `wrangler.toml`
- تأكد من إعادة النشر بعد التحديث

### خطأ CORS
- أضف نطاقك في `ALLOWED_ORIGINS`
- أعد النشر

### بطء الاستجابة
- تحقق من Cloudflare Analytics
- راجع تحسين الاستعلامات في `worker.ts`

## 💰 تقدير التكلفة

### Cloudflare Workers (مجاني حتى 100,000 طلب/يوم)
- **الطبقة المجانية:** 100,000 طلب يومياً
- **الدفع حسب الاستخدام:** $0.50 لكل مليون طلب إضافي

### D1 Database (مجاني حتى 5GB)
- **التخزين:** مجاني حتى 5GB
- **القراءة:** 25 مليون طلب/شهر مجاناً
- **الكتابة:** 50,000 عملية/يوم مجاناً

### تقدير للاستخدام المتوسط
- **موقع صغير (100 إرسال/يوم):** مجاني تماماً
- **موقع متوسط (1000 إرسال/يوم):** مجاني تماماً  
- **موقع كبير (10,000 إرسال/يوم):** حوالي $1-2/شهر

## 📞 الدعم الفني

إذا واجهت مشاكل:

1. **راجع اللوجات:** `npm run tail`
2. **تحقق من التوثيق:** [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
3. **افتح issue:** في [GitHub Repository](https://github.com/YOUR-USERNAME/form-cf/issues)

---

🎉 **تهانينا! مشروعك الآن جاهز ومنشور!** 🎉