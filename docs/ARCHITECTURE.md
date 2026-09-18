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
    llm/           LlmProvider, OpenAiLlmProvider
    stt/           SttProvider, DeepgramSttProvider
  modules/
    auth/          email і пароль, JWT, Google, одноразовий код для застосунку
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
  system_audio/  AudioSource на ScreenCaptureKit, делегат, розбір CMSampleBuffer
  permissions/   дозвіл на запис екрана

desktop/src-tauri/src
  app/           AppState, композиція ядра, життєвий цикл
  commands/      тонкі Tauri-команди, по файлу на область
  events.rs      назви подій та payload-типи
  windows/       головне вікно, оверлей, content protection
  hotkeys/       глобальні комбінації
  deep_link/     обробка meetcopilot://auth

desktop/src
  app/           оболонка головного вікна: шапка, вкладки «Зустріч», «Історія», «Налаштування»
  features/      auth, session, transcript, answer, settings, history, access
  shared/        ipc, ui, store, lib, i18n
```

## Контракт API

Базовий префікс `/api/v1`. Маршрути без `@Public()` вимагають `Authorization: Bearer`. Вебверсії немає, тому немає ні кук, ні CORS: єдиний клієнт це застосунок.

### Авторизація

- `POST /auth/register` `{ email, name, password }` → `{ accessToken, refreshToken, expiresIn }`
- `POST /auth/login` `{ email, password }` → пара токенів
- `POST /auth/refresh` `{ refreshToken }` → нова пара токенів
- `POST /auth/logout` → видаляє поточну сесію
- `GET /auth/google` → відкривається в системному браузері
- `GET /auth/google/callback` → редірект на `meetcopilot://auth?code=...`
- `POST /auth/exchange` `{ code }` → пара токенів

Одноразовий код живе в Redis 60 секунд і згорає при обміні.

Сесії зберігаються в таблиці `auth_sessions`, по рядку на пристрій, тому вхід із другої машини не вибиває першу. Refresh-токен зберігається лише як argon2-хеш, а ідентифікатор сесії їде в обох токенах. Повторне використання старого refresh-токена трактується як компрометація: сесія видаляється.

### Користувач і налаштування

- `GET /users/me` → профіль
- `GET /settings` → `{ style, defaultLanguage, defaultProfile }`
- `PUT /settings` з тим самим тілом

### Зустрічі

- `POST /meetings` `{ profile, language, title? }` → `{ id, status, startedAt }`
- `POST /meetings/:id/finish` → `{ id, status, endedAt }`
- `GET /meetings` → список без транскриптів, новіші першими
- `GET /meetings/:id` → зустріч, `summary`, `segments`, `generations`, `usage`

Бекенд віддає лише спожиті токени й секунди аудіо. Приблизну вартість рахує застосунок у `desktop/src/features/history/cost.ts`: тарифи лежать одним набором констант, бо точні гроші з'являться разом із підпискою і рахуватиме їх бекенд.

Значення: `profile` це `daily | interview_candidate | client_call`, `language` це `uk | en | ru`, `mode` це `reply | alternative`, `speaker` це `me | other`.

### WebSocket `/meetings/:id/stt?speaker=me`

Токен передається як `?token=`. Клієнт шле бінарні фрейми PCM 16 kHz mono i16. Бекенд шле JSON `{ type: "partial" | "final", id, speaker, text, startMs, durationMs }` або `{ type: "error", message }`. Мова береться зі зустрічі. Коди закриття: 1000 нормальне завершення після запиту клієнта, 4401 невірний токен, 4404 невідома або завершена зустріч чи невідомий спікер, 4500 збій розпізнавання.

Закінчує розмову клієнт текстовим повідомленням `{ "type": "finish" }`, а не розривом сокета. Deepgram віддає останню репліку лише після флашу, тому бекенд на `finish` закриває потік розпізнавання, дочікує записи фінальних сегментів, надсилає їх клієнту і аж тоді закриває сокет кодом 1000. Клієнт після `finish` читає сокет далі, поки той не закриється, з запобіжником у 5 секунд.

