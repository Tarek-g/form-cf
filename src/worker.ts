/**
 * نظام استمارات بسيط على Cloudflare Workers مع D1
 * Simple form system on Cloudflare Workers with D1
 */

export interface Env {
  DB: D1Database;
  ADMIN_BEARER: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
  ENC_KEY_B64: string;  // Base64 encoded AES-256 key
  ENC_KEY_ID: string;   // Key identifier for rotation
}

interface FormValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  data: {
    name: string;
    email: string;
    org: string;
    comment: string;
    consent_public: boolean;
  };
}

// Encryption helpers for AES-GCM
const te = new TextEncoder();
const td = new TextDecoder();

function base64Encode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function base64Decode(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function importKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64Decode(base64Key);
  return crypto.subtle.importKey("raw", keyData, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptJSON(obj: unknown, key: CryptoKey): Promise<{iv: string, ct: string}> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = te.encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({name: "AES-GCM", iv}, key, plaintext);
  return {
    iv: base64Encode(iv),
    ct: base64Encode(new Uint8Array(ciphertext))
  };
}

async function decryptJSON(ctBase64: string, ivBase64: string, key: CryptoKey): Promise<any> {
  const iv = base64Decode(ivBase64);
  const ciphertext = base64Decode(ctBase64);
  const plaintext = await crypto.subtle.decrypt({name: "AES-GCM", iv}, key, ciphertext);
  return JSON.parse(td.decode(plaintext));
}

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// CORS headers helper
function getCorsHeaders(req: Request, env: Env) {
  const origins = (env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean);
  const reqOrigin = req.headers.get("Origin") || "";
  const allowOrigin = origins.length === 0 || origins.includes(reqOrigin) ? reqOrigin || "*" : origins[0];
  
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
}

// JSON response helper
function jsonResponse(data: unknown, init: ResponseInit = {}) {
  const body = JSON.stringify(data, null, 2);
  return new Response(body, { 
    status: 200, 
    headers: { 
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers
    }, 
    ...init 
  });
}

// Parse request body (form data or JSON)
async function parseRequestBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  
  if (contentType.includes("application/json")) {
    return await req.json();
  }
  
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    return Object.fromEntries(
      [...formData.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""])
    );
  }
  
  return {};
}

// Validation function
function validateSubmission(payload: any) {
  const errors: Record<string, string> = {};
  
  const name = (payload.name || "").toString().trim();
  const email = (payload.email || "").toString().trim().toLowerCase();
  const org = (payload.org || "").toString().trim();
  const comment = (payload.comment || "").toString().trim();
  const consent = String(payload.consent_public ?? "").toLowerCase();
  
  // Validation rules
  if (!name) {
    errors.name = "الاسم مطلوب";
  } else if (name.length < 2) {
    errors.name = "الاسم يجب أن يكون أكثر من حرف واحد";
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "بريد إلكتروني غير صالح";
  }
  
  if (comment && comment.length > 1000) {
    errors.comment = "التعليق طويل جداً (الحد الأقصى 1000 حرف)";
  }
  
  const consent_public = consent === "1" || consent === "true" || consent === "on";
  
  return { 
    ok: Object.keys(errors).length === 0, 
    errors, 
    data: { name, email, org, comment, consent_public } 
  };
}

