# nShot – Tuval

InShot'ın **Tuval** ekranından esinlenen, Instagram paylaşımları için hafif bir fotoğraf düzenleyici.
Kurulum gerektirmez; tarayıcıda çalışır ve telefonda ana ekrana eklenebilir (PWA).
Fotoğraflar hiçbir yere yüklenmez, tüm işlem cihazında yapılır.

## Özellikler

- **Oranlar:** Orijinal, 1:1, 4:5, 3:4, 9:16 (Story/Reels), 16:9, 1.91:1, 4:3, 2:3, 3:2, 5:4
- **Sığdır / Doldur** düğmeleri ve yakınlaştırma kaydırıcısı
- **Hareket:** sürükleyerek taşı, iki parmakla (veya fare tekerleğiyle) yakınlaştır, çift dokunarak Sığdır ⇄ Doldur.
  Ortaya yaklaşınca fotoğraf merkeze yapışır ve kılavuz çizgisi çıkar.
- **Arka plan:** 5 seviye bulanık arka plan, hazır renkler, fotoğrafın ortalama rengi, özel renk
- **Döndür, Ayna, Sıfırla**
- **Dışa aktarma:** 1080p / 1440p / 4K, JPG veya PNG. Telefonda **Paylaş** düğmesiyle doğrudan Instagram'a,
  ya da **Cihaza Kaydet** ile galeriye/indirilenlere.
- Son seçtiğin oran, arka plan ve kalite hatırlanır.

## Kullanım

Herhangi bir statik sunucu yeterli:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

### GitHub Pages ile telefondan açmak

1. GitHub'da depo → **Settings → Pages**
2. *Source:* **Deploy from a branch**, dal olarak bu dalı ve `/ (root)` klasörünü seç → **Save**
3. Birkaç dakika sonra `https://<kullanıcı-adı>.github.io/<depo-adı>/` adresinden açılır.
4. Telefonda: Safari'de **Paylaş → Ana Ekrana Ekle**, Chrome'da **⋮ → Ana ekrana ekle**.

## Dosyalar

| Dosya | Görev |
| --- | --- |
| `index.html` | Arayüz |
| `style.css` | Koyu tema, InShot benzeri yerleşim |
| `app.js` | Tuval çizimi, hareketler, bulanıklaştırma, dışa aktarma |
| `sw.js`, `manifest.webmanifest`, `icons/` | Uygulama olarak kurulabilme ve çevrimdışı çalışma |

## Sonraki adımlar için fikirler

- Birden fazla fotoğrafı aynı ayarlarla dışa aktarma (Instagram carousel)
- Video desteği
- Kenarlık / gölge, yazı ve çıkartma ekleme
- Filtreler ve ışık/kontrast ayarları
- Android'de galeriden "Paylaş → nShot" ile doğrudan açma
