# DataGuard AI

**AI-assisted code review and software quality checker**

## Stack
- Frontend: React, Vite, React Router, Lucide
- Backend: Java 21, Spring Boot, Spring Security, JWT
- Database: Aiven PostgreSQL (required)
- AI provider: Groq primary with Gemini Flash fallback for provider failures and structured-output repair
- Database schema: Flyway migrations with Hibernate schema validation

## Architecture
React UI → Spring Boot REST API → Spring Security/JWT → Spring Data JPA → Aiven PostgreSQL.

Registration validates input, BCrypt-hashes the password, stores the user in PostgreSQL, and returns a signed JWT. Login verifies the password against the stored hash and returns a JWT. Protected upload, fix-preview, and download endpoints require that token. The browser never connects directly to Aiven and never receives the database password or Groq API key.

## Configure secrets
Copy the root `.env.example` to `.env`. From the Aiven Console, copy the PostgreSQL host, port, database name, username, and password into `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`. Keep `sslmode=require` in the JDBC URL.

Set `JWT_SECRET` to a private random value with at least 32 UTF-8 bytes. Set `GROQ_API_KEY` here only if AI explanations are enabled. Never commit `.env`, and never put database passwords, JWT secrets, or Groq keys into frontend variables or source code.

The backend intentionally fails to start if Aiven connection settings are missing or invalid; this avoids silently saving accounts into a temporary in-memory database.
The backend also validates `JWT_SECRET` at startup. Flyway applies the versioned PostgreSQL schema migration before Hibernate validates the entities; Hibernate no longer changes the production schema automatically. `/api/health` is a public, non-sensitive health check that returns `UP` only when PostgreSQL responds to `SELECT 1`.
Before the first rollout to an existing Aiven database, take a database backup and deploy to a staging database if available. The baseline migration is additive and does not drop data, but unique-index creation can correctly fail if legacy duplicate emails or session IDs exist; inspect the migration error rather than bypassing Hibernate validation.

For AI Radar, configure at least one backend key (`GROQ_API_KEY` and/or `GEMINI_API_KEY`). Both keys are recommended so structured-output failures can be retried with the alternate provider. Provider calls have bounded timeouts; the UI reports an error rather than waiting forever.

## Start backend
Requires Java 21 and Maven.

```powershell
cd backend
mvn spring-boot:run
```

Spring Boot listens on `http://localhost:8080`.

### Build a deployment image

The backend Dockerfile packages Java 21 and the Semgrep CLI. For a single-instance deployment, mount a persistent volume at `/var/data/dataguard` and set the database, JWT, CORS, and AI-provider environment variables at runtime:

```bash
docker build -t dataguard-backend ./backend
docker run --rm -p 8080:8080 \
  -v dataguard-data:/var/data/dataguard \
  -e DB_URL="$DB_URL" \
  -e DB_USERNAME="$DB_USERNAME" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e CORS_ALLOWED_ORIGINS="https://your-frontend.example.com" \
  -e GROQ_API_KEY="$GROQ_API_KEY" \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  dataguard-backend
```

Set secrets in your hosting provider's secret manager rather than committing them. The image enables Semgrep by default and downloads the configured public rule pack during scans; allow outbound HTTPS. The `/api/health` endpoint checks database connectivity. For multiple backend replicas, use shared private object storage instead of a local Docker volume.

## Start frontend
In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite listens on `http://localhost:5173` and proxies `/api` requests to Spring Boot on port 8080. For a deployed API, configure `VITE_API_URL` in the frontend environment.

### Production frontend/backend connection

Set `VITE_API_URL` in the **frontend build environment** to the public Spring Boot base URL (for example, `https://your-api.example.com`, without an `/api` suffix), then rebuild and redeploy the frontend. The React shell passes this build-time value to the existing same-origin dashboard iframe before its scripts initialize.

On the **backend hosting service**, set `CORS_ALLOWED_ORIGINS` to the exact frontend origin, including scheme and any non-default port (for example, `https://your-frontend.example.com`). Separate multiple exact origins with commas; do not include URL paths or use `*` for authenticated requests. Restart/redeploy the backend after changing it.

The backend defaults intentionally allow only local Vite origins. If frontend and backend use separate hosts, leaving out the deployed frontend origin will cause the browser to block the login response with a CORS error. CORS does not replace JWT authentication: login/register remain public routes, and protected API routes continue to require the backend-issued Bearer token. Keep database credentials, `JWT_SECRET`, and AI-provider keys on the backend only.

## Expected flow
1. Register with a valid name, email, and password.
2. Spring Boot validates the data, stores the BCrypt password hash in Aiven PostgreSQL, and returns a JWT.
3. The frontend stores the returned session and navigates to the dashboard only after successful registration.
4. Login validates credentials against the same Aiven-backed user table and returns a JWT.
5. Authenticated users upload ZIP archives, view findings, request fix suggestions, and download review archives through protected REST endpoints.
6. Project, review, and finding records are persisted through Spring Data JPA in Aiven PostgreSQL.

## Security and limitations
- Supabase Auth and its frontend SDK are removed. Spring Boot JWT + Aiven PostgreSQL are the only authentication/database path.
- Passwords are hashed with BCrypt; plain-text passwords are not stored.
- Database credentials, JWT secret, and Groq key remain server-side.
- The fix endpoint currently returns a reviewable suggestion; it does not silently rewrite source files.
- Uploaded archives are extracted under `DATAGUARD_STORAGE_DIR` (defaults to the OS temporary directory for local development). On a single-instance deployment, point it at a private persistent disk mount so review downloads and fix operations survive restarts. Multi-instance deployments need shared private object storage; local disk alone is not shared across replicas.
- Invalid/empty ZIPs are rejected, archive path traversal is blocked, and failed extraction/review attempts clean up their workspace and roll back database work.
- Keep `.env` out of Git. If a key has ever been committed, rotate it.
