# Cueline

Слухає онлайн-зустріч, веде живий транскрипт і за гарячою клавішею готує коротку відповідь, яку можна прочитати вголос.

- `backend/` — NestJS, володіє станом продукту та ключами провайдерів
- `desktop/` — Tauri, захоплює звук і показує відповідь в оверлеї
- `docs/PLAN.md` — обсяг і задачі по порядку
- `docs/ARCHITECTURE.md` — модулі, контракт API, модель даних

## Вимоги

- Node постачається автоматично: pnpm тримає версію з `devEngines` у `package.json`, системний Node не потрібен
- pnpm 12, Rust 1.82+, Xcode Command Line Tools, Docker

## Запуск

```bash
pnpm install
docker compose up -d
cp backend/.env.example backend/.env
pnpm --filter backend prisma:generate
pnpm --filter backend start:dev
pnpm --filter desktop tauri dev
```

Бекенд слухає `http://localhost:5070/api/v1`, Swagger на `/api/v1/docs`. Postgres на порту 5440, Redis на 6390: нестандартні порти навмисне, щоб не конфліктувати з іншими проєктами.

## Перевірки

```bash
pnpm lint
pnpm typecheck
pnpm test
cd desktop && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
```
