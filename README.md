# MissionWeather

Production-ready сервис погоды и решения **GO / CAUTION / NO-GO** для самолётного БПЛА наблюдения (полёты 1–10 ч).

## Стек

- **API:** NestJS, Clean Architecture, PostgreSQL, Redis
- **Web:** Next.js PWA, Яндекс.Карты, адаптив UI
- **Mobile:** Capacitor (Android)
- **ИИ:** RouterAI (советник, не меняет вердикт)
- **12 агрегаторов погоды** с fusion, spread, circuit breaker

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run dev:api
npm run dev:web
```

- API: http://localhost:3001 · Swagger: http://localhost:3001/docs
- Web: http://localhost:3000
- Admin: `admin@missionweather.local` / `admin123`

## Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Подробнее: [docs/DEPLOY.md](docs/DEPLOY.md)

## Тесты

```bash
npm run test -w @mission-weather/api
npm run test:e2e -w @mission-weather/api
npm run build
```

## Структура

```
apps/api     — NestJS backend
apps/web     — Next.js PWA
apps/mobile  — Capacitor Android
```

## Лицензия

Private / DmitryFPS
