# ChartView - Kripto Para Analiz Platformu

ChartView, kripto para birimlerinin fiyat grafiklerini görüntüleyen ve analiz eden basit bir web uygulamasıdır. TradingView benzeri bir arayüz sunarak, kullanıcıların kripto para piyasasını takip etmelerini sağlar.

## Özellikler

- Kripto para fiyat grafikleri
- Farklı zaman dilimlerinde görüntüleme (1s, 4s, 1g, 1h, 1a)
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
python -m http.server 8000
```

Eğer Python 2.x kullanıyorsanız:
```bash
python -m SimpleHTTPServer 8000
```

4. Web tarayıcınızı açın ve aşağıdaki adresi ziyaret edin:

```
http://localhost:8000
```

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
- **Sunucu Başlatma Hatası:** Port 8000 başka bir uygulama tarafından kullanılıyor olabilir. Python komutunu farklı bir port ile çalıştırın:

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