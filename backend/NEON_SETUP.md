# Neon setup for Render

The backend uses the pooled Neon connection for API requests and the direct Neon connection for Flyway migrations.

In the Render service **Environment** settings, add these secret variables before deploying the PostgreSQL backend:

- `DATABASE_URL`: Neon pooled connection string (`postgresql://...-pooler.../database?sslmode=require`).
- `DATABASE_URL_UNPOOLED`: Neon direct connection string (`postgresql://.../database?sslmode=require`, without `-pooler`).

Copy both values from Neon’s **Connect** dialog and keep them secret. The backend accepts the standard Neon `postgresql://` form and converts it to JDBC internally. It also accepts `jdbc:postgresql://` URLs.

On its first start, Flyway applies `src/main/resources/db/migration/V1__create_avisa_tables.sql`. This creates the PostgreSQL versions of `usuarios`, `categorias`, `trabajos`, and `ofertas`, with their foreign keys and category seed rows. Keep the Neon database empty before the first migration; if the tables were created manually already, do not deploy until a Flyway baseline/migration plan is prepared.

The publication form creates or reuses a user by email, checks the password for existing accounts, hashes new passwords with BCrypt, and stores client requests in `trabajos` or professional offers in `ofertas`. User data and listings commit in one transaction.