// Generate hash for IP (basic spam protection)
async function hashIP(ip: string): Promise<string> {
  const salt = "form-cf-salt-2024"; // In production, use env variable
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, env);
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // POST /api/submissions - Submit a new form
      if (url.pathname === "/api/submissions" && request.method === "POST") {
        const payload = await parseRequestBody(request);
        const { ok, errors, data } = validateSubmission(payload);
        
        if (!ok) {
          return jsonResponse(
            { success: false, errors }, 
            { status: 400, headers: corsHeaders }
          );
        }
        
        // Generate submission data
        const id = crypto.randomUUID();
        const created_at = Date.now();
        const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
        const ua = request.headers.get("User-Agent") || "";
        const ip_hash = await hashIP(ip);
        
        // Encrypt PII data
        const key = await importKey(env.ENC_KEY_B64);
        const pii = {
          name: data.name,
          org: data.org,
          email: data.email,
          comment: data.comment
        };
        const { ct, iv } = await encryptJSON(pii, key);
        const email_sha256 = await hashEmail(data.email);
        
        // Check for duplicate email (using hash)
        const existingSubmission = await env.DB.prepare(
          `SELECT id FROM submissions WHERE email_sha256 = ? LIMIT 1`
        ).bind(email_sha256).first();
        
        if (existingSubmission) {
          return jsonResponse(
            { success: false, errors: { email: "هذا البريد الإلكتروني مسجل مسبقاً" } }, 
            { status: 400, headers: corsHeaders }
          );
        }
        
        // Insert encrypted data into database
        await env.DB.prepare(
          `INSERT INTO submissions (id, created_at, pii_ct, iv, key_id, email_sha256, consent_public, ip_hash, ua)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id, 
          created_at, 
          ct,
          iv,
          env.ENC_KEY_ID,
          email_sha256,
          data.consent_public ? 1 : 0, 
          ip_hash, 
          ua
        ).run();
        
        return jsonResponse(
          { 
            success: true, 
            id, 
            message: "تم إرسال النموذج بنجاح. شكراً لك!" 
          }, 
          { status: 201, headers: corsHeaders }
        );
      }
      
      // GET /api/signatories - Public list (only consented submissions)
      if (url.pathname === "/api/signatories" && request.method === "GET") {
        const key = await importKey(env.ENC_KEY_B64);
        const { results } = await env.DB.prepare(
          `SELECT pii_ct, iv, consent_public, created_at 
           FROM submissions 
           WHERE consent_public = 1 AND pii_ct IS NOT NULL
           ORDER BY created_at DESC 
           LIMIT 500`
        ).all();
        
        const signatories = await Promise.all(
          (results || []).map(async (row: any) => {
            try {
              const pii = await decryptJSON(row.pii_ct, row.iv, key);
              return {
                name: pii.name,
                org: pii.org,
                comment: pii.comment,
                created_at: row.created_at
              };
            } catch (error) {
              console.error('Failed to decrypt PII for signatory:', error);
              return null;
            }
          })
        );
        
        // Filter out any failed decryptions
        const validSignatories = signatories.filter(item => item !== null);
        
        return jsonResponse(
          { 
            success: true, 
            count: validSignatories.length,
            signatories: validSignatories
          }, 
          { headers: corsHeaders }
        );
      }
      
      // GET /api/submissions - Admin view (requires authentication)
      if (url.pathname === "/api/submissions" && request.method === "GET") {
        const auth = request.headers.get("Authorization") || "";
        
        if (!auth.startsWith("Bearer ") || auth.slice(7) !== env.ADMIN_BEARER) {
          return jsonResponse(
            { success: false, error: "غير مخول للوصول" }, 
            { status: 401, headers: corsHeaders }
          );
        }
        
        const key = await importKey(env.ENC_KEY_B64);
        const { results } = await env.DB.prepare(
          `SELECT id, created_at, pii_ct, iv, key_id, consent_public, ip_hash, email_sha256
           FROM submissions 
           ORDER BY created_at DESC 
           LIMIT 1000`
        ).all();
        
        const submissions = await Promise.all(
          (results || []).map(async (row: any) => {
            let decryptedData = null;
            
            // Try to decrypt if we have encrypted data
            if (row.pii_ct && row.iv) {
              try {
                decryptedData = await decryptJSON(row.pii_ct, row.iv, key);
              } catch (error) {
                console.error('Failed to decrypt PII for admin view:', error);
              }
            }
            
            return {
              id: row.id,
              created_at: row.created_at,
              name: decryptedData?.name || '[ENCRYPTED]',
              org: decryptedData?.org || '[ENCRYPTED]',
              email: decryptedData?.email || '[ENCRYPTED]',
              comment: decryptedData?.comment || '[ENCRYPTED]',
              consent_public: row.consent_public,
              ip_hash: row.ip_hash,
              key_id: row.key_id,
              email_sha256: row.email_sha256
            };
          })
        );
        
        return jsonResponse(
          { 
            success: true, 
            count: submissions.length,
            submissions: submissions
          }, 
          { headers: corsHeaders }
        );
      }
      
      // GET /api/stats - Public statistics
      if (url.pathname === "/api/stats" && request.method === "GET") {
        const totalResult = await env.DB.prepare(
          `SELECT COUNT(*) as total FROM submissions`
        ).first();
        
        const publicResult = await env.DB.prepare(
          `SELECT COUNT(*) as public_count FROM submissions WHERE consent_public = 1`
        ).first();
        
        return jsonResponse(
          { 
            success: true,
            total_submissions: totalResult?.total || 0,
            public_signatures: publicResult?.public_count || 0
          }, 
          { headers: corsHeaders }
        );
      }
      
      // GET / - Landing page with embedded form
      if (url.pathname === "/" && request.method === "GET") {
        const html = getHomePage();
        return new Response(html, { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "text/html; charset=utf-8" 
          } 
        });
      }
      
      // 404 for other routes
      return jsonResponse(
        { success: false, error: "المسار غير موجود" }, 
        { status: 404, headers: corsHeaders }
      );
      
    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse(
        { success: false, error: "خطأ في الخادم" }, 
        { status: 500, headers: corsHeaders }
      );
    }
  }
};

// HTML home page with embedded form
function getHomePage(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام الاستمارات - Form CF</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 1rem;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 2rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
            color: #34495e;
        }
        input, textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
            transition: border-color 0.3s;
            box-sizing: border-box;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: #3498db;
        }
        .checkbox-group {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
        }
        .checkbox-group input {
            width: auto;
            margin: 0;
        }
        button {
            background: #3498db;
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: 5px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: background 0.3s;
            width: 100%;
        }
        button:hover {
            background: #2980b9;
        }
        button:disabled {
            background: #bdc3c7;
            cursor: not-allowed;
        }
        .message {
            padding: 1rem;
            border-radius: 5px;
            margin-top: 1rem;
            font-weight: bold;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .stats {
            text-align: center;
            margin-top: 2rem;
            padding: 1rem;
            background: #e8f4f8;
            border-radius: 5px;
        }
        .signatures {
            margin-top: 3rem;
        }
        .signature-item {
            background: #f8f9fa;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 5px;
            border-right: 4px solid #3498db;
        }
        .signature-name {
            font-weight: bold;
            color: #2c3e50;
        }
        .signature-org {
            color: #7f8c8d;
            font-size: 0.9rem;
        }
        .signature-comment {
            margin-top: 0.5rem;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖊️ نظام الاستمارات البسيط</h1>
        
        <form id="signForm">
            <div class="form-group">
                <label for="name">الاسم الكامل *</label>
                <input type="text" id="name" name="name" required>
            </div>
            
            <div class="form-group">
                <label for="org">المؤسسة أو الجهة (اختياري)</label>
                <input type="text" id="org" name="org">
            </div>
            
            <div class="form-group">
                <label for="email">البريد الإلكتروني *</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label for="comment">تعليق أو رسالة (اختياري)</label>
                <textarea id="comment" name="comment" rows="4" placeholder="شاركنا رأيك أو رسالتك..."></textarea>
            </div>
            
            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="consent_public" name="consent_public" value="1">
                    <label for="consent_public">
                        أوافق على عرض اسمي وتعليقي في القائمة العامة للموقعين. 
                        (بريدك الإلكتروني لن يظهر أبداً للعامة)
                    </label>
                </div>
            </div>
            
            <button type="submit">إرسال التوقيع</button>
        </form>
        
        <div id="message"></div>
        
        <div class="stats">
            <div id="stats-content">جاري تحميل الإحصائيات...</div>
        </div>
        
        <div class="signatures">
            <h2>آخر التوقيعات العامة</h2>
            <div id="signatures-list">جاري تحميل التوقيعات...</div>
        </div>
    </div>

    <script>
        const form = document.getElementById('signForm');
        const messageDiv = document.getElementById('message');
        
        // Load stats and signatures on page load
        window.addEventListener('load', function() {
            loadStats();
            loadSignatures();
        });
        
        // Form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإرسال...';
            
            try {
                const formData = new FormData(form);
                
                const response = await fetch('/api/submissions', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(result.message, 'success');
                    form.reset();
                    // Reload stats and signatures
                    setTimeout(() => {
                        loadStats();
                        loadSignatures();
                    }, 1000);
                } else {
                    let errorMsg = 'حدث خطأ في الإرسال:';
                    if (result.errors) {
                        errorMsg += '<br>' + Object.values(result.errors).join('<br>');
                    }
                    showMessage(errorMsg, 'error');
                }
            } catch (error) {
                showMessage('خطأ في الاتصال. حاول مرة أخرى.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'إرسال التوقيع';
            }
        });
        
        function showMessage(text, type) {
            messageDiv.innerHTML = text;
            messageDiv.className = 'message ' + type;
            messageDiv.style.display = 'block';
            
            // Auto hide after 5 seconds for success messages
            if (type === 'success') {
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 5000);
            }
        }
        
        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('stats-content').innerHTML = 
                        \`📊 إجمالي المشاركات: <strong>\${result.total_submissions}</strong> | 
                        التوقيعات العامة: <strong>\${result.public_signatures}</strong>\`;
                }
            } catch (error) {
                document.getElementById('stats-content').textContent = 'خطأ في تحميل الإحصائيات';
            }
        }
        
        async function loadSignatures() {
            try {
                const response = await fetch('/api/signatories');
                const result = await response.json();
                
                if (result.success && result.signatories.length > 0) {
                    const signaturesHtml = result.signatories.slice(0, 10).map(sig => \`
                        <div class="signature-item">
                            <div class="signature-name">\${escapeHtml(sig.name)}</div>
                            \${sig.org ? \`<div class="signature-org">\${escapeHtml(sig.org)}</div>\` : ''}
                            \${sig.comment ? \`<div class="signature-comment">\${escapeHtml(sig.comment)}</div>\` : ''}
                        </div>
                    \`).join('');
                    
                    document.getElementById('signatures-list').innerHTML = signaturesHtml;
                } else {
                    document.getElementById('signatures-list').innerHTML = 
                        '<p style="text-align: center; color: #666;">لا توجد توقيعات عامة بعد</p>';
                }
            } catch (error) {
                document.getElementById('signatures-list').innerHTML = 
                    '<p style="text-align: center; color: #666;">خطأ في تحميل التوقيعات</p>';
            }
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
}