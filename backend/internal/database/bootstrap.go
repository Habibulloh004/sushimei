package database

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	duplicateDatabaseCode = "42P04"
)

var dbNamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

func EnsureDatabaseExists(ctx context.Context, databaseURL string) error {
	targetCfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return fmt.Errorf("parse database url: %w", err)
	}

	targetDB := strings.TrimSpace(targetCfg.ConnConfig.Database)
	if targetDB == "" {
		return errors.New("database name is empty in DATABASE_URL")
	}

	adminCfg := targetCfg.Copy()
	adminCfg.ConnConfig.Database = "postgres"
	adminCfg.MaxConns = 2
	adminCfg.MinConns = 0

	pool, err := pgxpool.NewWithConfig(ctx, adminCfg)
	if err != nil {
		return fmt.Errorf("create admin pool: %w", err)
	}
	defer pool.Close()

	var exists bool
	if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)`, targetDB).Scan(&exists); err != nil {
		return fmt.Errorf("check database existence: %w", err)
	}
	if exists {
		return nil
	}

	if !dbNamePattern.MatchString(targetDB) {
		return fmt.Errorf("unsafe database name: %s", targetDB)
	}

	createSQL := fmt.Sprintf(`CREATE DATABASE "%s"`, targetDB)
	if _, err := pool.Exec(ctx, createSQL); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == duplicateDatabaseCode {
			return nil
		}
		return fmt.Errorf("create database %s: %w", targetDB, err)
	}

	return nil
}

func FindMigrationsDir() (string, error) {
	candidates := make([]string, 0, 4)
	if env := strings.TrimSpace(os.Getenv("MIGRATIONS_DIR")); env != "" {
		candidates = append(candidates, env)
	}
	candidates = append(candidates, "migrations", "./migrations", "backend/migrations")

	for _, candidate := range candidates {
		if fi, err := os.Stat(candidate); err == nil && fi.IsDir() {
			return candidate, nil
		}
	}

	return "", errors.New("migrations directory not found")
}

func RunMigrations(ctx context.Context, pool *pgxpool.Pool, migrationsDir string) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`); err != nil {
		return fmt.Errorf("ensure schema_migrations table: %w", err)
	}

	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.up.sql"))
	if err != nil {
		return fmt.Errorf("glob migration files: %w", err)
	}
	if len(files) == 0 {
		return fmt.Errorf("no .up.sql files found in %s", migrationsDir)
	}
	sort.Strings(files)

	for _, filePath := range files {
		version := filepath.Base(filePath)

		var applied bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&applied); err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if applied {
			continue
		}

		sqlBytes, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}
		sql := strings.TrimSpace(string(sqlBytes))
		if sql == "" {
			if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
				return fmt.Errorf("mark empty migration %s: %w", version, err)
			}
			continue
		}

		if _, err := pool.Exec(ctx, sql); err != nil {
			return fmt.Errorf("apply migration %s: %w", version, err)
		}
		if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			return fmt.Errorf("mark migration %s: %w", version, err)
		}
	}

	return nil
}
