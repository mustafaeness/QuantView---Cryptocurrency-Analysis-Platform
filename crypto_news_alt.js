// Global değişkenler
let allNews = [];
let activeCategory = 'all'; // Seçili haber kategorisi, başlangıçta hepsi
let isAnalyzing = false; // Genel bir analiz süreci (örn: fetchAllAnalysesInBackground için) devam ediyor mu?
let pendingAnalyses = 0; // Arka plan analizleri için bekleyen sayısı
let newsAnalyses = new Map(); // Haber analizlerini ve durumlarını saklamak için Map
const activeFetches = new Set(); // Aktif olarak çekilen analizlerin ID'lerini tutar

// OpenRouter API için sabitler
const OPENROUTER_API_KEY = "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";
const OPENROUTER_MODEL = "mistralai/mistral-7b-instruct";

// Kategoriler
const CATEGORIES = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    BNB: 'BNB',
    MARKET: 'Genel Piyasa'
};

// GNews API için sabitler
const GNEWS_API_KEY = "fd794ca9499b9ddcaae53e27892b65ff";
const GNEWS_API_BASE_URL = "https://gnews.io/api/v4";

// Yeni: Kategori anahtarlarına göre görsel URL'leri (Bunlar genel görseller olarak kalabilir)
const CATEGORY_IMAGE_URLS = {
    'BTC': 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&q=80',
    'ETH': 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&q=80',
    'BNB': 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=400&q=80',
    'MARKET': 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=400&q=80'
};

// Yeni: Kategori anahtarlarına göre CSS sınıfı sonekleri
const CATEGORY_CSS_CLASS_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'bnb',
    'MARKET': 'market'
};

// Kategoriye göre görsel URL'si döndüren fonksiyon
function getNewsImageUrl(categoryKey) {
    return CATEGORY_IMAGE_URLS[categoryKey] || CATEGORY_IMAGE_URLS['MARKET'];
}

// GNews API'si ile haberleri çeken fonksiyon
async function getNews() {
    const newsContainer = document.getElementById('newsContainer');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const errorMessageSpan = document.getElementById('errorMessage');

    console.log("getNews fonksiyonu GNews API ile çalıştırılıyor...");

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        newsContainer.innerHTML = '';

        isAnalyzing = true;
        pendingAnalyses = 0;
        newsAnalyses = new Map(); // Önceki analizleri temizle

        const analysisStatusElement = document.createElement('div');
        analysisStatusElement.id = 'analysisStatus';
        analysisStatusElement.className = 'analysis-status';
        analysisStatusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GNews API üzerinden haberler yükleniyor...';
        loadingElement.appendChild(analysisStatusElement);

        let fetchedNews = [];

        // GNews API parametreleri
        const lang = "en";
        const articlesPerCoin = 10; // Her coin için 10 haber
        const nowDate = new Date();
        const sevenDaysAgoDate = new Date(nowDate);
        sevenDaysAgoDate.setDate(nowDate.getDate() - 7);
        const fromDate = sevenDaysAgoDate.toISOString();
        const toDate = nowDate.toISOString();

        const coinQueries = {
            'BTC': '(Bitcoin OR BTC)',
            'ETH': '(Ethereum OR ETH)',
            'BNB': '("Binance Coin" OR BNB)'
        };

        console.log(`GNews API için ${Object.keys(coinQueries).length} farklı sorgu hazırlanıyor (her biri max ${articlesPerCoin} haber)...`);

        const fetchedNewsPromises = Object.keys(coinQueries).map(async coinSymbol => {
            const specificQuery = encodeURIComponent(coinQueries[coinSymbol]);
            const apiUrl = `${GNEWS_API_BASE_URL}/search?apikey=${GNEWS_API_KEY}&q=${specificQuery}&lang=${lang}&max=${articlesPerCoin}&from=${fromDate}&to=${toDate}&sortby=publishedAt`; // En yeni haberleri almak için sortby eklendi
            console.log(`GNews API URL for ${coinSymbol}:`, apiUrl);

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    let errorDetail = response.statusText;
                    try {
                        const errorData = await response.json();
                        if (errorData && errorData.errors && Array.isArray(errorData.errors)) {
                            errorDetail = errorData.errors.join(', ');
                        } else if (errorData && errorData.message) {
                            errorDetail = errorData.message;
                        } else {
                            errorDetail = JSON.stringify(errorData);
                        }
                    } catch (e) {
                        errorDetail = await response.text();
                    }
                    console.error(`GNews API Hatası (${coinSymbol} - ${response.status}): ${errorDetail}`);
                    return []; // Hata durumunda boş dizi dön
                }

                let apiData;
                try {
                    apiData = await response.json();
                } catch (e) {
                    console.error(`GNews API yanıtı JSON formatında değil (${coinSymbol}):`, e);
                    return [];
                }


                if (!apiData || !apiData.articles || !Array.isArray(apiData.articles)) {
                    console.error(`GNews API geçersiz yanıt formatı (${coinSymbol}):`, apiData);
                    return []; // Hata durumunda boş dizi dön
                }
                
                console.log(`${apiData.articles.length} adet haber GNews API'den ${coinSymbol} için çekildi.`);
                // Gelen haberlere doğrudan kategoriyi ekle
                return apiData.articles.map(rawArticle => ({
                    title: rawArticle.title,
                    url: rawArticle.url,
                    source: {
                        title: rawArticle.source.name,
                        url: rawArticle.source.url
                    },
                    published_at: rawArticle.publishedAt,
                    currencies: [{ code: coinSymbol }],
                    category: coinSymbol,
                    description: rawArticle.description || rawArticle.title,
                    image: rawArticle.image || getNewsImageUrl(coinSymbol)
                }));
            } catch (error) {
                console.error(`GNews API isteği sırasında genel hata (${coinSymbol}):`, error);
                return []; // Hata durumunda boş dizi dön
            }
        });

        const results = await Promise.allSettled(fetchedNewsPromises);
        let combinedArticles = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                combinedArticles.push(...result.value);
            } else if (result.status === 'rejected') {
                console.error("GNews API çağrılarından biri reddedildi (Promise.allSettled):", result.reason);
            }
        });
        
        fetchedNews = combinedArticles;
        console.log(`Toplam ${fetchedNews.length} adet haber (BTC, ETH, BNB birleştirilmiş) GNews API'den çekildi.`);

        if (fetchedNews.length === 0) {
            console.warn(`GNews API'den (BTC, ETH, BNB için ayrı sorgularla, her biri max ${articlesPerCoin}, son 7 gün) hiç haber çekilemedi veya filtrelenecek haber yoktu.`);
        }

        console.log(`--- GNews Haberleri (Filtrelenmiş ve Birleştirilmiş: BTC, ETH, BNB | Son 7 Gün | Bulunan: ${fetchedNews.length}) ---`);
        fetchedNews.forEach(newsItem => {
            console.log(`Başlık: ${newsItem.title}`);
            console.log(`Tarih: ${new Date(newsItem.published_at).toLocaleString('tr-TR')}`);
            console.log(`Kaynak: ${newsItem.source.name}`); // Kaynak adı GNews'ten geliyor
            console.log(`Kategori: ${newsItem.category}`);
            console.log("--------------------");
        });

        allNews = shuffleArray(fetchedNews); // Haberleri karıştır

        // !!! YENİ EKLENEN KISIM: Tüm haberler için ID'leri önceden oluştur !!!
        allNews.forEach(newsItem => {
            const titlePart = (newsItem.title || 'untitled').substring(0, 20).replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
            const randomPart = Math.random().toString(36).substr(2, 5);
            newsItem.generatedNewsId = newsItem.url || `news-${titlePart}-${randomPart}`;
            // Başlangıçta her haber için analiz durumu 'pending' (beklemede) olarak ayarlanabilir.
            if (!newsAnalyses.has(newsItem.generatedNewsId)) {
                newsAnalyses.set(newsItem.generatedNewsId, { status: 'pending', analysisText: null, category: newsItem.category });
            }
        });

        if (analysisStatusElement) { 
            analysisStatusElement.innerHTML = '<i class="fas fa-sync-alt"></i> Haberler yüklendi, gösteriliyor...';
        }
        
        displayFilteredNews(); // Filtrelenmiş haberleri göster (kartlar oluşacak)
        fetchAllAnalysesInBackground(); // YENİ: Tüm analizleri arka planda çekmeyi başlat.
        updateLastUpdateTime(); // Son güncelleme zamanını ayarla

    } catch (error) {
        console.error('GNews ile haber yükleme genel hatası:', error);
        if (errorMessageSpan) {
            errorMessageSpan.textContent = `Haberler GNews API üzerinden yüklenirken bir hata oluştu: ${error.message}. Lütfen API anahtarınızı, sorgunuzu ve internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin. Ücretsiz plan limitlerine takılmış olabilirsiniz.`;
        }
        if (errorElement) {
            errorElement.style.display = 'flex';
        }
    } finally {
        if (loadingElement) {
            const analysisStatusElement = document.getElementById('analysisStatus');
            if (analysisStatusElement) {
                analysisStatusElement.remove(); // Analiz durumu elementini kaldır
            }
            loadingElement.style.display = 'none';
        }
        isAnalyzing = false; // Analiz bitti
        console.log("getNews (GNews API) fonksiyonu tamamlandı.");
    }
}

