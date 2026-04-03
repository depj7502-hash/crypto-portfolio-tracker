/**
 * APP.JS — Portfolio Tracker
 * Реальные цены с CoinGecko (бесплатно, без лимитов для малых объёмов)
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

function save() {
    localStorage.setItem('portfolio_assets', JSON.stringify(assets));
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
        console.warn('Price fetch failed, using cache', e);
        return priceCache;
    }
}

function getPrice(data, symbol) {
    const id = COIN_MAP[symbol.toLowerCase()] || symbol.toLowerCase();
    return data[id];
}

async function render() {
    if (!assets.length) {
        document.getElementById('assets-container').innerHTML = '<p class="empty-state">Добавь первый актив выше 👆</p>';
        document.getElementById('total-balance').innerText = '$0.00';
        return;
    }

    const symbols = [...new Set(assets.map(a => a.symbol))];
    const priceData = await fetchPrices(symbols);
    priceCache = { ...priceCache, ...priceData };

    const container = document.getElementById('assets-container');
    container.innerHTML = '';
    let total = 0;
    let totalChange = 0;
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
            <button class="delete-btn" data-idx="${idx}" title="Удалить">✕</button>
        `;
        container.appendChild(row);
    });

    document.getElementById('total-balance').innerText = `$${total.toLocaleString('en-US', {maximumFractionDigits: 2})}`;

    const totalChangeAmt = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : 0;
    const changeEl = document.getElementById('balance-change');
    changeEl.className = `change ${totalChangeAmt >= 0 ? 'up' : 'down'}`;
    changeEl.innerText = `${totalChangeAmt >= 0 ? '+' : ''}${totalChangeAmt.toFixed(2)}% за 24ч`;

    lastUpdate = new Date();
    document.getElementById('last-update').innerText =
        `Обновлено: ${lastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

    // Delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            assets.splice(parseInt(btn.dataset.idx), 1);
            save();
            render();
        });
    });
}

document.getElementById('add-btn').addEventListener('click', () => {
    const symbol = document.getElementById('asset-name').value.trim().toLowerCase();
    const amount = parseFloat(document.getElementById('asset-amount').value);

    if (!symbol || isNaN(amount) || amount <= 0) {
        document.getElementById('asset-name').focus();
        return;
    }

    // Проверяем, есть ли уже такой актив — если да, добавляем кол-во
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

// Enter key support
document.getElementById('asset-amount').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-btn').click();
});

// Premium modal
document.getElementById('upgrade-btn').addEventListener('click', () => {
    document.getElementById('premium-modal').style.display = 'flex';
});

// Auto-refresh every 60s
setInterval(render, 60000);

// Init
render();
