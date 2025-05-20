# ChartView - Kripto Para Analiz Platformu

Bu proje, kripto para birimlerinin fiyat verilerini çekmek, grafiklerini oluşturmak ve teknik analiz yapmak için tasarlanmış bir web uygulamasıdır. Ek olarak, GNews API üzerinden güncel kripto para haberlerini (Bitcoin, Ethereum, BNB odaklı) toplayan, bu haberleri OpenRouter API aracılığıyla Mistral yapay zeka modeli ile analiz ederek yorumlayan ve yatırım yapılabilirlik skorları üreten yeteneklere de sahiptir. Kullanıcılar, farklı zaman dilimlerinde grafikleri görüntüleyebilir, alım-satım sinyalleri alabilir, backtest yapabilir ve yapay zeka destekli haber analizlerinden faydalanabilirler. Platform, ana bir gösterge paneli (`index.html`) ve detaylı haber analizlerinin sunulduğu bir haber sayfası (`crypto_news_alt.html`) olmak üzere iki ana bölümden oluşur.

## Modül Listesi ve Açıklamaları

### Ana Grafik Modülü (`index.html`)
- **CryptoData**: Kripto para birimlerinin fiyat verilerini çeker ve günceller.
- **ChartView**: Grafikleri oluşturur ve kullanıcı etkileşimlerini yönetir.

### SDA Algoritması (`index.html`)
- **TechnicalAnalysis**: Teknik analiz yapar ve alım-satım sinyalleri üretir.

### Trade Bot Modülü (`index.html`)
- **TradeBot**: Alım-satım stratejilerini uygular ve işlemleri yönetir.

### Backtest Modülü (`index.html`)
- **Backtest**: Geçmiş veriler üzerinde stratejileri test eder ve sonuçları gösterir.

### AI Destekli Haber Analizi ve Gündem Takibi (`crypto_news_alt.html`)
-   **GNews API Entegrasyonu**: Bitcoin (BTC), Ethereum (ETH) ve Binance Coin (BNB) için ayrı ayrı ve güncel (son 7 gün) haberlerin çekilmesi. Her kripto para için yaklaşık 10 adet haber hedeflenir.
-   **AI Destekli Haber Yorumlama**: Çekilen haber başlıkları, OpenRouter API üzerinde çalışan Mistral AI modeline gönderilerek, her haber için kısa (2-3 cümlelik) bir yorum ve 0-10 arasında bir yatırım yapılabilirlik skoru elde edilir.
-   **Dinamik Haber Arayüzü**:
    *   Haberler, ilgili kripto para birimine göre (BTC, ETH, BNB) kategorize edilmiş kartlar halinde sunulur.
    *   Her haber kartı; görsel, başlık (orijinal kaynağa bağlantılı), kısa açıklama, kaynak adı ve yayınlanma tarihi bilgilerini içerir.
    *   Kullanıcı bir haber kartına tıkladığında veya haberler arka planda yüklendiğinde, ilgili AI analizi (yorum ve skor) görüntülenir.
    *   Her bir kripto para için ortalama yatırım skorları, kullanıcı dostu göstergeler (metreler) üzerinde sunulur.
    *   Toplu bir duygu analizi bölümünde, farklı kripto paralar için yapılmış AI yorumları bir arada gösterilir.
    *   Kullanıcılar, haberleri kategoriye göre filtreleyebilir ve haber akışını manuel olarak yenileyebilir.

## Geliştirici Notları

### Canvas Ölçekleme Ayarları
- Grafikler, kullanıcı etkileşimlerine göre otomatik olarak ölçeklenir.

### SDA Algoritma Sınırları
- Cutoff box ve signal repainting yoktur.
- Performans optimizasyonları yapılmıştır.

### Genişletilebilir Modül Sistemi
- Modüler JavaScript yapısı ile yeni özellikler eklenebilir.

## Özelleştirme ve Parametreler

### Bot Parametreleri (`index.html` ile ilgili)
- **MinProfit**: Minimum kâr hedefi.
- **MaxStop**: Maksimum zarar durdurma seviyesi.
- **Tolerans**: Sinyal toleransı.

### Zaman Periyodu Seçimi (`index.html` ile ilgili)
- Kullanıcılar farklı zaman dilimlerini seçebilir.

### Sinyal Davranışı (`index.html` ile ilgili)
- **Buy-Sell**: Alım ve satım sinyalleri.
- **TP-SL Tetikleme Mantığı**: Kâr alma ve zarar durdurma seviyeleri.

## Teknik Bilgiler

-   Uygulama tamamen istemci taraflıdır (client-side).
-   **Frontend Teknolojileri**: JavaScript, HTML5, CSS3. Font Awesome kütüphanesi ikonlar için kullanılmıştır.
-   **Harici API Bağımlılığı**:
    *   **GNews API**: `crypto_news_alt.js` tarafından kripto para haberlerini çekmek için kullanılır. API anahtarı ile kimlik doğrulama gerektirir.
    *   **OpenRouter API**: `crypto_news_alt.js` tarafından haber analizi için Mistral AI modeline erişmek amacıyla kullanılır. Bearer Token (API Anahtarı) ile kimlik doğrulama gerektirir.
    *   **CoinGecko API**: `index.html` sayfasındaki kayan haber bandı için kripto para fiyat verilerini sağlamak amacıyla kullanılır.
