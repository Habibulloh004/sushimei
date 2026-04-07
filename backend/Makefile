.PHONY: run build tidy fmt test db-create db-drop migrate-up migrate-down setup dev

DB_NAME ?= sushimei
DB_URL ?= postgres://postgres:postgres@localhost:5432/$(DB_NAME)?sslmode=disable
DB_ADMIN_URL ?= postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable
MIGRATION_UP ?= migrations/000001_init.up.sql
MIGRATION_DOWN ?= migrations/000001_init.down.sql

run:
	go run ./cmd/api

build:
	go build ./cmd/api

tidy:
	go mod tidy

fmt:
	gofmt -w ./cmd ./internal

test:
	go test ./...

db-create:
	@psql "$(DB_ADMIN_URL)" -tAc "SELECT 1 FROM pg_database WHERE datname='$(DB_NAME)'" | grep -q 1 || psql "$(DB_ADMIN_URL)" -c "CREATE DATABASE $(DB_NAME);"

db-drop:
	psql "$(DB_ADMIN_URL)" -c "DROP DATABASE IF EXISTS $(DB_NAME);"

migrate-up:
	psql "$(DB_URL)" -f "$(MIGRATION_UP)"

migrate-down:
	psql "$(DB_URL)" -f "$(MIGRATION_DOWN)"

setup: db-create migrate-up

dev: setup run
