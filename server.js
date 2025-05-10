const express = require('express');
const path = require('path');
const app = express();
const PORT = 34300;

// Statik dosyaları sun
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Uygulama http://localhost:${PORT} adresinde çalışıyor.`);
});