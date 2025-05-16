class CryptoData {
    constructor() {
        this.symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
        this.data = {};
        this.candlestickData = [];
        this.updateInterval = 5000; // 5 seconds
        this.selectedSymbol = 'BTCUSDT';
        this.selectedPeriod = '4h'; // Default period
    }

    async fetchTickerData() {
        for (const symbol of this.symbols) {
            try {
                const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
                const data = await response.json();
                this.data[symbol] = {
                    price: parseFloat(data.lastPrice),
                    change: parseFloat(data.priceChangePercent),
                    high: parseFloat(data.highPrice),
                    low: parseFloat(data.lowPrice),
                    volume: parseFloat(data.volume)
                };
            } catch (error) {
                console.error(`Error fetching ticker data for ${symbol}:`, error);
            }
        }
        this.updateTicker();
    }

    async fetchCandlestickData() {
        try {
            // Binance API maksimum 1500 mum verisi dönebilir
            const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${this.selectedSymbol}&interval=${this.selectedPeriod}&limit=1500`);
            const data = await response.json();
            
            this.candlestickData = data.map(item => ({
                x: parseInt(item[0]), // timestamp
                open: parseFloat(item[1]),
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4]),
                volume: parseFloat(item[5])
            }));

            // Grafik verilerini güncelle
            if (window.chartView) {
                window.chartView.updateData(this.candlestickData);
                
                // Make sure axes are updated after data loading
                if (this.candlestickData.length > 0) {
                    window.chartView.updatePriceAxis();
                    window.chartView.updateTimeAxis();
                }
            }
        } catch (error) {
            console.error(`Error fetching candlestick data for ${this.selectedSymbol} with period ${this.selectedPeriod}:`, error);
        }
    }

    updateTicker() {
        const ticker = document.getElementById('ticker');
        ticker.innerHTML = '';
        
        this.symbols.forEach(symbol => {
            const data = this.data[symbol];
            if (!data) return;

            const tickerItem = document.createElement('div');
            tickerItem.className = 'ticker-item';
            tickerItem.style.cursor = 'pointer';
            tickerItem.onclick = () => this.selectSymbol(symbol);
            
            const symbolSpan = document.createElement('span');
            symbolSpan.textContent = symbol.replace('USDT', '');
            if (symbol === this.selectedSymbol) {
                symbolSpan.style.color = '#00FF00';
            }
            
            const priceSpan = document.createElement('span');
            priceSpan.className = 'price';
            priceSpan.textContent = `$${data.price.toFixed(2)}`;
            
            const changeSpan = document.createElement('span');
            changeSpan.className = `change ${data.change >= 0 ? 'positive' : 'negative'}`;
            changeSpan.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%`;
            
            tickerItem.appendChild(symbolSpan);
            tickerItem.appendChild(priceSpan);
            tickerItem.appendChild(changeSpan);
            ticker.appendChild(tickerItem);
        });
    }

    selectSymbol(symbol) {
        this.selectedSymbol = symbol;
        this.fetchCandlestickData();
        this.updateTicker();
    }

    selectPeriod(period) {
        this.selectedPeriod = period;
        // Periyot değiştiğinde görünür aralığı sıfırla
        if (window.chartView) {
            window.chartView.visibleRange = { start: 0, end: 0 };
        }
        this.fetchCandlestickData();
        this.updatePeriodSelect();
    }

    updatePeriodSelect() {
        const select = document.getElementById('periodSelect');
        select.value = this.selectedPeriod;
    }

    startUpdates() {
        this.fetchTickerData();
        this.fetchCandlestickData();
        this.initPeriodSelector();
        setInterval(() => this.fetchTickerData(), this.updateInterval);
        setInterval(() => this.fetchCandlestickData(), this.updateInterval);
    }

    initPeriodSelector() {
        const select = document.getElementById('periodSelect');
        select.value = this.selectedPeriod; // Default değeri ayarla
        
        select.addEventListener('change', () => {
            this.selectPeriod(select.value);
        });
    }
}

class ChartView {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.data = [];
        this.zoomLevel = 1;
        this.offsetX = 0; // Grafiğin x eksenindeki kaydırma pozisyonu
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastDeltaX = 0; // Son fare hareket yönü ve hızı için
        this.priceRange = { min: 0, max: 0 };
        this.timeRange = { start: 0, end: 0 };
        this.visibleRange = { start: 0, end: 0 }; // Görünür veri aralığı
        this.targetVisibleRange = { start: 0, end: 0 }; // Animasyon hedefi için
        this.isAnimating = false; // Animasyon durumu
        this.hoveredCandle = null; // Fare imlecinin üzerinde durduğu mum
        
        // Çizim araçları
        this.drawingMode = null; // 'line', 'rectangle', 'fibonacci', null
        this.currentDrawing = null; // Mevcut çizim
        this.drawings = []; // Kaydedilen çizimler
        this.isDrawing = false;
        
        // Axis elements
        this.priceAxisElement = document.getElementById('priceAxis');
        this.timeAxisElement = document.getElementById('timeAxis');
        
        // Set initial content for axes to avoid blank appearance
        if (this.priceAxisElement) {
            const loadingLabel = document.createElement('div');
            loadingLabel.className = 'price-label';
            loadingLabel.textContent = 'Loading...';
            loadingLabel.style.position = 'absolute';
            loadingLabel.style.top = '50%';
            loadingLabel.style.right = '5px';
            this.priceAxisElement.appendChild(loadingLabel);
        }
        
        if (this.timeAxisElement) {
            const loadingLabel = document.createElement('div');
            loadingLabel.className = 'time-label';
            loadingLabel.textContent = 'Loading...';
            loadingLabel.style.position = 'absolute';
            loadingLabel.style.bottom = '2px';
            loadingLabel.style.left = '50%';
            loadingLabel.style.transform = 'translateX(-50%)';
            this.timeAxisElement.appendChild(loadingLabel);
        }
        
        // Çizim araçları butonu ekle
        this.createDrawingTools();
        
        // Tooltip elementi
        this.tooltipElement = this.createTooltipElement();
        
        this.resizeCanvas();
        this.initEvents();
        this.renderLoop();
        
