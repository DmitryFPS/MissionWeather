# Сервер MissionWeather

Один порт **3000** — как простой `http://IP:3000`, но внутри:

```
Клиент → nginx:3000 → Web (UI) или /api → NestJS → Postgres + Redis
```

## Запуск

```powershell
.\scripts\start-server.ps1
.\scripts\open-firewall.ps1
.\scripts\server-status.ps1
```

## Сравнение с «просто node :3000»

| | Простой :3000 | MissionWeather |
|--|---------------|----------------|
| UI + API | один процесс | раздельно, nginx |
| База данных | часто нет | Postgres + Redis |
| Падение процесса | всё лежит | restart + healthcheck |
| Погода | 1 источник | 12 агрегаторов |
| GO/NO-GO | нет | DecisionEngine |
| ИИ-совет | нет | RouterAI |

## LAN (телефон в Wi‑Fi)

`http://<IP-сервера>:3000` — один URL, API через `/api`.

## Публичный IP (Azure / VPS, как 20.23.5.75)

См. [PUBLIC-IP.md](PUBLIC-IP.md).

## Watchdog

```powershell
# Планировщик задач Windows — каждые 5 мин:
powershell -File C:\Users\adm\Projects\MissionWeather\scripts\watchdog.ps1
```

## Команды

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose logs -f gateway
docker compose down
```
