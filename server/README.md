# YKP Marine API

## Kurulum

```bash
cd server
cp .env.example .env
npm install
npm start
```

## Yonetim (Whitelist)

- `WHITELIST_KEYS`: Virgulle ayrilan API anahtarlari.
- `WHITELIST_KEY_HASHES`: SHA-256 ile hashlenmis anahtarlar (onerilen).
- `WHITELIST_IPS`: Virgulle ayrilan IP adresleri.
- `KEYGEN_ALLOWED_IPS`: Anahtar uretme ucu icin izinli IP listesi.
- `ALLOW_PUBLIC_READ`: `false` olursa public okuma whitelist ister.
- `PUBLIC_WRITE_REQUIRES_WHITELIST`: `true` olursa public yazma whitelist ister.

## API Anahtari Uretme (SHA-256)

```bash
node scripts/generate-key.js
```

Cikti olarak verilen `SHA-256` degerini `.env` dosyasinda `WHITELIST_KEY_HASHES` alanina yazin.

Opsiyonel olarak, sadece izinli IP'lerden ve mevcut admin anahtariyla:

```bash
curl -X POST http://localhost:3000/api/admin/keys \\
  -H 'x-api-key: ADMIN_API_KEY'
```

Bu ucu aktif etmek icin `KEYGEN_ALLOWED_IPS` alanini doldurun.
Reverse proxy kullaniyorsaniz, allowlist icine proxy IP adresini de ekleyin.

## API Uclar

Public:
- `GET /api/public/listings`
- `GET /api/public/listings/:id`
- `POST /api/public/listings/:id/messages`
- `POST /api/public/listings/:id/comments`
- `POST /api/public/listings/:id/follow`
- `DELETE /api/public/listings/:id/follow`

Admin (whitelist gerekli):
- `POST /api/admin/keys`
- `GET /api/admin/listings`
- `POST /api/admin/listings`
- `PATCH /api/admin/listings/:id`
- `DELETE /api/admin/listings/:id`
- `GET /api/admin/messages`
- `GET /api/admin/comments`

## E-posta Bildirimi

SMTP bilgileri tanimlanirsa mesajlar `MAIL_TO` adresine yonlendirilir. Bilgi yoksa mesajlar loglanir.
