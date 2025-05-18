# ChartView - Kripto Para Analiz Platformu

Bu proje, kripto para birimlerinin fiyat verilerini çekmek, grafiklerini oluşturmak ve teknik analiz yapmak için tasarlanmış bir web uygulamasıdır. Kullanıcılar, farklı zaman dilimlerinde grafikleri görüntüleyebilir, alım-satım sinyalleri alabilir ve backtest yapabilirler.

## Modül Listesi ve Açıklamaları

### Ana Grafik Modülü
- **CryptoData**: Kripto para birimlerinin fiyat verilerini çeker ve günceller.
- **ChartView**: Grafikleri oluşturur ve kullanıcı etkileşimlerini yönetir.

### SDA Algoritması
- **TechnicalAnalysis**: Teknik analiz yapar ve alım-satım sinyalleri üretir.

### Trade Bot Modülü
- **TradeBot**: Alım-satım stratejilerini uygular ve işlemleri yönetir.

### Backtest Modülü
- **Backtest**: Geçmiş veriler üzerinde stratejileri test eder ve sonuçları gösterir.

## Geliştirici Notları

### Canvas Ölçekleme Ayarları
- Grafikler, kullanıcı etkileşimlerine göre otomatik olarak ölçeklenir.

### SDA Algoritma Sınırları
- Cutoff box ve signal repainting yoktur.
- Performans optimizasyonları yapılmıştır.

### Genişletilebilir Modül Sistemi
- Modüler JavaScript yapısı ile yeni özellikler eklenebilir.

## Özelleştirme ve Parametreler

### Bot Parametreleri
- **MinProfit**: Minimum kâr hedefi.
- **MaxStop**: Maksimum zarar durdurma seviyesi.
- **Tolerans**: Sinyal toleransı.

### Zaman Periyodu Seçimi
- Kullanıcılar farklı zaman dilimlerini seçebilir.

### Sinyal Davranışı
- **Buy-Sell**: Alım ve satım sinyalleri.
- **TP-SL Tetikleme Mantığı**: Kâr alma ve zarar durdurma seviyeleri.

## Haberler

- Kripto para haberleri (API key gerektirmeden)
- Dört ana kategori altında haberler:
  - Bitcoin
  - Ethereum
  - BNB
  - Genel Piyasa
- Güvenilir haber kaynaklarına doğrudan bağlantılar

## Kurulum

Uygulamayı yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

### Gereksiniimler

- Web tarayıcı (Chrome, Firefox, Safari, vb.)
- Python 3.x (yerel bir HTTP sunucusu başlatmak için)

### Adımlar

1. Bu repoyu bilgisayarınıza klonlayın veya ZIP olarak indirin:

```bash
git clone https://github.com/kullaniciadi/chartview.git
```

2. İndirdiğiniz klasöre gidin:

```bash
cd chartview
```

3. Python'un yerleşik HTTP sunucusunu başlatın:

Python 3.x için:
```bash
python -m http.server 34300
```

Eğer Python 2.x kullanıyorsanız:
```bash
python -m SimpleHTTPServer 34300
```

4. Web tarayıcınızı açın ve aşağıdaki adresi ziyaret edin:
http://localhost:34300

## Kullanım

### Ana Sayfa

Ana sayfada kripto para fiyat grafikleri görüntülenir. Sağ üst köşedeki menüden farklı zaman dilimlerini seçebilirsiniz.

### Haberler Sayfası

Ana sayfada "Haberler" bağlantısına tıklayarak kripto para haberlerine erişebilirsiniz. Haberler sayfasında:

1. Kategoriye göre haber filtreleme:
   - Tüm Haberler
   - Bitcoin
   - Ethereum
   - BNB
   - Piyasa

2. Her haber kartı:
   - Başlık
   - Kaynak
   - Yayınlanma tarihi
   - İlgili kripto para bilgisi içerir

3. "Habere Git" bağlantısı ile ilgili haberin detaylarına ulaşabilirsiniz.

4. "Ana Sayfaya Dön" butonu ile grafik görünümüne geri dönebilirsiniz.

## Teknik Bilgiler

- Uygulama tamamen istemci taraflıdır (client-side)
- JavaScript, HTML ve CSS kullanılarak geliştirilmiştir
- Harici API bağımlılığı:
  - CoinGecko API (haber verileri için)

## Hata Giderme

- **Haberler Yüklenmiyor:** İnternet bağlantınızı kontrol edin veya CoinGecko API'nin erişilebilir olduğundan emin olun.
- **Grafik Görüntülenmiyor:** Tarayıcınızı yenileyin veya JavaScript'in tarayıcınızda etkin olduğundan emin olun.
- **Sunucu Başlatma Hatası:** Port 34300 başka bir uygulama tarafından kullanılıyor olabilir. Python komutunu farklı bir port ile çalıştırın:

```bash
python -m http.server 9000
```

Ardından `http://localhost:9000` adresini ziyaret edin.

## Katkıda Bulunma

Bu proje geliştirmeye açıktır. Katkıda bulunmak için:

1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b ozellik/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: Açıklama'`)
4. Branch'inizi push edin (`git push origin ozellik/yeni-ozellik`)
5. Bir Pull Request oluşturun

## Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.