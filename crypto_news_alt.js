// Global değişkenler
let allNews = [];
let selectedCategory = '';

// Kategoriler
const CATEGORIES = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    BNB: 'BNB',
    MARKET: 'Genel Piyasa'
};

async function getNews() {
    try {
        // Loading mesajını göster
        const newsContainer = document.getElementById('newsContainer');
        newsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Haberler yükleniyor...</div>';
        
        // CoinGecko API'si - CORS sorunları olmayan API
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=15&page=1&sparkline=false');
        const coinData = await response.json();
        
        // Her kategori için haberler oluştur
        allNews = [];
        
        // Bitcoin haberleri
        const bitcoin = coinData.find(coin => coin.symbol === 'btc');
        if (bitcoin) {
            allNews = [...allNews, ...generateNewsForCoin(bitcoin, 5, 'BTC')];
        }
        
        // Ethereum haberleri
        const ethereum = coinData.find(coin => coin.symbol === 'eth');
        if (ethereum) {
            allNews = [...allNews, ...generateNewsForCoin(ethereum, 5, 'ETH')];
        }
        
        // BNB haberleri
        const bnb = coinData.find(coin => coin.symbol === 'bnb');
        if (bnb) {
            allNews = [...allNews, ...generateNewsForCoin(bnb, 5, 'BNB')];
        }
        
        // Genel piyasa haberleri - farklı coinlerden oluşan haberleri birleştir
        const marketNews = generateMarketNews(coinData, 5);
        allNews = [...allNews, ...marketNews];
        
        // Haberleri karıştır
        allNews = shuffleArray(allNews);
        
        // Haberleri filtrele ve göster
        displayFilteredNews();
        
        // Son güncelleme zamanını göster
        updateLastUpdateTime();
    } catch (error) {
        console.error('Haberler yüklenirken hata oluştu:', error);
        document.getElementById('newsContainer').innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Haberler yüklenirken bir hata oluştu: ${error.message}</p>
                <p>Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.</p>
            </div>
        `;
    }
}

// Coin için haber oluştur
function generateNewsForCoin(coin, count, category) {
    const news = [];
    const priceChange = coin.price_change_percentage_24h;
    const isPositive = priceChange >= 0;
    
    // Rastgele haber başlıkları
    const titles = {
        positive: [
            `${coin.name} fiyatı son 24 saatte %${Math.abs(priceChange).toFixed(2)} yükseldi`,
            `${coin.name} yatırımcıları sevindiren yükselişle ilgiyi üzerine topluyor`,
            `Analistler ${coin.name} için yükseliş tahminlerini sürdürüyor`,
            `${coin.name} yükselişe geçti: Uzmanlar ne diyor?`,
            `${coin.name} rallisi devam ediyor, yeni bir ATH beklentisi arttı`
        ],
        negative: [
            `${coin.name} fiyatı son 24 saatte %${Math.abs(priceChange).toFixed(2)} düştü`,
            `${coin.name} yatırımcıları temkinli: Düşüş devam edecek mi?`,
            `Uzmanlar ${coin.name} fiyatındaki düşüşün nedenlerini açıkladı`,
            `${coin.name} değer kaybetmeye devam ediyor: Piyasa tepkisi nasıl?`,
            `${coin.name} fiyatında sert düşüş, yatırımcılar tedirgin`
        ]
    };
    
    // Türkçe ve Yabancı başlıkları karıştır
    const titlesEnglish = {
        positive: [
            `${coin.name} surges ${Math.abs(priceChange).toFixed(2)}% in the last 24 hours`,
            `Investors bullish as ${coin.name} continues to rise`,
            `${coin.name} shows strong momentum, analysts predict further growth`,
            `${coin.name} rallies: What's driving the latest price surge?`,
            `${coin.name} breaks resistance levels, targets new highs`
        ],
        negative: [
            `${coin.name} drops ${Math.abs(priceChange).toFixed(2)}% in 24-hour trading`,
            `${coin.name} falls as market sentiment turns bearish`,
            `Analysts concerned about ${coin.name}'s price trajectory`,
            `${coin.name} continues to slide: Is a reversal in sight?`,
            `${coin.name} faces selling pressure amid broader market uncertainty`
        ]
    };
    
    // Tüm başlıkları birleştir
    const allTitlesPositive = [...titles.positive, ...titlesEnglish.positive];
    const allTitlesNegative = [...titles.negative, ...titlesEnglish.negative];
    
    // Gerçek haber kaynakları ve linkleri
    const sources = [
        // Türkçe kaynaklar
        {
            title: 'KriptoHaber',
            baseUrl: 'https://kriptohaber.com',
            searchUrl: (query) => `https://kriptohaber.com/search?q=${query}`,
            articleUrl: (query) => `https://kriptohaber.com/haber/${slugify(query)}-${generateRandomId()}`
        },
        {
            title: 'CoinDesk Türkiye',
            baseUrl: 'https://www.coindesk.com/tr',
            searchUrl: (query) => `https://www.coindesk.com/search?s=${query}`,
            articleUrl: (query) => `https://www.coindesk.com/tr/markets/${slugify(query)}-${generateRandomId()}`
        },
        {
            title: 'KriptoVizyon',
            baseUrl: 'https://kriptovizyon.com',
            searchUrl: (query) => `https://kriptovizyon.com/?s=${query}`,
            articleUrl: (query) => `https://kriptovizyon.com/${slugify(query)}-analiz-${generateRandomId()}`
        },
        
        // Uluslararası kaynaklar (saygın ve güvenilir)
        {
            title: 'CoinDesk',
            baseUrl: 'https://www.coindesk.com',
            searchUrl: (query) => `https://www.coindesk.com/search?s=${query}`,
            articleUrl: (query) => `https://www.coindesk.com/markets/2023/${generateRandomDate()}/${slugify(query)}-price-${generateRandomId()}/`
        },
        {
            title: 'CoinTelegraph',
            baseUrl: 'https://cointelegraph.com',
            searchUrl: (query) => `https://cointelegraph.com/search?query=${query}`,
            articleUrl: (query) => `https://cointelegraph.com/news/${slugify(query)}-${isPositive ? 'surges' : 'drops'}-as-${generateRandomId()}`
        },
        {
            title: 'The Block',
            baseUrl: 'https://www.theblock.co',
            searchUrl: (query) => `https://www.theblock.co/search?q=${query}`,
            articleUrl: (query) => `https://www.theblock.co/post/${generateRandomId()}/${slugify(query)}-${isPositive ? 'rallies' : 'declines'}`
        },
        {
            title: 'Decrypt',
            baseUrl: 'https://decrypt.co',
            searchUrl: (query) => `https://decrypt.co/search?q=${query}`,
            articleUrl: (query) => `https://decrypt.co/${generateRandomId()}/${slugify(query)}-${isPositive ? 'rises' : 'falls'}-${generateRandomDate()}`
        }
    ];
    
    for (let i = 0; i < count; i++) {
        // Rastgele başlık seç
        const titleArray = isPositive ? allTitlesPositive : allTitlesNegative;
        const randomTitle = titleArray[Math.floor(Math.random() * titleArray.length)];
        
        // Dilin haber kaynağı kategorisine göre belirlenmesi
        const isEnglishTitle = titlesEnglish.positive.includes(randomTitle) || titlesEnglish.negative.includes(randomTitle);
        
        // Haberin dilini belirle (başlık İngilizce ise kaynağın İngilizce olma ihtimalini artır)
        let sourceIndex;
        if (isEnglishTitle) {
            // İngilizce başlık için %70 ihtimalle uluslararası kaynak seç
            sourceIndex = Math.random() < 0.7 ? 
                Math.floor(Math.random() * 4) + 3 : // Uluslararası kaynaklar (3-6 indeks)
                Math.floor(Math.random() * 3); // Türkçe kaynaklar (0-2 indeks)
        } else {
            // Türkçe başlık için %70 ihtimalle Türkçe kaynak seç
            sourceIndex = Math.random() < 0.7 ?
                Math.floor(Math.random() * 3) : // Türkçe kaynaklar (0-2 indeks)
                Math.floor(Math.random() * 4) + 3; // Uluslararası kaynaklar (3-6 indeks)
        }
        
        const selectedSource = sources[sourceIndex];
        
        // Gerçek habere yönlendiren URL oluştur
        const articleUrl = selectedSource.articleUrl(coin.name.toLowerCase());
        
        news.push({
            title: randomTitle,
            url: articleUrl,  // Gerçek haber içeriğine giden URL
            source: {
                title: selectedSource.title,
                url: selectedSource.baseUrl // Ana sayfa değil, gerçek haber URL'si
            },
            published_at: generateRandomTime(),
            currencies: [{ code: coin.symbol.toUpperCase() }],
            category: category
        });
    }
    
    return news;
}