Це звичайний WebSocket-сервер, приєднаний до події `upgrade` HTTP-сервера, а не шлюз Nest: сирий PCM не має конверта `event`/`data`, якого чекає адаптер Nest, і ідентифікатор зустрічі потрібен у шляху. Deepgram теж викликається прямим WebSocket, без їхнього SDK.

### `POST /meetings/:id/generate` → SSE

Тіло `{ mode }`. Події: `delta { text }`, `done { generationId, stopReason, usage }`, `error { message }`. Для `alternative` бекенд бере попередню відповідь із власного стану. `usage` тут це лише токени `{ inputTokens, cachedInputTokens, outputTokens }`, без секунд аудіо: вони належать зустрічі, а не одній відповіді.

Це звичайний `POST` із ручним записом кадрів SSE, а не декоратор `@Sse()`: той працює лише на `GET` і не приймає тіло. Перевірка власника й статусу відбувається до відкриття потоку, тому помилка приходить звичайним HTTP-кодом, а не подією всередині стріму. Обрив з'єднання скасовує запит до провайдера, і часткова відповідь усе одно зберігається.

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
AuthSession     id, userId, hashedRt, expiresAt, createdAt
UserSettings    userId, style?, defaultLanguage, defaultProfile
Meeting         id, userId, profile, language, title, status, summary?, startedAt, endedAt?
Segment         id, meetingId, speaker, text, startMs, durationMs, createdAt
Generation      id, meetingId, mode, output, stopReason, inputTokens, cachedInputTokens,
                outputTokens, createdAt
UsageEvent      id, userId, meetingId?, kind, model?, tokens..., audioSeconds?, createdAt
```

Redis:

```
meeting:{id}:state           hash: language, profile, style, lastAnswer
meeting:{id}:window          list: свіжі фінальні сегменти як JSON
meeting:{id}:summary         string
meeting:{id}:summarize:lock  string з TTL
settings:{userId}            кеш налаштувань
login:code:{code}            userId, TTL 60 секунд
```

Усе, що в Redis, відновлюється з Postgres, тому втрата Redis не втрачає дані, а лише живий контекст поточних зустрічей.

### Потік живої зустрічі

1. `POST /meetings` створює рядок і `state` у Redis зі стилем із налаштувань на момент старту, щоб системний блок промпта не змінювався протягом зустрічі. Статус живе лише в Postgres, щоб не було двох джерел істини.
2. Кожне WebSocket-з'єднання відкриває потік у `SttProvider`. Фінальні сегменти пишуться в Postgres і у `window`. Проміжні лише повертаються клієнту.
3. Після кожного фінального сегмента `Summarizer` перевіряє, чи частина поза вікном перевищила поріг. Якщо так і блокування вільне, він фоново стискає її, зливає з резюме, обрізає вікно, оновлює `Meeting.summary`. Розпізнавання на це не чекає. Розпізнавання на це не чекає.
4. `generate` читає стан, резюме і вікно, будує промпт, стрімить відповідь, зберігає генерацію і останню відповідь.
5. `finish` закриває активні потоки, ставить статус і TTL на ключі.

### PromptBuilder

Порядок від стабільного до змінного, щоб кеш промпта працював: системний блок (персона, промпт профілю, стиль зі стану зустрічі), потім резюме, вікно сегментів як рядки `[me] ...` і `[other] ...`, попередня відповідь для `alternative`, інструкція режиму, інструкція мови. OpenAI кешує префікс автоматично, тому розмічати нічого не треба, але системний текст має лишатися незмінним байт у байт протягом зустрічі. Персона, промпти профілів і дефолтний стиль лежать у `modules/generation/prompts/` як файли даних.

## Застосунок

### Ключові типи

```rust
enum Speaker { Me, Other }
enum Language { Uk, En, Ru }
enum MeetingProfile { Daily, InterviewCandidate, ClientCall }
enum GenerationMode { Reply, Alternative }

