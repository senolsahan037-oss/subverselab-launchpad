# SubverseLab v2 — Platform Dokümantasyonu

> **Son güncelleme:** 24 Ağustos 2026  
> **Bu klasör canlı sitedir.** `subverselab.com` → Cloud Run servisi `subverselab-site`
> (proje `project-62238635-aae4-41f4-880`, bölge `europe-west1`), ve deploy bu
> klasörden yapılır. Kanonik hedef: `Rules/08_DEPLOYMENT_REGISTRY.md`.
>
> Bu satırlar daha önce `subverselab-v2`'yi karalama ortamı, `subverselab-site-cloud`'u
> canlı proje olarak tarif ediyordu. Bu geçiş dönemi bitti: `subverselab-site-cloud`
> adında bir GCP projesi veya Cloud Run servisi yok, alan adı bu klasörün deploy
> ettiği servise bağlı, ve `~/subverselab-site-cloud` yerel klasörü 24 Ağustos 2026'da
> `Archive/legacy/2026-08-24_subverselab-site-cloud.zip` olarak arşivlenip silindi.
> Kendi `Dockerfile`'ı ve `.env`'i olan, deploy edilebilir bir eski site kopyasıydı —
> yani bu README onu tarif ettiği sürece yanlış hedefe deploy etmek bir yazım hatası
> kadar kolaydı.

---

## Mimari: Ne Bu, Ne Değil

Bu proje bir **vitrin + katalog** sitesidir.

```
SubverseLab Ana Sitesi (bu proje)
│
├── Kullanıcı görür → Ürün kartları, açıklamalar, önizleme
├── Kullanıcı giriş yapar → Firebase Auth
├── Kullanıcı indirme yapar → Firebase Storage (imzalı URL)
├── Kullanıcı ürün satın alır → Stripe → Webhook → Firebase
├── SEO içerik okur → Firestore seo_articles koleksiyonu
│
└── Araçlar (ör: Drum Generator) → AYRI microservis
         └── Ana siteye GÖMÜLÜ DEĞİL
         └── Kendi URL'i, kendi sunucusu, kendi deployment'ı var
```

**KURAL:** Yeni bir araç eklendiğinde bu projenin koduna DOKUNULMAZ.  
Yeni araç kendi microservis olarak deploy edilir, buraya sadece bir link kartı eklenir.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Frontend | React + Vite |
| Styling | Vanilla CSS (Design System: High Stereo) |
| Routing | react-router-dom v6 |
| Auth | Firebase Authentication (Email + Google) |
| Database | Firebase Firestore (ürünler, kullanıcılar, raporlar, SEO makaleleri) |
| Storage | Firebase Storage (dosya indirme, kapak görselleri) |
| Payments | Stripe (webhook ile entegre) |
| SEO | react-helmet-async + JSON-LD schema |
| Backend API | Yok. Bu servis kendi `server.js`'i ile statik dosya sunar; ürün verisi doğrudan Firestore'dan, sync ise `metadata-sync-service`'ten gelir |

---

## Renk Sistemi (High Stereo Palette)

```css
--color-primary:   #C5A059   /* Altın sarısı — ana vurgu */
--color-accent:    #2A9D8F   /* Koyu yeşil (Teal) — ikincil vurgu */
--color-bg:        #050505   /* Derin siyah arka plan */
--color-surface:   #111111   /* Panel yüzeyleri */
--color-text:      #F0F0F0   /* Ana metin */
--color-border:    rgba(197,160,89,0.18) /* Altın kenarlık (şeffaf) */
```

> ⚠️ Eski renk sistemi (mor `#8b5cf6`, mavi `#06b6d4`) tamamen terk edildi.  
> Hiçbir yeni bileşende bu renkler kullanılmaz.

---

## Dosya Yapısı

```
subverselab-v2/
├── src/
│   ├── App.jsx                    ← Ana uygulama, routing, auth state, global player
│   ├── main.jsx                   ← React root render
│   ├── index.css                  ← Tüm tasarım sistemi (design tokens + component styles)
│   ├── firebase.js                ← Firebase init (Auth, Firestore, Storage)
│   ├── utils/
│   │   └── seoGenerator.js        ← Ürün datasından SEO taslağı üreten template engine
│   ├── services/
│   │   └── seoService.js          ← Firestore CRUD + in-memory cache (seo_articles)
│   └── components/
│       ├── Navbar.jsx             ← Üst navigasyon (sticky, glassmorphism)
│       ├── AuthModal.jsx          ← Giriş/kayıt popup (Email + Google)
│       ├── Storefront.jsx         ← Ana vitrin (ürün kartları, filtreler, preview player)
│       ├── Dashboard.jsx          ← Kullanıcı kütüphanesi + indirme
│       ├── AdminPanel.jsx         ← Admin paneli (analitik, ürün yönetimi, raporlar, SEO)
│       ├── ProductForm.jsx        ← Ürün ekleme/düzenleme formu
│       ├── SEOSection.jsx         ← Ana sayfa altı FAQ accordion + blog kart grid
│       ├── ArticlePage.jsx        ← /learn/:slug tam makale sayfası
│       └── admin/
│           └── SEOAdminTab.jsx    ← Admin Panel SEO Content sekmesi
├── index.html
├── vite.config.js
├── package.json
└── .env                           ← Firebase config (git'e eklenmiyor)
```