// CoinDesk API'si için generateNewsFromData, generateNewsForCoin, generateMarketNews fonksiyonlarına artık ihtiyaç yok.
// Bu fonksiyonlar kaldırılacak veya yorum satırına alınacak.
// function generateNewsFromData(coinData) { ... }
// function generateNewsForCoin(coin, count, category) { ... }
// function generateMarketNews(coinData, count) { ... }


// ... (analyzeAllNews, updateAnalysisStatus, updateAllNewsCardsWithAnalyses fonksiyonları aynı kalacak)
// ... (slugify, generateRandomId, generateRandomDate, generateRandomTime fonksiyonları ID oluşturmada kullanılıyor olabilir, şimdilik kalsın)

// ... (Diğer yardımcı fonksiyonlar ve olay dinleyicileri aynı kalacak)

// shuffleArray, formatDate gibi yardımcı fonksiyonlar hala kullanılabilir.
// generateRandomId, generateRandomDate, generateRandomTime gibi fonksiyonlar artık doğrudan haber oluşturmak için kullanılmayacak.
// Ancak updateNewsCardWithAnalysis içinde newsId oluşturmak için Math.random kullanılmaya devam ediliyor, bu kısım iyileştirilebilir
// veya GNews'ten gelen bir ID varsa o kullanılabilir (eğer varsa ve benzersizse, örneğin haberin URL'si).
// Şimdilik ID oluşturma mantığı aynı kalabilir.

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return `Dün`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Haber kartını oluşturan fonksiyon
function createNewsCard(newsItem) {
    const card = document.createElement('div');
    card.className = 'news-card'; // Ana kart sınıfı

    // Kategoriye göre ek CSS sınıfı (renklendirme vb. için)
    const categoryClass = CATEGORY_CSS_CLASS_MAP[newsItem.category.toUpperCase()] || CATEGORY_CSS_CLASS_MAP['MARKET'];
    if (categoryClass) {
        card.classList.add(`news-card-${categoryClass}`);
    }

    // Görsel
    const imageElement = document.createElement('img');
    imageElement.src = newsItem.image || getNewsImageUrl(newsItem.category.toUpperCase());
    imageElement.alt = newsItem.title;
    imageElement.className = 'news-image'; // Görsel için CSS sınıfı
    card.appendChild(imageElement);

    // Başlık
    const titleElement = document.createElement('h3');
    titleElement.className = 'news-title'; // Başlık için CSS sınıfı
    const titleLink = document.createElement('a');
    titleLink.href = newsItem.url;
    titleLink.textContent = newsItem.title;
    titleLink.target = '_blank'; // Yeni sekmede aç
    titleElement.appendChild(titleLink);
    card.appendChild(titleElement);

    // Açıklama
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'news-description'; // Açıklama için CSS sınıfı
    descriptionElement.textContent = newsItem.description || '';
    card.appendChild(descriptionElement);

    // Kaynak ve Tarih Bilgisi
    const metaInfo = document.createElement('div');
    metaInfo.className = 'news-meta'; // Meta bilgi için CSS sınıfı
    
    // const sourceSpan = document.createElement('span');
    // sourceSpan.className = 'news-source';
    // sourceSpan.textContent = `Kaynak: ${newsItem.source.name}`;
    // metaInfo.appendChild(sourceSpan);

    const dateSpan = document.createElement('span');
    dateSpan.className = 'news-date';
    dateSpan.textContent = formatDate(new Date(newsItem.published_at)); // formatDate fonksiyonunuzu kullanıyoruz
    metaInfo.appendChild(dateSpan);
    
    card.appendChild(metaInfo); // İSTEK 2: Kaynak ve Tarih bilgisini AI Analizinden sonra ekle
    
    // AI Analiz bölümü için placeholder
    const analysisPlaceholder = createAnalysisElement(); 
    card.appendChild(analysisPlaceholder); // İSTEK 2: AI Analizini önce ekle

    // updateNewsCardWithAnalysis fonksiyonunu çağırarak ID ve tıklama olaylarını ekle
    updateNewsCardWithAnalysis(card, newsItem);

    return card;
}