-   **Ana JavaScript Dosyaları ve Rolleri**:
    *   `crypto_news_alt.js`: GNews API'den haberlerin alınması, bu haberlerin OpenRouter API kullanılarak analiz edilmesi, analiz sonuçlarının işlenmesi ve `crypto_news_alt.html` sayfasındaki dinamik içeriğin (haber kartları, analiz metinleri, skor göstergeleri vb.) oluşturulmasından sorumludur.
    *   `script.js`: `index.html` sayfasında yer alan fiyat grafikleri, teknik analiz modülü ve trade bot modülünün işlevselliğini yönettiği varsayılmaktadır.
-   **Veri Akışı (Özet)**:
    *   Haber Analiz Sayfası (`crypto_news_alt.html`): GNews API -> (Haber Verileri) -> JavaScript (`crypto_news_alt.js`) -> OpenRouter API (Mistral AI) -> (AI Analiz Sonuçları) -> JavaScript (`crypto_news_alt.js`) -> HTML Arayüzü.
    *   Ana Sayfa Haber Bandı (`index.html`): CoinGecko API -> (Fiyat Verileri) -> JavaScript (`index.html` içi) -> HTML Arayüzü.
-   **Asenkron İşlemler**: API çağrıları ve veri işleme gibi zaman alıcı operasyonlar için `async/await` ve `Promise` tabanlı yapılar yoğun olarak kullanılır.


## Kurulum

Uygulamayı yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

### Gereksinimler

- Web tarayıcı (Chrome, Firefox, Safari, vb.)
- Python 3.x (yerel bir HTTP sunucusu başlatmak için önerilir)

### Adımlar

1.  Bu depoyu bilgisayarınıza klonlayın veya ZIP olarak indirin:
    ```bash
    git clone https://github.com/mustafaeness/QuantView---Cryptocurrency-Analysis-Platform.git
    ```
2.  İndirdiğiniz klasöre gidin:
    ```bash
    cd QuantView---Cryptocurrency-Analysis-Platform
    ```
3.  **API Anahtarlarını Ayarlayın:**
    `crypto_news_alt.js` dosyasında tanımlanmış olan `GNEWS_API_KEY` ve `OPENROUTER_API_KEY` sabitlerinin geçerli ve aktif API anahtarlarıyla güncellenmesi gerekmektedir. Bu anahtarlar olmadan GNews tabanlı haber çekme ve AI analiz özellikleri çalışmayacaktır.
4.  Python'un yerleşik HTTP sunucusunu başlatın (önerilen):
    Python 3.x için:
    ```bash
    python -m http.server 34300
    ```
    Eğer Python 2.x kullanıyorsanız:
    ```bash
    python -m SimpleHTTPServer 34300
    ```
5.  Web tarayıcınızı açın ve aşağıdaki adresi ziyaret edin:
    `http://localhost:34300`
    (Alternatif olarak, `index.html` dosyasına çift tıklayarak doğrudan tarayıcıda açabilirsiniz, ancak API anahtarlarının kullanımı ve bazı tarayıcı güvenlik politikaları nedeniyle yerel sunucu üzerinden çalıştırmak daha sorunsuz olabilir.)


## Kullanım

### Ana Sayfa (`index.html`)
Ana sayfada kripto para fiyat grafikleri görüntülenir. Sağ üst köşedeki menüden farklı zaman dilimlerini seçebilirsiniz. Çeşitli analiz ve bot modülleri de bu sayfada yer alır.

### AI Destekli Haberler Sayfası (`crypto_news_alt.html`)
Ana sayfadaki "Haberlere Git" (veya benzeri) bir bağlantı ile `crypto_news_alt.html` sayfasına erişebilirsiniz. Bu sayfada:
1.  Kategoriye göre haber filtreleme: Tüm Haberler, Bitcoin, Ethereum, BNB.
2.  Her haber kartı: Başlık (orijinal haber kaynağına bağlantılı), görsel, kısa açıklama, kaynak adı, yayınlanma tarihi ve AI tarafından üretilmiş yorum ve yatırım skoru (karta tıklandığında veya otomatik olarak yüklenir).
3.  Yatırım Skoru Göstergeleri: Her ana kripto para için AI analizlerinden elde edilen ortalama yatırım skorları.
4.  Toplu Duygu Analizi: Farklı haberler için üretilmiş AI yorumlarının bir arada sunulduğu bölüm.
5.  "Habere Git" bağlantısı ile ilgili haberin orijinal kaynağına ulaşabilirsiniz.


## Hata Giderme

-   **AI Analizleri veya GNews Haberleri Yüklenmiyor:**
    *   İnternet bağlantınızı kontrol edin.
    *   `crypto_news_alt.js` dosyasındaki `GNEWS_API_KEY` ve `OPENROUTER_API_KEY` değerlerinin doğru ve aktif olduğundan emin olun.
    *   Tarayıcınızın geliştirici konsolunda (genellikle F12 ile açılır) hata mesajlarını kontrol edin.
-   **Grafik Görüntülenmiyor (`index.html`):** Tarayıcınızı yenileyin veya JavaScript'in tarayıcınızda etkin olduğundan emin olun.
-   **Sunucu Başlatma Hatası (Python ile):** Port 34300 başka bir uygulama tarafından kullanılıyor olabilir. Python komutunu farklı bir port ile çalıştırın (örneğin, `python -m http.server 9000`) ve tarayıcıda `http://localhost:9000` adresini ziyaret edin.


1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b ozellik/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: Açıklama'`)
4. Branch'inizi push edin (`git push origin ozellik/yeni-ozellik`)
5. Bir Pull Request oluşturun

## Katkıda Bulunanlar
Mustafa Enes Tüzün
Mehmet Akif Cebeci
Mustafa Çetin
Cüneyt Er