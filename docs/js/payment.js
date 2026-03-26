
const CONFIG = {
    CHARGILY_API_KEY: 'test_pk_ASbs0koLC5Ar5Mbl0feG9gX3GwONGbwhBBWQVtd7',  // للإشارة فقط - لا يُستخدم لإنشاء الفاتورة
    CHARGILY_API_URL: 'https://pay.chargily.net/test/api/v2',
    SUPABASE_ANON_KEY: 'sb_publishable_58oRALrpYMsE7AJoVL9GBg_q5wtqytv',
    // ✅ الآن تمر كل طلبات الدفع عبر السيرفر الآمن
    CREATE_CHECKOUT_URL: 'https://jtjrncwyeasptvtrihep.supabase.co/functions/v1/create-checkout',

    // روابط Redirect بعد الدفع
    SUCCESS_URL: 'https://jibayatictech.github.io/jibayatic/welcome',
    FAILURE_URL: 'https://jibayatictech.github.io/jibayatic/?error=payment_failed',
    WEBHOOK_URL: 'https://jtjrncwyeasptvtrihep.supabase.co/functions/v1/chargily-webhook',

    PRICES: {
        annual: 5000,
        trial: 0
    }
};

// تحديث السعر بناءً على الاختيار
function updatePrice() {
    const select = document.getElementById('license-type');
    const option = select.options[select.selectedIndex];
    const price = parseInt(option.dataset.price);

    document.getElementById('price-display').textContent = price.toLocaleString('ar-DZ');

    if (price === 0) {
        document.getElementById('period-display').textContent = 'تجريبي 7 أيام • جهازان • مجاناً';
        document.getElementById('pay-btn-text').textContent = '🚀 التفعيل التجريبي المجاني';
    } else {
        document.getElementById('period-display').textContent = 'اشتراك سنوي • جهازان • تحديثات مجانية';
        document.getElementById('pay-btn-text').textContent = '💳 الدفع الآن عبر Chargily';
    }
}

// معالجة الدفع
async function handlePayment() {
    const email = document.getElementById('customer-email').value.trim();
    const licenseType = document.getElementById('license-type').value;
    const price = CONFIG.PRICES[licenseType];

    // التحقق من البريد
    if (!email || !email.includes('@')) {
        showError('الرجاء إدخال بريد إلكتروني صحيح');
        return;
    }

    // إخفاء الخطأ وإظهار التحميل
    hideError();
    setLoading(true);

    try {
        // ✅ الآن نتصل بالسيرفر الآمن الخاص بنا بدلاً من Chargily مباشرةً
        // المفتاح السري محمي بالكامل في Supabase Secrets
        const response = await fetch(CONFIG.CREATE_CHECKOUT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ email, licenseType })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `خطأ من السيرفر: ${response.status}`);
        }

        if (data.checkout_url) {
            // تسجيل بأن المشتري ذهب للدفع
            localStorage.setItem('pending_checkout', 'true');
            // توجيه العميل لصفحة الدفع
            window.location.href = data.checkout_url;
        } else {
            throw new Error('لم يتم إرسال رابط الدفع');
        }

    } catch (error) {
        console.error('[Payment] Error:', error);
        showError(`❌ خطأ: ${error.message}`);
        setLoading(false);
    }
}


// تفعيل النسخة التجريبية مجاناً
async function handleTrialActivation(email) {
    setLoading(true, '🚀 جاري إنشاء حسابك التجريبي...');

    try {
        // إرسال مباشر للـ webhook باستخدام بيانات مُزيّفة
        // ملاحظة: الـ Supabase Edge Function ستتحقق من التوقيع
        // للتجربة المجانية، يمكن إنشاء endpoint مختلف
        const response = await fetch(`https://jtjrncwyeasptvtrihep.supabase.co/functions/v1/create-trial-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ email, license_type: 'trial' })
        });

        if (response.ok) {
            showSuccessPage();
        } else {
            showError('فشل إنشاء الحساب التجريبي. تواصل معنا عبر واتساب.');
        }
    } catch (e) {
        showError('خطأ في الاتصال. تأكد من الإنترنت وحاول مجدداً.');
    } finally {
        setLoading(false);
    }
}

// إظهار صفحة النجاح
function showSuccessPage() {
    document.getElementById('buy-form-section').style.display = 'none';
    document.getElementById('success-page').classList.add('show');
}

// أدوات مساعدة
function setLoading(loading, text = null) {
    const btn = document.getElementById('pay-btn');
    const btnText = document.getElementById('pay-btn-text');
    const spinner = document.getElementById('pay-spinner');

    btn.disabled = loading;
    if (text && btnText) btnText.textContent = text;
    spinner.style.display = loading ? 'block' : 'none';
    if (!loading) btnText.textContent = '💳 الدفع الآن عبر Chargily';
}

function showError(msg) {
    const alert = document.getElementById('error-alert');
    alert.textContent = msg;
    alert.classList.add('show');
    // التمرير التلقائي لرؤية رسالة الخطأ
    alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => alert.classList.remove('show'), 6000);
}

function hideError() {
    document.getElementById('error-alert').classList.remove('show');
}

// التحقق من معلمة الـ URL عند العودة من الدفع
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('error') === 'payment_failed') {
        localStorage.removeItem('pending_checkout');
        showError('❌ فشلت عملية الدفع. حاول مجدداً أو تواصل معنا.');
    } else if (params.get('success') === 'true') {
        // ✅ دفع ناجح → مسح العلامة وتوجيه المشتري لصفحة التحميل
        localStorage.removeItem('pending_checkout');
        window.location.replace('welcome.html');
    } else if (localStorage.getItem('pending_checkout') === 'true') {
        // المشتري عاد للصفحة بدون إتمام الدفع
        localStorage.removeItem('pending_checkout');
        showError('⚠️ يبدو أن عملية الدفع لم تكتمل أو تم إلغاؤها من طرفك.');
    }
});
