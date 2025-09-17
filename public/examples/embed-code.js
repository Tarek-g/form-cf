/**
 * Form CF Embed Widget
 * ويدجت التضمين لنظام النماذج
 * 
 * الاستخدام:
 * <div id="form-cf-widget"></div>
 * <script src="path/to/embed-code.js"></script>
 * <script>FormCF.init('form-cf-widget', 'https://your-worker.workers.dev');</script>
 */

(function(global) {
    'use strict';
    
    const FormCF = {
        config: {
            apiUrl: '',
            containerId: '',
            theme: 'light',
            language: 'ar'
        },
        
        // Initialize the widget
        init: function(containerId, apiUrl, options = {}) {
            this.config.containerId = containerId;
            this.config.apiUrl = apiUrl;
            Object.assign(this.config, options);
            
            this.render();
            this.bindEvents();
            
            // Load Turnstile script if not already loaded
            if (!window.turnstile && !document.querySelector('script[src*="turnstile"]')) {
                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
            
            // Show Turnstile if site key is configured
            setTimeout(() => {
                const turnstileContainer = document.querySelector('#form-cf-turnstile-container');
                const turnstileElement = document.querySelector('.cf-turnstile');
                
                if (turnstileContainer && turnstileElement && this.config.turnstileSiteKey) {
                    turnstileElement.setAttribute('data-sitekey', this.config.turnstileSiteKey);
                    turnstileContainer.style.display = 'block';
                }
            }, 500);
        },
        
        // Render the form HTML
        render: function() {
            const container = document.getElementById(this.config.containerId);
            if (!container) {
                console.error('FormCF: Container element not found');
                return;
            }
            
            const isRTL = this.config.language === 'ar';
            const direction = isRTL ? 'rtl' : 'ltr';
            const lang = this.config.language;
            
            const texts = this.getTexts(lang);
            
            container.innerHTML = `
                <div class="form-cf-widget" dir="${direction}" lang="${lang}">
                    <style>
                        .form-cf-widget {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        .form-cf-container {
                            background: white;
                            padding: 2rem;
                            border-radius: 10px;
                            box-shadow: 0 2px 15px rgba(0,0,0,0.1);
                            border: 1px solid #e1e5e9;
                        }
                        .form-cf-title {
                            text-align: center;
                            color: #2c3e50;
                            margin-bottom: 1.5rem;
                            font-size: 1.5rem;
                            font-weight: bold;
                        }
                        .form-cf-group {
                            margin-bottom: 1.5rem;
                        }
                        .form-cf-label {
                            display: block;
                            margin-bottom: 0.5rem;
                            font-weight: 600;
                            color: #34495e;
                        }
                        .form-cf-input, .form-cf-textarea {
                            width: 100%;
                            padding: 0.75rem;
                            border: 2px solid #ddd;
                            border-radius: 6px;
                            font-size: 1rem;
                            transition: border-color 0.3s ease;
                            box-sizing: border-box;
                        }
                        .form-cf-input:focus, .form-cf-textarea:focus {
                            outline: none;
                            border-color: #3498db;
                            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
                        }
                        .form-cf-checkbox-group {
                            display: flex;
                            align-items: flex-start;
                            gap: 0.75rem;
                        }
                        .form-cf-checkbox {
                            margin: 0;
                            width: auto;
                        }
                        .form-cf-button {
                            background: linear-gradient(135deg, #3498db, #2980b9);
                            color: white;
                            padding: 1rem 2rem;
                            border: none;
                            border-radius: 6px;
                            font-size: 1.1rem;
                            font-weight: 600;
                            cursor: pointer;
                            width: 100%;
                            transition: all 0.3s ease;
                        }
                        .form-cf-button:hover {
                            background: linear-gradient(135deg, #2980b9, #1f4e8c);
                            transform: translateY(-2px);
                            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
                        }
                        .form-cf-button:disabled {
                            background: #bdc3c7;
                            cursor: not-allowed;
                            transform: none;
                            box-shadow: none;
                        }
                        .form-cf-message {
                            padding: 1rem;
                            border-radius: 6px;
                            margin-top: 1rem;
                            font-weight: 500;
                        }
                        .form-cf-success {
                            background: #d4edda;
                            color: #155724;
                            border: 1px solid #c3e6cb;
                        }
                        .form-cf-error {
                            background: #f8d7da;
                            color: #721c24;
                            border: 1px solid #f5c6cb;
                        }
                        .form-cf-loading {
                            display: inline-block;
                            width: 20px;
                            height: 20px;
                            border: 3px solid #f3f3f3;
                            border-top: 3px solid #3498db;
                            border-radius: 50%;
                            animation: form-cf-spin 1s linear infinite;
                            margin-left: 10px;
                        }
                        @keyframes form-cf-spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                    
                    <form class="form-cf-container" id="form-cf-form">
                        <h3 class="form-cf-title">${texts.title}</h3>
                        
                        <div class="form-cf-group">
                            <label class="form-cf-label" for="form-cf-name">${texts.nameLabel}</label>
                            <input type="text" id="form-cf-name" name="name" class="form-cf-input" required>
                        </div>
                        
                        <div class="form-cf-group">
                            <label class="form-cf-label" for="form-cf-org">${texts.orgLabel}</label>
                            <input type="text" id="form-cf-org" name="org" class="form-cf-input">
                        </div>
                        
                        <div class="form-cf-group">
                            <label class="form-cf-label" for="form-cf-email">${texts.emailLabel}</label>
                            <input type="email" id="form-cf-email" name="email" class="form-cf-input" required>
                        </div>
                        
                        <div class="form-cf-group">
                            <label class="form-cf-label" for="form-cf-comment">${texts.commentLabel}</label>
                            <textarea id="form-cf-comment" name="comment" class="form-cf-textarea" rows="4" placeholder="${texts.commentPlaceholder}"></textarea>
                        </div>
                        
                        <div class="form-cf-group">
                            <div class="form-cf-checkbox-group">
                                <input type="checkbox" id="form-cf-consent" name="consent_public" value="1" class="form-cf-checkbox">
                                <label class="form-cf-label" for="form-cf-consent">${texts.consentLabel}</label>
                            </div>
                        </div>
                        
                        <!-- Turnstile CAPTCHA -->
                        <div class="form-cf-group" id="form-cf-turnstile-container" style="display: none;">
                            <div class="cf-turnstile" 
                                 data-sitekey="TURNSTILE_SITE_KEY" 
                                 data-theme="${this.config.theme || 'light'}" 
                                 data-language="${this.config.language || 'ar'}"></div>
                        </div>
                        
                        <button type="submit" class="form-cf-button">
                            <span class="button-text">${texts.submitButton}</span>
                        </button>
                        
                        <div id="form-cf-message"></div>
                    </form>
                </div>
            `;
        },
        
        // Bind form events
        bindEvents: function() {
            const form = document.getElementById('form-cf-form');
            if (!form) return;
            
            form.addEventListener('submit', this.handleSubmit.bind(this));
        },
        
        // Handle form submission
        handleSubmit: async function(e) {
            e.preventDefault();
            
            const form = e.target;
            const button = form.querySelector('.form-cf-button');
            const buttonText = button.querySelector('.button-text');
            const messageDiv = document.getElementById('form-cf-message');
            
            // Show loading state
            button.disabled = true;
            buttonText.innerHTML = this.getTexts(this.config.language).submitting + '<span class="form-cf-loading"></span>';
            
            try {
                const formData = new FormData(form);
                
                // Add Turnstile token if available
                const turnstileElement = document.querySelector('.cf-turnstile');
                if (turnstileElement && window.turnstile) {
                    const turnstileToken = window.turnstile.getResponse(turnstileElement);
                    if (turnstileToken) {
                        formData.append('cf-turnstile-response', turnstileToken);
                    }
                }
                
                const response = await fetch(`${this.config.apiUrl}/api/submissions`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showMessage(result.message || this.getTexts(this.config.language).successMessage, 'success');
                    form.reset();
                    
                    // Reset Turnstile if present
                    const turnstileElement = document.querySelector('.cf-turnstile');
                    if (turnstileElement && window.turnstile) {
                        window.turnstile.reset(turnstileElement);
                    }
                    
                    // Trigger custom event
                    this.triggerEvent('formSubmitted', { result });
                } else {
                    let errorMsg = this.getTexts(this.config.language).errorMessage;
                    if (result.errors) {
                        errorMsg += '<br>' + Object.values(result.errors).join('<br>');
                    }
                    this.showMessage(errorMsg, 'error');
                    
                    // Reset Turnstile on error
                    const turnstileElement = document.querySelector('.cf-turnstile');
                    if (turnstileElement && window.turnstile) {
                        window.turnstile.reset(turnstileElement);
                    }
                    
                    // Trigger custom event
                    this.triggerEvent('formError', { result });
                }
            } catch (error) {
                console.error('FormCF submission error:', error);
                this.showMessage(this.getTexts(this.config.language).networkError, 'error');
                
                // Reset Turnstile on error
                const turnstileElement = document.querySelector('.cf-turnstile');
                if (turnstileElement && window.turnstile) {
                    window.turnstile.reset(turnstileElement);
                }
                
                // Trigger custom event
                this.triggerEvent('formError', { error });
            } finally {
                // Reset button state
                button.disabled = false;
                buttonText.textContent = this.getTexts(this.config.language).submitButton;
            }
        },
        
        // Show message
        showMessage: function(text, type) {
            const messageDiv = document.getElementById('form-cf-message');
            if (!messageDiv) return;
            
            messageDiv.innerHTML = text;
            messageDiv.className = `form-cf-message form-cf-${type}`;
            
            // Auto hide success messages after 5 seconds
            if (type === 'success') {
                setTimeout(() => {
                    messageDiv.innerHTML = '';
                    messageDiv.className = '';
                }, 5000);
            }
        },
        
        // Trigger custom events
        triggerEvent: function(eventName, detail) {
            const container = document.getElementById(this.config.containerId);
            if (container) {
                const event = new CustomEvent(`formcf:${eventName}`, { detail });
                container.dispatchEvent(event);
            }
        },
        
        // Get localized texts
        getTexts: function(lang) {
            const texts = {
                ar: {
                    title: '📝 نموذج التوقيع',
                    nameLabel: 'الاسم الكامل *',
                    orgLabel: 'المؤسسة أو الجهة (اختياري)',
                    emailLabel: 'البريد الإلكتروني *',
                    commentLabel: 'تعليق أو رسالة (اختياري)',
                    commentPlaceholder: 'شاركنا رأيك أو رسالتك...',
                    consentLabel: 'أوافق على عرض اسمي وتعليقي في القائمة العامة للموقعين. (بريدك الإلكتروني لن يظهر أبداً للعامة)',
                    submitButton: 'إرسال التوقيع',
                    submitting: 'جاري الإرسال...',
                    successMessage: 'تم إرسال النموذج بنجاح. شكراً لك!',
                    errorMessage: 'حدث خطأ في الإرسال',
                    networkError: 'خطأ في الاتصال. حاول مرة أخرى.'
                },
                en: {
                    title: '📝 Signature Form',
                    nameLabel: 'Full Name *',
                    orgLabel: 'Organization (Optional)',
                    emailLabel: 'Email Address *',
                    commentLabel: 'Comment or Message (Optional)',
                    commentPlaceholder: 'Share your thoughts or message...',
                    consentLabel: 'I agree to display my name and comment in the public signatories list. (Your email will never be shown publicly)',
                    submitButton: 'Submit Signature',
                    submitting: 'Submitting...',
                    successMessage: 'Form submitted successfully. Thank you!',
                    errorMessage: 'An error occurred during submission',
                    networkError: 'Network error. Please try again.'
                }
            };
            
            return texts[lang] || texts.ar;
        }
    };
    
    // Make FormCF globally available
    global.FormCF = FormCF;
    
    // Auto-initialize if data attributes are found
    document.addEventListener('DOMContentLoaded', function() {
        const autoWidgets = document.querySelectorAll('[data-formcf-url]');
        autoWidgets.forEach(function(widget) {
            const apiUrl = widget.getAttribute('data-formcf-url');
            const lang = widget.getAttribute('data-formcf-lang') || 'ar';
            const theme = widget.getAttribute('data-formcf-theme') || 'light';
            
            FormCF.init(widget.id, apiUrl, { language: lang, theme: theme });
        });
    });
    
})(window);