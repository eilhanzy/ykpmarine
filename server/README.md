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
- `WHITELIST_IPS`: Virgulle ayrilan IP adresleri.
- `ALLOW_PUBLIC_READ`: `false` olursa public okuma whitelist ister.
- `PUBLIC_WRITE_REQUIRES_WHITELIST`: `true` olursa public yazma whitelist ister.

## API Uclar

Public:
- `GET /api/public/listings`
- `GET /api/public/listings/:id`
- `POST /api/public/listings/:id/messages`
- `POST /api/public/listings/:id/comments`
- `POST /api/public/listings/:id/follow`
- `DELETE /api/public/listings/:id/follow`

Admin (whitelist gerekli):
- `GET /api/admin/listings`
- `POST /api/admin/listings`
- `PATCH /api/admin/listings/:id`
- `DELETE /api/admin/listings/:id`
- `GET /api/admin/messages`
- `GET /api/admin/comments`

## E-posta Bildirimi

SMTP bilgileri tanimlanirsa mesajlar `MAIL_TO` adresine yonlendirilir. Bilgi yoksa mesajlar loglanir.