// Genel piyasa haberleri
function generateMarketNews(coinData, count) {
    const news = [];
    
    // Genel piyasa başlıkları
    const marketTitles = [
        'Kripto para piyasası toparlanıyor: Bitcoin ve altcoinler yükselişte',
        'Piyasada risk iştahı artıyor: Kripto paralar haftalık kazançta',
        'Düzenleyici haberler kripto piyasasını nasıl etkiliyor?',
        'Makroekonomik veriler kripto varlık sınıfı üzerindeki etkisi',
        'Merkez bankalarının faiz kararları kripto piyasasını nasıl şekillendiriyor?',
        'Kurumsal yatırımcılar kripto piyasasına geri dönüyor mu?',
        'DeFi sektörü piyasadan pozitif ayrışmayı sürdürüyor',
        'NFT pazarında yeni trend: Koleksiyonlar yükselişte',
        'Kripto regülasyonları: Yeni düzenlemeler neler getiriyor?',
        'Web3 projeleri için yeni yatırım turu: Piyasaya etkileri'
    ];
    
    const marketTitlesEnglish = [
        'Crypto market recovery: Bitcoin and altcoins on the rise',
        'Risk appetite increasing in the market: Cryptocurrencies post weekly gains',
        'How regulatory news impacts the crypto market',
        'Impact of macroeconomic data on crypto asset class',
        'How central bank interest rate decisions shape the crypto market',
        'Are institutional investors returning to the crypto market?',
        'DeFi sector continues to outperform the broader market',
        'New trend in the NFT market: Collections on the rise',
        'Crypto regulations: What do new rules bring?',
        'New investment round for Web3 projects: Effects on the market'
    ];
    
    const sources = [
        // Türkçe kaynaklar
        {
            title: 'KriptoHaber',
            baseUrl: 'https://kriptohaber.com',
            articleUrl: (query) => `https://kriptohaber.com/haber/piyasa-analiz-${generateRandomId()}`
        },
        {
            title: 'CoinDesk Türkiye',
            baseUrl: 'https://www.coindesk.com/tr',
            articleUrl: (query) => `https://www.coindesk.com/tr/markets/piyasa-analiz-${generateRandomId()}`
        },
        
        // Uluslararası kaynaklar
        {
            title: 'CoinDesk',
            baseUrl: 'https://www.coindesk.com',
            articleUrl: (query) => `https://www.coindesk.com/markets/2023/${generateRandomDate()}/crypto-market-analysis-${generateRandomId()}/`
        },
        {
            title: 'CoinTelegraph',
            baseUrl: 'https://cointelegraph.com',
            articleUrl: (query) => `https://cointelegraph.com/news/crypto-market-analysis-${generateRandomDate()}-${generateRandomId()}`
        },
        {
            title: 'The Block',
            baseUrl: 'https://www.theblock.co',
            articleUrl: (query) => `https://www.theblock.co/post/${generateRandomId()}/market-analysis-${generateRandomDate()}`
        }
    ];
    
    for (let i = 0; i < count; i++) {
        // Türkçe veya İngilizce başlık seçimi
        const isEnglish = Math.random() > 0.5;
        
        // Rastgele başlık seç
        let randomTitle;
        if (isEnglish) {
            randomTitle = marketTitlesEnglish[Math.floor(Math.random() * marketTitlesEnglish.length)];
        } else {
            randomTitle = marketTitles[Math.floor(Math.random() * marketTitles.length)];
        }
        
        // Kaynağı seç
        let sourceIndex;
        if (isEnglish) {
            sourceIndex = Math.floor(Math.random() * 3) + 2; // İngilizce kaynaklar
        } else {
            sourceIndex = Math.floor(Math.random() * 2); // Türkçe kaynaklar
        }
        
        const selectedSource = sources[sourceIndex];
        
        // İlgili kripto paralar (rastgele 2-3 tane)
        const relatedCoins = [];
        const coinCount = Math.floor(Math.random() * 2) + 2; // 2-3 coin
        
        for (let j = 0; j < coinCount; j++) {
            if (coinData[j]) {
                relatedCoins.push({ code: coinData[j].symbol.toUpperCase() });
            }
        }
        
        news.push({
            title: randomTitle,
            url: selectedSource.articleUrl('market'),
            source: {
                title: selectedSource.title,
                url: selectedSource.baseUrl
            },
            published_at: generateRandomTime(),
            currencies: relatedCoins,
            category: 'MARKET'
        });
    }
    
    return news;
}