---

## Sayfalar ve Rotalar

| URL | Sayfa | Erişim |
|---|---|---|
| `/` | Storefront (vitrin) | Herkese açık |
| `/dashboard` | Kullanıcı kütüphanesi | Giriş zorunlu |
| `/admin` | Admin paneli | Sadece yetkili e-postalar |
| `/learn` | SEO makaleleri listesi | Herkese açık |
| `/learn/:slug` | Tam makale / rehber sayfası | Herkese açık |
| `/success` | Ödeme başarı sayfası | Stripe yönlendirir |
| `/cancel` | Ödeme iptal sayfası | Stripe yönlendirir |

**Admin yetkili e-postalar** (`App.jsx` içinde güncellenir):
```js
['info@subverselab.com', 'senolsahan037@gmail.com']
```

---

## Ortam Değişkenleri (.env)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

> `.env` dosyası git'e push edilmez. Canlıya deploy ederken hosting provider'da (Cloud Run, Vercel vb.) ortam değişkeni olarak girilir.

---

## Backend API Endpointleri

Bu frontend, aşağıdaki API endpointlerini bekler.  
Bu serviste backend kodu yoktur; `server.js` yalnızca statik dosya sunar (bkz. `Rules/06_DEPLOYMENT.md`).

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/products` | Tüm ürün kataloğu |
| POST | `/api/library/add` | Kütüphaneye ekle |
| POST | `/api/library/remove` | Kütüphaneden çıkar |
| GET | `/api/library` | Kullanıcı kütüphanesi |
| GET | `/api/purchases` | Satın almalar |
| POST | `/api/download` | İmzalı indirme URL'i |
| POST | `/api/create-checkout-session` | Stripe ödeme başlat |
| POST | `/api/reports` | Hata raporu gönder |
| GET | `/api/admin/stats` | Admin analitik |
| GET | `/api/admin/users` | Tüm kullanıcılar |
| GET | `/api/admin/reports` | Raporlar listesi |
| POST/PUT | `/api/admin/products/:id` | Ürün ekle/güncelle |
| DELETE | `/api/admin/products/:id` | Ürün sil |
| PATCH | `/api/admin/reports/:id` | Rapor durumu güncelle |
| DELETE | `/api/admin/reports/:id` | Rapor sil |

> SEO içerik okuma backend'den değil, doğrudan **Firebase Firestore SDK** üzerinden yapılır.  
> Backend SEO endpoint'i gerekmez.

---

## SEO Blog & FAQ Sistemi

### Nasıl Çalışır?

```
Ürün Verisi (/api/products)
        ↓
seoGenerator.js (template engine)
        ↓
Firestore → seo_articles koleksiyonu (status: "draft")
        ↓
Admin Panel → SEO Content sekmesi → İnceleme + Düzenleme
        ↓
Admin "Publish" tıklar → status: "published"
        ↓
Ana Sayfa (SEOSection.jsx) → FAQ + Blog bölümü görünür
        ↓
/learn/:slug → Tam makale sayfası
```

### Firestore Veri Modeli

```
seo_articles (koleksiyon)
├── id: otomatik
├── slug: "how-to-use-sensei-drum-generator"
├── title: "How to Use Sensei Drum Generator"
├── question: "How do I use Sensei Drum Generator?"
├── answer: "Kısa 2-3 cümle..."
├── body: "Tam markdown içerik (500-800 kelime)..."
├── type: "faq" | "blog"
├── relatedProductId: "subverse-ai-generator"
├── relatedProductTitle: "Sensei Drum Generator"
├── category: "AI Tool"
├── keywords: ["drum generator", "ai drums", "ableton"]
├── metaTitle: "How to Use Sensei... | SubverseLab"
├── metaDescription: "..."
├── status: "draft" | "published"
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

### İçerik Kuralları

