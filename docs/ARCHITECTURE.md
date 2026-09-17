# Архітектура

## Принципи

- Бекенд є джерелом істини. Користувачі, зустрічі, транскрипти, резюме, налаштування та промпти живуть на сервері. Застосунок є тонким клієнтом: звук, гарячі клавіші, оверлей, показ.
- Дві частини, один контракт. Застосунок і бекенд спілкуються лише через API, описаний нижче. Провайдери відомі тільки бекенду.
- Postgres для того, що має пережити все. Redis для того, що читається на кожен запит під час живої зустрічі, і для короткоживучих кодів.
- Ядро застосунку не знає про Tauri. `desktop/crates/core` компілюється й тестується без UI та без macOS.
- Усе платформне або зовнішнє ховається за інтерфейсом. Реалізацію обирає композиційний корінь.
- Файл робить одну річ і не перевищує приблизно 200 рядків. Модуль зростає розбиттям, а не подовженням.

## Структура репозиторію

```
docker-compose.yml             Postgres, Redis для розробки

backend/prisma/                schema.prisma, migrations
backend/src
  main.ts, app.module.ts
  common/
    config/        env.schema.ts через zod, validateEnv
    decorators/    Public, GetCurrentUserId, GetCurrentUser
    dto/           спільні response-класи
    filters/       глобальний фільтр помилок
    guards/        AtGuard, RtGuard, GoogleGuard, SubscriptionGuard
    types/         express.d.ts
  infrastructure/
    prisma/        PrismaService на @prisma/adapter-pg, @Global
    redis/         RedisService на ioredis, @Global
    hashing/       HashingService на argon2
    llm/           LlmProvider, AnthropicLlmProvider
    stt/           SttProvider, DeepgramSttProvider
  modules/
    auth/          email і пароль, JWT, Google, вхід для застосунку
    user/          профіль
    settings/      стиль, мова та профіль за замовчуванням
    meetings/      зустрічі, MeetingStateStore над Redis
    stt/           WebSocket-шлюз
    context/       ContextWindow, Summarizer
    generation/    SSE-генерація, PromptBuilder, prompts
    usage/         UsageRecorder
    health/

desktop/crates/core/src
  domain/        Meeting, TranscriptSegment, Speaker, Language, MeetingProfile, Generation, GenerationMode, UserSettings
  audio/         AudioSource, AudioFrame, resample, level
  backend/       BackendApi, BackendEndpoint, auth, http, stt_stream, sse
  session/       Session, SessionState, transcript view
  settings/      LocalSettings, defaults, SecretStore
  access/        AccessPolicy, Entitlement, always_allowed
  error.rs

desktop/crates/platform-macos/src
  system_audio/  AudioSource на ScreenCaptureKit
  permissions/   дозволи мікрофона та запису екрана

desktop/src-tauri/src
  app/           AppState, композиція ядра, життєвий цикл
  commands/      тонкі Tauri-команди, по файлу на область
  events.rs      назви подій та payload-типи
  windows/       головне вікно, оверлей, content protection
  hotkeys/       глобальні комбінації
  deep_link/     обробка meetcopilot://auth

desktop/src
  app/           маршрутизація, провайдери
  features/      auth, session, transcript, answer, settings, history, access
  shared/        ipc, ui, store, lib, i18n
```

## Контракт API

Базовий префікс `/api/v1`. Маршрути без `@Public()` вимагають access-токен: куку `accessToken` для вебу або `Authorization: Bearer` для застосунку.

### Авторизація

- `POST /auth/register` `{ email, name, password }` → куки, `{ message }`
- `POST /auth/login` `{ email, password }` → куки, `{ message }`
- `POST /auth/refresh` → куки, `{ message }`. Бере refresh-токен із куки
- `POST /auth/logout` → видаляє сесію й очищає куки
- `GET /auth/google` і `GET /auth/google/callback` → куки й редірект на фронтенд
- `GET /auth/google/desktop` → відкривається в браузері, після успіху редірект на `meetcopilot://auth?code=...`
- `POST /auth/desktop/exchange` `{ code }` → `{ accessToken, refreshToken, expiresIn }`
- `POST /auth/desktop/refresh` `{ refreshToken }` → нова пара токенів

Веб і застосунок розділяє параметр `state` у Google-потоці. Одноразовий код живе в Redis 60 секунд і згорає при обміні.

Сесії зберігаються в таблиці `auth_sessions`, по рядку на пристрій, тому вхід із застосунку не вибиває вебсесію. Refresh-токен зберігається лише як argon2-хеш, а його ідентифікатор сесії їде в обох токенах. Повторне використання старого refresh-токена трактується як компрометація: сесія видаляється.

### Користувач і налаштування

- `GET /users/me` → профіль
- `GET /settings` → `{ style, defaultLanguage, defaultProfile }`
- `PUT /settings` з тим самим тілом

### Зустрічі

