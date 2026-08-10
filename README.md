# MissionWeather

Сервис погоды и решения **GO / CAUTION / NO-GO** для самолётного БПЛА наблюдения (полёты 1–10 ч).

## Стек

- **API:** NestJS, Clean Architecture (modular monolith)
- **Web:** Next.js PWA, адаптив (телефон / планшет / Windows)
- **БД:** PostgreSQL + PostGIS, Redis
- **Хост:** мини-ПК (Docker Compose)

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run dev:api
npm run dev:web
```

- API: http://localhost:3001
- Web: http://localhost:3000
- Swagger: http://localhost:3001/docs

## Структура

```
apps/api   — backend (domain, weather fusion, decision)
apps/web   — frontend PWA
```

## Лицензия

Private / DmitryFPS
