# Доступ с телефона в поле (сервер за сотни км)

Телефон в поле **не в вашей Wi‑Fi** → нужна **частная VPN**. Рекомендуем **Tailscale** (бесплатно до 100 устройств).

## Схема

```
[Телефон в поле, 4G/5G]  ←—— Tailscale VPN ——→  [Этот ПК-сервер + Docker]
         Chrome/PWA                              MissionWeather :3000
```

После настройки телефон открывает **http://100.x.x.x:3000** — как будто сервер рядом.

---

## Шаг 1. Сервер (этот ПК)

```powershell
cd C:\Users\adm\Projects\MissionWeather
.\scripts\setup-tailscale.ps1
```

Или вручную:

1. Скачайте **Tailscale** для Windows: https://tailscale.com/download/windows  
2. Установите, войдите (Google / Microsoft / email)  
3. В трее Tailscale → **Connected**  
4. Запомните **Tailscale IP** (формат `100.x.y.z`) — в приложении или:

```powershell
& "$env:ProgramFiles\Tailscale\tailscale.exe" ip -4
```

5. Откройте брандмауэр (скрипт делает автоматически):

```powershell
.\scripts\open-firewall.ps1
```

6. Docker должен быть запущен:

```powershell
docker compose up -d
```

**Проверка на сервере:** откройте `http://100.x.y.z:3000` в браузере этого ПК.

---

## Шаг 2. Android в поле

1. Google Play → **Tailscale** → установить  
2. Войти **тем же аккаунтом**, что на сервере  
3. Переключатель **Connected** = ON  
4. Chrome → `http://100.x.y.z:3000` (IP вашего сервера из шага 1)  
5. **Меню Chrome → «Добавить на главный экран»** — иконка как приложение  
6. Логин: `admin@missionweather.local` / `admin123`

API (`:3001`) подставится **автоматически** — тот же IP, другой порт.

---

## Шаг 3. Проверка в поле

1. **Отключите Wi‑Fi** на телефоне (только мобильный интернет)  
2. Tailscale ON  
3. Откройте закладку / иконку MissionWeather  
4. Панель → статус API **ok**, агрегаторов **12**  
5. Погода → **Рассчитать GO/NO-GO**  
6. Миссии → создать маршрут → **Оценить (temporal)**

---

## Если не открывается

| Проблема | Решение |
|----------|---------|
| Страница не грузится | Tailscale ON на обоих устройствах, один аккаунт |
| API offline | `docker compose ps` на сервере, порты 3000/3001 |
| Брандмауэр Windows | `.\scripts\open-firewall.ps1` |
| ПК уснул | Отключите сон: «Электропитание → сон: никогда» для сервера |

---

## Альтернатива: Cloudflare Tunnel

Если нужен адрес вида `https://weather.ваш-домен.ru` без VPN — см. `docs/DEPLOY.md`.  
Для поля **Tailscale проще и безопаснее**.

---

## Важно для сервера 24/7

- ПК не должен засыпать  
- Docker: `restart: unless-stopped` (уже настроено)  
- UPS желателен при отключении света
