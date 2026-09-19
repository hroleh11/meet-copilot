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
    chat/          чати по завершеній зустрічі, ChatAgent та інструменти по ній
    usage/         UsageRecorder
    health/

desktop/crates/core/src
  domain/        Meeting, TranscriptSegment, Speaker, Language, MeetingProfile, Generation, GenerationMode, UserSettings
  audio/         AudioSource, AudioFrame, resample, level
  backend/       BackendApi, BackendEndpoint, auth, http, stt_stream, sse
  session/       Session, SessionState, transcript view
  screenshot/    ScreenCapture, Screenshot, стиснення знімка
  settings/      LocalSettings, defaults, SecretStore
  access/        AccessPolicy, Entitlement, always_allowed
  error.rs

desktop/crates/platform-macos/src
  capture_kit/   спільне для ScreenCaptureKit: перелік вмісту, ThreadSafe
  system_audio/  AudioSource на ScreenCaptureKit, делегат, розбір CMSampleBuffer
  screen_capture/ ScreenCapture на SCScreenshotManager, розбір CGImage
  permissions/   дозвіл на запис екрана

desktop/src-tauri/src
  app/           AppState, композиція ядра, життєвий цикл
  commands/      тонкі Tauri-команди, по файлу на область
  events.rs      назви подій та payload-типи
  windows/       головне вікно, оверлей, content protection
  hotkeys/       глобальні комбінації
  deep_link/     обробка meetcopilot://auth

desktop/src
  main.tsx, overlay.tsx, selection.tsx   по точці входу на вікно
  app/           екрани головного вікна та оболонка оверлея
  features/      auth, session, generation, settings, history, chat, access
  shared/theme/  tokens.css, згенерований із дизайн-системи
  shared/        ipc, ui, store, lib, i18n
