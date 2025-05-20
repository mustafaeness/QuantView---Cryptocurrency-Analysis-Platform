Proje Başlığı: Kripto Para Analiz Platformu


Bu proje, GNews API üzerinden güncel kripto para haberlerini (Bitcoin, Ethereum, BNB odaklı) toplayan, bu haberleri OpenRouter API aracılığıyla Mistral yapay zeka modeli ile analiz ederek yorumlayan ve yatırım yapılabilirlik skorları üreten web tabanlı bir araçtır. Kullanıcılara sunulan analizler, haberlerin potansiyel etkilerini anlamalarına yardımcı olmayı amaçlar. Platform, ana bir gösterge paneli (`index.html`) ve detaylı haber analizlerinin sunulduğu bir haber sayfası (`crypto_news_alt.html`) olmak üzere iki ana bölümden oluşur.

Temel Özellikler:
1.  GNews API Entegrasyonu: Bitcoin (BTC), Ethereum (ETH) ve Binance Coin (BNB) için ayrı ayrı ve güncel (son 7 gün) haberlerin çekilmesi. Her kripto para için 10 adet haber hedeflenir.
2.  AI Destekli Haber Analizi: Çekilen haber başlıkları, OpenRouter API üzerinde çalışan Mistral AI modeline gönderilerek, her haber için kısa (2-3 cümlelik) bir yorum ve 0-10 arasında bir yatırım yapılabilirlik skoru elde edilir.
3.  Dinamik Haber Arayüzü (`crypto_news_alt.html`):
    *   Haberler, ilgili kripto para birimine göre (BTC, ETH, BNB) kategorize edilmiş kartlar halinde sunulur.
    *   Her haber kartı; görsel, başlık (orijinal kaynağa bağlantılı), kısa açıklama, kaynak adı ve yayınlanma tarihi bilgilerini içerir.
    *   Kullanıcı bir haber kartına tıkladığında veya haberler arka planda yüklendiğinde, ilgili AI analizi (yorum ve skor) görüntülenir.
    *   Her bir kripto para için ortalama yatırım skorları, kullanıcı dostu göstergeler (metreler) üzerinde sunulur.
    *   Toplu bir duygu analizi bölümünde, farklı kripto paralar için yapılmış AI yorumları bir arada gösterilir.
    *   Kullanıcılar, haberleri kategoriye göre filtreleyebilir ve haber akışını manuel olarak yenileyebilir.
4.  Ana Gösterge Paneli (`index.html`):
    *   Kripto para fiyat grafiklerinin gösterilmesi için bir alan içerir (detaylı işlevsellik `script.js` ile yönetilir).
    *   Teknik analiz, duygu analizi (haberler sayfasına yönlendirme içerir) ve bir trade botu için tasarlanmış modüllere sahiptir.
    *   Sayfanın altında, CoinGecko API'sinden alınan güncel kripto para fiyatları ve 24 saatlik değişim yüzdelerini gösteren kayan bir haber bandı bulunur.

Teknik Mimarisi:
*   Frontend Teknolojileri: HTML5, CSS3, JavaScript (ES6 ve sonrası standartlar). Font Awesome kütüphanesi ikonlar için kullanılmıştır.
*   Harici API'ler:
    *   GNews API: `crypto_news_alt.js` tarafından kripto para haberlerini çekmek için kullanılır. API anahtarı ile kimlik doğrulama gerektirir.
    *   OpenRouter API: `crypto_news_alt.js` tarafından haber analizi için Mistral AI modeline erişmek amacıyla kullanılır. Bearer Token (API Anahtarı) ile kimlik doğrulama gerektirir.
    *   CoinGecko API: `index.html` sayfasındaki kayan haber bandı için kripto para fiyat verilerini sağlamak amacıyla kullanılır.
*   Ana JavaScript Dosyaları ve Rolleri:
    *   `crypto_news_alt.js`: GNews API'den haberlerin alınması, bu haberlerin OpenRouter API kullanılarak analiz edilmesi, analiz sonuçlarının işlenmesi ve `crypto_news_alt.html` sayfasındaki dinamik içeriğin (haber kartları, analiz metinleri, skor göstergeleri vb.) oluşturulmasından sorumludur.
    *   `script.js`: `index.html` sayfasında yer alan fiyat grafikleri, teknik analiz modülü ve trade bot modülünün işlevselliğini yönettiği varsayılmaktadır (içeriği bu analiz kapsamında incelenmemiştir).
*   Veri Akışı (Özet):
    *   Haber Analiz Sayfası (`crypto_news_alt.html`): GNews API -> (Haber Verileri) -> JavaScript (`crypto_news_alt.js`) -> OpenRouter API (Mistral AI) -> (AI Analiz Sonuçları) -> JavaScript (`crypto_news_alt.js`) -> HTML Arayüzü.
    *   Ana Sayfa Haber Bandı (`index.html`): CoinGecko API -> (Fiyat Verileri) -> JavaScript (`index.html` içi) -> HTML Arayüzü.
*   Asenkron İşlemler: API çağrıları ve veri işleme gibi zaman alıcı operasyonlar için `async/await` ve `Promise` tabanlı yapılar yoğun olarak kullanılır.

Kurulum ve Çalıştırma:
1.  Proje dosyalarını (HTML, CSS, JS) bir web sunucusu ortamına yükleyin veya yerel geliştirme için Visual Studio Code "Live Server" gibi bir eklenti kullanarak çalıştırın.
2.  `crypto_news_alt.js` dosyasında tanımlanmış olan `GNEWS_API_KEY` ve `OPENROUTER_API_KEY` sabitlerinin geçerli ve aktif API anahtarlarıyla güncellenmesi gerekmektedir. Bu anahtarlar olmadan haber çekme ve AI analiz özellikleri çalışmayacaktır.
3.  Projenin ana giriş noktası `index.html` dosyasıdır. Detaylı haber analizlerine ve AI yorumlarına ulaşmak için `index.html` üzerindeki "Haberlere Git" butonu kullanılarak `crypto_news_alt.html` sayfasına geçiş yapılabilir.

Katkıda Bulunanlar:
Mustafa Enes Tüzün
Mehmet Akif Cebeci
Mustafa Çetin
Cüneyt Er 