- İçerik üretimi **yapay zeka değil template engine** ile yapılır
- Uydurma fiyat, özellik veya teknik bilgi kesinlikle üretilmez
- Sadece ürünün gerçek field'ları kullanılır: `title`, `description`, `category`, `tags`, `metrics`, `price`, `specs`
- Her ürün için otomatik üretilen içerik tipleri:
  - **5 adet FAQ** (what is, is it free, how to use, what's included, who is it for)
  - **1 adet Blog** (complete guide — markdown formatında, tablo, karşılaştırma içerir)

### Admin'den SEO İçerik Yönetimi

1. `/admin` → **✨ SEO Content** sekmesi
2. Dropdown'dan ürün seçin veya "All Products" bırakın
3. **"Generate Drafts"** — Firestore'a taslak yazar, hiçbir şey yayınlanmaz
4. Tabloda her taslağı görün: başlık, tip, ürün, durum
5. **Edit** — inline düzenleme (title, question, answer, body, keywords)
6. **Publish** → `status: published` → site altında görünür, `/learn/:slug` açılır
7. **Unpublish** → `status: draft` → siteden kaldırılır, silinmez
8. **Delete** → Firestore'dan kalıcı olarak silinir

### SEO Özellikleri (Her Makale İçin)

- `<title>` ve `<meta name="description">` — react-helmet-async ile yönetilir
- `<link rel="canonical">` — `https://subverselab.com/learn/:slug`
- Open Graph tags (`og:title`, `og:description`, `og:type`, `og:url`)
- Twitter Card meta tags
- **JSON-LD FAQPage schema** — ana sayfa FAQ bölümü için
- **JSON-LD Article schema** — `/learn/:slug` sayfaları için
- Semantic HTML: `<article>`, `<section>`, `<h1>`, `<h2>`, `<h3>`, `<nav>`
- Breadcrumb navigasyonu: Home › Learn › Category

### Performance & Güvenilirlik

- Firestore sorguları **5 dakika in-memory cache** ile hızlandırılır
- Firestore bağlantısı başarısız olursa **SEOSection tamamen gizlenir** — ana sayfa bozulmaz
- Ana sayfada maksimum **8 FAQ + 6 blog** gösterilir
- Tam içerikler `/learn/:slug` sayfasında açılır (code-split yok, SPA routing)

---

## Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusu başlat
npm run dev
# → http://localhost:5173

# Production build
npm run build

# Build önizleme
npm run preview
```

---

## Deploy (Canlıya Alma)

Bu proje statik bir React uygulamasıdır.  
`npm run build` çalıştırılır ve çıkan `dist/` klasörü herhangi bir hosting'e deploy edilir.

Ayrı bir backend API projesi yoktur.

Production'da `vite.config.js`'e proxy tanımı ya da deploy ortamına göre API URL'i eklenmesi gerekir:

```js
// vite.config.js — development proxy örneği
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://subverselab-backend-url.a.run.app'
    }
  }
})
```

---

## Yeni Ürün Nasıl Eklenir

1. **Admin Paneli'ne giriş yap** (`/admin`)
2. **"Products Management"** sekmesine geç
3. **"+ Add New Product"** butonuna tıkla
4. Formu doldur: ID, başlık, kategori, fiyat, kapak görseli, dosyalar, önizleme sesi
5. **Save** — Firebase Storage'a yüklenir, Firestore'a kaydedilir
6. İstersen hemen **✨ SEO Content** sekmesine geçip bu ürün için taslak üret

> Ana site koduna hiçbir şey yazılmaz.

---

## Yeni Araç Nasıl Eklenir (Microservis Mimarisi)

1. Aracı **ayrı bir proje** olarak geliştir ve deploy et (ör: `synthpulse.subverselab.com`)
2. Bu projede Storefront'a sadece bir **link kartı** ekle:
   - Ürün ID'si, başlık, açıklama, kapak görseli, `externalUrl`
3. Kart üzerindeki "Launch Tool" butonu kullanıcıyı o URL'e yönlendirir
4. **Bu projenin koduna başka hiçbir şey eklenmez**

---

## Önemli Notlar

- Bu klasör canlı sitedir; ayrı bir "dokunulmaz production dizini" yoktur
- Deploy hedefi her zaman `Rules/08_DEPLOYMENT_REGISTRY.md`'den çözülür, klasör adından değil
- Mor ve mavi renk kodları (`#8b5cf6`, `#06b6d4`, `#a855f7`) artık yasaktır
- SEO taslakları otomatik üretilir ama **otomatik yayınlanmaz** — admin onayı zorunludur

---

## UX Tasarım İlkeleri

### Hero Bölümü (Compact)

Hero bölümü kasıtlı olarak **minimal ve hızlı** tutulmuştur.

**Hedef:** Kullanıcı sayfaya girdiğinde 5 saniye içinde araçlara ulaşabilmeli.

| Alan | Kural |
|---|---|
| Hero yüksekliği | Navbar hariç ~120px (padding: 32px üst/20px alt) |
| Başlık | Tek satır, max 40 karakter, `nowrap` |
| Açıklama | Max 2 satır, `line-clamp: 2` |
| Filtreler | Hero'nun hemen altında, border yok, 8px gap |
| Kart grid | `minmax(300px, 1fr)`, 20px gap |
| Kart görseli | `padding-top: 44%` (16:7 oranı) — kısa tutulur |
| Mobil | `grid-template-columns: 1fr`, ilk kart scroll olmadan kısmen görünür |

**İçerik öncelik sırası (kart üzerinde):**
1. Araç adı (`pack-title`)
2. Ne yaptığı (`pack-subtitle`)
3. Free / Beta / New durumu (badge)
4. Open Tool / Download CTA (buton)

**Yasak:**
- Hero'ya animasyon, radial glow, büyük padding ekleme
- Başlığı 2 satıra taşıma
- Filtreler ile grid arasına boşluk koyma
- Kart görsel oranını 56%'nın üstüne çıkarma