```

## Контракт API

Базовий префікс `/api/v1`. Маршрути без `@Public()` вимагають `Authorization: Bearer`. Вебверсії немає, тому немає ні кук, ні CORS: єдиний клієнт це застосунок.

### Авторизація

- `POST /auth/register` `{ email, name, password }` → `{ accessToken, refreshToken, expiresIn }`. Застосунок цей маршрут не викликає: у макеті входу немає поля імені, а бекенд вимагає його.
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
- `GET /meetings?limit&cursor` → сторінка списку без транскриптів, новіші першими. Курсор це id останньої зустрічі на екрані, а кінець списку видно з того, що сторінка прийшла коротшою за `limit`, тож окремої обгортки з `hasMore` немає
- `GET /meetings/:id` → зустріч, `overview`, `segments`, `generations`, `usage`
- `GET /meetings/:id/chats?query=` → чати по цій зустрічі, останній змінений першим. `query` шукає і по назві чату, і по тому, що в ньому питали
- `POST /meetings/:id/chats` → новий чат по цій зустрічі
- `GET /meetings/:id/chats/:chatId` → питання й відповіді цього чату, старіші першими
- `POST /meetings/:id/chats/:chatId` `{ question }` → SSE зі стрімом відповіді, як у генерації
- `DELETE /meetings/:id/chats/:chatId` → видаляє чат разом з усім, що в ньому питали

Бекенд віддає лише спожиті токени й секунди аудіо. Приблизну вартість рахує застосунок у `desktop/src/features/history/cost.ts`: тарифи лежать одним набором констант, бо точні гроші з'являться разом із підпискою і рахуватиме їх бекенд.

Значення: `profile` це `daily | interview_candidate | client_call`, `language` це `uk | en | ru`, `mode` це `reply | alternative`, `speaker` це `me | other`.

### WebSocket `/meetings/:id/stt?speaker=me`

Токен передається як `?token=`. Клієнт шле бінарні фрейми PCM 16 kHz mono i16. Бекенд шле JSON `{ type: "partial" | "final", id, speaker, text, startMs, durationMs }` або `{ type: "error", message }`. Мова береться зі зустрічі. Коди закриття: 1000 нормальне завершення після запиту клієнта, 4401 невірний токен, 4404 невідома або завершена зустріч чи невідомий спікер, 4500 збій розпізнавання.

Закінчує розмову клієнт текстовим повідомленням `{ "type": "finish" }`, а не розривом сокета. Deepgram віддає останню репліку лише після флашу, тому бекенд на `finish` закриває потік розпізнавання, дочікує записи фінальних сегментів, надсилає їх клієнту і аж тоді закриває сокет кодом 1000. Клієнт після `finish` читає сокет далі, поки той не закриється, з запобіжником у 5 секунд.

Це звичайний WebSocket-сервер, приєднаний до події `upgrade` HTTP-сервера, а не шлюз Nest: сирий PCM не має конверта `event`/`data`, якого чекає адаптер Nest, і ідентифікатор зустрічі потрібен у шляху. Deepgram теж викликається прямим WebSocket, без їхнього SDK.

### `POST /meetings/:id/chats/:chatId` → SSE

Питання до завершеної зустрічі. Чатів по одній зустрічі може бути скільки завгодно, кожен зі своєю історією; назву чат отримує з першого питання і більше її не міняє.

Модель не отримує готову витяжку, а сама працює зустріч інструментами: `meeting_facts` (коли почалась і скінчилась, скільки тривала, скільки говорила кожна сторона, скільки реплік і відповідей), `search_transcript`, `read_transcript` і `list_answers`. Через це питання на кшталт «скільки тривала зустріч» має відповідь, а довгий транскрипт не треба запихати в промпт цілком: короткий їде разом із ним, довгий читається інструментами. Цикл живе в `ChatAgent` і має межу в шість ходів; кожен наступний хід продовжує попередній через `previous_response_id`, тому провайдер тримає своє міркування, а назад їдуть лише результати інструментів.

Усе, що зустріч наговорила, приходить до моделі в тегах `<notes>`, `<facts>`, `<transcript>`, `<question>` і в результатах інструментів, а системний промпт каже, що це матеріал, а не інструкції: вказівки, ролі й прохання, знайдені всередині, не виконуються. Самі теги вирізаються з вмісту в `chat/untrusted.ts`, щоб текст із зустрічі не міг закрити огорожу й заговорити від нашого імені.

Обмін зберігається в `chat_messages`, тому історія чату є при наступному відкритті, а токени всіх ходів сумуються і йдуть у `UsageRecorder` з видом `chat`. Формат подій той самий, що в генерації, тільки `done` несе `messageId`, тож розбір SSE у ядрі розділений: спільний `sse::frames` віддає кадри, а кожна фіча читає свій `done`.

### Резюме зустрічі

`Meeting.summary` це щільні нотатки, якими живиться копайлот під час зустрічі, і читати їх людині нема сенсу. Для екрана є `Meeting.overview`: максимум три речення про те, чим була зустріч, без переказу питань і відповідей. Пише його `MeetingOverviewWriter` у модулі зустрічей моделлю резюме — один раз, після завершення. `finish` запускає його у фоні, `GET /meetings/:id` дочікується, якщо тексту ще немає, а спроба, що вже йде, спільна для обох, тому двічі за нього не платимо. Деталі зустрічі віддають лише `overview`; нотатки лишаються на сервері.

### `POST /meetings/:id/generate` → SSE

Тіло `{ mode, screenshot? }`, де `screenshot` це `{ mimeType, dataBase64 }` для `image/jpeg` або `image/png`. Події: `delta { text }`, `done { generationId, stopReason, usage }`, `error { message }`. Для `alternative` бекенд бере попередню відповідь із власного стану. `usage` тут це лише токени `{ inputTokens, cachedInputTokens, outputTokens }`, без секунд аудіо: вони належать зустрічі, а не одній відповіді.

Знімок екрана їде в тілі тому, що це одна картинка до одного питання: окремий маршрут завантаження додав би сховище й другий круг по мережі рівно нічого не давши. Через це `MAX_REQUEST_BODY_BYTES` це 1 МБ, а не 256 КБ: застосунок тримає картинку в межах 400 КБ, base64 додає третину. Бекенд кладе її в `meeting:{id}:screenshot` із `SCREENSHOT_TTL_SECONDS` і додає до кожної наступної генерації, поки ключ живий: уточнення на кшталт «а чому?» питають про той самий екран, і відповідь без картинки на них не будується. Знімок зникає сам по TTL або коли його замінює новий, а не від першого ж питання без нього; ціна — зайва картинка у відповідях, якщо розмова за ці хвилини пішла в інший бік, тому вікно регулюється `SCREENSHOT_TTL_SECONDS`. У Postgres лишається тільки `Generation.hasScreenshot`: самі зображення не зберігаються.

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
Meeting         id, userId, profile, language, title, status, summary?, overview?,
                startedAt, endedAt?
Segment         id, meetingId, speaker, text, startMs, durationMs, createdAt
Generation      id, meetingId, mode, output, stopReason, inputTokens, cachedInputTokens,
                outputTokens, hasScreenshot, createdAt
ChatSession     id, meetingId, title?, createdAt, updatedAt
ChatMessage     id, sessionId, question, answer, createdAt
UsageEvent      id, userId, meetingId?, kind, model?, tokens..., audioSeconds?, createdAt
```

