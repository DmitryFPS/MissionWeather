# Доступ по публичному IP (как http://20.23.5.75:3000)

MissionWeather уже слушает **порт 3000** — достаточно белого IP и открытого firewall.

## Azure VM (пример 20.23.x.x)

1. Создайте VM (Ubuntu или Windows), откройте **Inbound NSG** → TCP **3000**
2. Установите Docker, клонируйте репозиторий
3. `.env` → `JWT_SECRET`, `ROUTERAI_API_KEY`
4. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
5. Браузер: `http://<public-ip>:3000`

## Домашний ПК

1. `.\scripts\start-server.ps1`
2. `.\scripts\open-firewall.ps1`
3. Проброс порта **3000** на роутере → этот ПК
4. Внешний IP: https://api.ipify.org

## Безопасность

- Смените пароль admin после первого входа (когда будет UI смены пароля)
- Задайте длинный `JWT_SECRET` в `.env`
- Для production в интернете лучше добавить HTTPS (nginx + Let's Encrypt + домен)

## Один URL

| Путь | Сервис |
|------|--------|
| `/` | Web UI |
| `/api/*` | REST API |
| `/docs` | Swagger |

Телефону не нужен второй порт — всё через `:3000`.