- `POST /meetings` `{ profile, language, title? }` → `{ id, status, startedAt }`
- `POST /meetings/:id/finish` → `{ id, status, endedAt }`
- `GET /meetings` → список без транскриптів, новіші першими
- `GET /meetings/:id` → зустріч, `summary`, `segments`, `generations`, `usage`

Значення: `profile` це `daily | interview_candidate | client_call`, `language` це `uk | en | ru`, `mode` це `reply | alternative`, `speaker` це `me | other`.

### WebSocket `/meetings/:id/stt?speaker=me`

Клієнт шле бінарні фрейми PCM 16 kHz mono i16. Бекенд шле JSON `{ type: "partial" | "final", id, speaker, text, start, duration }` або `{ type: "error", message }`. Мова береться зі зустрічі. Коди закриття: 4401 невірний токен, 4403 немає підписки, 4404 невідома або завершена зустріч.

### `POST /meetings/:id/generate` → SSE

Тіло `{ mode }`. Події: `delta { text }`, `done { generationId, stopReason, usage }`, `error { message }`. Для `alternative` бекенд бере попередню відповідь із власного стану.

### `GET /health`

Публічний, `{ status, postgres, redis }`.

## Бекенд

### Межі

- `AtGuard` глобальний через `APP_GUARD`, `@Public()` знімає його. Далі `SubscriptionGuard`, який у першій версії пропускає всіх, а потім читає статус підписки. Ніякий інший код не читає заголовки чи куки авторизації.
- Сервіси містять правила, репозиторії містять усі запити Prisma. Сервіс ніколи не інжектить `PrismaService`.
- Кожен метод, що працює зі зустріччю, приймає `userId` і шукає `where: { id, userId }`. Промах це `NotFoundException`, не 403.
- `UsageRecorder` викликається після кожної генерації, резюмування та STT-потоку.
- `MeetingStateStore` є єдиним місцем, яке знає ключі Redis зустрічей.
- Модулі імпортують один одного лише через `index.ts`.

### Дані

Postgres (Prisma, таблиці й колонки в snake_case через `@map`):

```
User            id, email, name, createdAt, updatedAt
UserCredentials userId, hashedPassword?, googleId?
AuthSession     id, userId, hashedRt, client, expiresAt, createdAt
UserSettings    userId, style?, defaultLanguage, defaultProfile
Meeting         id, userId, profile, language, title, status, summary?, startedAt, endedAt?
Segment         id, meetingId, speaker, text, startMs, durationMs, createdAt
Generation      id, meetingId, mode, output, stopReason, inputTokens, cacheReadTokens,
                cacheCreationTokens, outputTokens, createdAt
UsageEvent      id, userId, meetingId?, kind, model?, tokens..., audioSeconds?, createdAt
```

Redis:

```
meeting:{id}:state           hash: status, language, profile, style, lastAnswer
meeting:{id}:window          list: свіжі фінальні сегменти як JSON
meeting:{id}:summary         string
meeting:{id}:summarize:lock  string з TTL
settings:{userId}            кеш налаштувань
desktop:auth:{code}          userId, TTL 60 секунд
```

Усе, що в Redis, відновлюється з Postgres, тому втрата Redis не втрачає дані, а лише живий контекст поточних зустрічей.

### Потік живої зустрічі

1. `POST /meetings` створює рядок і `state` у Redis зі стилем із налаштувань на момент старту, щоб системний блок промпта не змінювався протягом зустрічі.
2. Кожне WebSocket-з'єднання відкриває потік у `SttProvider`. Фінальні сегменти пишуться в Postgres і у `window`. Проміжні лише повертаються клієнту.
3. Після кожного фінального сегмента `Summarizer` перевіряє, чи частина поза вікном перевищила поріг. Якщо так і блокування вільне, він фоново стискає її, зливає з резюме, обрізає вікно, оновлює `Meeting.summary`.
4. `generate` читає стан, резюме і вікно, будує промпт, стрімить відповідь, зберігає генерацію і останню відповідь.
5. `finish` закриває активні потоки, ставить статус і TTL на ключі.

### PromptBuilder

Порядок від стабільного до змінного, щоб кеш промпта працював: системний блок (персона, промпт профілю, стиль зі стану зустрічі) із `cache_control`, потім резюме, вікно сегментів як рядки `[me] ...` і `[other] ...`, попередня відповідь для `alternative`, інструкція режиму, інструкція мови. Персона, промпти профілів і дефолтний стиль лежать у `modules/generation/prompts/` як файли даних.

## Застосунок

### Ключові типи

```rust
enum Speaker { Me, Other(Option<SpeakerId>) }
enum Language { Uk, En, Ru }
enum MeetingProfile { Daily, InterviewCandidate, ClientCall }
enum GenerationMode { Reply, Alternative }

struct AudioFrame { speaker: Speaker, samples: Vec<i16>, captured_at: Instant }
struct TranscriptSegment { id, speaker, text, start_ms, duration_ms, is_final }
struct Meeting { id, profile, language, title, status, started_at, ended_at }
struct MeetingDetails { meeting, summary, segments, generations, usage }
struct UserSettings { style, default_language, default_profile }
struct LocalSettings { backend_url, hotkeys, input_device }
struct Tokens { access_token, refresh_token, expires_in }
enum Entitlement { Allowed, Denied(DenialReason) }
```

