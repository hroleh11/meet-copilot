# Збірка й запуск

Цей документ описує, як зібрати обидві частини й перевірити їх на чистій машині. Рішення, що стоять за цими кроками, у `docs/ARCHITECTURE.md`.

## Що потрібно

- Node 24 і pnpm (через corepack, версія зафіксована в `packageManager`).
- Rust stable і Xcode Command Line Tools для застосунку.
- Docker з compose для бекенду.
- Для підпису: обліковий запис Apple Developer, сертифікат «Developer ID Application» і app-specific пароль або ключ App Store Connect.

## Бекенд

### Змінні

```
cp backend/.env.example backend/.env.production
printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env
```

- `backend/.env.production` тримає секрети застосунку: `AT_SECRET`, `RT_SECRET`, ключі Google, Deepgram і OpenAI. `DATABASE_URL` і `REDIS_URL` з нього не читаються: compose підставляє адреси сервісів сам.
- Кореневий `.env` читає compose. Там лежить пароль Postgres і, за потреби, `BACKEND_PORT` та `POSTGRES_USER`.
- Обидва файли ігноруються git.

### Запуск

```
docker compose -f docker-compose.prod.yml up -d --build
curl http://localhost:5070/api/v1/health
```

Порядок такий: Postgres і Redis піднімаються до готовності, сервіс `migrate` застосовує міграції (`prisma migrate deploy`) і завершується, і лише тоді стартує `backend`. Тому окремого кроку з міграціями під час деплою немає: досить `up -d --build`.

Образ збирається з `backend/Dockerfile` у чотири етапи: спільна база з pnpm, `build` з усіма залежностями (він же запускає міграції), `production-modules` лише з робочими залежностями і `runtime`, куди копіюються `dist` і ці залежності. Prisma CLI тягне за собою Studio і pglite, тому в робочому образі його немає: `--no-optional` відкидає необов'язкові peer-залежності, а міграції запускає образ етапу `build`.

Оновлення версії:

```
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f backend
```

## Застосунок

### Іконка

Джерело — `desktop/src-tauri/icons/icon.svg`. Після зміни:

```
rsvg-convert -w 1024 -h 1024 desktop/src-tauri/icons/icon.svg -o /tmp/icon.png
cd desktop && pnpm tauri icon /tmp/icon.png
```

Команда також створює набори для Android і iOS — їх у репозиторії не тримаємо, бо мобільних збірок немає.

### Збірка без підпису

```
cd desktop
pnpm tauri build --bundles app
```

Виходить `desktop/target/release/bundle/macos/Meet Copilot.app` з ad-hoc підписом. Такий бандл запускається лише на машині, де зібраний, і годиться для перевірки, а не для роздачі.

### Підпис і нотаризація

Tauri підписує й нотаризує сам, якщо в оточенні є змінні:

```
export APPLE_SIGNING_IDENTITY="Developer ID Application: Ім'я (TEAMID)"
export APPLE_ID="apple-id@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID"

cd desktop && pnpm tauri build
```

Замість `APPLE_ID` і `APPLE_PASSWORD` можна дати ключ App Store Connect: `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH`. На CI сертифікат передається як `APPLE_CERTIFICATE` (base64 файлу `.p12`) і `APPLE_CERTIFICATE_PASSWORD`.

Підпис іде з hardened runtime і `desktop/src-tauri/entitlements.plist`, де дозволено лише `com.apple.security.device.audio-input`. Дозвіл на запис екрана entitlement не має: його дає користувач у Системних налаштуваннях, і ScreenCaptureKit просить його при першому захопленні.

Перевірка готового бандла:

```
codesign -dv --entitlements - "target/release/bundle/macos/Meet Copilot.app"
spctl -a -vvv -t install "target/release/bundle/macos/Meet Copilot.app"
xcrun stapler validate "target/release/bundle/dmg/Meet Copilot_0.1.0_aarch64.dmg"
```

## Перевірка на чистій системі

На машині, де застосунок ніколи не запускався, і з обліковим записом без дозволів:

1. Встановити `.dmg`, перенести застосунок у «Програми», запустити. Gatekeeper не має скаржитися.
2. Увійти: email з паролем або Google, який відкриває браузер і повертається в застосунок за схемою `meetcopilot://`. У налаштуваннях за шестернею перевірити адресу сервера й звук: обидві смужки мають ворушитися після дозволів на мікрофон і запис екрана.
3. Почати зустріч, поговорити в мікрофон і дати звук із зустрічі: у транскрипті мають з'явитися обидві сторони.
4. Натиснути гарячу клавішу відповіді: оверлей показує відповідь і не видно її в демонстрації екрана.
5. Зупинити зустріч, відкрити «Історію»: зустріч на місці разом із транскриптом, відповідями й витратами.
6. Закрити застосунок під час зустрічі: у бекенді вона має стати `finished`.
7. Перевірити логи: `~/Library/Logs/com.meetcopilot.app/meet-copilot.<дата>.log`.