// Haber kartını analiz ile güncelle (artık sadece tıklama olayı ekliyor, analiz önceden yapılmış oluyor)
function updateNewsCardWithAnalysis(newsCard, newsItem) {
    const newsId = newsItem.generatedNewsId;
    if (!newsId) {
        console.warn("Haber kartı için generatedNewsId bulunamadı:", newsItem.title);
        const fallbackId = `news-${(newsItem.title || 'untitled').substring(0, 10).replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 5)}`;
        newsCard.setAttribute('data-news-id', fallbackId);
    } else {
        newsCard.setAttribute('data-news-id', newsId);
    }

    // Analiz bölümünün başlangıçta gizli olduğundan emin ol (createAnalysisElement zaten yapıyor)
    const analysisElement = newsCard.querySelector('.news-analysis');
    if (analysisElement) analysisElement.style.display = 'none';

    newsCard.addEventListener('click', (e) => {
        if (!e.target.closest('.news-analysis a') && !e.target.closest('a.news-title-link') && e.target.tagName !== 'A') { // Analiz içindeki linkler veya başlık linki hariç
            // Kapatma butonu da .news-analysis içinde olduğu için bu kontrol yeterli olabilir
            // Eğer tıklanan eleman .close-analysis ise veya .news-analysis'in dışıysa işlemi yap
            if (e.target.closest('.close-analysis') || !e.target.closest('.news-analysis')) {
                 handleNewsCardClick(newsId, newsItem, newsCard);
            }
        }
        // Eğer bir linke (<a>) tıklandıysa, varsayılan davranışı engelleme.
    });
}

// Yeni Fonksiyon: Haber kartına tıklandığında analiz sürecini yönetir
async function handleNewsCardClick(newsId, newsItem, newsCardElement) {
    const analysisContainer = newsCardElement.querySelector('.news-analysis');
    const analysisResultDiv = newsCardElement.querySelector('.news-analysis .analysis-result');
    const analysisLoadingDiv = newsCardElement.querySelector('.news-analysis .analysis-loading');

    if (!analysisContainer || !analysisResultDiv || !analysisLoadingDiv) {
        console.error("Analiz için gerekli DOM elementleri bulunamadı:", newsId);
        return;
    }

    const currentAnalysisData = newsAnalyses.get(newsId);
    const isVisible = analysisContainer.style.display === 'block';

    // Eğer analiz bölümü zaten görünürse ve tekrar aynı karta (kapatma butonu hariç) tıklanırsa gizle
    // Kapatma butonuna tıklanırsa da gizle
    if (isVisible && (!event || event.target.closest('.close-analysis') || !event.target.closest('.news-analysis .analysis-content'))) {
        analysisContainer.style.display = 'none';
        return;
    }
    
    analysisContainer.style.display = 'block'; // Analiz bölümünü görünür yap

    if (currentAnalysisData) {
        switch (currentAnalysisData.status) {
            case 'loaded':
                analysisLoadingDiv.style.display = 'none';
                analysisResultDiv.innerHTML = formatAnalysisContent(currentAnalysisData.analysisText);
                analysisResultDiv.style.display = 'block';
                break;
            case 'error':
                analysisLoadingDiv.style.display = 'none';
                analysisResultDiv.innerHTML = `<p style="color:red;">${currentAnalysisData.analysisText || 'Analiz yüklenirken bir hata oluştu.'}</p>`;
                analysisResultDiv.style.display = 'block';
                break;
            case 'loading':
                analysisResultDiv.style.display = 'none';
                analysisLoadingDiv.style.display = 'flex'; // veya block
                break;
            case 'pending': // Henüz analiz istenmemiş, şimdi iste
            default:
                if (activeFetches.has(newsId)) {
                    console.log("Bu haber için analiz zaten aktif olarak çekiliyor:", newsId);
                    analysisResultDiv.style.display = 'none';
                    analysisLoadingDiv.style.display = 'flex';
                    return; // Zaten yükleniyor, tekrar istek atma
                }

                activeFetches.add(newsId);
                newsAnalyses.set(newsId, { ...currentAnalysisData, status: 'loading' });
                analysisResultDiv.style.display = 'none';
                analysisLoadingDiv.style.display = 'flex';

                try {
                    const analysisText = await analyzeNewsWithOpenRouter(newsItem);

                    // UNDEFINED KONTROLÜ VE LOGLAMA
                    if (typeof analysisText === 'undefined') {
                        console.error(`analyzeNewsWithOpenRouter tanımsız (undefined) değer döndürdü! Haber ID: ${newsId}, Başlık: ${newsItem.title}`);
                        // Bu durumu bir hata olarak işle
                        const errorMessage = "AI analiz servisi beklenmedik bir yanıt döndürdü.";
                        newsAnalyses.set(newsId, { ...currentAnalysisData, status: 'error', analysisText: errorMessage, category: newsItem.category });
                        analysisLoadingDiv.style.display = 'none';
                        analysisResultDiv.innerHTML = `<p style="color:red;">${errorMessage}</p>`;
                        analysisResultDiv.style.display = 'block';
                        activeFetches.delete(newsId); // Fetch tamamlandı (başarısız da olsa)
                        return; // Fonksiyondan çık
                    }

                    newsAnalyses.set(newsId, { status: 'loaded', analysisText, category: newsItem.category });
                    analysisLoadingDiv.style.display = 'none';
                    analysisResultDiv.innerHTML = formatAnalysisContent(analysisText);
                    analysisResultDiv.style.display = 'block';
                    // Toplu bölümleri de bu yeni analizle güncelle
                    updateSentimentAnalysisSection(); 
                    updateInvestmentScores();
                } catch (error) {
                    console.error(`Haber analizi hatası (handleNewsCardClick - ${newsId}):`, error);
                    const errorMessage = error.message || "AI analizi sırasında bir hata oluştu.";
                    newsAnalyses.set(newsId, { ...currentAnalysisData, status: 'error', analysisText: errorMessage });
                    analysisLoadingDiv.style.display = 'none';
                    analysisResultDiv.innerHTML = `<p style="color:red;">${errorMessage}</p>`;
                    analysisResultDiv.style.display = 'block';
                } finally {
                    activeFetches.delete(newsId);
                }
                break;
        }
    } else {
        // Bu durumun olmaması gerekir çünkü getNews içinde pending olarak ekleniyor.
        console.warn("newsAnalyses Map'inde haber için kayıt bulunamadı, bu beklenmedik bir durum:", newsId);
        analysisLoadingDiv.style.display = 'none';
        analysisResultDiv.innerHTML = '<p style="color:orange;">Analiz bilgisi bulunamadı. Lütfen sayfayı yenileyin.</p>';
        analysisResultDiv.style.display = 'block';
    }
}

