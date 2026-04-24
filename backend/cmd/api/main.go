package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sushimei/backend/internal/config"
	"sushimei/backend/internal/database"
	apphttp "sushimei/backend/internal/http"
	"sushimei/backend/internal/modules/addresses"
	"sushimei/backend/internal/modules/auth"
	"sushimei/backend/internal/modules/bonusrules"
	"sushimei/backend/internal/modules/categories"
	"sushimei/backend/internal/modules/customers"
	"sushimei/backend/internal/modules/employees"
	"sushimei/backend/internal/modules/health"
	"sushimei/backend/internal/modules/orders"
	"sushimei/backend/internal/modules/products"
	"sushimei/backend/internal/modules/promos"
	"sushimei/backend/internal/modules/spots"
	"sushimei/backend/internal/platform/otp"
	"sushimei/backend/internal/platform/realtime"
	"sushimei/backend/internal/platform/security"
	"sushimei/backend/internal/routes"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	if err := database.EnsureDatabaseExists(ctx, cfg.DatabaseURL); err != nil {
		log.Fatalf("database bootstrap failed: %v", err)
	}

	dbPool, err := database.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}
	defer dbPool.Close()

	migrationsDir, err := database.FindMigrationsDir()
	if err != nil {
		log.Fatalf("migration setup failed: %v", err)
	}
	if err := database.RunMigrations(ctx, dbPool, migrationsDir); err != nil {
		log.Fatalf("migration run failed: %v", err)
	}

	tokenManager := security.NewTokenManager(cfg.JWTAccessSecret, cfg.JWTRefreshSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)
	otpStore := otp.NewMemoryStore()

	// Realtime hub — one shared in-memory instance fans order events to
	// subscribed staff clients over WebSocket.
	hub := realtime.NewHub()

	// Auth module
	authRepo := auth.NewRepository(dbPool)
	authService := auth.NewService(authRepo, tokenManager, otpStore, cfg.AppEnv)
	authHandler := auth.NewHandler(authService)

	// Orders module
	orderRepo := orders.NewRepository(dbPool)
	orderService := orders.NewService(orderRepo).WithHub(hub)
	orderHandler := orders.NewHandler(orderService)

	// Customers module
	customerRepo := customers.NewRepository(dbPool)
	customerService := customers.NewService(customerRepo)
	customerHandler := customers.NewHandler(customerService)

	// Categories module
	categoryRepo := categories.NewRepository(dbPool)
	categoryService := categories.NewService(categoryRepo)
	categoryHandler := categories.NewHandler(categoryService)

	// Products module
	productRepo := products.NewRepository(dbPool)
	productService := products.NewService(productRepo)
	productHandler := products.NewHandler(productService)

	// Spots module
	spotRepo := spots.NewRepository(dbPool)
	spotService := spots.NewService(spotRepo)
	spotHandler := spots.NewHandler(spotService)

	// Employees module
	employeeRepo := employees.NewRepository(dbPool)
	employeeService := employees.NewService(employeeRepo)
	employeeHandler := employees.NewHandler(employeeService)

	// Promos module
	promoRepo := promos.NewRepository(dbPool)
	promoService := promos.NewService(promoRepo)
	promoHandler := promos.NewHandler(promoService)

	// Addresses module
	addressRepo := addresses.NewRepository(dbPool)
	addressService := addresses.NewService(addressRepo)
	addressHandler := addresses.NewHandler(addressService)

	// Bonus rules module
	bonusRuleRepo := bonusrules.NewRepository(dbPool)
	bonusRuleService := bonusrules.NewService(bonusRuleRepo)
	bonusRuleHandler := bonusrules.NewHandler(bonusRuleService)

	// Health module
	healthHandler := health.NewHandler()

	app := apphttp.NewServer(cfg)
	routes.Register(app, routes.Dependencies{
		TokenManager:     tokenManager,
		HealthHandler:    healthHandler,
		AuthHandler:      authHandler,
		OrderHandler:     orderHandler,
		CustomerHandler:  customerHandler,
		CategoryHandler:  categoryHandler,
		ProductHandler:   productHandler,
		SpotHandler:      spotHandler,
		EmployeeHandler:  employeeHandler,
		PromoHandler:     promoHandler,
		BonusRuleHandler: bonusRuleHandler,
		AddressHandler:   addressHandler,
		Hub:              hub,
	})

	go func() {
		if err := apphttp.Listen(app, cfg.AppPort); err != nil {
			log.Fatalf("server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}
