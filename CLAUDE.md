# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Cloud Notes is a small full-stack notes application:

- Backend: Go module `cloud-notes` using Gin, GORM, MySQL, JWT, and bcrypt.
- Frontend: React + Vite + TypeScript app in `web-app/`.
- API tests: pytest-based end-to-end tests in `tests/api/` that expect a running backend and MySQL.
- Go tests: handler/middleware unit tests use injected stores and do not require the backend server or database.

This directory is not currently a git repository.

## Common commands

### Backend

```bash
# Run the API server on :8080
make run-server
# or
go run main.go

# Run all Go unit tests
go test ./... -v
# or
make test-go

# Run a single Go test
go test ./handler -run TestUserHandler_Login -v
go test ./middleware -run TestJWTAuthWithSecret -v

# Run Go benchmarks
go test -bench=. ./...
make bench
make bench-save
make bench-compare
```

Backend startup requires MySQL running with database `cloud_notes` created. The DSN is hardcoded in `config/db.go` as `root:root@tcp(127.0.0.1:3306)/cloud_notes?charset=utf8mb4&parseTime=True&loc=Local`.

### Python API tests

```bash
# Install API test dependencies
make install-pytest
# equivalent to: cd tests/api && pip install -r requirements.txt

# Run API tests; backend and MySQL must already be running
make test-api
# or
cd tests/api && pytest -v --html=report.html --self-contained-html

# Run by marker
cd tests/api && pytest -v -m auth
cd tests/api && pytest -v -m crud
cd tests/api && pytest -v -m boundary
cd tests/api && pytest -v -m "not slow"

# Run a single API test file or test
cd tests/api && pytest test_auth.py -v
cd tests/api && pytest test_notes_crud.py::TestNotesE2E::test_full_crud_cycle -v
```

`tests/api/conftest.py` reads `API_BASE_URL`, defaulting to `http://localhost:8080`. `tests/api/pytest.ini` enables strict markers and HTML report generation.

There is also an older lightweight pytest suite under `tests/` using `tests/common/request_util.py`; the more complete suite is under `tests/api/`.

### Frontend

```bash
cd web-app
npm install
npm run dev       # Vite dev server on :3000
npm run build     # tsc && vite build
npm run preview
```

The Vite dev server proxies `/api`, `/login`, and `/register` to `http://127.0.0.1:8080`.

### Combined and cleanup

```bash
make test-all     # Go tests, then API tests; requires backend already running for API tests
make clean        # removes cloud-notes.exe and pytest cache/report files
```

## Architecture notes

### Backend request flow

`main.go` initializes the database, auto-migrates `models.User` and `models.Note`, creates GORM-backed stores, then calls `router.SetupRouter(noteStore, userStore, middleware.DefaultSecret)` and runs Gin on port `8080`.

`router.SetupRouter` is the composition point. It wires:

- unauthenticated `POST /register` and `POST /login`,
- JWT-protected `/api` routes for profile and notes CRUD,
- `/debug/pprof/*` profiling endpoints,
- static root `GET /` serving `./web/index.html`,
- permissive CORS.

Handlers depend on interfaces from `store/store.go` rather than concrete GORM types. Keep this dependency-injection pattern when adding backend behavior so handler tests can use mock stores.

### Data and auth model

`models.User` has `ID`, unique `Username`, and `Password`. `models.Note` has `ID`, `UserID`, `Title`, `Content`, and `CreatedAt`; note queries are scoped by `user_id` in the store layer.

Authentication uses JWT signed with `middleware.DefaultSecret` (`cloud-notes-secret`) unless a test injects another secret. `JWTAuthWithSecret` expects an `Authorization: Bearer <token>` header and stores `user_id` in the Gin context. Note handlers assume this context value exists and is a `uint`.

`handler.UserHandler.Login` supports both bcrypt hashes and legacy plaintext passwords; plaintext passwords are upgraded to bcrypt via `Store.UpdatePassword` after a successful login.

### Persistence layer

`store/store.go` defines `NoteStore` and `UserStore`. `store/gorm_store.go` implements them with GORM and scopes note read/update/delete operations by both note ID and user ID to enforce per-user isolation.

The MySQL connection is initialized in `config.InitDB()`. It configures a high-connection pool for benchmark/load-test scenarios.

### Frontend structure

The React app uses `App.tsx` to choose between authenticated workspace and auth pages based on `useAuthStore().token`.

Key frontend boundaries:

- `src/lib/api.ts`: typed fetch wrapper for `/register`, `/login`, `/api/profile`, and `/api/notes` CRUD; it manages the bearer token used by requests.
- `src/store/authStore.ts`: Zustand auth state, localStorage token persistence under `cloud_notes_token`, login/register/logout/checkAuth.
- `src/store/notesStore.ts`: Zustand notes list, selected note, editor draft, search query, and CRUD actions.
- `src/pages/*`: page-level composition.
- `src/components/notes/*`, `src/components/auth/*`, `src/components/ui/*`: feature and UI components.

The frontend imports through the `@` alias configured in `web-app/vite.config.ts`.

## Testing notes

Go handler tests directly create Gin test contexts and mock store interfaces. When adding handler logic, update the interface/mocks in the relevant test files.

The full API test suite in `tests/api/` creates real users via HTTP and checks auth, CRUD, boundary text sizes, slow 5MB roundtrips, and cross-user isolation against a live server. It generates `tests/api/report.html`.

API tests require the backend and MySQL state to be available; Go unit tests do not.