        // Pencere boyutu değiştiğinde grafiği yeniden ölçeklendir
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Teknik analiz modülünü başlat
        this.technicalAnalysis = new TechnicalAnalysis(this);
    }

    resizeCanvas() {
        // Grafik konteynerinin boyutunu al
        const container = document.getElementById('chartContainer');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight || 600; // Minimum 600px yükseklik
        
        // Canvas boyutunu konteynere göre ayarla
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Axis'leri güncelle
        this.updatePriceAxis();
        this.updateTimeAxis();
    }

    initEvents() {
        // Fare tekerleği ile yakınlaştırma/uzaklaştırma
        this.canvas.addEventListener('wheel', this.handleZoom.bind(this));
        
        // Fare olayları
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // İmleç grafikten çıktığında tüm fare etkileşimlerini temizle
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Dokunmatik ekran desteği
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    // Dokunmatik olayları
    handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            // Tek parmak dokunma - kaydırma
            this.isPanning = true;
            this.lastMouseX = event.touches[0].clientX;
        } else if (event.touches.length === 2) {
            // İki parmak dokunma - yakınlaştırma/uzaklaştırma
            this.isPanning = false; // İki parmakla kaydırma devre dışı
            this.pinchStartDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            this.startZoomLevel = this.zoomLevel;
            
            // Başlangıç görünür aralığını kaydet
            this.startVisibleWidth = this.visibleRange.end - this.visibleRange.start;
            
            // Pinch merkezi
            const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = centerX - rect.left;
            this.pinchCenterTime = this.pixelToDataX(canvasX);
        }
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        if (this.isPanning && event.touches.length === 1) {
            // Tek parmak kaydırma
            const currentX = event.touches[0].clientX;
            const deltaX = currentX - this.lastMouseX;
            this.lastDeltaX = deltaX;
            
            // Hız faktörü - dokunmatik daha hassas olmalı
            const speedFactor = 2.0;
            
            const visibleWidth = this.visibleRange.end - this.visibleRange.start;
            const pixelsPerTime = this.canvas.width / visibleWidth;
            
            // DÜZELTME: 
            // Sağa sürükleme (deltaX > 0) daha eski verilere gitmeli
            // Sola sürükleme (deltaX < 0) daha yeni verilere gitmeli
            // Eksi işareti koyuyoruz ki:
            // Kullanıcı sağa sürüklediğinde (deltaX > 0) -> grafikte daha eski verilere git (sola)
            // Kullanıcı sola sürüklediğinde (deltaX < 0) -> grafikte daha yeni verilere git (sağa)
            const timeShift = -(deltaX / pixelsPerTime) * speedFactor;
            
            let newStart = this.visibleRange.start + timeShift;
            let newEnd = this.visibleRange.end + timeShift;
            
            // Görünür aralığın sınırlar içinde kalmasını sağla
            if (newStart < this.timeRange.start) {
                const diff = this.timeRange.start - newStart;
                newStart += diff;
                newEnd += diff;
            } else if (newEnd > this.timeRange.end) {
                const diff = newEnd - this.timeRange.end;
                newStart -= diff;
                newEnd -= diff;
            }
            
            // Anında güncelleme
            this.visibleRange.start = newStart;
            this.visibleRange.end = newEnd;
            
            // Son pozisyonu güncelle
            this.lastMouseX = currentX;
            this.lastMoveTime = performance.now();
            
            // Axis'leri güncelle
            this.updatePriceAxis();
            this.updateTimeAxis();
        } else if (event.touches.length === 2) {
            // İki parmak yakınlaştırma/uzaklaştırma
            // Mevcut mesafeyi hesapla
            const currentDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            
            // Pinch merkezi
            const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = centerX - rect.left;
            
            // Ölçek değişimini hesapla
            const scale = this.pinchStartDistance / currentDistance;
            
            // Minimum ve maksimum zoom sınırlamalarıyla yeni görünür genişliği hesapla
            const timeRange = this.timeRange.end - this.timeRange.start;
            const newVisibleWidth = Math.min(
                Math.max(this.startVisibleWidth * scale, timeRange * 0.01), // Minimum %1
                timeRange // Maksimum tüm veri
            );
            
            // Pinch merkezine göre yeni başlangıç ve bitiş zamanlarını hesapla
            const pinchCenterRatio = (this.pinchCenterTime - this.visibleRange.start) / 
                                     (this.visibleRange.end - this.visibleRange.start);
            
            let newStart = this.pinchCenterTime - (pinchCenterRatio * newVisibleWidth);
            let newEnd = newStart + newVisibleWidth;
            
            // Sınırlar içinde kalmasını sağla
            if (newStart < this.timeRange.start) {
                newStart = this.timeRange.start;
                newEnd = newStart + newVisibleWidth;
            } else if (newEnd > this.timeRange.end) {
                newEnd = this.timeRange.end;
                newStart = newEnd - newVisibleWidth;
            }
            
            // Animasyonsuz direk güncelleme
            this.visibleRange.start = newStart;
            this.visibleRange.end = newEnd;
            this.zoomLevel = timeRange / newVisibleWidth;
            
            // Axis'leri güncelle
            this.updatePriceAxis();
            this.updateTimeAxis();
        }
    }
    
    handleTouchEnd(event) {
        event.preventDefault();
        
        // Eğer kaydırma işlemi varsa, atalet (inertia) efekti ekle
        if (this.isPanning) {
            this.isPanning = false;
            
            // İnertia efekti - sürükle bırak sonrası hafif bir animasyon
            if (this.lastDeltaX && Math.abs(this.lastDeltaX) > 5) {
                const visibleWidth = this.visibleRange.end - this.visibleRange.start;
                const pixelsPerTime = this.canvas.width / visibleWidth;
                
                // DÜZELTME:
                // Sağa sürükleme (lastDeltaX > 0) daha eski verilere gitmeli
                // Sola sürükleme (lastDeltaX < 0) daha yeni verilere gitmeli
                const timeShift = -(this.lastDeltaX * 0.8) / pixelsPerTime;
                
                let newStart = this.visibleRange.start + timeShift;
                let newEnd = this.visibleRange.end + timeShift;
                
                // Sınırları kontrol et
                if (newStart < this.timeRange.start) {
                    const diff = this.timeRange.start - newStart;
                    newStart += diff;
                    newEnd += diff;
                } else if (newEnd > this.timeRange.end) {
                    const diff = newEnd - this.timeRange.end;
                    newStart -= diff;
                    newEnd -= diff;
                }
                
                // Animasyonlu geçiş - dokunmatik için daha uzun animasyon süresi
                this.animateVisibleRange(newStart, newEnd, 400);
            }
            
            this.lastDeltaX = 0;
        }
    }
    
    handleMouseDown(event) {
        if (this.drawingMode) {
            // Çizim başlat
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Piksel konumunu veri değerine dönüştür
            const time = this.pixelToDataX(x);
            const price = this.pixelToDataY(y);
            
            this.isDrawing = true;
            this.isPanning = false; // Çizim yaparken kaydırmayı engelle
            
            this.currentDrawing = {
                type: this.drawingMode,
                startTime: time,
                startPrice: price,
                endTime: time,
                endPrice: price
            };
            
            // Fibonacci için özel değerler
            if (this.drawingMode === 'fibonacci') {
                this.currentDrawing.levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
            }
        } else {
            // Kaydırma işlemini başlat
            this.startPan(event);
        }
        
        event.preventDefault();
    }

    handleMouseMove(event) {
        if (this.data.length === 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Fare grafik alanının dışındaysa işlemi durdur
        if (x < 0 || x > this.canvas.width || y < 0 || y > this.canvas.height) {
            // Canvas dışında, ama hala panning devam ediyorsa (mouse down durumunda)
            if (this.isPanning) {
                this.doPan(event);
            } else if (this.isDrawing) {
                // Çizim devam ediyorsa, çizime devam et
                const time = this.pixelToDataX(Math.max(0, Math.min(x, this.canvas.width)));
                const price = this.pixelToDataY(Math.max(0, Math.min(y, this.canvas.height)));
                
                if (this.currentDrawing) {
                    this.currentDrawing.endTime = time;
                    this.currentDrawing.endPrice = price;
                }
            } else {
                // Tooltip ve crosshair'i gizle
                this.hideTooltip();
                this.crosshairX = null;
                this.crosshairY = null;
                this.hoveredCandle = null;
            }
            return;
        }
        
        // Fare pozisyonunu kaydet
        this.lastMouseX = x;
        this.lastMouseY = y;
        
        // Çizim yapılıyorsa güncelle
        if (this.isDrawing && this.currentDrawing) {
            // Çizim için piksel konumunu veri değerine dönüştür
            const time = this.pixelToDataX(x);
            const price = this.pixelToDataY(y);
            
            this.currentDrawing.endTime = time;
            this.currentDrawing.endPrice = price;
        } else if (this.isPanning) {
            // Kaydırma işlemi
            this.doPan(event);
        } else {
            // Y koordinatından fiyatı hesapla
            const height = this.canvas.height;
            const priceRange = this.priceRange.max - this.priceRange.min;
            const price = this.priceRange.max - (y / height * priceRange);
            
            // Crosshair çiz
            this.crosshairX = x;
            this.crosshairY = y;
            this.crosshairPrice = price;
            
            // Fare pozisyonuna en yakın mumu bul
            this.findHoveredCandle(x);
            
            // Mum üzerindeyse tooltip göster
            if (this.hoveredCandle) {
                this.showTooltip(event.clientX, event.clientY, this.hoveredCandle);
            } else {
                this.hideTooltip();
            }
        }
    }

    handleMouseUp(event) {
        if (this.isDrawing && this.currentDrawing) {
            // Çizimi tamamla
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Son konum
            const time = this.pixelToDataX(x);
            const price = this.pixelToDataY(y);
            
            this.currentDrawing.endTime = time;
            this.currentDrawing.endPrice = price;
            
            // Çizimi kaydet
            this.drawings.push(this.currentDrawing);
            this.currentDrawing = null;
            this.isDrawing = false;
        } else {
            // Kaydırma işlemini bitir
            this.endPan();
        }
    }

    handleZoom(event) {
        event.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const zoomCenterTime = this.pixelToDataX(mouseX);
        const oldVisibleWidth = this.visibleRange.end - this.visibleRange.start;

        // Daha hassas zoom
        const zoomSpeed = 0.2;
        const zoomFactor = 1 + (event.deltaY > 0 ? zoomSpeed : -zoomSpeed);
        const newVisibleWidth = oldVisibleWidth * zoomFactor;

        const timeRange = this.timeRange.end - this.timeRange.start;
        const minWidth = timeRange * 0.01;
        const maxWidth = timeRange;

        const finalWidth = Math.min(Math.max(minWidth, newVisibleWidth), maxWidth);

        const mouseRatio = (zoomCenterTime - this.visibleRange.start) / oldVisibleWidth;
        const newStart = zoomCenterTime - mouseRatio * finalWidth;
        const newEnd = newStart + finalWidth;

        this.visibleRange.start = Math.max(this.timeRange.start, newStart);
        this.visibleRange.end = Math.min(this.timeRange.end, newEnd);
        this.zoomLevel = timeRange / finalWidth;

        this.updatePriceAxis();
        this.updateTimeAxis();
    }
    
    // Veri koordinatından piksel koordinatına dönüştürme
    dataToPixelX(dataX) {
        const visibleWidth = this.visibleRange.end - this.visibleRange.start;
        // Görünür alan dışındaki verileri de doğru şekilde konumlandır
        if (dataX < this.visibleRange.start) {
            const distanceFromStart = this.visibleRange.start - dataX;
            return -((distanceFromStart / visibleWidth) * this.canvas.width);
        } else if (dataX > this.visibleRange.end) {
            const distanceFromEnd = dataX - this.visibleRange.end;
            return this.canvas.width + ((distanceFromEnd / visibleWidth) * this.canvas.width);
        }
        // Normal durum - görünür alan içindeki veri
        return ((dataX - this.visibleRange.start) / visibleWidth) * this.canvas.width;
    }
    
    // Piksel koordinatından veri koordinatına dönüştürme
    pixelToDataX(pixelX) {
        const visibleWidth = this.visibleRange.end - this.visibleRange.start;
        // Görünür alan dışındaki pikselleri de doğru şekilde hesapla
        if (pixelX < 0) {
            return this.visibleRange.start + ((pixelX / this.canvas.width) * visibleWidth);
        } else if (pixelX > this.canvas.width) {
            return this.visibleRange.end + (((pixelX - this.canvas.width) / this.canvas.width) * visibleWidth);
        }
        // Normal durum - görünür alan içindeki piksel
        return this.visibleRange.start + (pixelX / this.canvas.width) * visibleWidth;
    }

    // Pikselden veri Y koordinatına dönüşüm (piksel -> fiyat)
    pixelToDataY(pixelY) {
        const height = this.canvas.height * 0.75; // Güncellendi - mum grafiği yüksekliği
        const priceRange = this.priceRange.max - this.priceRange.min;
        return this.priceRange.max - (pixelY / height * priceRange);
    }
    
    // Veri Y koordinatından piksele dönüşüm (fiyat -> piksel)
    dataToPixelY(price) {
        const height = this.canvas.height * 0.75; // Güncellendi
        const priceRange = this.priceRange.max - this.priceRange.min;
        return height - ((price - this.priceRange.min) / priceRange * height);
    }

    startPan(event) {
        this.isPanning = true;
        this.lastMouseX = event.clientX;
        this.canvas.style.cursor = 'grabbing';
        event.preventDefault();
    }

    doPan(event) {
        if (!this.isPanning) return;

        const deltaX = event.clientX - this.lastMouseX;
        this.lastMouseX = event.clientX;
        this.lastDeltaX = deltaX;

        const visibleWidth = this.visibleRange.end - this.visibleRange.start;
        
        // DÜZELTME: Sağa sürükleme (deltaX > 0) daha eski verilere gitmeli
        // Sola sürükleme (deltaX < 0) daha yeni verilere gitmeli
        // Burada '-' işareti koyuyoruz çünkü grafikte sağ=yeni, sol=eski
        const timeShift = -deltaX * visibleWidth / this.canvas.width;

        let newStart = this.visibleRange.start + timeShift;
        let newEnd = this.visibleRange.end + timeShift;

        // Sınır kontrolü
        if (newStart < this.timeRange.start) {
            newEnd += this.timeRange.start - newStart;
            newStart = this.timeRange.start;
        }
        if (newEnd > this.timeRange.end) {
            newStart -= newEnd - this.timeRange.end;
            newEnd = this.timeRange.end;
        }

        this.visibleRange.start = newStart;
        this.visibleRange.end = newEnd;

        this.updatePriceAxis();
        this.updateTimeAxis();

        event.preventDefault();
    }

    endPan() {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
            
            // İnertia efekti - sürükle bırak sonrası hafif bir animasyon
            if (this.lastDeltaX && Math.abs(this.lastDeltaX) > 5) {
                const visibleWidth = this.visibleRange.end - this.visibleRange.start;
                const pixelsPerTime = this.canvas.width / visibleWidth;
                
                // DÜZELTME:
                // Sağa sürükleme (lastDeltaX > 0) daha eski verilere gitmeli
                // Sola sürükleme (lastDeltaX < 0) daha yeni verilere gitmeli
                const timeShift = -(this.lastDeltaX * 0.5) / pixelsPerTime;
                
                let newStart = this.visibleRange.start + timeShift;
                let newEnd = this.visibleRange.end + timeShift;
                
                // Sınırları kontrol et
                if (newStart < this.timeRange.start) {
                    const diff = this.timeRange.start - newStart;
                    newStart += diff;
                    newEnd += diff;
                } else if (newEnd > this.timeRange.end) {
                    const diff = newEnd - this.timeRange.end;
                    newStart -= diff;
                    newEnd -= diff;
                }
                
                // Animasyonlu geçiş
                this.animateVisibleRange(newStart, newEnd, 300);
            }
            
            this.lastDeltaX = 0;
        }
    }
    
    // Görünür veri aralığını güncelle
    updateVisibleRange() {
        const timeRange = this.timeRange.end - this.timeRange.start;
        const visibleWidth = timeRange / this.zoomLevel;
        
        // offsetX'i kullanarak görünür başlangıç zamanını hesapla
        this.visibleRange.start = this.timeRange.start + (this.offsetX / this.canvas.width) * visibleWidth;
        this.visibleRange.end = this.visibleRange.start + visibleWidth;
        
        // Axis'leri güncelle
        this.updatePriceAxis();
        this.updateTimeAxis();
    }

    updateData(newData) {
        this.data = newData;
        
        // Only proceed if we actually have data
        if (this.data.length === 0) return;
        
        this.calculateRanges();
        
        // İlk kez veri yüklendiğinde veya periyot değiştiğinde görünür aralığı ayarla
        if (this.visibleRange.start === 0 && this.visibleRange.end === 0) {
            // Son 100 mumu göster
            const targetCandleCount = 100;
            
            // Eğer veri 100 mumdan azsa, tüm verileri göster
            const visibleCandles = Math.min(targetCandleCount, this.data.length);
            
            // Son mumun indeksi
            const lastCandleIndex = this.data.length - 1;
            
            // Görünür aralığın başlangıç indeksi
            const startIndex = Math.max(0, lastCandleIndex - visibleCandles + 1);
            
            // Görünür aralığın başlangıç ve bitiş zamanları
            this.visibleRange.start = this.data[startIndex].x;
            this.visibleRange.end = this.data[lastCandleIndex].x;
            
            // Sağ kenardan boşluk bırakmak için görünür aralığı genişlet
            const timeRange = this.visibleRange.end - this.visibleRange.start;
            const rightPadding = timeRange * 0.3; // %30 boşluk
            this.visibleRange.end += rightPadding;
            
            // Zoom seviyesini ayarla
            this.zoomLevel = (this.timeRange.end - this.timeRange.start) / 
                            (this.visibleRange.end - this.visibleRange.start);
            
            // Make sure to update axes explicitly after setting visible range
            this.updatePriceAxis();
            this.updateTimeAxis();
        }
    }

    calculateRanges() {
        if (this.data.length === 0) return;

        // Fiyat aralığını hesapla
        this.priceRange.min = Math.min(...this.data.map(candle => candle.low));
        this.priceRange.max = Math.max(...this.data.map(candle => candle.high));

        // Zaman aralığını hesapla
        this.timeRange.start = this.data[0].x;
        this.timeRange.end = this.data[this.data.length - 1].x;

        // Fiyat aralığına padding ekle - daha az padding ile mumlar daha belirgin görünür
        const pricePadding = (this.priceRange.max - this.priceRange.min) * 0.02; // Önceki değer: 0.05
        this.priceRange.min -= pricePadding;
        this.priceRange.max += pricePadding;
    }

    updatePriceAxis() {
        if (!this.data || this.data.length === 0 || !this.priceAxisElement) return;
        
        // Fiyat eksenini temizle
        this.priceAxisElement.innerHTML = '';
        
        const height = this.canvas.height;
        
        // Sadece ekranda görünen mumlar (buffer yok)
        const visibleData = this.data.filter(d => d.x >= this.visibleRange.start && d.x <= this.visibleRange.end);
        if (visibleData.length === 0) return;
        
        // Fiyat aralığını görünür mumlara göre hesapla
        const min = Math.min(...visibleData.map(candle => candle.low));
        const max = Math.max(...visibleData.map(candle => candle.high));
        const pricePadding = (max - min) * 0.02;
        const priceRangeMin = min - pricePadding;
        const priceRangeMax = max + pricePadding;
        const priceRange = priceRangeMax - priceRangeMin;
        
        // TradingView'deki gibi dinamik fiyat adımları
        const priceStep = this.calculatePriceStep(priceRange);
        const firstStep = Math.ceil(priceRangeMin / priceStep) * priceStep;
        
        // Fiyat çizgileri ve etiketleri oluştur
        for (let price = firstStep; price <= priceRangeMax; price += priceStep) {
            const y = height - ((price - priceRangeMin) / priceRange * height);
            
            // Çizgi
            const priceLine = document.createElement('div');
            priceLine.className = 'price-line';
            priceLine.style.top = `${y}px`;
            this.priceAxisElement.appendChild(priceLine);
            
            // Etiket
            const priceLabel = document.createElement('div');
            priceLabel.className = 'price-label';
            priceLabel.textContent = price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            priceLabel.style.position = 'absolute';
            priceLabel.style.top = `${y - 10}px`;
            this.priceAxisElement.appendChild(priceLabel);
        }
    }
    
    calculatePriceStep(priceRange) {
        // Daha akıllı bir adım hesaplama
        // 1. Bitcoin gibi yüksek değerli kriptolar için
        // 2. Daha düşük değerli kriptolar için farklı adım hesapla
        
        // Fiyat aralığını kontrol et ve uygun bölücü sayısını belirle
        let divisions;
        if (this.priceRange.min > 10000) {
            // Bitcoin gibi yüksek değerli kriptolar
            divisions = 20; // Daha fazla bölme
        } else if (this.priceRange.min > 1000) {
            // Orta değerli kriptolar
            divisions = 15;
        } else if (this.priceRange.min > 100) {
            // Düşük değerli kriptolar
            divisions = 12;
        } else {
            // Çok düşük değerli kriptolar
            divisions = 10;
        }
        
        // Adım boyutunu hesapla
        let rawStep = priceRange / divisions;
        
        // "Güzel" adım değerleri seç: 1, 2, 5, 10, 20, 50, 100, 200, 500, ...
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const normalizedStep = rawStep / magnitude;
        
        let step;
        if (normalizedStep < 1.2) step = 1;
        else if (normalizedStep < 2.5) step = 2;
        else if (normalizedStep < 7) step = 5;
        else step = 10;
        
        return step * magnitude;
    }

    updateTimeAxis() {
        if (!this.data || this.data.length === 0 || !this.timeAxisElement) return;
        
        // Zaman eksenini temizle
        this.timeAxisElement.innerHTML = '';
        
        const width = this.canvas.width;
        
        // Guard against invalid visible range
        if (this.visibleRange.end <= this.visibleRange.start) return;
        
        // Görünür süreye göre zaman adımı seç
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;
        const timeStep = this.calculateTimeStep(visibleDuration);
        
        // İlk görünür zaman adımını bul
        const firstTimeStep = Math.ceil(this.visibleRange.start / timeStep) * timeStep;
        
        // Tüm görünür zaman adımları için etiketler ve çizgiler oluştur
        for (let time = firstTimeStep; time <= this.visibleRange.end; time += timeStep) {
            const x = this.dataToPixelX(time);
            
            if (x >= 0 && x <= width) {
                // Çizgi
                const timeLine = document.createElement('div');
                timeLine.className = 'time-line';
                timeLine.style.left = `${x}px`;
                this.timeAxisElement.appendChild(timeLine);
                
                // Etiket
                const timeLabel = document.createElement('div');
                timeLabel.className = 'time-label';
                const date = new Date(time);
                timeLabel.textContent = this.formatDate(date, timeStep);
                timeLabel.style.position = 'absolute';
                timeLabel.style.left = `${x}px`;
                timeLabel.style.transform = 'translateX(-50%)';  // Yatay ortalama
                timeLabel.style.bottom = '2px';
                this.timeAxisElement.appendChild(timeLabel);
            }
        }
    }
    
    calculateTimeStep(visibleDuration) {
        // Görünür süreye göre uygun zaman adımı seç
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        
        if (visibleDuration < 2 * hour) return 15 * minute;  // 15 dakika
        if (visibleDuration < 8 * hour) return hour;         // 1 saat
        if (visibleDuration < 3 * day) return 6 * hour;      // 6 saat
        if (visibleDuration < 10 * day) return day;          // 1 gün
        if (visibleDuration < 30 * day) return 7 * day;      // 1 hafta
        return 30 * day;                                     // 1 ay
    }
    
    formatDate(date, timeStep) {
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        
        if (timeStep < hour) {
            return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        } else if (timeStep < day) {
            return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        } else {
            return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
        }
    }

    drawChart() {
        this.clear();

        if (this.data.length === 0) return;

        // Sadece ekranda görünen mumlar (buffer yok)
        const visibleData = this.data.filter(d => d.x >= this.visibleRange.start && d.x <= this.visibleRange.end);
        if (visibleData.length === 0) return;

        // Fiyat aralığını sadece ekranda görünen mumlara göre ayarla
        this.priceRange.min = Math.min(...visibleData.map(candle => candle.low));
        this.priceRange.max = Math.max(...visibleData.map(candle => candle.high));
        const pricePadding = (this.priceRange.max - this.priceRange.min) * 0.02;
        this.priceRange.min -= pricePadding;
        this.priceRange.max += pricePadding;

        // Performans için buffer'lı veri (sadece çizim için, min/max için değil)
        const bufferRatio = 0.5;
        const bufferWidth = (this.visibleRange.end - this.visibleRange.start) * bufferRatio;
        const bufferedData = this.data.filter(d => 
            d.x >= this.visibleRange.start - bufferWidth && 
            d.x <= this.visibleRange.end + bufferWidth
        );
        if (bufferedData.length === 0) return;

        // Önce grid (arka plan) çiz
        this.drawGrid();
        
        // Tüm çizimleri göster
        this.drawAllDrawings();
        
        // Mevcut çizimi göster
        if (this.isDrawing && this.currentDrawing) {
            this.drawCurrentDrawing();
        }
        
        // Daha sonra ön plan öğeleri
        this.drawCandlesticks(visibleData);
        this.drawVolumeChart(visibleData);
        
        // Crosshair'i graf dönüşümlerinden bağımsız çiz
        if (this.crosshairX && this.crosshairY) {
            this.drawCrosshairLines(this.crosshairX, this.crosshairY, this.crosshairPrice);
        }
        
        // Hover efekti - seçili mumu vurgula
        if (this.hoveredCandle) {
            this.highlightCandle(this.hoveredCandle);
        }
    }

    drawGrid() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.save();
        this.ctx.lineWidth = 0.5;
        this.ctx.strokeStyle = 'rgba(42, 46, 57, 0.5)'; // TradingView grid rengi

        // Yatay çizgiler (Fiyat)
        const priceRange = this.priceRange.max - this.priceRange.min;
        const priceStep = this.calculatePriceStep(priceRange);
        const firstStep = Math.ceil(this.priceRange.min / priceStep) * priceStep;
        
        for (let price = firstStep; price <= this.priceRange.max; price += priceStep) {
            const y = height - ((price - this.priceRange.min) / priceRange * height);
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Dikey çizgiler (Zaman)
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;
        const timeStep = this.calculateTimeStep(visibleDuration);
        
        // İlk görünür zaman adımını bul
        const firstTimeStep = Math.ceil(this.visibleRange.start / timeStep) * timeStep;
        
        for (let time = firstTimeStep; time <= this.visibleRange.end; time += timeStep) {
            const x = this.dataToPixelX(time);
            
            if (x >= 0 && x <= width) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, height);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    drawCandlesticks(visibleData) {
        const width = this.canvas.width;
        const height = this.canvas.height * 0.75; // Arttırıldı - daha fazla dikey alan (önceki değer: 0.7)
        const priceRange = this.priceRange.max - this.priceRange.min;
        
        if (visibleData.length === 0) return;
        
        // Mum genişliğini dinamik olarak ayarla - daha kalın mumlar için minimum genişliği artır
        const barWidth = Math.min(
            width / visibleData.length * 0.8, 
            25 // Maksimum mum genişliğini artır (15 yerine 25)
        );
        
        // Minimum mum genişliğini 3px olarak ayarla
        const finalBarWidth = Math.max(barWidth, 3);
        
        // Son mumun fiyatını göster
        if (this.data.length > 0) {
            const lastCandle = this.data[this.data.length - 1];
            const lastPrice = lastCandle.close;
            const lastPriceY = height - ((lastPrice - this.priceRange.min) / priceRange * height);

            // Fiyat çizgisi
            this.ctx.strokeStyle = 'rgba(240, 240, 240, 0.5)'; // Daha açık bir renk
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(0, lastPriceY);
            this.ctx.lineTo(width, lastPriceY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Fiyat etiketi
            const text = lastPrice.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            });
            this.ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell';
            const textWidth = this.ctx.measureText(text).width;
            const boxWidth = textWidth + 20;
            const boxHeight = 30;
            
            // Son fiyat göstergesini sağ kenara konumlandır
            const boxX = width - boxWidth - 10;
            const boxY = lastPriceY - boxHeight / 2;

            // Arka plan kutusu
            this.ctx.fillStyle = '#151924'; // TradingView arka plan rengi
            this.ctx.strokeStyle = '#2a2e39'; // TradingView kenar rengi
            this.ctx.lineWidth = 1;
            this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            // Fiyat etiketi
            const priceColor = lastCandle.close >= lastCandle.open ? '#26a69a' : '#ef5350'; // TradingView renkleri
            this.ctx.fillStyle = priceColor;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, boxX + boxWidth / 2, boxY + boxHeight / 2);
        }

        // Mumları çiz
        visibleData.forEach(candle => {
            const x = this.dataToPixelX(candle.x);
            const openY = height - ((candle.open - this.priceRange.min) / priceRange * height);
            const closeY = height - ((candle.close - this.priceRange.min) / priceRange * height);
            const highY = height - ((candle.high - this.priceRange.min) / priceRange * height);
            const lowY = height - ((candle.low - this.priceRange.min) / priceRange * height);

            // TradingView renkleri
            const color = candle.close >= candle.open ? '#26a69a' : '#ef5350';

            this.ctx.strokeStyle = color;
            this.ctx.beginPath();
            this.ctx.moveTo(x, highY);
            this.ctx.lineTo(x, lowY);
            this.ctx.stroke();

            this.ctx.fillStyle = color;
            const bodyHeight = Math.max(1, Math.abs(openY - closeY));
            this.ctx.fillRect(x - finalBarWidth/2, Math.min(openY, closeY), finalBarWidth, bodyHeight);
        });
    }
    
    drawVolumeChart(visibleData) {
        if (visibleData.length === 0) return;
        
        const width = this.canvas.width;
        const totalHeight = this.canvas.height;
        const volumeHeight = totalHeight * 0.15; // Azaltıldı - grafiğin alt %15'i (önceki: %20)
        const volumeTop = totalHeight * 0.85; // Güncellendi - önceki: 0.8
        
        // Maksimum volume değerini bul
        const maxVolume = Math.max(...visibleData.map(candle => candle.volume));
        
        // Bar genişliğini hesapla - daha kalın volume barları için minimum genişliği artır
        const barWidth = Math.min(
            width / visibleData.length * 0.8,
            25 // Maksimum volume bar genişliğini artır (15 yerine 25)
        );
        
        // Minimum volume bar genişliğini 3px olarak ayarla
        const finalBarWidth = Math.max(barWidth, 3);
        
        // Volume bar'larını çiz
        visibleData.forEach(candle => {
            const x = this.dataToPixelX(candle.x);
            const volumeRatio = candle.volume / maxVolume;
            const barHeight = volumeHeight * volumeRatio;
            
            const color = candle.close >= candle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'; // TradingView renkleri
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x - finalBarWidth/2, volumeTop + (volumeHeight - barHeight), finalBarWidth, barHeight);
        });
    }
    
    drawCrosshairLines(x, y, price) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.save();
        this.ctx.setLineDash([2, 2]);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 0.5;
        
        // Yatay çizgi
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
        
        // Dikey çizgi
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, height);
        this.ctx.stroke();
        
        // Fiyat etiketi
        this.ctx.fillStyle = '#1e1e1e';
        this.ctx.fillRect(0, y - 10, 80, 20);
        this.ctx.strokeRect(0, y - 10, 80, 20);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`$${price.toFixed(2)}`, 5, y);
        
        this.ctx.restore();
    }

    clear() {
        // Temizleme işleminin piksel boyutlarını tam olarak belirle
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);
    }

    renderLoop() {
        if (!this.rafControl) {
            this.rafControl = {
                lastFrameTime: 0,
                minFrameInterval: 1000 / 60, // Maksimum 60 FPS
                pending: false
            };
        }
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.rafControl.lastFrameTime;
        
        // Animasyon varsa veya yeterli süre geçtiyse yeniden çiz
        if (!this.rafControl.pending && 
            (this.animationFrame || elapsed >= this.rafControl.minFrameInterval)) {
            
            this.rafControl.pending = true;
            this.rafControl.lastFrameTime = currentTime;
            
            requestAnimationFrame(() => {
                this.drawChart();
                this.rafControl.pending = false;
            });
        }
        
        // Bir sonraki frame için hazırlan
        requestAnimationFrame(() => this.renderLoop());
    }

    // Yeni animasyon fonksiyonu
    animateVisibleRange(targetStart, targetEnd, duration = 300) {
        // Cancel any existing animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Store animation target
        this.targetVisibleRange = { start: targetStart, end: targetEnd };
        const startTime = performance.now();
        const startRange = { start: this.visibleRange.start, end: this.visibleRange.end };
        
        // Sınırlara ulaşıldığında efekti ayarla
        const isAtStartBoundary = targetStart <= this.timeRange.start + 1; // küçük tolerans
        const isAtEndBoundary = targetEnd >= this.timeRange.end - 1; // küçük tolerans
        
        // Sınırlardaysa daha uzun süre ile daha yumuşak dur
        let finalDuration = duration;
        if (isAtStartBoundary || isAtEndBoundary) {
            finalDuration = duration * 1.5; // Sınırda daha yavaş dur
        }
        
        // Calculate total distance for adaptive duration
        const distance = Math.max(
            Math.abs(targetStart - startRange.start),
            Math.abs(targetEnd - startRange.end)
        );
        
        // Adjust duration based on distance (faster for small changes)
        const adaptiveDuration = Math.min(
            Math.max(distance / 10000 * finalDuration, 100), // Minimum 100ms
            finalDuration // Maximum is our possibly extended duration
        );
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / adaptiveDuration, 1);
            
            // Daha gelişmiş easing fonksiyonu
            let easedProgress;
            
            if (isAtStartBoundary || isAtEndBoundary) {
                // Sınırlara yaklaşırken daha yumuşak bir easing kullan
                // easeOutQuint - daha yavaş yavaşlama
                easedProgress = 1 - Math.pow(1 - progress, 5);
            } else {
                // Normal easing - easeOutCubic
                easedProgress = 1 - Math.pow(1 - progress, 3);
            }
            
            // Update visible range
            this.visibleRange.start = startRange.start + (this.targetVisibleRange.start - startRange.start) * easedProgress;
            this.visibleRange.end = startRange.end + (this.targetVisibleRange.end - startRange.end) * easedProgress;
            
            // Update axes during animation for smooth experience
            this.updatePriceAxis();
            this.updateTimeAxis();
            
            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                // Ensure we end exactly at the target values
                this.visibleRange.start = this.targetVisibleRange.start;
                this.visibleRange.end = this.targetVisibleRange.end;
                this.updatePriceAxis();
                this.updateTimeAxis();
                this.animationFrame = null;
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    // Fare pozisyonunun üzerinde olduğu mumu bul
    findHoveredCandle(mouseX) {
        if (this.data.length === 0) {
            this.hoveredCandle = null;
            return;
        }
        
        // Görünen verileri filtrele
        const visibleData = this.data.filter(d => 
            d.x >= this.visibleRange.start && d.x <= this.visibleRange.end
        );
        
        if (visibleData.length === 0) {
            this.hoveredCandle = null;
            return;
        }
        
        // Fare pozisyonundan X koordinatındaki zamanı bul
        const mouseTime = this.pixelToDataX(mouseX);
        
        // En yakın mumu bul
        let closestCandle = null;
        let minTimeDiff = Infinity;
        
        // Görünür veriler içinde en yakın mumu bul
        for (const candle of visibleData) {
            const timeDiff = Math.abs(candle.x - mouseTime);
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestCandle = candle;
            }
        }
        
        // Mumlar arası mesafeyi tahmin et
        const visibleWidth = this.visibleRange.end - this.visibleRange.start;
        const estimatedCandleWidth = visibleWidth / visibleData.length;
        
        // Eğer fare muma yeterince yakınsa seç
        if (minTimeDiff < estimatedCandleWidth / 2) {
            this.hoveredCandle = closestCandle;
        } else {
            this.hoveredCandle = null;
        }
    }
    
    // Tooltip göster
    showTooltip(clientX, clientY, candle) {
        // Tooltip içeriğini güncelle
        const date = new Date(candle.x);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Fiyat formatı (2 ondalık)
        const formatPrice = (price) => price.toFixed(2);
        
        // Renkler
        const changeColor = candle.close >= candle.open ? '#26a69a' : '#ef5350';
        
        // HTML içeriği oluştur - TradingView benzeri düzen
        this.tooltipElement.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; background-color: rgba(30, 34, 45, 0.9); padding: 4px 8px;">
                ${formattedDate}
            </div>
            <div style="display: grid; grid-template-columns: auto auto; gap: 4px 12px; padding: 4px 8px;">
                <div style="font-weight: bold;">Open:</div><div style="text-align: right; color: ${changeColor};">${formatPrice(candle.open)}</div>
                <div style="font-weight: bold;">High:</div><div style="text-align: right; color: ${changeColor};">${formatPrice(candle.high)}</div>
                <div style="font-weight: bold;">Low:</div><div style="text-align: right; color: ${changeColor};">${formatPrice(candle.low)}</div>
                <div style="font-weight: bold;">Close:</div><div style="text-align: right; color: ${changeColor};">${formatPrice(candle.close)}</div>
                <div style="font-weight: bold;">Volume:</div><div style="text-align: right;">${candle.volume.toLocaleString()}</div>
            </div>
        `;
        
        // Tooltip pozisyonunu ayarla
        this.tooltipElement.style.display = 'block';
        
        // Fare pozisyonuna göre tooltip pozisyonunu ayarla
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        let left = clientX + 15; // Farenin sağına
        let top = clientY - tooltipRect.height / 2; // Farenin ortasına hizala
        
        // Pencere kenarları dışına taşmasını önle
        if (left + tooltipRect.width > window.innerWidth) {
            left = clientX - tooltipRect.width - 15; // Farenin soluna
        }
        if (top < 0) top = 0;
        if (top + tooltipRect.height > window.innerHeight) {
            top = window.innerHeight - tooltipRect.height;
        }
        
        this.tooltipElement.style.left = `${left}px`;
        this.tooltipElement.style.top = `${top}px`;
    }
    
    // Tooltip gizle
    hideTooltip() {
        this.tooltipElement.style.display = 'none';
    }

    // Seçili mumu vurgulama
    highlightCandle(candle) {
        const x = this.dataToPixelX(candle.x);
        const height = this.canvas.height * 0.75;
        const priceRange = this.priceRange.max - this.priceRange.min;
        
        const openY = height - ((candle.open - this.priceRange.min) / priceRange * height);
        const closeY = height - ((candle.close - this.priceRange.min) / priceRange * height);
        const highY = height - ((candle.high - this.priceRange.min) / priceRange * height);
        const lowY = height - ((candle.low - this.priceRange.min) / priceRange * height);
        
        // Mum genişliğini hesapla
        const visibleData = this.data.filter(d => 
            d.x >= this.visibleRange.start && d.x <= this.visibleRange.end
        );
        
        const barWidth = Math.min(
            this.canvas.width / visibleData.length * 0.8, 
            25
        );
        const finalBarWidth = Math.max(barWidth, 3);
        
        // Vurgulama efekti
        this.ctx.save();
        
        // Renk, mumun yönüne göre
        const color = candle.close >= candle.open ? '#26a69a' : '#ef5350';
        
        // Yuvarlak vurgulama kaldırıldı, bunun yerine sadece mumu daha kalın çiz
        
        // Mumu tekrar çiz (daha kalın çizgilerle)
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2.5; // Wickleri daha kalın yap
        this.ctx.beginPath();
        this.ctx.moveTo(x, highY);
        this.ctx.lineTo(x, lowY);
        this.ctx.stroke();
        
        // Mum gövdesini daha belirgin çiz
        this.ctx.fillStyle = color;
        const bodyHeight = Math.max(1, Math.abs(openY - closeY));
        
        // Mum gövdesini biraz daha geniş çiz
        const bodyWidth = finalBarWidth * 1.2; // %20 daha geniş
        this.ctx.fillRect(x - bodyWidth/2, Math.min(openY, closeY), bodyWidth, bodyHeight);
        
        // Mum gövdesinin kenarlarını çiz
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - bodyWidth/2, Math.min(openY, closeY), bodyWidth, bodyHeight);
        
        this.ctx.restore();
    }

    // OHLC tooltip elementi oluştur
    createTooltipElement() {
        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.display = 'none';
        tooltip.style.backgroundColor = 'rgba(28, 32, 48, 0.9)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '0'; // Padding kaldırıldı, içerik kısmında padding uygulanacak
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.fontFamily = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell';
        tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.5)';
        tooltip.style.zIndex = '1000';
        tooltip.style.pointerEvents = 'none'; // Tooltipın fare olaylarını engellememesi için
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.border = '1px solid rgba(80, 80, 80, 0.5)';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    // Çizim araçları butonlarını oluştur
    createDrawingTools() {
        // Çizim araçları container
        const toolsContainer = document.createElement('div');
        toolsContainer.className = 'drawing-tools';
        toolsContainer.style.position = 'absolute';
        toolsContainer.style.left = '5px';
        toolsContainer.style.top = '5px';
        toolsContainer.style.background = 'rgba(28, 32, 48, 0.8)';
        toolsContainer.style.borderRadius = '5px';
        toolsContainer.style.padding = '5px';
        toolsContainer.style.display = 'flex';
        toolsContainer.style.flexDirection = 'column';
        toolsContainer.style.gap = '5px';
        toolsContainer.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.3)';
        toolsContainer.style.zIndex = '10';
        
        // Çizim araçları
        const tools = [
            { id: 'line', icon: '📉', tooltip: 'Çizgi' },
            { id: 'rectangle', icon: '⬜', tooltip: 'Dikdörtgen' },
            { id: 'fibonacci', icon: '🔄', tooltip: 'Fibonacci' },
            { id: 'ruler', icon: '📏', tooltip: 'Cetvel' },
            { id: 'clear', icon: '🗑️', tooltip: 'Temizle' }
        ];
        
        tools.forEach(tool => {
            const button = document.createElement('button');
            button.className = 'drawing-tool';
            button.textContent = tool.icon;
            button.title = tool.tooltip;
            button.style.width = '36px';
            button.style.height = '36px';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.border = 'none';
            button.style.borderRadius = '3px';
            button.style.background = 'transparent';
            button.style.color = '#fff';
            button.style.fontSize = '18px';
            button.style.cursor = 'pointer';
            button.style.transition = 'background 0.2s';
            
            // Hover efekti
            button.addEventListener('mouseover', () => {
                button.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            
            button.addEventListener('mouseout', () => {
                if (this.drawingMode !== tool.id) {
                    button.style.background = 'transparent';
                }
            });
            
            // Tıklama
            button.addEventListener('click', () => {
                if (tool.id === 'clear') {
                    // Tüm çizimleri temizle
                    this.drawings = [];
                    return;
                }
                
                // Aktif/pasif durumunu değiştir
                if (this.drawingMode === tool.id) {
                    this.drawingMode = null;
                    button.style.background = 'transparent';
                } else {
                    // Diğer butonları pasif yap
                    document.querySelectorAll('.drawing-tool').forEach(btn => {
                        btn.style.background = 'transparent';
                    });
                    
                    this.drawingMode = tool.id;
                    button.style.background = 'rgba(59, 130, 246, 0.3)';
                }
            });
            
            toolsContainer.appendChild(button);
        });
        
        // Çizim araçlarını grafik konteynerine ekle
        const chartContainer = document.getElementById('chartContainer');
        chartContainer.style.position = 'relative';
        chartContainer.appendChild(toolsContainer);
    }

    // Tüm çizimleri göster
    drawAllDrawings() {
        if (this.drawings.length === 0) return;
        
        for (const drawing of this.drawings) {
            this.drawSingleDrawing(drawing);
        }
    }
    
    // Mevcut çizimi göster
    drawCurrentDrawing() {
        if (!this.currentDrawing) return;
        
        this.drawSingleDrawing(this.currentDrawing);
    }
    
    // Tek bir çizimi göster
    drawSingleDrawing(drawing) {
        if (!drawing) return;
        
        this.ctx.save();
        
        if (drawing.type === 'sellSignal' || drawing.type === 'buySignal') {
            // Sinyal çizimi
            const x = this.dataToPixelX(drawing.time);
            let y = this.dataToPixelY(drawing.price);
            
            // Mum boyutunu hesapla
            const visibleData = this.data.filter(d => 
                d.x >= this.visibleRange.start && d.x <= this.visibleRange.end
            );
            const barWidth = Math.min(
                this.canvas.width / visibleData.length * 0.8, 
                25
            );
            const finalBarWidth = Math.max(barWidth, 3);
            
            // Ok boyutları - mum genişliğiyle aynı
            const arrowWidth = finalBarWidth;
            const arrowHeight = finalBarWidth;
            const arrowOffset = 18; // Okun mumdan ayrılması için piksel miktarı
            
            // Okun mumdan ayrılması için y koordinatını ayarla
            if (drawing.type === 'sellSignal') {
                y -= arrowOffset; // high'ın üstüne taşır
            } else {
                y += arrowOffset; // low'un altına taşır
            }
            
            this.ctx.fillStyle = drawing.color;
            this.ctx.beginPath();
            
            if (drawing.type === 'sellSignal') {
                // Aşağı ok (SAT sinyali) - ▼
                this.ctx.moveTo(x, y + arrowHeight); // Okun ucu (altta)
                this.ctx.lineTo(x - arrowWidth/2, y); // Sol üst
                this.ctx.lineTo(x + arrowWidth/2, y); // Sağ üst
            } else {
                // Yukarı ok (AL sinyali) - ▲
                this.ctx.moveTo(x, y - arrowHeight); // Okun ucu (üstte)
                this.ctx.lineTo(x - arrowWidth/2, y); // Sol alt
                this.ctx.lineTo(x + arrowWidth/2, y); // Sağ alt
            }
            
            this.ctx.closePath();
            this.ctx.fill();
            
            // Ok kenarlarını çiz - daha belirgin görünüm için
            this.ctx.strokeStyle = drawing.color;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            
            this.ctx.restore();
            return;
        }
        
        // Diğer çizimler için mevcut kod
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1.5;
        
        const startX = this.dataToPixelX(drawing.startTime);
        const startY = this.dataToPixelY(drawing.startPrice);
        const endX = this.dataToPixelX(drawing.endTime);
        const endY = this.dataToPixelY(drawing.endPrice);
        
        switch (drawing.type) {
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                break;
                
            case 'rectangle':
                this.ctx.beginPath();
                this.ctx.strokeStyle = drawing.color || '#3b82f6';
                this.ctx.strokeRect(
                    Math.min(startX, endX),
                    Math.min(startY, endY),
                    Math.abs(endX - startX),
                    Math.abs(endY - startY)
                );
                this.ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                this.ctx.fillRect(
                    Math.min(startX, endX),
                    Math.min(startY, endY),
                    Math.abs(endX - startX),
                    Math.abs(endY - startY)
                );
                break;
                
            case 'fibonacci':
                // Fibonacci çiz
                const width = this.canvas.width;
                const height = this.canvas.height * 0.7; // Mum grafiği yüksekliği
                
                // Ana çizgi
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                
                // Fiyat değişimi
                const priceDiff = drawing.startPrice - drawing.endPrice;
                
                // Fibonacci seviyeleri
                const levels = drawing.levels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
                const colors = [
                    'rgba(255, 215, 0, 0.7)',   // Gold (1.0)
                    'rgba(59, 130, 246, 0.7)',  // Blue (0.786)
                    'rgba(154, 205, 50, 0.7)',  // YellowGreen (0.618)
                    'rgba(255, 99, 71, 0.7)',   // Tomato (0.5)
                    'rgba(138, 43, 226, 0.7)',  // BlueViolet (0.382)
                    'rgba(0, 206, 209, 0.7)',   // Turquoise (0.236)
                    'rgba(255, 215, 0, 0.7)'    // Gold (0.0)
                ];
                
                // Min/Max X değerleri - grafiğin genişliğinde yatay çizgiler
                const minX = 0;
                const maxX = width;
                
                for (let i = 0; i < levels.length; i++) {
                    const level = levels[i];
                    const price = drawing.endPrice + (priceDiff * level);
                    const y = this.dataToPixelY(price);
                    
                    // Seviye çizgisi
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = colors[i];
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.moveTo(minX, y);
                    this.ctx.lineTo(maxX, y);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                    
                    // Seviye etiketi
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '10px sans-serif';
                    this.ctx.textAlign = 'left';
                    this.ctx.fillText(`${(level * 100).toFixed(1)}% - $${price.toFixed(2)}`, 5, y - 3);
                }
                break;

            case 'ruler':
                // Cetvel çizimi
                const isUpward = startY > endY;
                const color = isUpward ? '#26a69a' : '#ef5350'; // Yeşil veya kırmızı
                
                // Dikdörtgen çiz
                this.ctx.fillStyle = `${color}33`; // Yarı saydam renk
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 1;
                
                const rectX = Math.min(startX, endX);
                const rectY = Math.min(startY, endY);
                const rectWidth = Math.abs(endX - startX);
                const rectHeight = Math.abs(endY - startY);
                
                this.ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
                this.ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
                
                // Fiyat farkını hesapla
                const priceDifference = Math.abs(drawing.endPrice - drawing.startPrice);
                const priceChangePercent = (priceDifference / drawing.startPrice) * 100;
                
                // Mum sayısını hesapla
                const candleCount = this.data.filter(candle => 
                    candle.x >= Math.min(drawing.startTime, drawing.endTime) && 
                    candle.x <= Math.max(drawing.startTime, drawing.endTime)
                ).length;
                
                // Bilgileri göster
                this.ctx.fillStyle = color;
                this.ctx.font = '12px sans-serif';
                this.ctx.textAlign = 'center';
                
                // Fiyat değişimi
                const priceText = `${priceChangePercent.toFixed(2)}%`;
                this.ctx.fillText(priceText, (startX + endX) / 2, Math.min(startY, endY) - 5);
                
                // Mum sayısı
                const candleText = `${candleCount} mum`;
                this.ctx.fillText(candleText, (startX + endX) / 2, Math.max(startY, endY) + 15);
                break;
        }
        
        this.ctx.restore();
    }

    // İmleç grafikten çıktığında tüm fare etkileşimlerini temizle
    handleMouseLeave(event) {
        // Tooltip'i gizle
        this.hideTooltip();
        
        // Crosshair pozisyonunu sıfırla
        this.crosshairX = null;
        this.crosshairY = null;
        this.crosshairPrice = null;
        
        // Fare üzerindeki mumu temizle
        this.hoveredCandle = null;
        
        // Kaydırma işlemini bitir
        this.endPan();
    }
}

class TechnicalAnalysis {
    constructor(chartView) {
        this.chartView = chartView;
        this.resultsElement = document.getElementById('analysisResults');
        this.runButton = document.getElementById('runAlgorithm');
        this.activeRectangles = [];
        this.isRunning = false;
        this.updateInterval = null;
        this.signalsActive = false; // Sinyal gösterimi açık mı?
        
        // Generate Signals butonunu oluştur
        this.generateSignalsButton = document.createElement('button');
        this.generateSignalsButton.id = 'generateSignals';
        this.generateSignalsButton.textContent = 'Generate Signals';
        this.generateSignalsButton.style.display = 'none';
        this.generateSignalsButton.style.backgroundColor = '#2196F3';
        this.generateSignalsButton.style.color = 'white';
        this.generateSignalsButton.style.padding = '8px 16px';
        this.generateSignalsButton.style.border = 'none';
        this.generateSignalsButton.style.borderRadius = '4px';
        this.generateSignalsButton.style.cursor = 'pointer';
        this.generateSignalsButton.style.marginLeft = '10px';
        
        // Butonları yan yana yerleştir
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.marginBottom = '10px';
        
        // Orijinal butonu container'a taşı
        this.runButton.parentNode.insertBefore(buttonContainer, this.runButton);
        buttonContainer.appendChild(this.runButton);
        buttonContainer.appendChild(this.generateSignalsButton);
        
        // Event listener'ları ekle
        this.runButton.addEventListener('click', () => this.toggleAnalysis());
        this.generateSignalsButton.addEventListener('click', () => this.toggleSignals());
    }

    toggleAnalysis() {
        if (this.isRunning) {
            this.stopAnalysis();
        } else {
            this.runAnalysis();
        }
    }

    stopAnalysis() {
        this.isRunning = false;
        this.runButton.textContent = 'SDA – Squeeze Detection Algorithm';
        this.runButton.style.backgroundColor = '#4CAF50';
        this.generateSignalsButton.style.display = 'none'; // Sinyal butonunu gizle
        this.activeRectangles = [];
        this.chartView.drawings = [];
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    runAnalysis() {
        if (!this.chartView.data || this.chartView.data.length === 0) {
            this.showResults('Veri yok. Lütfen grafik verilerinin yüklenmesini bekleyin.');
            return;
        }

        this.isRunning = true;
        this.runButton.textContent = 'SDA Durdur';
        this.runButton.style.backgroundColor = '#f44336';
        this.generateSignalsButton.style.display = 'inline-block'; // Sinyal butonunu göster

        // 1. Konsolidasyon kutularını bul
        const candles = this.chartView.data;
        const currentPrice = candles[candles.length - 1].close;
        const minWindow = 20;
        const maxWindow = 50;
        const rangeThreshold = 5; // %5 aralık
        const minInRangeRatio = 0.8; // %80 mum aralıkta
        const maxDistancePercent = 20; // Anlık fiyata uzaklık limiti
        let boxes = [];

        for (let windowSize = minWindow; windowSize <= maxWindow; windowSize += 5) {
            for (let i = 0; i <= candles.length - windowSize; i++) {
                const window = candles.slice(i, i + windowSize);
                const highs = window.map(c => c.high);
                const lows = window.map(c => c.low);
                const high = Math.max(...highs);
                const low = Math.min(...lows);
                const rangePercent = ((high - low) / low) * 100;
                if (rangePercent > rangeThreshold) continue;
                // Kaç mum bu aralıkta?
                const inRange = window.filter(c => c.high <= high && c.low >= low).length;
                if (inRange / windowSize < minInRangeRatio) continue;
                // Anlık fiyata uzaklık kontrolü
                const distToCurrent = Math.min(Math.abs(currentPrice - high), Math.abs(currentPrice - low)) / currentPrice * 100;
                if (distToCurrent > maxDistancePercent) continue;
                boxes.push({
                    upper: high,
                    lower: low,
                    startTime: window[0].x,
                    endTime: window[window.length - 1].x,
                    touchCount: inRange,
                    violationCount: 0,
                    status: 'active'
                });
            }
        }

        // 2. Çakışan kutuları temizle
        boxes = this.cleanOverlappingBoxes(boxes);
        this.activeRectangles = boxes;
        this.completedRectangles = [];

        // 3. Sadece kutuları çiz
        this.drawRectangles([...this.activeRectangles, ...this.completedRectangles]);

        // 4. Canlı takibi başlat
        this.startLiveTracking();
    }

    toggleSignals() {
        if (!this.isRunning) {
            this.showResults('Önce SDA algoritmasını çalıştırın.');
            return;
        }
        this.signalsActive = !this.signalsActive;
        if (this.signalsActive) {
            // Sinyalleri çiz
            this.drawSignals([...this.activeRectangles, ...this.completedRectangles]);
            this.generateSignalsButton.style.backgroundColor = '#4CAF50';
            this.generateSignalsButton.textContent = 'Stop Generating Signals';
        } else {
            // Sinyalleri kaldır (sadece kutuları çiz)
            this.drawRectangles([...this.activeRectangles, ...this.completedRectangles]);
            this.generateSignalsButton.style.backgroundColor = '#2196F3';
            this.generateSignalsButton.textContent = 'Generate Signals';
        }
    }

    cleanOverlappingBoxes(boxes) {
        // Zaman aralığı çakışan kutulardan en uzun ve en çok temaslı olanı bırak
        boxes.sort((a, b) => a.startTime - b.startTime);
        const result = [];
        for (const box of boxes) {
            let overlap = false;
            for (const r of result) {
                if (!(box.endTime < r.startTime || box.startTime > r.endTime)) {
                    // Çakışıyor
                    // Daha uzun veya daha çok temaslı olanı bırak
                    const boxLen = box.endTime - box.startTime;
                    const rLen = r.endTime - r.startTime;
                    if (boxLen > rLen || (boxLen === rLen && box.touchCount > r.touchCount)) {
                        // Replace
                        Object.assign(r, box);
                    }
                    overlap = true;
                    break;
                }
            }
            if (!overlap) result.push(box);
        }
        return result;
    }

    startLiveTracking() {
        this.updateInterval = setInterval(() => {
            if (!this.isRunning) return;
            const candles = this.chartView.data;
            if (!candles || candles.length === 0) return;
            const latestCandle = candles[candles.length - 1];
            
            // Aktif kutuları güncelle
            const updated = [];
            for (const rect of this.activeRectangles) {
                let status = rect.status;
                let violationCount = rect.violationCount;
                const price = latestCandle.close;
                if (status === 'active') {
                    if (price > rect.upper * 1.10 || price < rect.lower * 0.90) {
                        status = 'completed'; // Breakout/breakdown
                    } else if (price > rect.upper || price < rect.lower) {
                        violationCount++;
                        if (violationCount > 10) {
                            status = 'completed';
                        }
                    }
                }
                updated.push({ ...rect, status, violationCount });
            }
            
            // --- SON KUTU UZATMA ---
            if (updated.length > 0) {
                const lastRect = updated[updated.length - 1];
                const price = latestCandle.close;
                if (lastRect.status === 'active' && price <= lastRect.upper && price >= lastRect.lower) {
                    // Son mumdan 10 mum sonrası
                    const candles = this.chartView.data;
                    const lastCandle = candles[candles.length - 1];
                    // 10 mum sonrası varsa, yoksa son mumun zamanı + 10x ortalama aralık
                    let newEndTime;
                    if (candles.length >= 11) {
                        const idx = candles.length - 1;
                        const tenthAhead = candles[idx]?.x + (candles[idx]?.x - candles[idx-1]?.x) * 10;
                        // Eğer 10 mum sonrası varsa, onun zamanını kullan
                        if (candles[idx + 10]) {
                            newEndTime = candles[idx + 10].x;
                        } else {
                            newEndTime = tenthAhead;
                        }
                    } else {
                        // Yeterli mum yoksa, son mumun zamanı + 10x ortalama aralık
                        const avgInterval = (candles[candles.length-1].x - candles[0].x) / (candles.length-1);
                        newEndTime = candles[candles.length-1].x + avgInterval * 10;
                    }
                    // Sadece ileriye doğru uzat (geri gitmesin)
                    if (newEndTime > lastRect.endTime) {
                        lastRect.endTime = newEndTime;
                        updated[updated.length - 1] = lastRect;
                    }
                }
            }
            // --- SON KUTU UZATMA SONU ---
            
            // Aktif ve tamamlanmış kutuları ayır
            this.activeRectangles = updated.filter(r => r.status === 'active');
            this.completedRectangles = [
                ...(this.completedRectangles || []),
                ...updated.filter(r => r.status === 'completed' && !this.completedRectangles?.some(c => c.startTime === r.startTime && c.endTime === r.endTime))
            ];
            
            // Sadece kutuları çiz
            this.drawRectangles([...this.activeRectangles, ...this.completedRectangles]);
        }, 1000);
    }

    drawRectangles(rectangles) {
        this.chartView.drawings = [];
        rectangles.forEach((rect, idx) => {
            let color = '#3b82f6'; // aktif mavi
            if (rect.status === 'completed') color = '#888888'; // tamamlanmış gri
            else if (idx > 0) color = '#ef5350'; // ikinci aktif kırmızı
            const drawing = {
                type: 'rectangle',
                startTime: rect.startTime,
                startPrice: rect.upper,
                endTime: rect.endTime,
                endPrice: rect.lower,
                violationCount: rect.violationCount,
                color: color
            };
            this.chartView.drawings.push(drawing);
        });
        // Sinyaller aktifse, sinyalleri de ekle
        if (this.signalsActive) {
            this.drawSignals(rectangles);
        }
    }

    drawSignals(rectangles) {
        rectangles.forEach(rect => {
            const candles = this.chartView.data;
            const upperTolerance = rect.upper * 0.003; // %0.3 tolerans
            const lowerTolerance = rect.lower * 0.003; // %0.3 tolerans

            // Kutu zaman aralığındaki tüm mumları tara
            for (let i = 0; i < candles.length; i++) {
                const candle = candles[i];
                if (candle.x >= rect.startTime && candle.x <= rect.endTime) {
                    // Üst kenar temas kontrolü (SAT sinyali)
                    if (Math.abs(candle.high - rect.upper) <= upperTolerance) {
                        const signal = {
                            type: 'sellSignal',
                            time: candle.x,
                            price: candle.high,
                            color: '#ef5350' // kırmızı
                        };
                        this.chartView.drawings.push(signal);
                    }
                    
                    // Alt kenar temas kontrolü (AL sinyali)
                    if (Math.abs(candle.low - rect.lower) <= lowerTolerance) {
                        const signal = {
                            type: 'buySignal',
                            time: candle.x,
                            price: candle.low,
                            color: '#26a69a' // yeşil
                        };
                        this.chartView.drawings.push(signal);
                    }
                }
            }
        });
    }

    formatResults(rectangles) {
        if (rectangles.length === 0) return 'Aktif dikdörtgen kalmadı.';
        let msg = `${rectangles.length} aktif dikdörtgen:\n\n`;
        rectangles.forEach((rect, i) => {
            msg += `Dikdörtgen ${i + 1}:\n`;
            msg += `Üst Kenar: ${rect.upper.toFixed(2)}\n`;
            msg += `Alt Kenar: ${rect.lower.toFixed(2)}\n`;
            msg += `Temas: ${rect.upperTouchCount}\n`;
            msg += `İhlal: ${rect.violationCount}/10\n\n`;
        });
        return msg;
    }

    showResults(message) {
        this.resultsElement.innerHTML = `<div class="analysis-results"><p>${message}</p></div>`;
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('chartCanvas');
    window.chartView = new ChartView(canvas);
    const cryptoData = new CryptoData();
    
    cryptoData.startUpdates();
    // Algoritma buton metnini güncelle
    const runButton = document.getElementById('runAlgorithm');
    if (runButton) runButton.textContent = 'SDA – Squeeze Detection Algorithm';

    // TradingView'e Git butonu event
    const tradingviewBtn = document.getElementById('tradingviewBtn');
    // --- BACKTEST BUTONU EKLE ---
    if (tradingviewBtn) {
        // Backtest butonunu oluştur
        const backtestBtn = document.createElement('button');
        backtestBtn.id = 'backtestBtn';
        backtestBtn.textContent = 'Backtest';
        backtestBtn.style.backgroundColor = '#4F46E5';
        backtestBtn.style.color = 'white';
        backtestBtn.style.padding = '8px 16px';
        backtestBtn.style.border = 'none';
        backtestBtn.style.borderRadius = '4px';
        backtestBtn.style.cursor = 'pointer';
        backtestBtn.style.marginLeft = '10px';
        backtestBtn.style.fontWeight = 'bold';
        backtestBtn.style.fontSize = '15px';
        tradingviewBtn.parentNode.insertBefore(backtestBtn, tradingviewBtn.nextSibling);

        // Modal pencereyi oluştur (ilk başta gizli)
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'backtestModalOverlay';
        modalOverlay.style.position = 'fixed';
        modalOverlay.style.top = '0';
        modalOverlay.style.left = '0';
        modalOverlay.style.width = '100vw';
        modalOverlay.style.height = '100vh';
        modalOverlay.style.background = 'rgba(0,0,0,0.45)';
        modalOverlay.style.display = 'none';
        modalOverlay.style.zIndex = '9999';
        modalOverlay.style.justifyContent = 'center';
        modalOverlay.style.alignItems = 'center';

        const modal = document.createElement('div');
        modal.id = 'backtestModal';
        modal.style.background = '#181C2A';
        modal.style.borderRadius = '12px';
        modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
        modal.style.padding = '32px 32px 24px 32px';
        modal.style.minWidth = '400px';
        modal.style.maxWidth = '95vw';
        modal.style.maxHeight = '90vh';
        modal.style.position = 'relative';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.overflowY = 'auto';

        // Kapatma butonu
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '12px';
        closeBtn.style.right = '16px';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#fff';
        closeBtn.style.fontSize = '22px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
        modal.appendChild(closeBtn);

        // --- Backtest adım 1: Mum sayısı sor ---
        const askDiv = document.createElement('div');
        askDiv.style.display = 'flex';
        askDiv.style.flexDirection = 'column';
        askDiv.style.alignItems = 'center';
        askDiv.style.margin = '24px 0 12px 0';
        const askLabel = document.createElement('label');
        askLabel.textContent = 'Kaç mumluk geçmişle backtest yapılsın?';
        askLabel.style.color = '#fff';
        askLabel.style.fontSize = '16px';
        askLabel.style.marginBottom = '8px';
        const askInput = document.createElement('input');
        askInput.type = 'number';
        askInput.min = '10';
        askInput.max = '1000';
        askInput.value = '100';
        askInput.style.padding = '6px 10px';
        askInput.style.fontSize = '15px';
        askInput.style.borderRadius = '4px';
        askInput.style.border = '1px solid #333';
        askInput.style.width = '120px';
        askInput.style.marginBottom = '8px';
        const askBtn = document.createElement('button');
        askBtn.textContent = 'Onayla';
        askBtn.style.background = '#4F46E5';
        askBtn.style.color = '#fff';
        askBtn.style.border = 'none';
        askBtn.style.borderRadius = '4px';
        askBtn.style.padding = '7px 18px';
        askBtn.style.fontWeight = 'bold';
        askBtn.style.cursor = 'pointer';
        askDiv.appendChild(askLabel);
        askDiv.appendChild(askInput);
        askDiv.appendChild(askBtn);
        modal.appendChild(askDiv);

        // --- Backtest adım 2: Grafik, SDA ve bot alanı ---
        const backtestPanel = document.createElement('div');
        backtestPanel.style.display = 'none';
        backtestPanel.style.flexDirection = 'column';
        backtestPanel.style.alignItems = 'center';
        backtestPanel.style.width = '100%';

        // Grafik
        const chartCanvas = document.createElement('canvas');
        chartCanvas.width = 700;
        chartCanvas.height = 350;
        chartCanvas.style.background = '#23263a';
        chartCanvas.style.borderRadius = '8px';
        chartCanvas.style.margin = '12px 0 18px 0';
        backtestPanel.appendChild(chartCanvas);

        // SDA butonu
        const sdaBtn = document.createElement('button');
        sdaBtn.textContent = "SDA'yı Çalıştır & Sinyalleri Üret";
        sdaBtn.style.background = '#2196F3';
        sdaBtn.style.color = '#fff';
        sdaBtn.style.border = 'none';
        sdaBtn.style.borderRadius = '4px';
        sdaBtn.style.padding = '8px 18px';
        sdaBtn.style.fontWeight = 'bold';
        sdaBtn.style.fontSize = '15px';
        sdaBtn.style.cursor = 'pointer';
        sdaBtn.style.marginBottom = '18px';
        backtestPanel.appendChild(sdaBtn);

        // Bot konfig alanı (başta gizli)
        const configDiv = document.createElement('div');
        configDiv.style.display = 'none';
        configDiv.style.flexDirection = 'row';
        configDiv.style.gap = '18px';
        configDiv.style.marginBottom = '18px';
        configDiv.style.justifyContent = 'center';
        configDiv.style.alignItems = 'center';
        configDiv.innerHTML = `
            <label style="color:#fff;font-size:15px;">Bakiye: <input id="backtestBalance" type="number" value="10000" style="width:80px;padding:3px 6px;border-radius:3px;border:1px solid #333;"></label>
            <label style="color:#fff;font-size:15px;">Strateji: 
                <select id="backtestStrategy" style="padding:3px 6px;border-radius:3px;">
                    <option value="sda">SDA</option>
                    <option value="sma-cross">SMA Cross</option>
                    <option value="price-threshold">Price Threshold</option>
                </select>
            </label>
            <label style="color:#fff;font-size:15px;">Min Profit %: <input id="backtestMinProfit" type="number" value="1" min="0.1" max="5" step="0.1" style="width:50px;padding:3px 6px;border-radius:3px;border:1px solid #333;"></label>
            <label style="color:#fff;font-size:15px;">Max Stop %: <input id="backtestMaxStop" type="number" value="1" min="0.1" max="2" step="0.1" style="width:50px;padding:3px 6px;border-radius:3px;border:1px solid #333;"></label>
        `;
        backtestPanel.appendChild(configDiv);

        // Botu Başlat butonu (başta gizli)
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Botu Başlat';
        startBtn.style.background = '#22c55e';
        startBtn.style.color = '#fff';
        startBtn.style.border = 'none';
        startBtn.style.borderRadius = '4px';
        startBtn.style.padding = '8px 22px';
        startBtn.style.fontWeight = 'bold';
        startBtn.style.fontSize = '16px';
        startBtn.style.cursor = 'pointer';
        startBtn.style.display = 'none';
        backtestPanel.appendChild(startBtn);

        // İşlem tablosu (başta gizli)
        const tableDiv = document.createElement('div');
        tableDiv.style.display = 'none';
        tableDiv.style.width = '100%';
        tableDiv.style.maxHeight = '180px';
        tableDiv.style.overflowY = 'auto';
        tableDiv.innerHTML = `
            <table style="width:100%;background:#23263a;color:#fff;border-radius:6px;overflow:hidden;font-size:14px;">
                <thead><tr style="background:#222;"><th>Zaman</th><th>İşlem</th><th>Fiyat</th><th>Miktar</th><th>Güncel Bakiye</th></tr></thead>
                <tbody id="backtestTradeTableBody"></tbody>
            </table>
        `;
        backtestPanel.appendChild(tableDiv);

        modal.appendChild(backtestPanel);

        // Onayla'ya basınca backtest grafiğini hazırla
        askBtn.addEventListener('click', () => {
            let n = parseInt(askInput.value);
            if (isNaN(n) || n < 10) n = 10;
            // Sadece 4 saatlik periyot datası ile çalış
            const allData = window.chartView ? window.chartView.data : [];
            const period = window.cryptoData ? window.cryptoData.selectedPeriod : '4h';
            if (period !== '4h') {
                alert('Backtest sadece 4 saatlik periyotta çalışır.');
                return;
            }
            // Backtest datası ve eklenecek mumlar
            const backtestData = allData.slice(0, allData.length - n);
            const toAddCandles = allData.slice(allData.length - n);
            // Son 100 muma zoom
            const zoomCount = 100;
            const zoomStart = Math.max(0, backtestData.length - zoomCount);
            let zoomData = backtestData.slice(zoomStart);
            // Grafik state
            let chartState = {
                candles: [...zoomData],
                allCandles: [...backtestData],
                toAdd: [...toAddCandles],
                signals: [],
                boxes: [],
                trades: [],
                bot: null,
                sdaActive: false,
                botActive: false,
                interval: null
            };
            // Basit chart çizim fonksiyonu (kutular ve sinyaller dahil)
            function drawBacktestChart() {
                const ctx = chartCanvas.getContext('2d');
                ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                if (chartState.candles.length === 0) return;
                // Fiyat aralığı
                const min = Math.min(...chartState.candles.map(c => c.low));
                const max = Math.max(...chartState.candles.map(c => c.high));
                const pricePadding = (max - min) * 0.05;
                const priceMin = min - pricePadding;
                const priceMax = max + pricePadding;
                // Mumları çiz
                chartState.candles.forEach((candle, i) => {
                    const x = 40 + (i / (chartState.candles.length-1)) * (chartCanvas.width-80);
                    const openY = chartCanvas.height - ((candle.open - priceMin) / (priceMax - priceMin) * (chartCanvas.height-40)) - 20;
                    const closeY = chartCanvas.height - ((candle.close - priceMin) / (priceMax - priceMin) * (chartCanvas.height-40)) - 20;
                    const highY = chartCanvas.height - ((candle.high - priceMin) / (priceMax - priceMin) * (chartCanvas.height-40)) - 20;
                    const lowY = chartCanvas.height - ((candle.low - priceMin) / (priceMax - priceMin) * (chartCanvas.height-40)) - 20;
                    // Wick
                    ctx.strokeStyle = '#888';
                    ctx.beginPath();
                    ctx.moveTo(x, highY);
                    ctx.lineTo(x, lowY);
                    ctx.stroke();
                    // Body
                    ctx.strokeStyle = ctx.fillStyle = candle.close >= candle.open ? '#26a69a' : '#ef5350';
                    ctx.fillRect(x-3, Math.min(openY, closeY), 6, Math.max(2, Math.abs(openY-closeY)));
                });
                // Kutuları çiz
                chartState.boxes.forEach(box => {
                    const startIdx = chartState.candles.findIndex(c => c.x === box.startTime);
                    const endIdx = chartState.candles.findIndex(c => c.x === box.endTime);
                    if (startIdx === -1 || endIdx === -1) return;
                    const x1 = 40 + (startIdx / (chartState.candles.length-1)) * (chartCanvas.width-80);
                    const x2 = 40 + (endIdx / (chartState.candles.length-1)) * (chartCanvas.width-80);
                    const y1 = chartCanvas.height - ((box.upper - priceMin) / (priceMax - priceMin) * (chartCanvas.height-40)) - 20;
                    const y2 = chartCanvas.height - ((box.lower - priceMin) / (priceMax - priceMin) * (chartCanvas.height-40)) - 20;
                    ctx.save();
                    ctx.strokeStyle = box.status === 'completed' ? '#888' : '#3b82f6';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 4]);
                    ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
                    ctx.restore();
                });
                // Sinyalleri çiz
                chartState.signals.forEach(sig => {
                    const idx = chartState.candles.findIndex(c => c.x === sig.time);
                    if (idx === -1) return;
                    const x = 40 + (idx / (chartState.candles.length-1)) * (chartCanvas.width-80);
                    const y = chartCanvas.height - ((sig.price - priceMin) / (priceMax - priceMin) * (chartCanvas.height-40)) - 20;
                    ctx.save();
                    ctx.fillStyle = sig.type === 'buySignal' ? '#26a69a' : '#ef5350';
                    ctx.beginPath();
                    if (sig.type === 'buySignal') {
                        ctx.moveTo(x, y-12); ctx.lineTo(x-7, y+7); ctx.lineTo(x+7, y+7);
                    } else {
                        ctx.moveTo(x, y+12); ctx.lineTo(x-7, y-7); ctx.lineTo(x+7, y-7);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                });
            }
            drawBacktestChart();
            // --- SDA Algoritması (modal için izole) ---
            function runSDA(candles) {
                // Aynı mantıkla kutu ve sinyal üretimi (kısa, sade versiyon)
                const minWindow = 20, maxWindow = 50, rangeThreshold = 5, minInRangeRatio = 0.8, maxDistancePercent = 20;
                let boxes = [];
                for (let windowSize = minWindow; windowSize <= maxWindow; windowSize += 5) {
                    for (let i = 0; i <= candles.length - windowSize; i++) {
                        const window = candles.slice(i, i + windowSize);
                        const highs = window.map(c => c.high);
                        const lows = window.map(c => c.low);
                        const high = Math.max(...highs);
                        const low = Math.min(...lows);
                        const rangePercent = ((high - low) / low) * 100;
                        if (rangePercent > rangeThreshold) continue;
                        const inRange = window.filter(c => c.high <= high && c.low >= low).length;
                        if (inRange / windowSize < minInRangeRatio) continue;
                        const currentPrice = candles[candles.length-1].close;
                        const distToCurrent = Math.min(Math.abs(currentPrice - high), Math.abs(currentPrice - low)) / currentPrice * 100;
                        if (distToCurrent > maxDistancePercent) continue;
                        boxes.push({ upper: high, lower: low, startTime: window[0].x, endTime: window[window.length-1].x, status: 'active' });
                    }
                }
                // Çakışan kutuları temizle (kısa versiyon)
                boxes.sort((a, b) => a.startTime - b.startTime);
                const result = [];
                for (const box of boxes) {
                    let overlap = false;
                    for (const r of result) {
                        if (!(box.endTime < r.startTime || box.startTime > r.endTime)) {
                            const boxLen = box.endTime - box.startTime;
                            const rLen = r.endTime - r.startTime;
                            if (boxLen > rLen) Object.assign(r, box);
                            overlap = true; break;
                        }
                    }
                    if (!overlap) result.push(box);
                }
                // Sinyal üretimi
                let signals = [];
                result.forEach(rect => {
                    const upperTol = rect.upper * 0.003, lowerTol = rect.lower * 0.003;
                    for (let i = 0; i < candles.length; i++) {
                        const c = candles[i];
                        if (c.x >= rect.startTime && c.x <= rect.endTime) {
                            if (Math.abs(c.high - rect.upper) <= upperTol) signals.push({ type: 'sellSignal', time: c.x, price: c.high });
                            if (Math.abs(c.low - rect.lower) <= lowerTol) signals.push({ type: 'buySignal', time: c.x, price: c.low });
                        }
                    }
                });
                return { boxes: result, signals };
            }
            // --- TradeBot (modal için izole) ---
            class ModalTradeBot {
                constructor(getData, onTrade, config) {
                    this.getData = getData;
                    this.onTrade = onTrade;
                    this.balance = Number(config.balance) || 10000;
                    this.position = 0;
                    this.lastAction = null;
                    this.strategy = config.strategy;
                    this.minProfit = Math.min(Math.max(Number(config.minProfit) / 100, 0.001), 0.05) || 0.01;
                    this.maxStop = Math.min(Math.max(Number(config.maxStop) / 100, 0.001), 0.02) || 0.01;
                    this.buyPrice = null;
                    this.processedSignals = new Set();
                    this.hasBoughtOnce = false; // YENİ: İlk buy sinyali gelene kadar bekle
                    this.lastBox = null; // YENİ: Son SDA kutusu
                }
                run() {
                    const data = this.getData();
                    if (!data || data.length < 50) return;
                    const price = data[data.length-1].close;
                    let action = null;
                    let reason = '';
                    if (this.strategy === 'sda') {
                        // Son aktif kutuyu bul
                        const boxes = chartState.boxes;
                        const lastBox = boxes.length > 0 ? boxes[boxes.length-1] : null;
                        this.lastBox = lastBox;
                        if (this.position === 0 && lastBox) {
                            const lower = Math.min(lastBox.upper, lastBox.lower);
                            const lowerTol = lower * 0.003; // %0.3 tolerans (SDA ile aynı)
                            if (price <= lower + lowerTol && price >= lower - lowerTol) {
                                action = 'buy';
                                reason = 'Box Lower Touch';
                            }
                        } else if (this.position > 0 && this.buyPrice !== null && lastBox) {
                            const upper = Math.max(lastBox.upper, lastBox.lower);
                            const upperTol = upper * 0.003; // %0.3 tolerans (SDA ile aynı)
                            if (price >= upper - upperTol && price <= upper + upperTol) {
                                action = 'sell';
                                reason = 'Box Upper Touch';
                            } else if (price >= this.buyPrice * (1 + this.minProfit)) {
                                action = 'sell';
                                reason = 'Take Profit';
                            } else if (price <= this.buyPrice * (1 - this.maxStop)) {
                                action = 'sell';
                                reason = 'Stop Loss';
                            }
                        }
                    }
                    // Diğer stratejilerde işlem yapma
                    if (action === 'buy') {
                        this.position += 1;
                        this.balance -= price;
                        this.buyPrice = price;
                        this.lastAction = {type: 'Al', price, amount: 1, balance: this.balance + this.position * price, reason};
                        this.onTrade({...this.lastAction, time: new Date().toLocaleString()});
                    } else if (action === 'sell') {
                        this.balance += price * this.position;
                        this.lastAction = {type: 'Sat', price, amount: this.position, balance: this.balance, reason};
                        this.onTrade({...this.lastAction, time: new Date().toLocaleString()});
                        this.position = 0;
                        this.buyPrice = null;
                    }
                }
            }
            // --- SDA butonuna basınca ---
            sdaBtn.onclick = () => {
                // SDA çalıştır, sinyalleri ve kutuları güncelle
                const { boxes, signals } = runSDA(chartState.candles);
                chartState.boxes = boxes;
                chartState.signals = signals;
                drawBacktestChart();
                sdaBtn.style.display = 'none';
                configDiv.style.display = 'flex';
                startBtn.style.display = 'inline-block';
                tableDiv.style.display = 'block';
            };
            // --- Botu Başlat butonuna basınca ---
            startBtn.onclick = () => {
                if (chartState.botActive) return;
                chartState.botActive = true;
                // Update button appearance
                startBtn.style.backgroundColor = '#666';
                startBtn.textContent = 'Bot Çalışıyor';
                startBtn.disabled = true;
                
                // Bot konfigürasyonunu al
                const config = {
                    balance: document.getElementById('backtestBalance').value,
                    strategy: document.getElementById('backtestStrategy').value,
                    minProfit: document.getElementById('backtestMinProfit').value,
                    maxStop: document.getElementById('backtestMaxStop').value
                };
                chartState.bot = new ModalTradeBot(() => chartState.candles, trade => {
                    // İşlem tablosuna ekle
                    const tbody = document.getElementById('backtestTradeTableBody');
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${trade.time}</td><td>${trade.type}${trade.reason ? ' ('+trade.reason+')' : ''}</td><td>${trade.price.toFixed(2)}</td><td>${trade.type === 'Al' ? (trade.balance / trade.price).toFixed(6) : trade.amount}</td><td>${trade.balance.toFixed(2)}</td>`;
                    tbody.appendChild(row);
                }, config);
                // Zincirleme animasyon başlat
                function animateNextCandle() {
                    if (chartState.toAdd.length === 0) return;
                    const nextCandle = chartState.toAdd.shift();
                    animateCandle(chartState, chartCanvas, nextCandle, 4000, (animState) => {
                        chartState.candles.push(nextCandle);
                        // SDA ve sinyalleri güncelle
                        const { boxes, signals } = runSDA(chartState.candles);
                        chartState.boxes = boxes;
                        chartState.signals = signals;
                        // Botu çalıştır
                        chartState.bot.run();
                        drawBacktestChart(chartState, chartCanvas);
                        setTimeout(animateNextCandle, 1000); // 1 sn bekle, sonra sıradaki muma geç
                    }, drawBacktestChart);
                }
                animateNextCandle();
            };
            // ---
            askDiv.style.display = 'none';
            backtestPanel.style.display = 'flex';
            sdaBtn.style.display = 'block';
            configDiv.style.display = 'none';
            startBtn.style.display = 'none';
            tableDiv.style.display = 'none';
        });

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        // Butona tıklayınca modalı göster
        backtestBtn.addEventListener('click', () => {
            modalOverlay.style.display = 'flex';
        });
    }
    // --- BACKTEST BUTONU SONU ---

    if (tradingviewBtn) {
        tradingviewBtn.addEventListener('click', function() {
            // Sembol ve periyodu CryptoData'dan al
            let symbol = window.cryptoData ? window.cryptoData.selectedSymbol : 'BTCUSDT';
            let period = window.cryptoData ? window.cryptoData.selectedPeriod : '4h';
            // TradingView periyot eşlemesi
            const periodMap = {
                '1h': '60',
                '4h': '240',
                '1d': '1D',
                '1w': '1W',
                '1M': '1M'
            };
            let tvPeriod = periodMap[period] || '60';
            // Sembolü TradingView formatına çevir (ör: BTCUSDT -> BINANCE:BTCUSDT)
            let tvSymbol = 'BINANCE:' + symbol;
            let url = `https://www.tradingview.com/chart/?symbol=${tvSymbol}&interval=${tvPeriod}`;
            window.open(url, '_blank');
        });
    }

    const maxStopInput = document.getElementById('maxStop');
    const maxStopMsg = document.getElementById('maxStopMsg');

    function checkBotStartEnable() {
        const minProfitVal = parseFloat(minProfitInput.value);
        const maxStopVal = parseFloat(maxStopInput.value);
        let disable = false;
        if (minProfitVal > 5) disable = true;
        if (maxStopVal > 2) disable = true;
        if (disable) {
            startBtn.classList.add('disabled');
            startBtn.disabled = true;
        } else {
            startBtn.classList.remove('disabled');
            startBtn.disabled = false;
        }
    }
    minProfitInput.addEventListener('input', function() {
        const val = parseFloat(minProfitInput.value);
        if (val > 5) {
            minProfitMsg.textContent = 'Algoritmanın çalışma presibine göre maksimum %5 girmeniz tavsiye edilir.';
            minProfitMsg.style.display = 'block';
        } else {
            minProfitMsg.textContent = '';
            minProfitMsg.style.display = 'none';
        }
        checkBotStartEnable();
    });
    maxStopInput.addEventListener('input', function() {
        const val = parseFloat(maxStopInput.value);
        if (val > 2) {
            maxStopMsg.textContent = 'Algoritmanın çalışma prensibine göre maximum %2 girmeniz tavsiye edilir';
            maxStopMsg.style.display = 'block';
        } else {
            maxStopMsg.textContent = '';
            maxStopMsg.style.display = 'none';
        }
        checkBotStartEnable();
    });

    // ... existing code ...
    if (startBtn && stopBtn) {
        startBtn.addEventListener('click', function() {
            if (parseFloat(minProfitInput.value) > 5 || parseFloat(maxStopInput.value) > 2) return;
            tableBody.innerHTML = '';
            tradeBot = new TradeBot({
                getData: () => window.chartView ? window.chartView.data : [],
                getSymbol: () => window.cryptoData ? window.cryptoData.selectedSymbol : 'BTCUSDT',
                getPeriod: () => window.cryptoData ? window.cryptoData.selectedPeriod : '4h',
                onTrade: updateTradeHistory
            });
            tradeBot.start(balanceInput.value, strategyInput.value, minProfitInput.value, maxStopInput.value);
            setBotButtons(true);
            setBotStatus('Bot çalışıyor...', '#26a69a');
            // Update start button appearance
            startBtn.style.backgroundColor = '#666';
            startBtn.textContent = 'Bot Çalışıyor';
        });
        stopBtn.addEventListener('click', function() {
            if (tradeBot) tradeBot.stop();
            setBotButtons(false);
            setBotStatus('Bot durduruldu', '#ef5350');
            // Reset start button appearance
            startBtn.style.backgroundColor = '#26a69a';
            startBtn.textContent = 'Botu Başlat';
        });
    }

    const buyPriceInput = document.getElementById('buyPrice');
    const targetSellPriceInput = document.getElementById('targetSellPrice');
    // ... existing code ...
    // TradeBot UI entegrasyonu
    let tradeBot = null;
    function updateTradeHistory(trade) {
        const table = document.getElementById('tradeHistoryTable').querySelector('tbody');
        const row = document.createElement('tr');
        row.innerHTML = `<td>${trade.time}</td><td>${trade.type}${trade.reason ? ' ('+trade.reason+')' : ''}</td><td>${trade.price.toFixed(2)}</td><td>${trade.type === 'Al' ? (trade.balance / trade.price).toFixed(6) : trade.amount}</td><td>${trade.balance.toFixed(2)}</td>`;
        table.appendChild(row);
        // Alış fiyatı ve tahmini satış fiyatı kutularını güncelle
        if (trade.type === 'Al') {
            buyPriceInput.value = trade.price.toFixed(2);
            // minProfit yüzdesini al
            const minProfitVal = parseFloat(document.getElementById('minProfit').value);
            const target = trade.price * (1 + (minProfitVal/100));
            targetSellPriceInput.value = target.toFixed(2);
        } else if (trade.type === 'Sat') {
            buyPriceInput.value = '';
            targetSellPriceInput.value = '';
        }
    }

    // Alış fiyatı ve tahmini satış fiyatı kutularını buySignal'a göre otomatik doldur
    function updateBuyAndTargetFromLastBuySignal() {
        const drawings = window.chartView && window.chartView.drawings ? window.chartView.drawings : [];
        const minProfitVal = parseFloat(document.getElementById('minProfit').value);
        const lastBuySignal = [...drawings].reverse().find(d => d.type === 'buySignal');
        if (lastBuySignal) {
            buyPriceInput.value = lastBuySignal.price.toFixed(2);
            const target = lastBuySignal.price * (1 + (minProfitVal/100));
            targetSellPriceInput.value = target.toFixed(2);
        } else {
            buyPriceInput.value = '';
            targetSellPriceInput.value = '';
        }
    }
    // minProfit değişirse tahmini satış fiyatı güncellensin
    minProfitInput.addEventListener('input', updateBuyAndTargetFromLastBuySignal);
    // Sinyaller değiştikçe de güncellensin (örneğin Generate Signals tıklandığında)
    setInterval(updateBuyAndTargetFromLastBuySignal, 2000);
}); 