// Tüm haberleri analiz eden fonksiyon (analyzeAllNews) aynı kalabilir.
// Analiz durumu mesajını güncelleyen fonksiyon (updateAnalysisStatus) aynı kalabilir.
// Tüm haber kartlarını analiz sonuçlarıyla güncelleyen fonksiyon (updateAllNewsCardsWithAnalyses) aynı kalabilir.
// Analiz elementini oluşturan fonksiyon (createAnalysisElement) aynı kalabilir.
// Analiz içeriğini formatlayan fonksiyon (formatAnalysisContent) aynı kalabilir.
// Toplu analiz bölümünü güncelleyen fonksiyon (updateSentimentAnalysisSection) aynı kalabilir.
// Yatırım skorlarını parse etme ve göstergeleri güncelleme fonksiyonu (updateInvestmentScores) aynı kalabilir.
// Göstergeyi güncelleme fonksiyonu (updateScoreMeter) aynı kalabilir.

// displayFilteredNews fonksiyonu, allNews dizisi GNews'ten gelenlerle dolacağı için çalışmaya devam edecektir.
function displayFilteredNews() {
    const newsContainer = document.getElementById('newsContainer');
    newsContainer.innerHTML = ''; 

    const filteredNews = allNews.filter(item => {
        if (activeCategory === 'all') return true;
        const itemCssCategory = CATEGORY_CSS_CLASS_MAP[item.category.toUpperCase()] || CATEGORY_CSS_CLASS_MAP['MARKET'];
        return itemCssCategory === activeCategory;
    });

    if (filteredNews.length > 0) {
        filteredNews.forEach(item => {
            const card = createNewsCard(item);
            newsContainer.appendChild(card);
        });
        // Analizler zaten başta yapıldığı için, kartlar oluşturulduktan sonra tekrar analizleri kartlara eklemeye gerek yok.
        // updateAllNewsCardsWithAnalyses fonksiyonu bunu getNews içinde hallediyor.
    } else {
        if (allNews.length === 0 && !isAnalyzing) { 
             newsContainer.innerHTML = `<p style="text-align:center; color: var(--text-secondary); padding: 20px;">Şu anda gösterilecek haber bulunmuyor.</p>`;
        } else if (!isAnalyzing) { 
            newsContainer.innerHTML = `<p style="text-align:center; color: var(--text-secondary); padding: 20px;">Bu kategoride haber bulunamadı.</p>`;
        }
        // Eğer analiz hala devam ediyorsa bir şey gösterme, yükleme ekranı aktif olacak.
    }
}


function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleString('tr-TR');
    }
}

