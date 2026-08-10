# Деплой MissionWeather на мини-ПК

## 1. Подготовка

```bash
cp .env.example .env
# Заполните JWT_SECRET, ROUTERAI_API_KEY, ключи погоды
docker compose up -d
```

## 2. Production compose

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 3. Cloudflare Tunnel (Android извне)

1. Установите `cloudflared` на мини-ПК
2. `cloudflared tunnel create missionweather`
3. Направьте `weather.yourdomain.com` → `http://localhost:3000`
4. Направьте `api.yourdomain.com` → `http://localhost:3001`
5. В `.env`: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

## 4. Tailscale (альтернатива)

1. Установите Tailscale на mini-PC и Android
2. Используйте `http://100.x.x.x:3000` без публикации в интернет

## 5. Резервное копирование Postgres

```bash
docker compose exec postgres pg_dump -U mission missionweather > backup.sql
```

## 6. Capacitor APK

```bash
cd apps/mobile
npm install
npx cap sync android
npx cap open android
```

Соберите signed APK в Android Studio.

## 7. Healthcheck

- API: `GET /health`
- Провайдеры: `GET /weather/providers/health` (если включено)
- Redis/Postgres: через `docker compose ps`
