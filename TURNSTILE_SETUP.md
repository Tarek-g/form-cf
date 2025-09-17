# 🛡️ إعداد Cloudflare Turnstile (اختياري)

## ما هو Turnstile؟

Cloudflare Turnstile هو بديل مجاني وصديق للخصوصية لـ reCAPTCHA. يحمي النماذج من البريد العشوائي والروبوتات بدون إزعاج المستخدمين.

## خطوات التفعيل

### 1. إنشاء موقع Turnstile

1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. اختر حسابك واذهب إلى "Turnstile"
3. انقر على "Add Site"
4. أدخل معلومات الموقع:
   - **Site Name**: اسم موقعك (مثل: "نموذج التوقيع")
   - **Domain**: نطاق موقعك (مثل: `example.com` أو `localhost` للتطوير)
   - **Widget Mode**: اختر "Managed"

### 2. الحصول على المفاتيح

بعد إنشاء الموقع، ستحصل على:
- **Site Key** (مفتاح عام): يستخدم في الواجهة الأمامية
- **Secret Key** (مفتاح سري): يستخدم في الخادم

### 3. تحديث إعدادات Worker

#### أ. في `wrangler.toml`:
```toml
[vars]
# ... إعدادات أخرى
TURNSTILE_SECRET_KEY = "your_secret_key_here"
```

#### ب. أو باستخدام wrangler secrets:
```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
# أدخل المفتاح السري عند السؤال
```

### 4. تحديث النماذج

#### للنماذج المضمنة (embed-code.js):
```javascript
FormCF.init('form-widget', 'https://your-worker.workers.dev', {
    language: 'ar',
    theme: 'light',
    turnstileSiteKey: 'your_site_key_here'  // أضف هذا السطر
});
```

#### للنماذج البسيطة (simple-form.html):
استبدل `YOUR_TURNSTILE_SITE_KEY` بالمفتاح العام الخاص بك:
```html
<div class="cf-turnstile" 
     data-sitekey="your_actual_site_key" 
     data-theme="light" 
     data-language="ar"></div>
```

## خيارات التخصيص

### الثيمات المتاحة:
- `light`: ثيم فاتح (افتراضي)
- `dark`: ثيم داكن
- `auto`: يتكيف مع نظام المستخدم

### اللغات المدعومة:
- `ar`: العربية
- `en`: الإنجليزية
- `fr`: الفرنسية
- والمزيد...

### مثال متقدم:
```html
<div class="cf-turnstile" 
     data-sitekey="your_site_key"
     data-theme="auto"
     data-language="ar"
     data-size="compact"
     data-callback="onTurnstileSuccess"
     data-error-callback="onTurnstileError"></div>
```

## اختبار التكامل

### 1. تشغيل محلي:
```bash
npx wrangler dev
```

### 2. اختبار النموذج:
- افتح المتصفح على `http://localhost:8787`
- املأ النموذج
- تأكد من ظهور Turnstile (إذا كان مفعل)
- أرسل النموذج

### 3. فحص السجلات:
```bash
npx wrangler tail
```

## استكشاف الأخطاء

### مشاكل شائعة:

#### 1. Turnstile لا يظهر:
- تأكد من صحة Site Key
- تأكد من إضافة النطاق في إعدادات Turnstile
- تأكد من تحميل السكريبت: `https://challenges.cloudflare.com/turnstile/v0/api.js`

#### 2. فشل التحقق:
- تأكد من صحة Secret Key في متغيرات البيئة
- تأكد من تطابق النطاق
- فحص سجلات Worker للأخطاء

#### 3. للتطوير المحلي:
- أضف `localhost` في إعدادات النطاق في Turnstile
- أو استخدم `127.0.0.1`

## إعدادات الأمان

### أفضل الممارسات:
1. **لا تكشف Secret Key أبداً** في الكود الأمامي
2. استخدم `wrangler secret` بدلاً من `wrangler.toml` للبيئة الإنتاج
3. قم بتحديد النطاقات المسموحة بدقة
4. راقب محاولات الاختراق من خلال سجلات Cloudflare

### مثال إعداد إنتاج آمن:
```bash
# إعداد المفاتيح بشكل آمن
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
npx wrangler secret put ENC_KEY_B64 --env production
npx wrangler secret put ADMIN_BEARER --env production
```

## التكامل الاختياري

النظام يعمل بدون Turnstile أيضاً! إذا لم تضع المفاتيح، سيتم تجاهل التحقق من Turnstile والاعتماد على الطرق الأخرى لمنع البريد العشوائي:

- فحص عنوان IP
- التحقق من صحة البيانات
- منع التكرار بنفس البريد الإلكتروني

## الدعم

إذا واجهت مشاكل:
1. راجع [وثائق Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
2. تأكد من تحديث Worker إلى أحدث إصدار
3. فحص سجلات المتصفح والـ Worker

---

📝 **ملاحظة**: Turnstile مجاني للاستخدام مع Cloudflare وأكثر صداقة للخصوصية من البدائل الأخرى.