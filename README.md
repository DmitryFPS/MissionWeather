# MissionWeather

**GO / CAUTION / NO-GO** для БПЛА наблюдения (1–10 ч).

Production-сервер: **один адрес** `http://IP:3000` — UI, API и Swagger (как `http://20.23.5.75:3000`, но с Docker, nginx, healthcheck и автоперезапуском).

## Запуск

```powershell
.\scripts\start-server.ps1
.\scripts\open-firewall.ps1   # один раз
```

| URL | Что |
|-----|-----|
| http://localhost:3000 | Web UI |
| http://localhost:3000/api/health | API |
| http://localhost:3000/docs | Swagger |
| http://192.168.x.x:3000 | LAN / телефон в Wi‑Fi |
| http://\<public-IP\>:3000 | Из интернета (VM + firewall) |

**Admin:** `admin@missionweather.local` / `admin123`

## Надёжность

- **nginx** — один вход, прокси на API и Web
- **healthcheck** — Docker перезапускает упавшие контейнеры
- **watchdog** — `.\scripts\watchdog.ps1` (можно в Планировщик задач каждые 5 мин)
- Postgres + Redis + 12 агрегаторов погоды + RouterAI

Подробнее: [docs/SERVER-PC.md](docs/SERVER-PC.md) · [docs/PUBLIC-IP.md](docs/PUBLIC-IP.md)

## Тесты

```powershell
npm run test -w @mission-weather/api
powershell -File scripts/human-runs.ps1
```
