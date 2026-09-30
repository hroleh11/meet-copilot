# ADR-0012: Google sign-in through the system browser and a one-time code

**Status:** accepted

## Context

Users expect "Sign in with Google". Google blocks OAuth inside embedded webviews, and RFC 8252 recommends the system browser for native apps. The app must end up with a JWT pair, not a Google token.

## Decision

1. The app opens `GET /auth/google` in the system browser.
2. After the callback, the backend stores a one-time code in Redis (`login:code:{code}`, 60 s) and redirects to `cueline://auth?code=…`.
3. The app receives the deep link and exchanges the code at `POST /auth/exchange` for a token pair.

Tokens travel in response bodies; there are no cookies and no CORS because there is no web client.

## Alternatives considered

- **Embedded webview OAuth.** Blocked by Google and unsafe.
- **Tokens in the deep link.** Would leak long-lived tokens into browser history and logs.
- **Loopback redirect to a local port.** Works, but needs a local server and firewall prompts.

## Consequences

- The deep-link scheme `cueline://` is registered by the Tauri bundler.
- The code is short-lived and single-use.
- Each device gets its own `auth_sessions` row; refresh-token reuse deletes the session.
