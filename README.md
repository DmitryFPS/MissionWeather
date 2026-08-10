# MissionWeather

Production-ready сервис **GO / CAUTION / NO-GO** для БПЛА наблюдения (1–10 ч).

## Запуск сервера на этом ПК (Docker)

```powershell
.\scripts\start-server.ps1
```

Или вручную:

```powershell
docker compose up -d --build
```

| URL | Описание |
|-----|----------|
| http://localhost:3000 | Web UI |
| http://localhost:3001 | API |
| http://localhost:3001/docs | Swagger |

**Admin:** `admin@missionweather.local` / `admin123`

Подробнее: [docs/SERVER-PC.md](docs/SERVER-PC.md)

## Стек

- NestJS + PostgreSQL + Redis + 12 weather aggregators
- Next.js PWA + OpenStreetMap (Leaflet)
- RouterAI advisor
- Docker Compose

## LAN-доступ

С телефона/планшета в той же Wi‑Fi: `http://<IP-этого-ПК>:3000`  
API определяется автоматически.

## Тесты

```powershell
npm run test -w @mission-weather/api
powershell -File scripts/human-runs.ps1
```