Redis:

```
meeting:{id}:state           hash: language, profile, style, lastAnswer
meeting:{id}:window          list: свіжі фінальні сегменти як JSON
meeting:{id}:summary         string
meeting:{id}:screenshot      string: остання картинка як JSON, TTL SCREENSHOT_TTL_SECONDS
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
struct CaptureRect { x: f64, y: f64, width: f64, height: f64, scale: f64 }
struct RawFrame { width: u32, height: u32, stride: usize, bgra: Vec<u8> }
struct Screenshot { mime_type: String, bytes: Vec<u8> }
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
    fn generate(&self, id: &MeetingId, mode: GenerationMode, screenshot: Option<&Screenshot>)
        -> BoxStream<'_, Result<Delta>>;
    async fn meeting_chats(&self, id: &MeetingId, query: Option<&str>) -> Result<Vec<ChatSession>>;
    async fn start_meeting_chat(&self, id: &MeetingId) -> Result<ChatSession>;
    async fn chat_messages(&self, id: &MeetingId, chat: &ChatId) -> Result<Vec<ChatMessage>>;
    async fn delete_meeting_chat(&self, id: &MeetingId, chat: &ChatId) -> Result<()>;
    fn ask_in_chat(&self, id: &MeetingId, chat: &ChatId, question: &str) -> ChatStream<'_>;
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

trait ScreenCapture {
    async fn capture(&self, rect: CaptureRect) -> Result<Screenshot>;
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

### Знімок екрана

Клавіша «знімок» питає модель про те, що на екрані, тим самим питанням, яке щойно прозвучало в розмові: окремого поля для тексту немає, контекст бекенд збирає так само, як для звичайної відповіді.

Дозвіл питається до того, як відкриється виділення: `capture_kit::capture_allowed` питає сам ScreenCaptureKit (прапорець `CGPreflightScreenCaptureAccess` бреше), і без дозволу застосунок каже про це замість того, щоб дати намалювати прямокутник у порожнечу. Той самий виклик відповідає на питання, чи доступний звук зустрічі: обидва захоплення тримаються на одному дозволі.

Знімає ScreenCaptureKit усередині нашого ж процесу (`SCScreenshotManager` у `platform-macos/screen_capture`), а не `/usr/sbin/screencapture`. Дочірній процес macOS перевіряє не по нашому застосунку, а по «відповідальному» процесі свого ланцюга — під час розробки це WebStorm, який запустив `tauri dev`. Без дозволу `screencapture` не падає й нічого не пише в stderr: він повертає робочий стіл без жодного вікна, і до моделі їдуть шпалери замість питання. SCK у своєму процесі користується тим самим дозволом, що й звук зустрічі, а відмову віддає помилкою, яку видно.

Область користувач обирає сам, бо системне перехрестя свій прямокутник не віддає: `app/selection.rs` відкриває прозоре вікно `selection` на всіх дисплеях одразу (одне вікно розміром з об'єднання їхніх прямокутників), `features/generation/RegionSelector` малює затемнення з вирізом, Esc або права кнопка скасовують. Вікно створюється в головному потоці через `run_on_main_thread`, бо AppKit інших не приймає, а гаряча клавіша живе на воркері tokio. Воно піднімається тим самим кодом, що й оверлей (`app/macos_window.rs`) і, як і оверлей, лишається `NonactivatingPanel`: вікно, яке активує застосунок, тягне користувача на той Space, де застосунок живе, а виділяти область треба там, де зараз браузер. Різниця лише в тому, що вибір стає key-вікном (`makeKeyAndOrderFront`) — нонактивуюча панель має право на клавіатуру й перший клік без активації застосунку. Escape додатково ловиться глобальною комбінацією, зареєстрованою на час вибору, тому скасування працює навіть якщо key-статус не дали. `set_content_protected(true)` тримає саме вікно поза знімком, тому затемнення не потрапляє в кадр, навіть якщо компонувальник ще не встиг його прибрати.

Друге натискання, поки екран уже притемнений, нічого не робить: це людина перевіряє, чи спрацювало перше. Вікно при цьому не створюється щоразу заново, а перевикористовується, якщо ще існує: `close()` у Tauri це повідомлення до циклу подій, тому щойно закрите вікно ще тримає свою мітку, і наступна спроба падала б на «webview with label `selection` already exists».

Вікно на один монітор не годиться: питають зазвичай не про той екран, де стоїть застосунок, а на інших дисплеях не було б на чому малювати.

Прямокутник приходить із вебв'ю в CSS-пікселях вікна, `selection.rs` додає початок цього вікна і віддає `CaptureRect` у глобальних точках. `screen_capture` знаходить `SCDisplay`, який містить центр прямокутника, ставить його як `sourceRect` відносно початку цього дисплея, а розмір кадру рахує з його ж щільності (`CGDisplayModeGetPixelWidth` поділити на ширину в точках), тому на Retina знімок виходить у рідній роздільності, а на звичайному сусідньому екрані не роздувається. Прямокутник, розтягнутий на два дисплеї, обрізається до того, на якому лежить його центр.

Стискає картинку ядро, а не платформний крейт: `screenshot::shrink` читає BGRA з урахуванням `stride`, зводить довгу сторону до 1400 px і кодує JPEG, знижуючи якість, доки не влізе в 400 КБ. Зустріч перевіряється до появи виділення: вибирати область, щоб потім почути «зустріч не йде», було б знущанням.

Гарячі клавіші беруться з локальних налаштувань і перереєструються при їх збереженні. Клавіша «відповісти», «інший варіант» і «знімок» різні, ще одна показує або ховає оверлей. За замовчуванням «відповісти» це `Alt+R` (⌥R з макета); підказку в бічній панелі й чип в оверлеї малює той самий рядок із налаштувань, тому вони не розходяться.

### IPC

Команди UI → Rust: `start_login`, `complete_login`, `logout`, `auth_state`, `session_state`, `start_session`, `stop_session`, `generate`, `cancel_generation`, `finish_selection`, `cancel_selection`, `list_meetings`, `get_meeting`, `meeting_chats`, `start_meeting_chat`, `chat_messages`, `delete_meeting_chat`, `ask_in_chat`, `get_local_settings`, `save_local_settings`, `get_user_settings`, `save_user_settings`, `check_backend`, `list_audio_devices`, `start_audio_check`, `stop_audio_check`.

Подія `generation:started` несе `{ mode, withScreenshot }`, тому оверлей і історія кажуть, що відповідь читала екран.

Події Rust → UI: `auth:state`, `session:state`, `audio:level`, `source:status`, `transcript:segment`, `generation:started`, `generation:delta`, `generation:finished`, `generation:failed`, `chat:delta`, `chat:finished`, `chat:failed`, `app:error`. Події чату несуть `chatId`, а не зустріч: екран чату бере лише свої.

`source:status` приходить по одній події на джерело одразу після старту зустрічі: `{ speaker, active }`. UI показує з них статуси мікрофона й звуку зустрічі і забуває їх, коли зустріч закінчується. Поки зустрічі немає, статус системного звуку береться з команди `system_audio_allowed`: без неї джерело вічно висіло б «не перевірено», хоча дозвіл уже виданий. Клік по рядку джерела відкриває потрібну панель macOS через `open_audio_permission`, і для звуку зустрічі це «Запис екрана», а не мікрофон.

Помилка з `app:error` показується смугою внизу головного вікна і сама зникає через дванадцять секунд (`shared/lib/useTransientMessage`). Смуга, що висить далі, читається як стан останньої дії: дозвіл уже виданий, а екран досі каже, що його немає.

Назви подій і форми payload визначені один раз у `desktop/src-tauri/src/events.rs` і продубльовані типами в `desktop/src/shared/ipc/events.ts`.

### Вікна

- Екран зустрічі відкривається кліком по рядку в списку і показує саме її: ліворуч список чатів по цій зустрічі з пошуком і кнопкою «Новий чат», у центрі картки резюме, транскрипту, відповідей і витрат. Списку інших зустрічей тут немає: по них ходять із головного екрана, де сторінки довантажуються при гортанні.
- Чат це ще один екран того самого вікна, а не нове вікно: `View` у `app/App.tsx` має варіант `chat` з `meetingId` і `chatId`, а стрілка назад веде зі чату на його зустріч, а не на головний екран. Сам екран виглядає як месенджер: питання праворуч акцентною бульбашкою, відповідь ліворуч, час у куті, тред тримається низу, поки користувач не почав гортати вгору.
- Той самий список чатів стоїть ліворуч і на екрані зустрічі, і на екрані чату, де відкритий чат підсвічений рамкою: між чатами однієї зустрічі ходять не повертаючись назад. Видалення живе в рядку списку і питає підтвердження діалогом, який називає чат; якщо видалили відкритий чат, застосунок повертається на зустріч.
- Головне вікно: `titleBarStyle: "Overlay"` і `hiddenTitle`, тому світлофор системний, а свою смугу заголовка малює `app/TitleBar.tsx` із відступом під нього. Ліворуч бічна панель сесії (профіль, мова, джерела звуку, старт), праворуч останні зустрічі. Налаштування й повна історія — окремі види того самого вікна. Налаштування розбиті на чотири вкладки в лівій рейці: «Загальні» (профіль, мова, стиль, акаунт), «Аудіо», «Гарячі клавіші», «Розширені». Вкладка це локальний стан екрана, не маршрут: вікно одне, і назад веде та сама стрілка в шапці. Кожна вкладка зберігає своє, тому кнопка «Зберегти» живе в ній, а не одна на весь екран.
- Оверлей не ловить мишу: `set_ignore_cursor_events(true)` пропускає кліки в застосунок під ним, тож кнопка в браузері під оверлеєм натискається. Гаряча клавіша (`interact` у налаштуваннях) повертає вікну мишу, і лише в цьому режимі його можна тягнути, міняти розмір і гортати транскрипт; про режим UI дізнається з події `overlay:interaction` і підсвічує рамку. Кнопок в оверлеї немає взагалі, копіювання це виділення тексту в режимі взаємодії.
- Транскрипт в оверлеї показує всю зустріч: тримається низу, доки користувач не почав гортати, а вгору довантажує по сорок реплік, тому довга зустріч не тримає в DOM тисячі рядків.
- Оверлей видимий від старту застосунку, а не лише під час відповіді: це «меблі», які показують стан сесії, транскрипт і останню відповідь. Ховає й повертає його гаряча клавіша. Вікно оголошене в `tauri.conf.json` як прихованим, має власну точку входу `overlay.html` і власний набір дозволів. Живий транскрипт живе тут, а не в головному вікні: під час зустрічі користувач дивиться на зустріч, а не на застосунок.
- Оверлей прозорий: `transparent: true` плюс `macOSPrivateApi`, бо без цього `backdrop-filter` малює суцільний прямокутник замість скла з макета. Ціна рішення — App Store відпадає, лишається роздача через DMG з нотаризацією. Системну тінь вимкнено (`shadow: false`), тінь малює CSS, інакше навколо прозорого вікна з'явиться прямокутна рамка.
- Вікно вибору області живе лише під час вибору: `app/selection.rs` створює його на гарячу клавішу й закриває, щойно прямокутник обрано або вибір скасовано. Воно прозоре, без рамки, ловить мишу й клавіатуру і приховане від знімка.
- Рівень вікна оверлея піднято до `NSScreenSaverWindowLevel`, а `collectionBehavior` це `CanJoinAllSpaces | FullScreenAuxiliary | Stationary | IgnoresCycle`, плюс `hidesOnDeactivate(false)`. Самого `CanJoinAllSpaces` не досить: вікно застосунку зі значком у Dock лишається на просторі, де його відкрили, хоч би що казала поведінка колекції. На всі простори виходить тільки `NSPanel`, тому в `app/overlay/macos.rs` клас вікна на час виставляння прапорців підмінюється на `NSPanel` (з ним заходить стиль `NonactivatingPanel`), а одразу по тому повертається початковий: залишити вікно панеллю не можна, tao віддає `NSKVONotifying_TaoWindow`, і підміна класу назавжди ламає спостерігачів KVO, які тримає на вікні AppKit — застосунок падає на `removeObserver`. Прапорці виставляються заново при кожному показі й завжди в головному потоці через `run_on_main_thread`. Це єдиний шматок AppKit у `src-tauri`, і він лежить в `app/macos_window.rs`, бо ним користуються обидва вікна поверх усіх: оверлей і вибір області.
- Позицію оверлей отримує один раз, на моніторі під курсором, і саме після `show()`: tao центрує вікно при першому показі, тому позиція, виставлена раніше, губиться. Далі вікно не рухається саме. Тягне його користувач за шапку, і це власний обробник `pointerdown` з `setPosition`, а не `data-tauri-drag-region`: регіон пропускає натискання, які влучили в дочірній елемент, а в шапці їх майже суцільно.
- `set_content_protected(true)` прибирає оверлей із демонстрації екрана. Побічний ефект: його не видно і на звичайному знімку екрана, хоча на екрані він є. Перевіряти його наявність інструментами варто через `CGWindowListCopyWindowInfo`, а не через скриншот, а належність до просторів — через приватну `CGSCopySpacesForWindows`: у відповіді мають бути всі простори.

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

## Збірка й запуск

Покрокові команди в `docs/RELEASE.md`. Рішення такі:

- Бекенд їде образом з `backend/Dockerfile` і `docker-compose.prod.yml`. Міграції застосовує окремий сервіс `migrate` з етапу `build`, і бекенд стартує лише після його успішного завершення. Робочий образ не містить Prisma CLI: він тягне Studio і pglite, а `--no-optional` відкидає необов'язкові peer-залежності й лишає образ удвічі меншим.
- Секрети бекенду живуть у `backend/.env.production`, пароль Postgres — у кореневому `.env` для compose. Адреси Postgres і Redis задає сам compose, щоб їх не можна було випадково перевизначити з env-файла.
- Джерело іконки застосунку — `desktop/src-tauri/icons/icon.svg`; набір розмірів генерується `tauri icon`. Мобільні набори не тримаємо.
- Схему `meetcopilot://` бандлер сам кладе в `Info.plist` із конфігу плагіна deep-link, тому вручну `CFBundleURLTypes` не пишемо. `LSMinimumSystemVersion` це 13.0, бо захоплення звуку через ScreenCaptureKit молодше.
- Підпис і нотаризація йдуть змінними оточення Apple, які читає Tauri. Entitlements мінімальні: лише `com.apple.security.device.audio-input`. Дозвіл на запис екрана entitlement не має, його дає користувач.
- Першим екраном іде вхід із макета. Окремого знайомства немає: адреса сервера, пристрій і гарячі клавіші лежать у налаштуваннях за шестернею, а дозволи macOS просить сама при першій зустрічі.

