# SushiMei Backend (Go Fiber + PostgreSQL)

Production-oriented backend foundation for:
- Customer Web App
- Admin Panel
- Spot/Branch Staff Panel

## Implemented in this scaffold
- Go Fiber server with middleware (CORS, Helmet, compression, rate limiting, recover)
- PostgreSQL connection pooling (pgx)
- JWT access/refresh auth with refresh token rotation
- Customer OTP flow (in-memory OTP store for development)
- RBAC middleware and role-permission structure
- Orders list endpoint with server-side filtering, sorting, pagination
- Customers list endpoint with server-side filtering, sorting, pagination
- Order status updates with transition checks + timeline write
- Full initial relational schema migration
- OpenAPI starter spec and architecture docs
- Startup bootstrap: auto-create database (if missing) + auto-apply new `*.up.sql` migrations once

## Quick Start

1. Copy env values:
```bash
cp .env.example .env
```

2. Start PostgreSQL (docker):
```bash
docker compose up -d postgres
```

3. Run backend:
```bash
make run
```

Service runs on `http://localhost:8080`.

## API Docs
- OpenAPI YAML: `docs/openapi.yaml`
- Architecture and delivery docs: `docs/system-design.md`
- Static docs route (when server running): `http://localhost:8080/docs/openapi.yaml`

## Important API Contract
Every list endpoint must support server-side:
- pagination (`page`, `limit`)
- filtering (`date_from`, `date_to`, `status`, `spot_id`, `payment_type`, `order_type`, plus resource-specific filters)
- sorting (`sort_by`, `sort_order`)
- text search (`search`)

No endpoint should return full datasets in one response.