// TradeBot sınıfı ve entegrasyonu
class TradeBot {
    constructor({getData, getSymbol, getPeriod, onTrade}) {
        this.getData = getData;
        this.getSymbol = getSymbol;
        this.getPeriod = getPeriod;
        this.onTrade = onTrade;
        this.running = false;
        this.balance = 10000;
        this.position = 0;
        this.lastAction = null;
        this.interval = null;
        this.strategy = 'sma-cross';
        this.tradeSize = 1; // 1 birimlik işlem
        this.lastSmaState = null;
        this.processedSignals = new Set(); // Sadece SDA için kullanılır
        this.minProfit = 0.01; // Yüzde cinsinden, ör: 0.01 = %1
        this.maxStop = 0.01; // Yüzde cinsinden, ör: 0.01 = %1
        this.buyPrice = null; // Son alış fiyatı
        this.hasBoughtOnce = false; // YENİ: İlk buy sinyali gelene kadar bekle
        this.lastBox = null; // YENİ: Son SDA kutusu
    }
    start(balance, strategy, minProfit, maxStop) {
        this.balance = Number(balance) || 10000;
        this.position = 0;
        this.lastAction = null;
        this.strategy = strategy;
        this.running = true;
        this.lastSmaState = null;
        this.processedSignals = new Set();
        this.minProfit = Math.min(Math.max(Number(minProfit) / 100, 0.001), 0.05) || 0.01;
        this.maxStop = Math.min(Math.max(Number(maxStop) / 100, 0.001), 0.02) || 0.01;
        this.buyPrice = null;
        this.hasBoughtOnce = false;
        this.lastBox = null;
        this.interval = setInterval(() => this.run(), 2000);
    }
    stop() {
        this.running = false;
        clearInterval(this.interval);
        this.interval = null;
    }
    run() {
        const data = this.getData();
        if (!data || data.length < 50) return;
        const price = data[data.length-1].close;
        let action = null;
        let reason = '';
        if (this.strategy === 'sda') {
            // SDA kutularını ve sinyallerini al
            const drawings = window.chartView && window.chartView.drawings ? window.chartView.drawings : [];
            // Son aktif kutuyu bul
            const rectangles = drawings.filter(d => d.type === 'rectangle' && d.violationCount !== undefined && d.color !== '#888888');
            const lastBox = rectangles.length > 0 ? rectangles[rectangles.length-1] : null;
            this.lastBox = lastBox;
            if (this.position === 0 && lastBox) {
                // Alt sınır ve tolerans
                const lower = Math.min(lastBox.startPrice, lastBox.endPrice);
                const lowerTol = lower * 0.003; // %0.3 tolerans (SDA ile aynı)
                if (price <= lower + lowerTol && price >= lower - lowerTol) {
                    action = 'buy';
                    reason = 'Box Lower Touch';
                }
            } else if (this.position > 0 && this.buyPrice !== null && lastBox) {
                // Üst sınır ve tolerans
                const upper = Math.max(lastBox.startPrice, lastBox.endPrice);
                const upperTol = upper * 0.003; // %0.3 tolerans (SDA ile aynı)
                if (price >= upper - upperTol && price <= upper + upperTol) {
                    action = 'sell';
                    reason = 'Box Upper Touch';
                } else if (price >= this.buyPrice * (1 + this.minProfit)) {
                    action = 'sell';
                    reason = 'Take Profit';
                } else if (price <= this.buyPrice * (1 - this.maxStop)) {
                    action = 'sell';
                    reason = 'Stop Loss';
                }
            }
        }
        // Diğer stratejilerde işlem yapma
        if (action === 'buy') {
            this.position += this.tradeSize;
            this.balance -= price * this.tradeSize;
            this.buyPrice = price;
            this.lastAction = {type: 'Al', price, amount: this.tradeSize, balance: this.balance + this.position * price, reason};
            this.onTrade({...this.lastAction, time: new Date().toLocaleString()});
        } else if (action === 'sell') {
            this.balance += price * this.position;
            this.lastAction = {type: 'Sat', price, amount: this.position, balance: this.balance, reason};
            this.onTrade({...this.lastAction, time: new Date().toLocaleString()});
            this.position = 0;
            this.buyPrice = null;
        }
    }
}

