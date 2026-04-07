package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName          string
	AppEnv           string
	AppPort          string
	DatabaseURL      string
	JWTAccessSecret  string
	JWTRefreshSecret string
	JWTAccessTTL     time.Duration
	JWTRefreshTTL    time.Duration
	RateLimitMax     int
	RateLimitWindow  time.Duration
	AllowedOrigins   string
}

func Load() Config {
	_ = godotenv.Load()

	return Config{
		AppName:          getenv("APP_NAME", "sushimei-backend"),
		AppEnv:           getenv("APP_ENV", "development"),
		AppPort:          getenv("APP_PORT", "8080"),
		DatabaseURL:      getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/sushimei?sslmode=disable"),
		JWTAccessSecret:  getenv("JWT_ACCESS_SECRET", "change-me-access"),
		JWTRefreshSecret: getenv("JWT_REFRESH_SECRET", "change-me-refresh"),
		JWTAccessTTL:     mustDuration("JWT_ACCESS_TTL", "15m"),
		JWTRefreshTTL:    mustDuration("JWT_REFRESH_TTL", "720h"),
		RateLimitMax:     mustInt("RATE_LIMIT_MAX", 100),
		RateLimitWindow:  mustDuration("RATE_LIMIT_WINDOW", "1m"),
		AllowedOrigins:   getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustDuration(key, fallback string) time.Duration {
	v := getenv(key, fallback)
	d, err := time.ParseDuration(v)
	if err != nil {
		fd, _ := time.ParseDuration(fallback)
		return fd
	}
	return d
}

func mustInt(key string, fallback int) int {
	v := getenv(key, "")
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
