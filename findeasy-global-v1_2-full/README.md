# FindEasy Global v1.2 — Full Skeleton
**Bu sürüm**, aşağıdaki modülleri içerir ve doğrudan API anahtarları ile aktif edilebilir:
- Feeds: Shopify / WooCommerce JSON, Amazon / Booking affiliate (yapı hazır)
- Affiliate redirect + tıklama kaydı
- Dinamik fiyatlandırma + Deals sayfası
- PSP routing: TR=iyzico/PayTR, Global=Stripe Connect (iskelet)
- Güvenlik: Helmet, rate-limit, CORS, gzip, Joi, morgan
- Ops: Docker, docker-compose, Nginx conf, /healthz
- Admin: Ayarlar + Feed yönetimi

## Çalıştırma (lokal)
cp .env.example .env
npm install
npm run dev   # http://localhost:3000

Admin: http://localhost:3000/admin.html (X-Admin-Token gerekir)
Feeds Paneli: http://localhost:3000/feeds.html

## Canlı (özet)
docker compose up -d --build
Nginx reverse proxy + Certbot ile SSL → nginx.findeasy.conf örneği dahildir.
