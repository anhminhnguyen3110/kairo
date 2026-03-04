# Kairo  Frontend

Next.js 16 chat interface for the Kairo AI agent platform. Real-time SSE token streaming, side-by-side artifact panel, tool call cards, file uploads, thread management, model selector with 183+ models, and persistent agent memory.

**Stack:** Next.js 16  React 19  TanStack Query 5  Zustand 5  Tailwind CSS 4  
**Tests:** 129 passing across 12 spec files (Vitest + Testing Library)

---

## Run Locally

> Requires Node.js ≥ 22, pnpm ≥ 9, and the backend running at http://localhost:3001.

```bash
cd fe
pnpm install
pnpm dev                       # Turbopack hot reload → http://localhost:3000
```

```bash
# Production build
pnpm build && pnpm start
```

## Deploy with Docker

```bash
# Full stack (recommended) — run from repo root
cp .env.example be/.env        # fill in secrets
docker compose up -d --build
# open http://localhost:3000
```

```bash
# Production — nginx on :80, external DB + Redis, no exposed FE/BE ports
docker compose -f docker-compose.prod.yml up -d --build
# open http://localhost
```

```bash
# Frontend-only Docker build
cd fe
docker build -t kairo-fe .
docker run -p 3000:3000 \
  -e API_INTERNAL_URL=http://host.docker.internal:3001 \
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  kairo-fe
```

---

## Table of Contents

