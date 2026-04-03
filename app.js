/**
 * APP.JS — Portfolio Tracker (English, Pixel Premium, €19/mo)
 */

const COIN_MAP = {
    'btc': 'bitcoin', 'eth': 'ethereum', 'sol': 'solana',
    'bnb': 'binancecoin', 'usdt': 'tether', 'usdc': 'usd-coin',
    'xrp': 'ripple', 'ada': 'cardano', 'doge': 'dogecoin',
    'dot': 'polkadot', 'matic': 'matic-network', 'link': 'chainlink',
    'avax': 'avalanche-2', 'uni': 'uniswap', 'ltc': 'litecoin',
    'ton': 'the-open-network', 'trx': 'tron', 'near': 'near'
};

let assets = JSON.parse(localStorage.getItem('portfolio_assets') || '[]');
let priceCache = {};
let lastUpdate = null;

// Premium Check
function isPremium() {
    const expiry = localStorage.getItem('premium_expiry');
    if (!expiry) return false;
    return new Date().getTime() < parseInt(expiry);
}

function updatePremiumUI() {
    const box = document.getElementById('premium-ad-box');
    if (isPremium()) {
        const daysLeft = Math.ceil((parseInt(localStorage.getItem('premium_expiry')) - new Date().getTime()) / (1000 * 60 * 60 * 24));
        box.innerHTML = `<p>STATUS: <span style="color:#39ff14">PRO ACTIVE</span></p><p style="font-size:0.6rem">${daysLeft} DAYS REMAINING</p>`;
    }
}

function save() {
    localStorage.setItem('portfolio_assets', JSON.stringify(assets));
}

// Show notification
function showStatus(text) {
    const el = document.getElementById('notification-modal');
    document.getElementById('notification-text').innerText = text;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

async function fetchPrices(symbols) {
    if (!symbols.length) return {};
    const ids = symbols.map(s => COIN_MAP[s.toLowerCase()] || s.toLowerCase()).join(',');
    try {
        const r = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
            { headers: { 'Accept': 'application/json' } }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
    } catch (e) {
        console.warn('Price fetch failed', e);
        return priceCache;
    }
}

function getPrice(data, symbol) {
    const id = COIN_MAP[symbol.toLowerCase()] || symbol.toLowerCase();
    return data[id];
}

async function render() {
    updatePremiumUI();

    if (!assets.length) {
        document.getElementById('assets-container').innerHTML = '<p class="empty-state">NO ASSETS DETECTED. INITIALIZE ABOVE.</p>';
        document.getElementById('total-balance').innerText = '$0.00';
        return;
    }

    const symbols = [...new Set(assets.map(a => a.symbol))];
    const priceData = await fetchPrices(symbols);
    priceCache = { ...priceCache, ...priceData };

    const container = document.getElementById('assets-container');
    container.innerHTML = '';
    let total = 0;
    let totalPrev = 0;

    assets.forEach((asset, idx) => {
        const info = getPrice(priceData, asset.symbol);
        const price = info?.usd ?? 0;
        const change24h = info?.usd_24h_change ?? 0;
        const val = asset.amount * price;
        const prevVal = val / (1 + change24h / 100);
        total += val;
        totalPrev += prevVal;

        const changeClass = change24h >= 0 ? 'up' : 'down';
        const changeSign = change24h >= 0 ? '+' : '';

        const row = document.createElement('div');
        row.className = 'asset-item';
        row.innerHTML = `
            <div>
                <div class="asset-symbol">${asset.symbol.toUpperCase()}</div>
                <div class="asset-details">${asset.amount} × $${price.toLocaleString('en-US', {maximumFractionDigits: 4})}</div>
            </div>
            <div style="text-align:right;flex:1">
                <div class="asset-value">$${val.toLocaleString('en-US', {maximumFractionDigits: 2})}</div>
                <div class="asset-price ${changeClass}">${changeSign}${change24h.toFixed(2)}%</div>
            </div>
            <button class="delete-btn" data-idx="${idx}" title="DELETE">[X]</button>
        `;
        container.appendChild(row);
    });

    document.getElementById('total-balance').innerText = `$${total.toLocaleString('en-US', {maximumFractionDigits: 2})}`;

    const totalChangeAmt = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : 0;
    const changeEl = document.getElementById('balance-change');
    changeEl.className = `change ${totalChangeAmt >= 0 ? 'up' : 'down'}`;
    changeEl.innerText = `${totalChangeAmt >= 0 ? '+' : ''}${totalChangeAmt.toFixed(2)}% (24H)`;

    lastUpdate = new Date();
    document.getElementById('last-update').innerText =
        `LAST UPDATE: ${lastUpdate.toLocaleTimeString('en-US', { hour12: false })}`;

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            assets.splice(parseInt(btn.dataset.idx), 1);
            save();
            render();
        });
    });
}

document.getElementById('add-btn').addEventListener('click', () => {
    // Check Free limit
    if (!isPremium() && assets.length >= 3) {
        document.getElementById('premium-modal').style.display = 'flex';
        showStatus("FREE TIER LIMIT REACHED (3 COINS)");
        return;
    }

    const symbol = document.getElementById('asset-name').value.trim().toLowerCase();
    const amount = parseFloat(document.getElementById('asset-amount').value);

    if (!symbol || isNaN(amount) || amount <= 0) {
        document.getElementById('asset-name').focus();
        return;
    }

    const existing = assets.find(a => a.symbol === symbol);
    if (existing) {
        existing.amount += amount;
    } else {
        assets.push({ symbol, amount });
    }

    save();
    document.getElementById('asset-name').value = '';
    document.getElementById('asset-amount').value = '';
    render();
});

document.getElementById('asset-amount').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-btn').click();
});

const upgradeBtn = document.getElementById('upgrade-btn');
if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
        document.getElementById('premium-modal').style.display = 'flex';
    });
}

document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('premium-modal').style.display = 'none';
});

// Auto-refresh: 1s for PRO, 60s for FREE
setInterval(render, isPremium() ? 1000 : 60000);

// Init
render();