struct AudioFrame { speaker: Speaker, samples: Vec<i16>, captured_at: Instant }
struct TranscriptSegment { id, speaker, text, start_ms, duration_ms }
struct Meeting { id, profile, language, title, status, started_at, ended_at }
struct MeetingDetails { meeting, summary, segments, generations, usage }
struct UserSettings { style, default_language, default_profile }
struct LocalSettings { backend_url, hotkeys, input_device }
struct Tokens { access_token, refresh_token, expires_in }
struct Secret(String)  // Debug prints Secret(***)
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
    async fn user_settings(&self) -> Result<UserSettings>;
    async fn save_user_settings(&self, settings: &UserSettings) -> Result<UserSettings>;
    async fn create_meeting(&self, profile: MeetingProfile, language: Language) -> Result<Meeting>;
    async fn finish_meeting(&self, id: &MeetingId) -> Result<Meeting>;
    async fn list_meetings(&self) -> Result<Vec<Meeting>>;
    async fn meeting(&self, id: &MeetingId) -> Result<MeetingDetails>;
    fn generate(&self, id: &MeetingId, mode: GenerationMode) -> BoxStream<'_, Result<Delta>>;
}

trait SttGateway {
    async fn open(&self, id: &MeetingId, speaker: Speaker) -> Result<SttLane>;
}

type SttLane = (Box<dyn SttSink>, Box<dyn SttEvents>);

trait SttSink {
    async fn send(&mut self, frame: &AudioFrame) -> Result<()>;
    async fn close(&mut self) -> Result<()>;
}

trait SttEvents {
    async fn next(&mut self) -> Option<SttEvent>;
}