function setupEventListeners() {
    const categoryButtons = document.querySelectorAll('.category');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            activeCategory = button.dataset.category;
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            displayFilteredNews();
            // Kategori değiştiğinde analizler zaten yapılmış ve kartlara eklenmiş olmalı.
            // Sadece görünürlükleri toggleAnalysis ile ayarlanacak.
            // Bu yüzden updateAllNewsCardsWithAnalyses çağrısını burada kaldırdım.
            // Eğer analizlerin tekrar yüklenmesi gerekiyorsa (örneğin tıklayınca açılan analizler için)
            // o zaman bu mantık farklı olmalıydı, ama mevcut yapıda analizler başta yükleniyor.
        });
    });

    const refreshNewsButton = document.getElementById('refreshNews');
    if (refreshNewsButton) {
        refreshNewsButton.addEventListener('click', () => {
            if (isAnalyzing) return; // Eğer zaten analiz yapılıyorsa tekrar başlatma
            refreshNewsButton.classList.add('refreshing');
            getNews().finally(() => {
                refreshNewsButton.classList.remove('refreshing');
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    getNews();
    // GNews API'sinin hız limitleri olabileceği için sık sık otomatik yenileme yapmamak daha iyi olabilir.
    // Dokümantasyona göre limitler kontrol edilmeli. Şimdilik 15 dakika yapalım.
    setInterval(getNews, 15 * 60 * 1000); 
});

// GEREKSİZ HALE GELEN ESKİ FONKSİYON YORUMLARI
/*
function generateNewsFromData(coinData) { 
    // ...
}

function generateNewsForCoin(coin, count, category) {
    // ...
}

function generateMarketNews(coinData, count) {
    // ...
}

function slugify(text) {
    // ... ID oluşturmada kullanılıyor olabilir ...
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
    // ... ID oluşturmada kullanılıyor. GNews'ten ID gelmiyorsa gerekli. ...
    return Math.floor(Math.random() * 10000000);
}

function generateRandomDate() {
    // ... GNews'ten yayın tarihi geldiği için bu gereksiz ...
}

function generateRandomTime() {
    // ... GNews'ten yayın tarihi geldiği için bu gereksiz ...
}
*/

// OpenRouter API ile haber analizi yap
async function analyzeNewsWithOpenRouter(newsItem) {
    const newsTitleForLog = newsItem && newsItem.title ? newsItem.title : "BAŞLIK BİLGİSİ EKSİK";
    console.log(`[analyzeNewsWithOpenRouter] Fonksiyon başlatıldı. Haber Başlığı: ${newsTitleForLog}`);

    if (!newsItem || typeof newsItem.title === 'undefined') {
        console.error(`[analyzeNewsWithOpenRouter] Geçersiz haber objesi veya başlık alınamadı. Haber objesi: ${JSON.stringify(newsItem)}`);
        return "Haber başlığı analiz için uygun değil.";
    }

    const cryptoAsset = newsItem.category || 'Genel Kripto Piyasası';
    
    // ÖRNEK VERMELİ YENİ PROMPT
    const prompt = `Sen profesyonel bir kripto para analistisin. Görevin, verilen haber başlığını ve ilgili kripto varlığı analiz ederek, belirtilen formatta kısa ve öz bir değerlendirme sunmaktır. Cevabın tamamen profesyonel, teknik, analitik olmalı ve spekülatif veya abartılı yorumlardan kaçınmalısın. Yanıtların kısa, net ve Türkçe olmalı. Kesinlikle format dışına çıkma.

ÖNCELİKLE YATIRIM YAPILABİLİRLİK SKORUNU, ARDINDAN YORUMUNU BELİRT. Skor 0 ile 10 arasında bir tam sayı olmalıdır.

İşte senden beklediğim format ve bir örnek:

Input Örneği:
Haber Başlığı: "Dev Banka, Spot Bitcoin ETF İçin SEC'e Başvurdu"
Kripto Varlık: Bitcoin

Output Örneği (Bu formata birebir uymalısın):
Yatırım Yapılabilirlik Skoru: 8
Yorum: Bu başvuru, Bitcoin'e yönelik kurumsal ilginin arttığını gösteriyor ve düzenleyici onay alırsa piyasaya önemli bir likidite sağlayabilir. Olumlu bir gelişme olarak değerlendirilebilir.

Şimdi senin sıran. Aşağıdaki bilgileri kullanarak aynı formatta bir analiz yap:

Haber Başlığı: "${newsItem.title}"
Kripto Varlık: ${cryptoAsset}

Yanıtın SADECE "Yatırım Yapılabilirlik Skoru:" ve "Yorum:" satırlarını içermelidir.`;

    console.log(`[analyzeNewsWithOpenRouter] Örnekli Yeni Prompt oluşturuldu (${cryptoAsset} - ${newsTitleForLog.substring(0,30)}...): ${prompt}`);
    console.log(`[analyzeNewsWithOpenRouter] API Anahtarı (ilk 5 karakter): ${OPENROUTER_API_KEY ? OPENROUTER_API_KEY.substring(0,5) : "API ANAHTARI TANIMSIZ!"}`);
    console.log(`[analyzeNewsWithOpenRouter] Model: ${OPENROUTER_MODEL}`);

    if (!OPENROUTER_API_KEY) {
        console.error("[analyzeNewsWithOpenRouter] OpenRouter API anahtarı tanımlanmamış!");
        return "API yapılandırma hatası: Anahtar eksik.";
    }

    try {
        console.log("[analyzeNewsWithOpenRouter] Fetch isteği bloğuna girildi. URL: https://openrouter.ai/api/v1/chat/completions");
        
        const requestBody = {
            "model": OPENROUTER_MODEL,
            "messages": [
                { "role": "user", "content": prompt }
            ],
            "max_tokens": 200,
            "temperature": 0.2
        };
        console.log(`[analyzeNewsWithOpenRouter] İstek Body: ${JSON.stringify(requestBody)}`);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://localhost", 
                "X-Title": "Crypto News Analyzer"
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`[analyzeNewsWithOpenRouter] Fetch isteği tamamlandı. Yanıt durumu: ${response.status}. OK?: ${response.ok}`);

        if (!response.ok) {
            let errorDetail = response.statusText;
            let errorResponseData = null;
            try {
                errorResponseData = await response.json(); 
                console.log(`[analyzeNewsWithOpenRouter] API hata yanıtı (JSON): ${JSON.stringify(errorResponseData)}`);
                if (errorResponseData && errorResponseData.error && errorResponseData.error.message) {
                    errorDetail = errorResponseData.error.message;
                } else if (errorResponseData && errorResponseData.message) {
                    errorDetail = errorResponseData.message;
                } else {
                    errorDetail = JSON.stringify(errorResponseData);
                }
            } catch (e) {
                 console.warn(`[analyzeNewsWithOpenRouter] API hata yanıtını JSON olarak işlerken ek hata: ${e.toString()}`);
                 errorDetail = await response.text(); 
                 console.log(`[analyzeNewsWithOpenRouter] API hata yanıtı (text): ${errorDetail}`);
            }
            const errorMessage = `OpenRouter API isteği başarısız: ${response.status} - ${errorDetail || 'Detay yok'}`;
            console.error(`[analyzeNewsWithOpenRouter] OpenRouter API Hatası Oluştu. Fırlatılacak mesaj: ${errorMessage}`);
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log(`[analyzeNewsWithOpenRouter] API yanıtı JSON olarak parse edildi: ${JSON.stringify(data)}`);

        if (data.choices && data.choices.length > 0 && data.choices[0].message && typeof data.choices[0].message.content === 'string') {
            const analysisResult = data.choices[0].message.content.trim();
            console.log(`[analyzeNewsWithOpenRouter] Başarılı analiz alındı (${cryptoAsset} - ${newsTitleForLog.substring(0,30)}...): ${analysisResult}`);
            return analysisResult;
        } else {
            console.error(`[analyzeNewsWithOpenRouter] OpenRouter API yanıt formatı beklenmedik veya content string değil. Alınan data: ${JSON.stringify(data)}`);
            const errorMessage = 'OpenRouter API\'den geçerli bir analiz yanıtı alınamadı (yanıt formatı hatalı veya content eksik/string değil).';
            console.log(`[analyzeNewsWithOpenRouter] Hata fırlatılıyor, mesaj: ${errorMessage}`);
            throw new Error(errorMessage);
        }
    } catch (error) {
        // const errorStack = error.stack ? error.stack : "(stack bilgisi yok)"; // Lint hatasına neden oluyor, şimdilik kaldırıldı.
        const errorMessageForCatch = `AI analizi sırasında bir hata oluştu: ${error.message || 'Bilinmeyen bir sorun oluştu.'}`;
        console.error(`[analyzeNewsWithOpenRouter] Genel hata yakalandı (${newsTitleForLog}). Hata: ${error.message}.`); // Sadece mesajı logla
        console.log(`[analyzeNewsWithOpenRouter] Catch bloğundan hata mesajı döndürülüyor: ${errorMessageForCatch}`);
        return errorMessageForCatch;
    }
    
    console.error("[analyzeNewsWithOpenRouter] BEKLENMEDİK DURUM: Fonksiyonun sonuna ulaşıldı, bu olmamalı!");
    return "Analiz fonksiyonunda beklenmedik bir sonlanma.";
}

// Analiz elementini oluştur
function createAnalysisElement() {
    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'news-analysis';
    
    analysisDiv.innerHTML = `
        <div class="analysis-header">
            <h4><i class="fas fa-robot"></i> AI Analizi</h4>
            <button class="close-analysis"><i class="fas fa-times"></i></button>
        </div>
        <div class="analysis-content">
            <div class="analysis-loading">
                <i class="fas fa-spinner fa-spin"></i> Analiz yapılıyor...
            </div>
            <div class="analysis-result"></div>
        </div>
    `;
    // Başlangıçta gizli olsun, tıklanınca gösterilsin
    analysisDiv.style.display = 'none'; 
    return analysisDiv;
}


// Tüm haberleri analiz eden yeni fonksiyon (Arka Plan için)
async function fetchAllAnalysesInBackground() {
    console.log("Arka plan analizleri başlatılıyor...");
    isAnalyzing = true; // Genel analiz süreci başladı olarak işaretle
    const allNewsCopy = [...allNews]; // Orijinal diziyi değiştirmemek için kopyasını al
    pendingAnalyses = allNewsCopy.filter(item => {
        const analysisEntry = newsAnalyses.get(item.generatedNewsId);
        return !analysisEntry || analysisEntry.status === 'pending';
    }).length;
    updateAnalysisStatus(); // İlk durumu göster (kaç analiz beklendiği)

    const analysisPromises = allNewsCopy.map(async (newsItem) => {
        const newsId = newsItem.generatedNewsId;
        let currentEntry = newsAnalyses.get(newsId);

        // Eğer analiz zaten yüklenmiş, yükleniyor veya hatalıysa bu haber için tekrar çekme
        if (currentEntry && (currentEntry.status === 'loaded' || currentEntry.status === 'loading' || currentEntry.status === 'error')) {
            if (currentEntry.status === 'pending') pendingAnalyses--; // Eğer pending ise sayacı düşür.
            return; // Bu haberi atla
        }
        
        // Eğer bu haber için fetch zaten aktifse (kullanıcı tıkladığı için), arka plan isteği atlamalı
        if(activeFetches.has(newsId)) {
            console.log(`fetchAllAnalysesInBackground: ${newsId} için kullanıcı tarafından analiz başlatılmış, arka plan isteği atlanıyor.`);
            if (currentEntry && currentEntry.status === 'pending') pendingAnalyses--;
            return;
        }

        try {
            if (currentEntry) { // pending ise
                newsAnalyses.set(newsId, { ...currentEntry, status: 'loading' });
            } else { // newsAnalyses'de hiç yoksa (olmamalı ama önlem)
                newsAnalyses.set(newsId, { status: 'loading', analysisText: null, category: newsItem.category });
            }
            
            const analysisText = await analyzeNewsWithOpenRouter(newsItem);
            newsAnalyses.set(newsId, { status: 'loaded', analysisText, category: newsItem.category });
            if (pendingAnalyses > 0) pendingAnalyses--; 
        } catch (error) {
            console.error(`Arka plan analiz hatası (${newsItem.title}):`, error);
            const errorMessage = error.message || "AI analizi sırasında bir hata oluştu.";
            newsAnalyses.set(newsId, { status: 'error', analysisText: errorMessage, category: newsItem.category });
            if (pendingAnalyses > 0) pendingAnalyses--;
        }
        updateAnalysisStatus(); // Her bir analiz sonrası durumu güncelle
    });

    try {
        await Promise.allSettled(analysisPromises);
        console.log("Tüm arka plan analiz denemeleri tamamlandı.");
    } catch (error) {
        console.error("fetchAllAnalysesInBackground Promise.allSettled hatası:", error);
    } finally {
        isAnalyzing = false;
        pendingAnalyses = 0; // Tüm işlemler bitti, bekleyen yok
        updateAnalysisStatus(); // Son durumu (tamamlandı) göster
        // Tüm analizler çekildikten sonra genel bölümleri güncelle
        updateSentimentAnalysisSection();
        updateInvestmentScores();
        console.log("newsAnalyses durumu:", newsAnalyses);
    }
}

// Analiz durumu mesajını güncelleyen yeni fonksiyon
function updateAnalysisStatus() {
    const analysisStatusElement = document.getElementById('analysisStatus');
    if (analysisStatusElement) {
        if (pendingAnalyses > 0) {
            const completedAnalyses = allNews.length - pendingAnalyses;
            const percentComplete = allNews.length > 0 ? Math.round((completedAnalyses / allNews.length) * 100) : 0;
            analysisStatusElement.innerHTML = `<i class="fas fa-robot"></i> Haberler analiz ediliyor... (${completedAnalyses}/${allNews.length}, %${percentComplete})`;
        } else if (isAnalyzing) { // Analiz devam ediyor ama pendingAnalyses = 0 (yani hepsi bitti)
             analysisStatusElement.innerHTML = `<i class="fas fa-check-circle"></i> Tüm analizler tamamlandı.`;
        } else { // isAnalyzing false ise (getNews bittiğinde)
            // Bu element zaten kaldırılıyor olacak, ama yine de temizleyebiliriz.
            analysisStatusElement.innerHTML = '';
        }
    }
}

// Tüm haber kartlarını analiz sonuçlarıyla güncelleyen yeni fonksiyon
function updateAllNewsCardsWithAnalyses() {
    const newsCards = document.querySelectorAll('.news-card');
    newsCards.forEach(card => {
        const newsId = card.getAttribute('data-news-id'); // Bu ID updateNewsCardWithAnalysis'de set ediliyor.
        const analysisData = newsAnalyses.get(newsId);

        if (analysisData) {
            let analysisElement = card.querySelector('.news-analysis');
            if (!analysisElement) { // Eğer kartta analiz bölümü yoksa oluştur ve ekle
                analysisElement = createAnalysisElement();
                card.appendChild(analysisElement);
            }
            
            const loadingElement = analysisElement.querySelector('.analysis-loading');
            const resultElement = analysisElement.querySelector('.analysis-result');

            loadingElement.style.display = 'none';
            if (analysisData.error) {
                resultElement.innerHTML = `<p style="color:red;">${analysisData.analysis}</p>`;
            } else {
                resultElement.innerHTML = formatAnalysisContent(analysisData.analysis);
            }
            resultElement.style.display = 'block';
            // Analiz bölümü başlangıçta gizli kalsın, createAnalysisElement'te ayarlandı.
            // analysisElement.style.display = 'none'; 
        } else {
            // Eğer bu ID ile bir analiz bulunamazsa, bir sorun var demektir.
            // console.warn(`Analiz bulunamadı: ${newsId}`);
            // İsteğe bağlı olarak, burada da bir "analiz yok" mesajı eklenebilir.
            let analysisElement = card.querySelector('.news-analysis');
            if (!analysisElement) {
                analysisElement = createAnalysisElement();
                card.appendChild(analysisElement);
            }
            const loadingElement = analysisElement.querySelector('.analysis-loading');
            const resultElement = analysisElement.querySelector('.analysis-result');
            loadingElement.style.display = 'none';
            resultElement.textContent = 'Bu haber için AI analizi bulunamadı.';
            resultElement.style.display = 'block';
        }
    });
}


// Analiz içeriğini formatlama
function formatAnalysisContent(content) {
    if (typeof content !== 'string') {
        console.warn("formatAnalysisContent: Geçersiz content parametresi alındı:", content);
        return "<p>Analiz içeriği şu anda mevcut değil veya formatlanamıyor.</p>"; 
    }

    let yorumText = "Yorum: Bilgi bulunamadı.";
    let skorText = "Yatırım Yapılabilirlik Skoru: N/A";

    // Yatırım Yapılabilirlik Skorunu ayrıştır (önce skor gelecek şekilde güncellendi)
    const skorMatch = content.match(/Yatırım Yapılabilirlik Skoru\s*:\s*(\d+)/i);
    if (skorMatch && skorMatch[1]) {
        const score = parseInt(skorMatch[1], 10);
        let color = '#ffaa33'; // Medium (Nötr)
        if (score < 4) color = '#ff4d4d'; // Low (Olumsuz) - 0-3
        else if (score > 6) color = '#33cc33'; // High (Olumlu) - 7-10
        skorText = `<strong>Yatırım Yapılabilirlik Skoru:</strong> <span style="color:${color}; font-weight:bold;">${score.toFixed(0)}</span>`;
    }

    // Yorumu ayrıştır (skordan sonra veya tek başına)
    const yorumMatch = content.match(/Yorum\s*:\s*([\s\S]*)/i); 
    if (yorumMatch && yorumMatch[1]) {
        // Eğer skor da bulunmuşsa, yorum metni skordan sonraki kısım olmalı.
        // Skor bulunamamışsa, tüm metin yorum olabilir.
        let rawYorum = yorumMatch[1].trim();
        // Eğer skor metni yorumun başındaysa (istenmeyen durum ama olabilir), onu temizle
        if (skorMatch && rawYorum.toLowerCase().startsWith(skorMatch[0].toLowerCase())) {
            rawYorum = rawYorum.substring(skorMatch[0].length).trim();
        }
        yorumText = `<strong>Yorum:</strong><br>${rawYorum.replace(/\n/g, '<br>')}`;
    } else if (!skorMatch) { // Ne skor ne de "Yorum:" etiketi varsa, tüm içeriği yorum olarak al
        yorumText = `<strong>Yorum:</strong><br>${content.trim().replace(/\n/g, '<br>')}`;
    }

    // Çıktı sırası: Önce skor, sonra yorum (eğer her ikisi de varsa veya sadece biri varsa ona göre düzenlenir)
    if (skorMatch && yorumMatch) {
        return `${skorText}<br><br>${yorumText}`;
    } else if (skorMatch) {
        return skorText;
    } else if (yorumMatch || content.trim().length > 0) { // Sadece yorum varsa veya etiket yoksa bile içerik varsa
        return yorumText;
    }
    
    return "<p>Analiz içeriği ayrıştırılamadı.</p>"; // Eğer hiçbir şey bulunamazsa
}

// Toplu analiz bölümünü güncelle
function updateSentimentAnalysisSection() {
    const categories = ['BTC', 'ETH', 'BNB']; // Sadece bu coinler için gösterge var
    // MARKET kategorisi için ayrıca bir genel duygu göstergesi eklenebilir istenirse.
    
    categories.forEach(categoryKey => {
        const analysisCard = document.getElementById(`${categoryKey.toLowerCase()}-analysis`); // HTML'deki id (örn: btc-analysis)
        if (analysisCard) {
            const contentElement = analysisCard.querySelector('.sentiment-content');
            if (!contentElement) {
                console.error(`Sentiment content elementi bulunamadı: ${categoryKey}-analysis`);
                return;
            }

            const categoryAnalyses = Array.from(newsAnalyses.values()) // Sadece değerleri al
                .filter(data => data.category === categoryKey && data.analysis && !data.error)
                .map(data => data.analysis);
            
            if (categoryAnalyses.length > 0) {
                // Her bir analizi formatla ve birleştir
                contentElement.innerHTML = categoryAnalyses.map(analysisText => {
                    // formatAnalysisContent zaten HTML string döndürdüğü için doğrudan kullanabiliriz.
                    return `<div class="single-sentiment-item">${formatAnalysisContent(analysisText)}</div>`;
                }).join('<hr class="sentiment-divider">');
            } else {
                contentElement.innerHTML = '<p>Bu kategori için henüz AI analizi bulunmuyor veya analiz sırasında hata oluştu.</p>';
            }
        } else {
            // console.warn(`${categoryKey.toLowerCase()}-analysis ID'li element bulunamadı.`);
        }
    });
    updateInvestmentScores();
}


// Yatırım skorlarını parse etme ve göstergeleri güncelleme
function updateInvestmentScores() {
    const categoryScores = {
        'BTC': [],
        'ETH': [],
        'BNB': []
    };

    newsAnalyses.forEach((data) => { 
        if (data.error || data.status !== 'loaded' || !data.analysisText) return; 

        const category = data.category;
        if (!['BTC', 'ETH', 'BNB'].includes(category)) return;

        // formatAnalysisContent içindeki regex ile tutarlı olmalı
        const scoreRegex = /Yatırım Yapılabilirlik Skoru\s*:\s*(\d+)/i; // Güncellenmiş Regex
        const scoreMatch = data.analysisText.match(scoreRegex);

        if (scoreMatch && scoreMatch[1]) {
            const score = parseInt(scoreMatch[1], 10); // Tam sayı olduğu için parseInt
            if (!isNaN(score) && score >= 0 && score <= 10) {
                categoryScores[category].push(score);
            } else {
                 console.warn(`Geçersiz skor formatı veya değeri: ${scoreMatch[1]} kategori: ${category}. Analiz: ${data.analysisText.substring(0,100)}`);
            }
        } else {
             console.warn(`Yatırım skoru bulunamadı. Kategori: ${category}, Analiz (ilk 100 karakter): ${data.analysisText.substring(0,100)}...`);
        }
    });
    
    Object.keys(categoryScores).forEach(category => {
        const scores = categoryScores[category];
        const meterElement = document.getElementById(`${category.toLowerCase()}-score-meter`); // Ana gösterge elementi
        const scoreValueElement = document.getElementById(`${category.toLowerCase()}-score`); // Skor değerini gösteren span

        if (scores.length > 0) {
            const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            updateScoreMeter(category.toLowerCase(), avgScore);
        } else {
            // Eğer skor yoksa varsayılan değer olarak 5 (nötr) kullan ve mesaj göster
            updateScoreMeter(category.toLowerCase(), 5); 
            if (scoreValueElement) {
                scoreValueElement.textContent = "N/A"; // Skor yoksa N/A göster
            }
             if (meterElement) { // Eğer gösterge elementi varsa, "veri yok" mesajı göster
                const noDataMsg = meterElement.querySelector('.no-score-data');
                if (noDataMsg) noDataMsg.style.display = 'block';

                const pointer = meterElement.querySelector(`#${category.toLowerCase()}-meter-pointer`);
                const fill = meterElement.querySelector(`#${category.toLowerCase()}-meter-fill`);
                if(pointer) pointer.style.display = 'none';
                if(fill) fill.style.display = 'none';
            }
        }
    });
}

// Göstergeyi güncelleme fonksiyonu
function updateScoreMeter(category, score) {
    const roundedScore = Math.round(score * 10) / 10;
    const scoreElement = document.getElementById(`${category}-score`);
    const pointerElement = document.getElementById(`${category}-meter-pointer`);
    const fillElement = document.getElementById(`${category}-meter-fill`);
    const meterElement = document.getElementById(`${category.toLowerCase()}-score-meter`); // Ana gösterge elementi
    const noDataMsg = meterElement ? meterElement.querySelector('.no-score-data') : null;


    if (scoreElement) {
        scoreElement.textContent = roundedScore.toFixed(1); // Her zaman bir ondalık göster
        scoreElement.classList.remove('low-score', 'medium-score', 'high-score', 'no-data-score');
        if (score < 3.5) {
            scoreElement.classList.add('low-score');
            // Renkler CSS üzerinden yönetilmeli, JS ile inline style yerine class eklemek daha iyi.
        } else if (score < 7) {
            scoreElement.classList.add('medium-score');
        } else {
            scoreElement.classList.add('high-score');
        }
    }

    if (pointerElement) {
        pointerElement.style.display = 'block'; // Veri varsa göster
        const percentage = Math.min(100, Math.max(0, (score / 10) * 100)); // %0 ile %100 arasında sınırla
        pointerElement.style.left = `${percentage}%`;
    }

    if (fillElement) {
        fillElement.style.display = 'block'; // Veri varsa göster
        const percentage = Math.min(100, Math.max(0, (score / 10) * 100));
        fillElement.style.width = `${percentage}%`;
        fillElement.className = 'meter-fill'; // Reset classes
        if (score < 3.5) {
            fillElement.classList.add('low-score-fill');
        } else if (score < 7) {
            fillElement.classList.add('medium-score-fill');
        } else {
            fillElement.classList.add('high-score-fill');
        }
    }
    
    if (noDataMsg) { // Veri varsa "veri yok" mesajını gizle
        noDataMsg.style.display = 'none';
    }
}