// TradeBot UI entegrasyonu
let tradeBot = null;
function updateTradeHistory(trade) {
    const table = document.getElementById('tradeHistoryTable').querySelector('tbody');
    const row = document.createElement('tr');
    row.innerHTML = `<td>${trade.time}</td><td>${trade.type}${trade.reason ? ' ('+trade.reason+')' : ''}</td><td>${trade.price.toFixed(2)}</td><td>${trade.type === 'Al' ? (trade.balance / trade.price).toFixed(6) : trade.amount}</td><td>${trade.balance.toFixed(2)}</td>`;
    table.appendChild(row);
}
function setBotStatus(msg, color) {
    const el = document.getElementById('botStatus');
    el.textContent = msg;
    el.style.color = color || '#26a69a';
}
function setBotButtons(running) {
    const startBtn = document.getElementById('botStartBtn');
    const stopBtn = document.getElementById('botStopBtn');
    if (running) {
        startBtn.classList.add('disabled');
        startBtn.disabled = true;
        stopBtn.classList.remove('disabled');
        stopBtn.disabled = false;
    } else {
        startBtn.classList.remove('disabled');
        startBtn.disabled = false;
        stopBtn.classList.add('disabled');
        stopBtn.disabled = true;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // TradeBot başlat/durdur
    const startBtn = document.getElementById('botStartBtn');
    const stopBtn = document.getElementById('botStopBtn');
    const balanceInput = document.getElementById('botBalance');
    const strategyInput = document.getElementById('botStrategy');
    const minProfitInput = document.getElementById('minProfit');
    const maxStopInput = document.getElementById('maxStop');
    const minProfitMsg = document.getElementById('minProfitMsg');
    const maxStopMsg = document.getElementById('maxStopMsg');
    const tableBody = document.getElementById('tradeHistoryTable').querySelector('tbody');
    
    setBotButtons(false);
    setBotStatus('Bot durduruldu', '#ef5350');

    function checkBotStartEnable() {
        const minProfitVal = parseFloat(minProfitInput.value);
        const maxStopVal = parseFloat(maxStopInput.value);
        let disable = false;
        if (minProfitVal > 5) disable = true;
        if (maxStopVal > 2) disable = true;
        if (disable) {
            startBtn.classList.add('disabled');
            startBtn.disabled = true;
        } else {
            startBtn.classList.remove('disabled');
            startBtn.disabled = false;
        }
    }

    // Min kar kontrolü
    minProfitInput.addEventListener('input', function() {
        const val = parseFloat(minProfitInput.value);
        if (val > 5) {
            minProfitMsg.textContent = 'Algoritmanın çalışma presibine göre maksimum %5 girmeniz tavsiye edilir.';
            minProfitMsg.style.display = 'block';
        } else {
            minProfitMsg.textContent = '';
            minProfitMsg.style.display = 'none';
        }
        checkBotStartEnable();
    });

    // Max stop kontrolü
    maxStopInput.addEventListener('input', function() {
        const val = parseFloat(maxStopInput.value);
        if (val > 2) {
            maxStopMsg.textContent = 'Algoritmanın çalışma prensibine göre maximum %2 girmeniz tavsiye edilir';
            maxStopMsg.style.display = 'block';
        } else {
            maxStopMsg.textContent = '';
            maxStopMsg.style.display = 'none';
        }
        checkBotStartEnable();
    });

    // İlk yüklemede buton durumunu kontrol et
    checkBotStartEnable();

    if (startBtn && stopBtn) {
        startBtn.addEventListener('click', function() {
            if (parseFloat(minProfitInput.value) > 5 || parseFloat(maxStopInput.value) > 2) return;
            tableBody.innerHTML = '';
            tradeBot = new TradeBot({
                getData: () => window.chartView ? window.chartView.data : [],
                getSymbol: () => window.cryptoData ? window.cryptoData.selectedSymbol : 'BTCUSDT',
                getPeriod: () => window.cryptoData ? window.cryptoData.selectedPeriod : '4h',
                onTrade: updateTradeHistory
            });
            tradeBot.start(balanceInput.value, strategyInput.value, minProfitInput.value, maxStopInput.value);
            setBotButtons(true);
            setBotStatus('Bot çalışıyor...', '#26a69a');
            // Update start button appearance
            startBtn.style.backgroundColor = '#666';
            startBtn.textContent = 'Bot Çalışıyor';
        });
        stopBtn.addEventListener('click', function() {
            if (tradeBot) tradeBot.stop();
            setBotButtons(false);
            setBotStatus('Bot durduruldu', '#ef5350');
            // Reset start button appearance
            startBtn.style.backgroundColor = '#26a69a';
            startBtn.textContent = 'Botu Başlat';
        });
    }
}); 