### Трейти

```rust
trait AudioSource {
    fn start(&mut self, sink: mpsc::Sender<AudioFrame>) -> Result<()>;
    fn stop(&mut self) -> Result<()>;
}

trait BackendApi {
    async fn health(&self) -> Result<Health>;
    async fn exchange_code(&self, code: &str) -> Result<Tokens>;
    async fn me(&self) -> Result<Profile>;
    async fn settings(&self) -> Result<UserSettings>;
    async fn save_settings(&self, settings: &UserSettings) -> Result<()>;
    async fn create_meeting(&self, profile: MeetingProfile, language: Language) -> Result<Meeting>;
    async fn finish_meeting(&self, id: &MeetingId) -> Result<Meeting>;
    async fn list_meetings(&self) -> Result<Vec<Meeting>>;
    async fn meeting(&self, id: &MeetingId) -> Result<MeetingDetails>;
    async fn open_stt(&self, id: &MeetingId, speaker: Speaker) -> Result<Box<dyn SttStream>>;
    fn generate(&self, id: &MeetingId, mode: GenerationMode) -> BoxStream<'_, Result<Delta>>;
}

trait SttStream {
    async fn send(&mut self, frame: &AudioFrame) -> Result<()>;
    async fn next(&mut self) -> Option<SttEvent>;
    async fn close(self: Box<Self>) -> Result<()>;
}

trait AccessPolicy {
    async fn check(&self) -> Result<Entitlement>;
}

trait SecretStore {
    fn get(&self, key: SecretKey) -> Result<Option<SecretString>>;
    fn set(&self, key: SecretKey, value: SecretString) -> Result<()>;
    fn delete(&self, key: SecretKey) -> Result<()>;
}
```

`BackendApi` має одну реалізацію на `reqwest` і `tokio-tungstenite` та фейк для тестів. Вона сама оновлює access-токен по refresh при 401 і зберігає нову пару в `SecretStore`.

### Сесія

`Session` володіє всім, що живе між стартом і стопом: джерелами звуку, STT-потоками, транскриптом для показу. Стан:

```
Idle → Starting → Listening → Stopping → Idle
```

Кожен перехід публікується подією `session:state`. Помилка на етапі `Starting` повертає в `Idle` з описом причини і завершує зустріч на бекенді, якщо вона вже створена. Перед `Starting` викликається `AccessPolicy::check`.

Аудіоконвеєр на кожне джерело: `AudioSource` → ресемплер у 16 kHz mono i16 → фрейми по 100 мс → `SttStream`.

### IPC

Команди UI → Rust: `login`, `logout`, `auth_state`, `start_session`, `stop_session`, `generate`, `cancel_generation`, `list_meetings`, `get_meeting`, `get_local_settings`, `save_local_settings`, `get_user_settings`, `save_user_settings`, `check_backend`, `list_audio_devices`.

Події Rust → UI: `auth:state`, `session:state`, `audio:level`, `transcript:segment`, `generation:started`, `generation:delta`, `generation:finished`, `generation:failed`, `app:error`.

Назви подій і форми payload визначені один раз у `desktop/src-tauri/src/events.rs` і продубльовані типами в `desktop/src/shared/ipc/events.ts`.

### Вікна

- Головне вікно: вхід, керування сесією, транскрипт, історія, налаштування.
- Оверлей: маленьке вікно поверх усіх, без рамки, `set_content_protected(true)`, не забирає фокус.

## Безпека та підписка

Застосунок на диску користувача не є довіреним: будь-що всередині бінарника можна дістати, будь-яку локальну перевірку можна вирізати. Тому:

- Ключі провайдерів існують лише в `.env` бекенду. У застосунку є адреса бекенду й пара токенів у Keychain.
- Уся логіка продукту на бекенді: промпти, контекст, моделі, ліміти. Єдиний спосіб щось згенерувати це генерація для власної зустрічі.
- Вхід у застосунку йде через системний браузер і одноразовий код, а не через вбудовану форму з паролем. Так працює Google OAuth і так рекомендує RFC 8252.
- Підписка перевіряється на бекенді в `SubscriptionGuard`. `AccessPolicy` у застосунку існує лише для UI, щоб показати пейвол до 403.
- Транскрипти зберігаються на сервері. Для комерційної версії це вимагає політики приватності та можливості видалити зустріч і акаунт.

## Кросплатформність

Платформний код застосунку живе в `desktop/crates/platform-*`. Композиційний корінь обирає реалізацію через `cfg(target_os)`. Для Linux і Windows додається новий crate із `AudioSource` для системного звуку і, за потреби, свій модуль дозволів. Решта коду не змінюється.
