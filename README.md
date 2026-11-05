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

## Android uygulaması (APK)

`android/` klasörü, aynı web uygulamasını içeren yerel bir Android uygulamasıdır (Android 8.0 ve üzeri).
Uygulamada ek olarak:

- Fotoğraflar Android'in kendi **fotoğraf seçicisinden** seçilir
- **Galeriye Kaydet** → `Resimler/nShot` klasörüne kaydeder
- **Paylaş** → Instagram (Gönderi, Hikâye, Direkt) dahil tüm uygulamalara gönderir
- Galeride bir fotoğrafta **Paylaş → nShot ile düzenle** dersen doğrudan uygulamada açılır
- Telefonun geri tuşu dışa aktarma penceresini kapatır

### APK'yı edinmek

- **GitHub'dan:** depoda **Actions → Android APK** → son çalıştırma → *Artifacts* altındaki `nShot-apk`
  (zip içinden `nShot.apk` çıkar). Kod her değiştiğinde otomatik yeniden derlenir.
- **Kendin derlemek için:** JDK 17+ ve Android SDK kurulu olmalı:

  ```bash
  cd android
  ./gradlew assembleRelease
  # çıktı: android/app/build/outputs/apk/release/app-release.apk
  ```

### Telefona kurmak

APK'yı telefona indir, dosyaya dokun. Android "bilinmeyen kaynaklardan yükleme" izni isterse
(tarayıcı veya Dosyalar uygulaması için) izin ver ve **Yükle**'ye bas.

### İmza anahtarı

Android bir uygulamanın yeni sürümünü eskisinin üzerine ancak **aynı anahtarla** imzalandıysa kurar.
Anahtar güvenlik için depoda tutulmaz; ortam değişkeniyle verilir:

```bash
NSHOT_KEYSTORE=/yol/nshot-release.jks NSHOT_KEYSTORE_PASSWORD=... ./gradlew assembleRelease
```

GitHub Actions'ın da aynı anahtarla imzalaması için depoya iki *secret* ekle
(**Settings → Secrets and variables → Actions**):

- `NSHOT_KEYSTORE_BASE64` – `base64 -w0 nshot-release.jks` çıktısı
- `NSHOT_KEYSTORE_PASSWORD` – anahtar şifresi

Anahtar verilmezse APK debug anahtarıyla imzalanır: kurulur ama farklı anahtarlı bir sürümü
güncellemek için önce eskisini kaldırmak gerekir.

## Web sürümü

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
| `android/` | Android uygulaması (WebView kabuğu, galeri/paylaşım köprüsü) |

## Sonraki adımlar için fikirler

- Birden fazla fotoğrafı aynı ayarlarla dışa aktarma (Instagram carousel)
- Video desteği
- Kenarlık / gölge, yazı ve çıkartma ekleme
- Filtreler ve ışık/kontrast ayarları
