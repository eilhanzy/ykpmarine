# YKP Marine Web Projesi

YKP Marine icin hazirlanan statik web sitesi ve Node.js tabanli API/admin paneli.

## Icerik
- Statik site: `index.html` ve diger sayfalar
- API ve admin: `server/`
- Stil: `css/`
- Scriptler: `js/`

## Gereksinimler
- Node.js (LTS)
- npm

## Hizli Baslangic

```bash
cd /home/eilhanzy/ykpmarine/ykpmarine.com.tr/server
cp .env.example .env
npm install
npm start
```

Sunucu calistiginda:
- Site: `http://localhost:3000/`
- Admin panel: `http://localhost:3000/admin.html`

## Docker

Docker imaji Nginx ile statik dosyalari servis eder ve `/api` isteklerini Node.js'e yonlendirir.

```bash
docker build -t ykp-marine .
docker run --name ykp-marine -p 3000:3000 --env-file server/.env ykp-marine
```

Veri kaliciligi icin `server/data` dizinini volume olarak baglayabilirsiniz.

## Docker Compose / RunTipi

```bash
docker compose up -d --build
```

RunTipi icin `docker-compose.yml` dosyasini kullanabilirsiniz. Ortam degiskenleri icin `server/.env` dosyasini olusturun.

## API Ortami (.env)

```bash
PORT=3000
ALLOW_PUBLIC_READ=true
PUBLIC_WRITE_REQUIRES_WHITELIST=false
WHITELIST_KEYS=
WHITELIST_KEY_HASHES=
WHITELIST_IPS=
KEYGEN_ALLOWED_IPS=127.0.0.1,::1
MAIL_TO=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### Whitelist
- `WHITELIST_KEYS`: Virgulle ayrilan API anahtarlari (admin uclari icin zorunlu).
- `WHITELIST_KEY_HASHES`: SHA-256 ile hashlenmis anahtarlar (onerilen).
- `WHITELIST_IPS`: Virgulle ayrilan IP adresleri.
- `KEYGEN_ALLOWED_IPS`: Anahtar uretme ucu icin izinli IP listesi.
- `ALLOW_PUBLIC_READ=false` olursa public okuma da whitelist ister.
- `PUBLIC_WRITE_REQUIRES_WHITELIST=true` olursa public yazma whitelist ister.

## API Anahtari Uretme (SHA-256)

```bash
node server/scripts/generate-key.js
```

Cikti olarak verilen `SHA-256` degerini `.env` dosyasinda `WHITELIST_KEY_HASHES` alanina yazin.
Admin panelde kullanacaginiz anahtar ise `API Key` satiridir.

Opsiyonel olarak, sadece izinli IP'lerden ve mevcut admin anahtariyla:

```bash
curl -X POST http://localhost:3000/api/admin/keys \\
  -H 'x-api-key: ADMIN_API_KEY'
```

Bu ucu aktif etmek icin `KEYGEN_ALLOWED_IPS` alanini doldurun.
Reverse proxy kullaniyorsaniz, allowlist icine proxy IP adresini de ekleyin.

## Ana Uclar

Public:
- `GET /api/public/listings`
- `GET /api/public/listings/:id`
- `POST /api/public/listings/:id/messages`
- `POST /api/public/listings/:id/comments`
- `POST /api/public/listings/:id/follow`
- `DELETE /api/public/listings/:id/follow`

Admin (whitelist):
- `POST /api/admin/keys`
- `GET /api/admin/listings`
- `POST /api/admin/listings`
- `PATCH /api/admin/listings/:id`
- `DELETE /api/admin/listings/:id`
- `GET /api/admin/messages`
- `GET /api/admin/comments`

## Admin Panel
`admin.html` uzerinden API anahtari kaydedilir, ilan ekleme/silme ve mesaj takibi yapilir.

## Karanlik Mod
Tema butonu header alanindadir. Secim `localStorage` icinde `ykpTheme` anahtariyla saklanir.

## Veri Depolama
Veriler `server/data/db.json` dosyasinda saklanir. Isterseniz bu dosyayi manuel duzenleyebilir veya admin paneli ile yonetebilirsiniz.

## E-posta Yonlendirme
SMTP bilgileri girilirse ilanlara gelen mesajlar `MAIL_TO` adresine yonlendirilir.