1. [Features](#features)
2. [Screenshots](#screenshots)
3. [Quick Start — Local](#quick-start--local)
4. [Deploy with Docker](#deploy-with-docker)
5. [Environment Variables](#environment-variables)
6. [Architecture](#architecture)
7. [Testing](#testing)
8. [Project Structure](#project-structure)
9. [Key Routes](#key-routes)

---

## Features

### Chat & Streaming

- **SSE token streaming**  `POST /api/proxy/chat/send` with `stream: true`. Tokens render word-by-word in the assistant bubble as they arrive from the LLM. No polling, no WebSocket  HTTP/1.1 native.
- **Auto-scroll**  chat viewport follows the stream; a floating action button appears when the user scrolls up so they can jump back to the bottom instantly.
- **Streaming session ID**  each SSE stream is tagged with a `sessionId`. The abort button sends `POST /chat/abort` with the same ID, allowing mid-stream cancellation.
- **Optimistic messages**  the user's message appears instantly in the UI before the server confirms receipt, making the interface feel synchronous.
- **New thread auto-creation**  sending from the empty state creates a thread on the server and navigates to `/threads/:id` only after the stream's `[DONE]` event, avoiding a mid-stream navigation flash.

### Tool Cards

Every agent tool call is rendered as an expandable inline card:

| Tool card | Shows |
|---|---|
| `think` | Internal reasoning in a collapsed scratchpad |
| `web_search` | Query + search result snippets |
| `write_file` | Path + content written to workspace |
| `read_file` | Path + content read from workspace |
| `edit_file` | Path + diff-style line edits |
| `search_files` | Pattern + matching lines |
| `extract_document` | File name + extracted text preview |
| `create_artifact` | Artifact type + title (link to panel) |

Cards start in loading state on `tool_start` and resolve on `tool_end`. Collapsed by default; click to expand.

### Artifacts

A side-by-side panel opens when the agent generates an artifact:

| Artifact type | Who produces it | Renderer |
|---|---|---|
| `html` | Agent (`create_artifact`) | Sandboxed `<iframe srcDoc>` — full HTML/CSS/JS execution |
| `code` | Agent (`create_artifact`) | Syntax-highlighted code block with language label |
| `markdown` | Agent (`create_artifact`) | react-markdown with rehype syntax highlight |
| `react` | Agent (via `code` + language hint) | Sandpack live editor (CodeSandbox in-browser) |
| `mermaid` | FE renderer auto-detection | Mermaid.js SVG diagram renderer |
| `svg` | FE renderer auto-detection | Inline SVG rendering |

The panel shows **Code** and **Preview** tabs. Artifacts are versioned — editing the artifact in a follow-up message creates a new version linked to the original via `parentId`.

### File Upload

- Attach button reveals **Upload file** or **Toggle web search** options.
- Files attach as chips in the input bar, each with an  remove button.
- On send, files are uploaded to the backend before the SSE stream starts so the `fileId` is available to the agent's `extract_document` tool.
- Supported types: PDF, TXT, Markdown, CSV (up to 10 MB).
- Uploaded files persist in the thread and are listed in a collapsible files panel.

### Thread Management

- **Sidebar** lists threads grouped by: Today / Yesterday / Previous 7 days / Previous 30 days / Older.
- **Hover actions**: `...` button reveals a context menu with Rename, Clone, Delete.
- **Rename**: inline edit, committed on Enter or blur.
- **Clone**: `POST /threads/:id/clone` creates a deep copy (messages + files + checkpoints). New thread appears at top of sidebar.
- **Delete**: confirmation dialog before `DELETE /threads/:id`. Cascade destroys messages, files, artifacts.
- **Delete all**: `DELETE /threads` from account menu. Clears entire history.
- **Collapsible sidebar**: toggled by a button in the header. State persisted in `localStorage`.

### Thread Search

- `Ctrl+K` (or `Cmd+K` on Mac) opens a Radix Dialog search modal.
- Input is debounced 300 ms, calls `GET /threads?search=<query>`.
- Results are highlighted and clickable  navigates to `/threads/:id`.

### Model Selector

- Dropdown in the chat input bar shows the current provider + model.
- 183+ models grouped by provider: OpenAI, Anthropic, Google, NVIDIA NIM, Meta, Mistral, etc.
- Filter input inside the dropdown for live search.
- Selection is persisted in Zustand model store (survives page refresh via `localStorage`).
- Model change takes effect on the next message in the same thread.

### Authentication

- Register and login forms with Zod validation and react-hook-form.
- JWT stored in **httpOnly cookies** managed by the Next.js BFF  never accessible to JavaScript.
- Access token (15 min) is automatically refreshed by the BFF proxy when it detects a 401, using the refresh token cookie.
- Protected routes redirect to `/login` via Next.js middleware (`proxy.ts`). Already-authenticated users visiting `/login` are redirected to `/threads`.

### AI Memory

- Memory is stored in **`AGENTS.md`** at `agent-file/workspace/<userId>/AGENTS.md` — one level above the thread workspace, so it is **per-user and persists across all threads**.
- Before every LLM call the `memoryMiddleware` reads `AGENTS.md` and injects it as `<agent_memory>` in the system prompt.
- The agent updates memory with `write_file` when it learns something worth remembering (e.g., name, preferences, role instructions, feedback patterns).
- File is auto-created with a default header if it does not yet exist — no manual setup needed.
- Large memory files (>32K chars) are previewed; the agent is instructed to `read_file` the full file before overwriting.

### Agent Intelligence — Todo List & Context Management

- **Persistent todo list** — `todoListMiddleware` gives the agent a structured checklist it can read and update throughout a multi-step task. The list survives between model calls within the same run so complex multi-step tasks are tracked reliably.
- **Model fallback** — if the primary LLM call fails (rate-limit, provider error), `modelFallbackMiddleware` retries with `gpt-4o-mini` automatically so the conversation never hard-errors.
- **Tool output chunking** — tool results larger than ~20 000 tokens are saved to a file and the agent receives a reference, preventing context overflow from large `read_file` / `web_search` results.
- **Message trimming** — oldest messages are dropped when the conversation exceeds ~80 000 tokens, keeping at least the last 3 human turns.
- **Context editing** — old tool-use turns are cleared (replaced with `[cleared]`) when the context exceeds 100 000 tokens, preserving the last 5 messages and always keeping `think` turns.

### UX Details

- **Copy button** on every message bubble  copies to clipboard with a 2-second success tick animation.
- **Markdown rendering**  full GFM (tables, task lists, code fences with syntax highlighting, blockquotes).
- **Dark mode**  follows system preference (`prefers-color-scheme`). Toggle available in sidebar footer.
- **Scroll-to-bottom FAB**  appears when the user scrolls more than 200 px from the latest message.
- **Disabled input during streaming**  send button becomes a Stop button. Input field is disabled until the stream completes.

---

## Screenshots

### Authentication — Login & Register

![Login page with form elements](docs/screenshots/r1-tc1-login-page-elements.png)

![Wrong credentials error](docs/screenshots/r1-tc9-wrong-credentials-error.png)

![After successful login — threads home](docs/screenshots/r1-tc8-login-success-threads.png)

![Authentication demo](docs/round-1.gif)

---

![Register page with form elements](docs/screenshots/r2-tc1-register-page-elements.png)

![Duplicate email error](docs/screenshots/r2-tc9-duplicate-email.png)

![After successful registration — threads home](docs/screenshots/r2-tc8-register-success-threads.png)

---

### Streaming Chat — Token-by-Token

![Message sent — streaming tokens](docs/screenshots/r7-tc1-tc2-message-sent-streaming.png)

![Response complete — title auto-generated](docs/screenshots/r7-tc3-tc8-response-complete-title-updated.png)

![Multi-turn conversation](docs/screenshots/r7-tc10-multi-turn-conversation.png)

![Streaming chat demo](docs/round-2.gif)

---

### Tool Cards — Web Search & Think

![Tools panel with web search toggle](docs/screenshots/r8-tc2-tools-panel.png)

![Web search enabled](docs/screenshots/r8-tc2-web-search-enabled.png)

![Web search executing — streaming](docs/screenshots/r8-tc3-web-search-streaming.png)

![Web search results card](docs/screenshots/r8-tc3-tool-call-web-search-results.png)

![Complete response with citations](docs/screenshots/r8-tc3-web-search-complete-response.png)

![Tool cards collapsed — compact view](docs/screenshots/r8-tc6-tool-card-collapsed.png)

![search_files tool card](docs/screenshots/r8-search-files-tool.png)

![Tool cards demo](docs/round-3.gif)

---

### Artifacts — Live HTML Preview & Code

![Agent creating artifact](docs/screenshots/r9-tc1-artifact-creating.png)

![Artifact panel — preview tab](docs/screenshots/r9-tc1-tc2-artifact-panel-preview.png)

![Interactive artifact — counter example](docs/screenshots/r9-tc3-interactive-preview-counter.png)

![Artifact source code tab](docs/screenshots/r9-tc4-artifact-source-code.png)

![Python code artifact](docs/screenshots/r9-tc8-python-code-artifact.png)

![Multiple artifacts](docs/screenshots/r9-tc10-multiple-artifacts.png)

![Artifacts demo](docs/round-4.gif)

---

### File Upload & Document Understanding

![Attach files dropdown](docs/screenshots/r10-tc1-attach-files-dropdown.png)

![File chip attached in input bar](docs/screenshots/r10-tc2-tc3-file-attached-chip.png)

![Upload result — extract_document tool card](docs/screenshots/r10-tc4-file-upload-result.png)

![Files panel in thread header](docs/screenshots/r10-tc10-header-attach-files-panel.png)

![File upload demo](docs/round-5.gif)

---

### Thread Management — Rename, Clone, Delete

![Thread hover menu](docs/screenshots/r5-tc1-thread-hover-menu.png)

![Thread context menu](docs/screenshots/r5-tc2-thread-context-menu.png)

![Rename inline input](docs/screenshots/r5-tc3-rename-input.png)

![Rename confirmed](docs/screenshots/r5-tc4-rename-success.png)

![Clone thread](docs/screenshots/r5-tc6-clone-thread.png)

![Delete thread](docs/screenshots/r5-tc7-delete-thread.png)

![Thread management demo](docs/round-6.gif)

---

### Thread Search — Ctrl+K

![Search modal open](docs/screenshots/r6-tc1-search-modal-open.png)

![Search results highlighted](docs/screenshots/r6-tc5-search-results.png)

![No results state](docs/screenshots/r6-tc6-no-results.png)

![API-backed search results](docs/screenshots/r6-tc9-api-search-results.png)

---

### AI Memory — Per-User Persistent

![Writing memory with write_file](docs/screenshots/r7-04-memory-written.png)

![Memory confirmed in workspace](docs/screenshots/r7-05-memory-scroll-bottom.png)

![Memory recalled in new thread](docs/screenshots/r7-08-memory-recalled.png)

![AI memory demo](docs/round-7.gif)

---

### Session & Protected Routes

![Unauthenticated redirect to login](docs/screenshots/r3-tc1-protected-redirect.png)

![User avatar — first letter of email](docs/screenshots/r3-tc8-user-avatar.png)

![Session persistence across page refresh](docs/screenshots/r3-tc5-tc6-tc7-tc8-tc9-tc10-session.png)

![Cookie-based token refresh](docs/screenshots/r16-tc10-refresh-cookie-based.png)

![Session persistence demo](docs/round-10.gif)

---

### Model Selector — 183+ Models

![Model selector dropdown](docs/screenshots/r11-tc1-model-selector-dropdown.png)

![Model list expanded by provider](docs/screenshots/r11-tc2-model-list-expanded.png)

![Search model — DeepSeek](docs/screenshots/r11-tc3-model-search-deepseek.png)

![Model changed — DeepSeek selected](docs/screenshots/r11-tc4-model-changed-deepseek.png)

![Model selector demo](docs/round-9.gif)

---

### Scroll UX — Jump-to-Bottom FAB

![Thread at bottom](docs/screenshots/r8-01-thread-bottom.png)

![Scrolled up — FAB appears](docs/screenshots/r8-03-scroll-to-bottom-fab.png)

![Back to bottom](docs/screenshots/r8-04-scrolled-to-bottom.png)

![Scroll UX + abort demo](docs/round-8.gif)

---

### Responsive Design

**Desktop — sidebar collapsed (icon-only strip)**
![Sidebar collapsed — icon strip](docs/screenshots/r12-tc1-sidebar-collapsed.png)

**Desktop — sidebar expanded**
![Sidebar expanded](docs/screenshots/r12-tc3-sidebar-expanded.png)

**Mobile 375 px — full-width chat area**
![Mobile 375px viewport](docs/screenshots/r12-tc6-mobile-375px-viewport.png)

**Mobile — active thread**
![Mobile thread view](docs/screenshots/r12-tc7-thread-mobile-view.png)

**Tablet 768 px**
![Tablet 768px viewport](docs/screenshots/r12-tc8-tablet-768px-viewport.png)

## Quick Start — Local

### Prerequisites

- Node.js >= 22
- pnpm >= 9 (`npm i -g pnpm`)
- Backend running at http://localhost:3001

### Steps

```bash
cd fe
pnpm install

# Development  Turbopack hot reload
pnpm dev
```

App available at **http://localhost:3000**

```bash
# Production build
pnpm build
pnpm start
```

---

## Deploy with Docker

### Full stack (recommended)

Run from the **repo root**  starts PostgreSQL, Redis, backend, and frontend together:

```bash
# 1. Prepare backend env
cp .env.example be/.env
# Edit be/.env with your secrets

# 2. Build and start all 4 services
docker compose up -d --build

# 3. Open the app
open http://localhost:3000   # macOS / Linux
start http://localhost:3000  # Windows
```

### Frontend-only Docker build

```bash
cd fe
docker build -t kairo-fe .
docker run -p 3000:3000 \
  -e API_INTERNAL_URL=http://your-backend:3001 \
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  kairo-fe
```

The FE image uses Next.js `output: 'standalone'`  the runner stage is ~120 MB (vs ~1 GB for a full install image).

---

## Environment Variables

The frontend uses **no client-side secrets**. All backend communication goes through the Next.js BFF proxy route (`/api/proxy/[...path]`), which injects the `Authorization` header server-side.

```env
#  Server-side only (BFF) 
API_INTERNAL_URL=http://localhost:3001   # backend URL reachable from Next.js server
                                        # In Docker: http://app:3001 (service name)

#  Build-time / public 
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # used for SSR absolute URL construction
```

> **No API keys in the frontend.** The JWT is stored in `httpOnly` cookies. The BFF reads the cookie and adds `Authorization: Bearer <token>` on each proxied request.

---

## Architecture

### BFF Proxy Pattern

Every API call from the browser goes through `src/app/api/proxy/[...path]/route.ts`:

```
Browser fetch('/api/proxy/threads')
   Next.js Route Handler
      reads httpOnly cookie  adds Authorization header
      forwards to API_INTERNAL_URL/api/v1/threads
      handles 401  auto-refresh token
      returns response to browser
```

This means:
- Zero CORS issues (same-origin requests from browser to Next.js)
- JWT never accessible to JavaScript (XSS-safe)
- Token refresh is transparent (user never sees a 401 error)

### SSE Streaming

`useStream` hook (`features/chat/hooks/use-stream.ts`) opens a streaming `fetch()`:

```
POST /api/proxy/chat/send { message, stream: true }
   BFF proxies to NestJS, forces status 200 for SSE
    (fix for ERR_INCOMPLETE_CHUNKED_ENCODING on 201/202 responses)
   ReadableStream reader loop
       parse line-delimited SSE frames
       dispatch to Zustand chat store actions
```

SSE event types handled:

| Event | Action |
|---|---|
| `ping` | Ignored (Redis Stream seed event) |
| `meta` | Set `confirmedThreadId`; if `title` present → `setQueriesData` patches thread cache in-memory (zero network cost) |
| `content_block_start` | Add tool card or think card |
| `content_block_delta` | Append token / thinking delta / tool input JSON |
| `content_block_stop` | Resolve tool card with output |
| `streaming_complete` | LLM done, DB write in progress → `setSavingStatus()` unlocks input, shows "Saving…" indicator |
| `message_stop` | Navigate new thread; `invalidateQueries(messages).then(finalizeStream)` swaps bubble; refresh sidebar |
| `token` | Append token to streaming bubble |
| `tool_start` / `tool_end` | Legacy tool card lifecycle |
| `artifact` | Open artifact panel |
| `error` | Set stream error state |
| `[DONE]` | No-op safety fence (all finalization moved to `message_stop`) |
| `done` | Dead path — `toKairoEvents` consumes this internally; kept as no-op |

#### Streaming status transitions

```
idle → streaming (startStream)
         ↓ streaming_complete
       saving (setSavingStatus) ← input unlocked, "Saving…" shown
         ↓ invalidateQueries(messages) resolves
       idle (finalizeStream) ← StreamingBubble → MessageBubble swap
```

### State Management

| Store | Responsibility |
|---|---|
| `chat-store.ts` | Streaming state (`idle`/`streaming`/`saving`/`error`), optimistic messages, tool events, artifacts-in-progress |
| `model-store.ts` | Selected LLM provider + model, persisted to `localStorage` |
| `ui-store.ts` | Sidebar collapsed, artifact panel open, web search toggle |
| `artifact-store.ts` | Completed artifacts list, active artifact ID |

TanStack Query manages all server state (threads list, messages, files). Zustand manages client-only UI state.

---

## Testing

```bash
pnpm test            # run all specs once (Vitest)
pnpm test:watch      # watch mode
pnpm test:cov        # coverage report
pnpm test:ui         # Vitest browser UI
```

| Test file | What it covers |
|---|---|
| `ui-store.spec.ts` | All 9 Zustand store actions (sidebar, scroll, web search) |
| `api-client.spec.ts` | GET/POST/PATCH/DELETE, 204 empty response, envelope unwrap |
| `login-schema.spec.ts` | Zod login schema  valid/invalid email, password rules |
| `register-schema.spec.ts` | Zod register + password confirm mismatch |
| `message-list.spec.tsx` | Message rendering, role differentiation, markdown |
| `copy-button.spec.tsx` | Clipboard API mock, success state animation |
| `artifact-panel.spec.tsx` | Panel open/close, type switching (html/mermaid/code) |
| `thread-list.spec.tsx` | Time-group sorting (Today/Yesterday/Older) |
| `model-store.spec.ts` | Model selection, provider change, localStorage persistence |
| `chat-input.spec.tsx` | Submit on Enter, Shift+Enter newline, file chip remove |
| **Total** | **129 tests across 12 files** |

---

## Project Structure

```
fe/
 src/
    app/                          # Next.js App Router
       (auth)/
          login/page.tsx
          register/page.tsx
       threads/
          [threadId]/page.tsx    # Thread view
       page.tsx                   # Root  redirect to /threads
       api/
           proxy/[...path]/route.ts # BFF proxy (JWT injection)
           auth/                    # Login/register/refresh/logout
    components/
       ui/                       # Radix UI primitives (Button, Dialog, etc.)
       chat/
          message-bubble.tsx
          tool-card.tsx
          chat-input.tsx
          copy-button.tsx
          scroll-to-bottom-fab.tsx
       artifact/
          artifact-panel.tsx    # Side panel container
          artifact-renderer.tsx # html/mermaid/code/markdown/svg
       sidebar/
           sidebar.tsx
           thread-item.tsx        # Hover actions (rename/clone/delete)
           search-modal.tsx       # Ctrl+K search
    features/
       auth/                     # Auth forms, schemas, API
       chat/
          hooks/use-stream.ts   # SSE streaming loop
          hooks/use-messages.ts # Cursor-paginated message list
          hooks/use-models.ts   # 183+ model list
       threads/                  # Thread CRUD hooks
       files/                    # Upload, list, download hooks
    stores/
       chat-store.ts             # Streaming + optimistic message state
       model-store.ts            # LLM selection (localStorage)
       ui-store.ts               # Sidebar, artifact panel, scroll
       artifact-store.ts         # Completed artifacts
    lib/
       api-client.ts             # Typed fetch, envelope unwrap, SSE stream
    types/                        # thread.ts, message.ts, artifact.ts
 docs/
    screenshots/                  # 100+ PNG screenshots (per test-case)
    round-1.gif  round-10.gif   # Animated GIF per feature
 public/
 Dockerfile
 next.config.ts                # output: standalone, BFF rewrites
 tsconfig.json
 vitest.config.ts
```

---

## Key Routes

| Route | Description |
|---|---|
| `/login` | Login form. Redirects to `/threads` if already authenticated. |
| `/register` | Registration form. |
| `/threads` | Thread list (redirects to welcome screen if no threads). |
| `/threads/:id` | Active thread  messages, streaming, artifact panel. |
| `/api/proxy/[...path]` | BFF proxy route  injects JWT, handles refresh. |
| `/api/auth/login` | Sets httpOnly cookies on successful login. |
| `/api/auth/refresh` | Refreshes access token using refresh cookie. |
| `/api/auth/logout` | Clears cookies. |
