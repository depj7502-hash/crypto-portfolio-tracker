/**
 * PAYMENT.JS — NowPayments интеграция
 * Принимает крипто-оплату и активирует Premium
 */

const PAYMENT_AMOUNT = 19;
const PAYMENT_CURRENCY = "usd";
const PAYMENT_CRYPTO = "eth"; // Можно USDT, BTC

async function createPayment() {
    // NowPayments создаёт инвойс через их API
    const payload = {
        price_amount: PAYMENT_AMOUNT,
        price_currency: PAYMENT_CURRENCY,
        pay_currency: PAYMENT_CRYPTO,
        order_id: `order_${Date.now()}`,
        order_description: "PortfolioPro Premium - Lifetime Access",
        success_url: window.location.href + "?payment=success",
        cancel_url: window.location.href
    };

    try {
        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": NOWPAYMENTS_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.invoice_url) {
            // Открываем страницу оплаты NowPayments
            window.open(data.invoice_url, '_blank');
            
            // Сохраняем invoice id для проверки
            localStorage.setItem('pending_invoice', data.id);
            
            // Начинаем проверку платежа
            startPaymentCheck(data.id);
        } else {
            alert("Ошибка создания платежа. Попробуй позже.");
        }
    } catch (e) {
        console.error("Payment error:", e);
        // Fallback: показываем прямые данные кошелька
        showDirectPayment();
    }
}

function showDirectPayment() {
    // Если NowPayments недоступен — показываем прямой кошелёк
    const modal = document.getElementById('premium-modal');
    const box = modal.querySelector('.modal-box');
    box.innerHTML = `
        <button class="close-modal" id="close-modal" onclick="closeModal()">✕</button>
        <div class="modal-icon">₿</div>
        <h3>Отправь €19 в крипто</h3>
        <div class="wallet-display">
            <div class="wallet-row">
                <span class="coin-label">ETH / USDT (ERC20):</span>
                <code id="eth-addr">0xYOUR_ETH_ADDRESS</code>
                <button onclick="copy('eth-addr')">📋</button>
            </div>
        </div>
        <p class="pay-note">После оплаты напиши нам — активируем вручную в течение 24ч</p>
    `;
}

function copy(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text);
}

let pollInterval = null;

function startPaymentCheck(invoiceId) {
    // Проверяем статус платежа каждые 30 сек
    pollInterval = setInterval(async () => {
        try {
            const r = await fetch(`https://api.nowpayments.io/v1/invoice/${invoiceId}`, {
                headers: { "x-api-key": NOWPAYMENTS_KEY }
            });
            const data = await r.json();
            
            if (data.payment_status === "finished" || data.payment_status === "confirmed") {
                clearInterval(pollInterval);
                activatePremium();
            }
        } catch (e) {
            console.error("Poll error:", e);
        }
    }, 30000);
}

function activatePremium() {
    localStorage.setItem('premium_activated', 'true');
    localStorage.setItem('premium_date', new Date().toISOString());
    
    document.getElementById('premium-modal').style.display = 'none';
    document.getElementById('success-modal').style.display = 'flex';
    
    // Обновляем UI
    document.getElementById('upgrade-btn').innerText = '⭐ PREMIUM';
    document.getElementById('upgrade-btn').style.background = 'gold';
    document.getElementById('upgrade-btn').style.color = '#000';
}

function isPremium() {
    return localStorage.getItem('premium_activated') === 'true';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем ?payment=success в URL
    if (window.location.search.includes('payment=success')) {
        activatePremium();
    }
    
    // Если уже оплачено
    if (isPremium()) {
        const btn = document.getElementById('upgrade-btn');
        if (btn) {
            btn.innerText = '⭐ PREMIUM';
            btn.style.background = 'gold';
            btn.style.color = '#000';
        }
    }

    const payBtn = document.getElementById('pay-crypto-btn');
    if (payBtn) payBtn.addEventListener('click', createPayment);
    
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
});

function closeModal() {
    document.getElementById('premium-modal').style.display = 'none';
}
