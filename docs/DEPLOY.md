# Деплой MissionWeather

## 1. Сервер (API)

```bash
cp .env.example .env
docker compose up -d --build
```

Сервисы: `postgres`, `redis`, `api` (порт 3001).

## 2. Рабочий ПК (Web UI)

```powershell
npm install
# SERVER_API_URL=http://<ip-сервера>:3001  в .env
.\scripts\start-local.ps1
```

## 3. Production compose (опционально)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 4. Резервное копирование Postgres

```bash
docker compose exec postgres pg_dump -U mission missionweather > backup.sql
```

## 5. Healthcheck

- API: `GET /health`
- Redis/Postgres: `docker compose ps`