// --- Animasyonlu mum fonksiyonu ---
function animateCandle(chartState, chartCanvas, candle, duration, onComplete, drawChartFn) {
    const candles = chartState.candles;
    const i = candles.length;
    const min = Math.min(...candles.map(c => c.low), candle.low);
    const max = Math.max(...candles.map(c => c.high), candle.high);
    const pricePadding = (max - min) * 0.05;
    const priceMin = min - pricePadding;
    const priceMax = max + pricePadding;
    const x = 40 + (i / (candles.length + 1 - 1)) * (chartCanvas.width-80);
    const start = performance.now();
    function step(now) {
        const elapsed = now - start;
        let t = Math.min(elapsed / duration, 1);
        let currentPrice = candle.open;
        let highSoFar = candle.open;
        let lowSoFar = candle.open;
        if (t < 0.4) {
            const t1 = t / 0.4;
            highSoFar = candle.open + (candle.high - candle.open) * t1;
            lowSoFar = candle.open + (candle.low - candle.open) * t1;
            currentPrice = candle.open + (candle.close - candle.open) * t * 0.5;
        } else {
            const t2 = (t - 0.4) / 0.6;
            highSoFar = candle.high;
            lowSoFar = candle.low;
            currentPrice = candle.open + (candle.close - candle.open) * t;
        }
        // Animasyonlu mumu parametre olarak çizdir
        if (drawChartFn) {
            drawChartFn(chartState, chartCanvas, {
                ...candle,
                currentPrice,
                highSoFar,
                lowSoFar
            });
        }
        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            onComplete && onComplete();
        }
    }
    requestAnimationFrame(step);
}