trait AudioSources {
    fn microphone(&self, device_id: Option<String>) -> Box<dyn AudioSource>;
    fn system_audio(&self) -> Option<Box<dyn AudioSource>>;
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

`BackendApi` і `SttGateway` мають одну спільну реалізацію на `reqwest` і `tokio-tungstenite` та фейки для тестів. Вона сама оновлює access-токен по refresh при 401 і зберігає нову пару в `SecretStore`. Половини лінії розділені, бо доріжка одночасно пише звук і читає транскрипт.

### Сесія

`Session` володіє всім, що живе між стартом і стопом: джерелами звуку, STT-потоками, транскриптом для показу. Стан:

```
Idle → Starting → Listening → Stopping → Idle
```

Кожен перехід публікується подією `session:state`. Помилка на етапі `Starting` повертає в `Idle` з описом причини і завершує зустріч на бекенді, якщо вона вже створена. Перед `Starting` викликається `AccessPolicy::check`.

Аудіоконвеєр на кожне джерело: `AudioSource` → ресемплер у 16 kHz mono i16 → фрейми по 100 мс → `SttSink`.

Кожен спікер має свою доріжку. Обрив сокета не завершує зустріч: доріжка перевідкриває лінію з тією ж зустріччю, до п'яти спроб із наростаючою паузою; 4401 і 4404 не повторюються. Якщо джерело звуку замовкає назовсім, доріжка каже про це транскриптом і зупиняється. Відсутній звук співрозмовника не блокує старт: зустріч іде з одним мікрофоном, а причина повертається в `startedSession.systemAudioProblem`.

Стоп просить кожну лінію завершитись і дочитує її до кінця, інакше остання репліка втрачається: бекенд віддає її вже після запиту на закриття.

### Генерація

`Generator` живе поза сесією і тримає лише поточний запит. Старт скасовує попередній через його токен, перевіряє `AccessPolicy`, відкриває SSE-потік і шле в UI `Started`, далі `Delta` по шматку тексту, наприкінці `Finished` або `Failed`. Скасування просто кидає потік: розрив з'єднання доходить до бекенду, і той зберігає часткову відповідь.

HTTP-клієнт для генерації окремий, без загального таймаута: відповідь пишеться стільки, скільки треба, а межа стоїть лише на встановлення з'єднання. Потік закінчується подією `done`; якщо тіло обірвалось раніше, UI лишає написане і показує, що відповідь не дописана.

Гарячі клавіші беруться з локальних налаштувань і перереєструються при їх збереженні. Клавіша «відповісти» і клавіша «інший варіант» різні, третя показує або ховає оверлей.

### IPC

Команди UI → Rust: `start_login`, `complete_login`, `logout`, `auth_state`, `session_state`, `start_session`, `stop_session`, `generate`, `cancel_generation`, `list_meetings`, `get_meeting`, `get_local_settings`, `save_local_settings`, `get_user_settings`, `save_user_settings`, `check_backend`, `list_audio_devices`, `start_audio_check`, `stop_audio_check`.

Події Rust → UI: `auth:state`, `session:state`, `audio:level`, `source:status`, `transcript:segment`, `generation:started`, `generation:delta`, `generation:finished`, `generation:failed`, `app:error`.

`source:status` приходить по одній події на джерело одразу після старту зустрічі: `{ speaker, active }`. UI показує з них статуси мікрофона й звуку зустрічі і забуває їх, коли зустріч закінчується.

Назви подій і форми payload визначені один раз у `desktop/src-tauri/src/events.rs` і продубльовані типами в `desktop/src/shared/ipc/events.ts`.

### Вікна

- Головне вікно: вхід, керування сесією, транскрипт, історія, налаштування.
- Оверлей: маленьке вікно поверх усіх, без рамки, `set_content_protected(true)`, не забирає фокус і не з'являється в Dock. Вікно оголошене в `tauri.conf.json` як прихованим, має власну точку входу `overlay.html` і власний набір дозволів. Прозорість не вмикаємо: на macOS вона тягне приватний API.

## Безпека та підписка

Застосунок на диску користувача не є довіреним: будь-що всередині бінарника можна дістати, будь-яку локальну перевірку можна вирізати. Тому:

- Ключі провайдерів існують лише в `.env` бекенду. У застосунку є адреса бекенду й пара токенів: у релізі в Keychain, у debug-збірці у файлі з правами `0600`, бо ad-hoc підпис змінюється з кожною збіркою і Keychain питає пароль щоразу.
- Уся логіка продукту на бекенді: промпти, контекст, моделі, ліміти. Єдиний спосіб щось згенерувати це генерація для власної зустрічі.
- Вхід через Google йде через системний браузер і одноразовий код, а не через вбудований webview. Так рекомендує RFC 8252, і Google інакше не дозволяє.
- Підписка перевіряється на бекенді в `SubscriptionGuard`. `AccessPolicy` у застосунку існує лише для UI, щоб показати пейвол до 403.
- Транскрипти зберігаються на сервері. Для комерційної версії це вимагає політики приватності та можливості видалити зустріч і акаунт.

## Надійність

- Прострочені `auth_sessions` прибирає `ExpiredSessionsCleaner` щогодини, «завислі» зустрічі закриває `StaleMeetingsCloser` кожні пів години. Зустріч вважається завислою, коли її ключ `meeting:{id}:alive` у Redis зник: потік розпізнавання оновлює його, поки йде звук, тому довга, але жива зустріч не обривається. TTL ключа й поріг віку беруться з `LIVE_MEETING_IDLE_SECONDS`.
- Межі на провайдерів у конфігу: `LLM_TIMEOUT_MS` на запит до OpenAI і `STT_CONNECT_TIMEOUT_MS` на рукостискання з Deepgram. Стрім відповіді не обмежений: таймаут стоїть на встановлення з'єднання.
- `MAX_REQUEST_BODY_BYTES` обмежує тіло запиту. Помилка парсера тіла має власний статус, тому фільтр віддає її як 413 у тій самій формі помилки, а не як 500.
- Застосунок пише логи через `tracing` у `app_log_dir` із добовою ротацією і сімома файлами історії. Секрети туди не потрапляють: `Secret` друкується як `Secret(***)`.
- Вихід із застосунку проходить через `RunEvent::Exit`: він зупиняє перевірку звуку й сесію, тобто завершує зустріч на бекенді, з межею в 5 секунд. Перемикання вкладок у вікні на сесію не впливає.
- HTTP-транспорт ядра повторює запит тричі з експоненційною паузою, але лише коли це таймаут, збій з'єднання або 5xx. Відмову на кшталт 404 чи 409 не повторюємо.

## Кросплатформність

Платформний код застосунку живе в `desktop/crates/platform-*`. Композиційний корінь обирає реалізацію через `cfg(target_os)`. Для Linux і Windows додається новий crate із `AudioSource` для системного звуку і, за потреби, свій модуль дозволів. Решта коду не змінюється.