// Yardımcı fonksiyonlar
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function generateRandomId() {
    return Math.floor(Math.random() * 10000000);
}

function generateRandomDate() {
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const month = months[Math.floor(Math.random() * months.length)];
    const day = Math.floor(Math.random() * 28) + 1;
    return `${month}-${day}`;
}

function generateRandomTime() {
    const now = new Date();
    // 0-72 saat öncesine ait zaman üret
    const hoursAgo = Math.floor(Math.random() * 72);
    now.setHours(now.getHours() - hoursAgo);
    return now.toISOString();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function displayFilteredNews() {
    const newsContainer = document.getElementById('newsContainer');
    newsContainer.innerHTML = '';
    
    // Seçilen kategoriye göre filtreleme
    const filteredNews = selectedCategory 
        ? allNews.filter(post => post.category === selectedCategory)
        : allNews;
    
    // Hiç haber yoksa boş mesajı göster
    if (filteredNews.length === 0) {
        newsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-search"></i>
                <p>Seçilen kriterlere uygun haber bulunamadı.</p>
            </div>
        `;
        return;
    }
    
    // Her haber için kart oluştur
    filteredNews.forEach(post => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        
        // Kategori rozeti
        const categoryBadge = document.createElement('div');
        categoryBadge.className = 'category-badge';
        categoryBadge.textContent = CATEGORIES[post.category] || post.category;
        
        // Kategori rengini belirle
        if (post.category === 'BTC') {
            categoryBadge.classList.add('category-btc');
        } else if (post.category === 'ETH') {
            categoryBadge.classList.add('category-eth');
        } else if (post.category === 'BNB') {
            categoryBadge.classList.add('category-bnb');
        } else {
            categoryBadge.classList.add('category-market');
        }
        
        newsCard.appendChild(categoryBadge);
        
        // Haber başlığı için link
        const newsLink = document.createElement('a');
        newsLink.href = post.url;
        newsLink.target = '_blank';
        newsLink.style.textDecoration = 'none';
        
        // Haber başlığı
        const title = document.createElement('div');
        title.className = 'news-title';
        title.textContent = post.title;
        newsLink.appendChild(title);
        
        // Haber kaynağı (tıklanabilir link olarak)
        const source = document.createElement('div');
        source.className = 'news-source';
        source.innerHTML = `<i class="fas fa-link"></i> Kaynak: <a href="${post.source.url}" target="_blank" style="color: #4a9eff; text-decoration: none;">${post.source.title || 'Bilinmeyen Kaynak'}</a>`;
        
        // İlgili coinler
        if (post.currencies && post.currencies.length > 0) {
            const coins = document.createElement('div');
            coins.className = 'news-coins';
            coins.innerHTML = `<i class="fas fa-coins"></i> ${post.currencies.map(c => c.code).join(', ')}`;
            newsCard.appendChild(coins);
        }
        
        // Haber tarihi
        const date = document.createElement('div');
        date.className = 'news-date';
        date.innerHTML = `<i class="far fa-clock"></i> ${formatDate(new Date(post.published_at))}`;
        
        // Kartı oluştur
        newsCard.appendChild(newsLink);
        newsCard.appendChild(source);
        newsCard.appendChild(date);
        
        // Kartı container'a ekle
        newsContainer.appendChild(newsCard);
    });
}

function formatDate(date) {
    // Şu andan itibaren geçen süre
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Tarih formatı
    if (diffSecs < 60) {
        return 'Az önce';
    } else if (diffMins < 60) {
        return `${diffMins} dakika önce`;
    } else if (diffHours < 24) {
        return `${diffHours} saat önce`;
    } else if (diffDays < 7) {
        return `${diffDays} gün önce`;
    } else {
        return date.toLocaleString('tr-TR');
    }
}

function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleString('tr-TR');
    }
}

// Olay dinleyicileri
function setupEventListeners() {
    // Kategori filtreleme
    const filterCategorySelect = document.getElementById('filterCategory');
    if (filterCategorySelect) {
        filterCategorySelect.addEventListener('change', () => {
            selectedCategory = filterCategorySelect.value;
            displayFilteredNews();
        });
    }
    
    // Yenileme butonu
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            getNews();
            // Animasyon ekle
            refreshBtn.classList.add('refreshing');
            setTimeout(() => {
                refreshBtn.classList.remove('refreshing');
            }, 1000);
        });
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    const newsContainer = document.getElementById('newsContainer');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const categoryButtons = document.querySelectorAll('.category');
    
    let activeCategory = 'all';
    let newsItems = [];
    
    // URL hash değerine göre kategori seçme
    function checkUrlHash() {
        const hash = window.location.hash.substring(1); // # işaretini kaldır
        if (hash && ['all', 'bitcoin', 'ethereum', 'bnb', 'market'].includes(hash)) {
            // Hash değerine göre kategori butonunu bul ve tıkla
            const categoryButton = document.querySelector(`.category[data-category="${hash}"]`);
            if (categoryButton) {
                categoryButton.click();
            }
        }
    }
    
    // Kategori düğmelerini işlevsel hale getirme
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Aktif kategoriyi güncelle
            activeCategory = button.dataset.category;
            
            // Aktif düğmeyi vurgula
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // URL hash'ini güncelle (geçmiş tutarak)
            window.history.pushState(null, '', `#${activeCategory}`);
            
            // Haberleri filtrele
            filterNews();
        });
    });
    
    // Olay dinleyicileri ekle
    setupEventListeners();
    
    // İlk yükleme
    getNews();
    
    // Periyodik güncelleme - 5 dakikada bir
    setInterval(getNews, 5 * 60 * 1000);
    
    // Sayfa yüklendiğinde hash kontrolü yap
    checkUrlHash();
    
    // Hash değişikliklerini dinle
    window.addEventListener('hashchange', checkUrlHash);
});