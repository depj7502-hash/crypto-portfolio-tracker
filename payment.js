/**
 * PAYMENT.JS - NowPayments €19/mo integration
 */
const API_KEY = "YOUR_NOWPAYMENTS_API_KEY"; 

async function createInvoice() {
    try {
        document.getElementById('pay-crypto-btn').innerText = 'GENERATING INVOICE...';
        document.getElementById('pay-crypto-btn').disabled = true;

        // Simulate NowPayments or Call API
        // For actual production, replace with POST to https://api.nowpayments.io/v1/invoice
        const isSimulated = API_KEY === "YOUR_NOWPAYMENTS_API_KEY";

        if (isSimulated) {
            console.log("Simulating payment success for €19/mo...");
            setTimeout(() => {
                activatePremium(30); // 30 days
            }, 2000);
            return;
        }

        const res = await fetch('https://api.nowpayments.io/v1/invoice', {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price_amount: 19,
                price_currency: "eur",
                order_id: "PRO_SUB_" + Date.now(),
                order_description: "30-Day Pro Subscription",
                success_url: window.location.href + "?payment=success",
                cancel_url: window.location.href
            })
        });

        const data = await res.json();
        if (data.invoice_url) {
            window.location.href = data.invoice_url;
        } else {
            alert("Payment gateway offline.");
            document.getElementById('pay-crypto-btn').innerText = 'PAY NOW WITH CRYPTO';
            document.getElementById('pay-crypto-btn').disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Error initializing payment.");
        document.getElementById('pay-crypto-btn').innerText = 'PAY NOW WITH CRYPTO';
        document.getElementById('pay-crypto-btn').disabled = false;
    }
}

function activatePremium(days) {
    const expiry = new Date().getTime() + (days * 24 * 60 * 60 * 1000);
    localStorage.setItem('premium_expiry', expiry.toString());
    document.getElementById('premium-modal').style.display = 'none';
    showStatus("PRO ACTIVATED FOR 30 DAYS!");
    render(); 
}

// Check if returned from success payment
window.onload = () => {
    if (window.location.search.includes('payment=success')) {
        activatePremium(30);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

document.getElementById('pay-crypto-btn').addEventListener('click', createInvoice);
