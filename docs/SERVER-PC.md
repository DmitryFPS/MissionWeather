# Запуск MissionWeather на этом ПК (сервер)

## Быстрый старт

```powershell
cd C:\Users\adm\Projects\MissionWeather
copy .env.example .env
# В .env задайте ROUTERAI_API_KEY (у вас уже есть)
docker compose up -d --build
```

## Адреса

| Сервис | URL |
|--------|-----|
| **Web (UI)** | http://localhost:3000 |
| **API** | http://localhost:3001 |
| **Swagger** | http://localhost:3001/docs |
| **Admin** | admin@missionweather.local / admin123 |

## Доступ с других устройств в LAN (Windows / планшет)

1. Узнайте IP этого ПК: `ipconfig` → IPv4 (например `192.168.1.50`)
2. На другом устройстве в той же Wi‑Fi сети:
   - Web: **http://192.168.1.50:3000**
   - API подставится автоматически (тот же IP, порт 3001)
3. Разрешите порты **3000** и **3001** в брандмауэре Windows (если не открываются)

## Android вне дома (опционально)

**Cloudflare Tunnel** — «проброс» вашего localhost в интернет через Cloudflare без белого IP.
**Tailscale** — частная VPN-сеть: телефон и mini-ПК как будто в одной LAN.

Для работы **только дома** это не нужно — достаточно IP в LAN выше.

## Погода и карты

- **Погода:** 12 агрегаторов (Open-Meteo, MET Norway, AviationWeather и др.) — ключи не обязательны для бесплатных.
- **Карты:** OpenStreetMap (Leaflet) — без отдельного ключа.
- **ИИ:** RouterAI через `ROUTERAI_API_KEY` в `.env`.

## Команды

```powershell
docker compose ps          # статус
docker compose logs -f api # логи API
docker compose down        # остановить
docker compose up -d --build  # пересобрать
```

## Бэкап Postgres

```powershell
docker compose exec postgres pg_dump -U mission missionweather > backup.sql
```
