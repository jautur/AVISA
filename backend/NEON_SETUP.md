# Neon setup for Render

The backend uses the pooled Neon connection for API requests and the direct Neon connection for Flyway migrations.

In the Render service **Environment** settings, add these secret variables before deploying the PostgreSQL backend:

- `DATABASE_URL`: Neon pooled connection string (`postgresql://...-pooler.../database?sslmode=require`).
- `DATABASE_URL_UNPOOLED`: Neon direct connection string (`postgresql://.../database?sslmode=require`, without `-pooler`).

Copy both values from Neon’s **Connect** dialog and keep them secret. The backend accepts the standard Neon `postgresql://` form and converts it to JDBC internally. It also accepts `jdbc:postgresql://` URLs.

On its first start, Flyway applies the migrations in `src/main/resources/db/migration` in order. `V1` creates `usuarios`, `categorias`, `trabajos`, and `ofertas`, with their foreign keys and category seed rows. `V2` creates the table for revocable user sessions. Keep the Neon database empty before the first migration; if the tables were created manually already, do not deploy until a Flyway baseline/migration plan is prepared.

Registration hashes passwords with BCrypt. Login creates a random seven-day bearer session; only its SHA-256 hash is stored in `sesiones_usuario`. Authenticated users can publish to `trabajos` or `ofertas`, and the backend gets the owner ID from the session rather than trusting account fields in the browser request.