## Звук і Bluetooth

Щойно застосунок відкриває мікрофон Bluetooth-гарнітури, macOS переводить її з A2DP у профіль розмови: 16 кГц моно, і зустріч у навушниках починає звучати як телефонна трубка. Обійти це з боку застосунку не можна, тому коли мікрофон не обраний вручну, композиційний корінь бере вбудований: `platform-macos/audio_devices` питає CoreAudio про транспорт пристроїв, а `app/microphone_choice.rs` підставляє вбудований замість Bluetooth. У налаштуваннях такі входи позначені як `(Bluetooth)`, і вибір одного з них показує, чим це закінчиться.

## Тема і компоненти UI

Кольори, типографіка, відступи й радіуси приходять із дизайн-системи одним файлом `desktop/src/shared/theme/tokens.css`, згенерованим із її `tokens.json`. Він оголошує токени в `@theme`, тому Tailwind робить із них утиліти (`bg-surface-elevated`, `text-body`, `p-5`, `rounded-lg`), а темна тема це ті самі імена з іншими значеннями під `prefers-color-scheme: dark` і під `[data-theme='dark']`. Компоненти ніколи не пишуть шістнадцяткові кольори: правило дизайн-системи, і воно ж рятує від гілок «якщо темна тема» в коді.

Екран це набір маленьких компонентів, а не один файл: бічна панель сесії складається з `ProfileSwitcher`, `LanguageSelect`, `AudioSourceStatus` і `StartMeetingButton`, оверлей — із `StatusIndicator`, `LiveTranscript`, `ResponseBlock`, `CopyButton` і `RegenerateButton`. Усі вони приймають дані пропсами, а стан збирають хуки над сторами, тому жоден із них не знає про Tauri.

Стан у цих компонентах справжній: профіль приходить із налаштувань користувача, статуси джерел — із події `source:status`, транскрипт — із `transcript:segment` (проміжний рядок сірий і курсивом, доки не прийде фінальний), текст відповіді накопичується з `generation:delta`. «Записую» замість «Слухаю» вмикається, поки в транскрипті висить незавершена репліка від мікрофона.

## Кросплатформність

Платформний код застосунку живе в `desktop/crates/platform-*`. Композиційний корінь обирає реалізацію через `cfg(target_os)`. Для Linux і Windows додається новий crate із `AudioSource` для системного звуку і, за потреби, свій модуль дозволів. Решта коду не змінюється.
