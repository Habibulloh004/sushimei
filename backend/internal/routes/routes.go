package routes

import (
	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/middleware"
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
	"sushimei/backend/internal/platform/realtime"
	"sushimei/backend/internal/platform/security"
)

type Dependencies struct {
	TokenManager     *security.TokenManager
	HealthHandler    *health.Handler
	AuthHandler      *auth.Handler
	OrderHandler     *orders.Handler
	CustomerHandler  *customers.Handler
	CategoryHandler  *categories.Handler
	ProductHandler   *products.Handler
	SpotHandler      *spots.Handler
	EmployeeHandler  *employees.Handler
	PromoHandler     *promos.Handler
	BonusRuleHandler *bonusrules.Handler
	AddressHandler   *addresses.Handler
	Hub              *realtime.Hub
}

func Register(app *fiber.App, deps Dependencies) {
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"service": "sushimei-backend", "version": "v1"})
	})
	app.Static("/docs", "./docs")

	api := app.Group("/api")
	v1 := api.Group("/v1")

	v1.Get("/health", deps.HealthHandler.Check)

	// Realtime WebSocket endpoint. Auth via `token` query param (JWT access
	// token). The upgrade guard middleware must run before websocket.New.
	if deps.Hub != nil {
		v1.Use("/ws", realtime.UpgradeGuard())
		v1.Get("/ws", realtime.Handler(deps.Hub, deps.TokenManager))
	}

	// Auth routes (public)
	authGroup := v1.Group("/auth")
	authGroup.Post("/customer/request-otp", deps.AuthHandler.RequestCustomerOTP)
	authGroup.Post("/customer/verify-otp", deps.AuthHandler.VerifyCustomerOTP)
	authGroup.Post("/customer/login", deps.AuthHandler.CustomerLogin)
	authGroup.Post("/customer/register", deps.AuthHandler.CustomerRegister)
	authGroup.Post("/employee/login", deps.AuthHandler.EmployeeLogin)
	authGroup.Post("/refresh", deps.AuthHandler.Refresh)

	// Public routes (no auth required)
	public := v1.Group("/public")
	public.Get("/categories", deps.CategoryHandler.List)
	public.Get("/categories/:id", deps.CategoryHandler.GetByID)
	public.Get("/products", deps.ProductHandler.List)
	public.Get("/products/:id", deps.ProductHandler.GetByID)
	public.Get("/spots", deps.SpotHandler.List)
	public.Get("/spots/:id", deps.SpotHandler.GetByID)
	public.Get("/modifiers", deps.ProductHandler.GetModifiers)
	public.Get("/dietary-options", deps.ProductHandler.GetDietaryOptions)

	// Protected routes (auth required)
	protected := v1.Group("", middleware.RequireAuth(deps.TokenManager))

	// Admin routes
	admin := protected.Group("/admin")
	admin.Get("/orders", middleware.RequirePermission("orders.read"), deps.OrderHandler.List)
	admin.Patch("/orders/:id/status", middleware.RequirePermission("orders.write"), deps.OrderHandler.UpdateStatus)
	admin.Delete("/orders/:id", middleware.RequirePermission("orders.write"), deps.OrderHandler.Delete)
	admin.Get("/customers", middleware.RequirePermission("customers.read"), deps.CustomerHandler.List)
	admin.Post("/customers", middleware.RequirePermission("customers.write"), deps.CustomerHandler.Create)
	admin.Put("/customers/:id", middleware.RequirePermission("customers.write"), deps.CustomerHandler.Update)
	admin.Delete("/customers/:id", middleware.RequirePermission("customers.write"), deps.CustomerHandler.Delete)

	// Admin dashboard stats
	admin.Get("/stats/dashboard", middleware.RequirePermission("orders.read"), deps.OrderHandler.GetDashboardStats)
	admin.Get("/stats/efficiency", middleware.RequirePermission("orders.read"), deps.OrderHandler.GetEfficiencyMetrics)
	admin.Get("/stats/loyalty", middleware.RequirePermission("orders.read"), deps.OrderHandler.GetLoyaltyStats)
	admin.Get("/stats/daily-sales", middleware.RequirePermission("orders.read"), deps.OrderHandler.GetDailySales)

	// Categories management (admin)
	admin.Post("/categories", middleware.RequirePermission("menu.write"), deps.CategoryHandler.Create)
	admin.Put("/categories/:id", middleware.RequirePermission("menu.write"), deps.CategoryHandler.Update)
	admin.Delete("/categories/:id", middleware.RequirePermission("menu.write"), deps.CategoryHandler.Delete)

	// Products management (admin)
	admin.Get("/products", middleware.RequirePermission("menu.read"), deps.ProductHandler.List)
	admin.Post("/products", middleware.RequirePermission("menu.write"), deps.ProductHandler.Create)
	admin.Put("/products/:id", middleware.RequirePermission("menu.write"), deps.ProductHandler.Update)
	admin.Delete("/products/:id", middleware.RequirePermission("menu.write"), deps.ProductHandler.Delete)

	// Spots management (admin)
	admin.Get("/spots", middleware.RequirePermission("spots.read"), deps.SpotHandler.List)
	admin.Post("/spots", middleware.RequirePermission("spots.write"), deps.SpotHandler.Create)
	admin.Put("/spots/:id", middleware.RequirePermission("spots.write"), deps.SpotHandler.Update)
	admin.Delete("/spots/:id", middleware.RequirePermission("spots.write"), deps.SpotHandler.Delete)

	// Employees management (admin)
	admin.Get("/employees", middleware.RequirePermission("employees.read"), deps.EmployeeHandler.List)
	admin.Get("/employees/:id", middleware.RequirePermission("employees.read"), deps.EmployeeHandler.GetByID)
	admin.Post("/employees", middleware.RequirePermission("employees.write"), deps.EmployeeHandler.Create)
	admin.Put("/employees/:id", middleware.RequirePermission("employees.write"), deps.EmployeeHandler.Update)
	admin.Delete("/employees/:id", middleware.RequirePermission("employees.write"), deps.EmployeeHandler.Delete)

	// Promos management (admin)
	admin.Get("/promos", middleware.RequirePermission("promos.read"), deps.PromoHandler.List)
	admin.Get("/promos/:id", middleware.RequirePermission("promos.read"), deps.PromoHandler.GetByID)
	admin.Post("/promos", middleware.RequirePermission("promos.write"), deps.PromoHandler.Create)
	admin.Put("/promos/:id", middleware.RequirePermission("promos.write"), deps.PromoHandler.Update)
	admin.Delete("/promos/:id", middleware.RequirePermission("promos.write"), deps.PromoHandler.Delete)

	// Bonus rules management (admin)
	admin.Get("/bonus-rules", middleware.RequirePermission("customers.read"), deps.BonusRuleHandler.List)
	admin.Post("/bonus-rules", middleware.RequirePermission("customers.bonus.write"), deps.BonusRuleHandler.Create)
	admin.Put("/bonus-rules/:id", middleware.RequirePermission("customers.bonus.write"), deps.BonusRuleHandler.Update)
	admin.Delete("/bonus-rules/:id", middleware.RequirePermission("customers.bonus.write"), deps.BonusRuleHandler.Delete)

	// Spot operator routes (shared by CASHIER, KITCHEN, COURIER, SPOT_OPERATOR)
	spot := protected.Group("/spot")
	spot.Get("/orders", middleware.RequirePermission("orders.read"), deps.OrderHandler.List)
	spot.Get("/orders/:id", middleware.RequirePermission("orders.read"), deps.OrderHandler.GetByID)
	spot.Post("/orders", middleware.RequirePermission("orders.write"), deps.OrderHandler.CreateSpotOrder)
	spot.Patch("/orders/:id/status", middleware.RequirePermission("orders.write"), deps.OrderHandler.UpdateStatus)
	spot.Patch("/orders/:id/items", middleware.RequirePermission("orders.write"), deps.OrderHandler.UpdateItems)
	spot.Post("/orders/:id/assign-courier", middleware.RequirePermission("orders.write"), deps.OrderHandler.AssignCourier)
	spot.Get("/couriers", middleware.RequirePermission("orders.read"), deps.EmployeeHandler.ListCouriers)

	// Current employee profile — used by courier/cashier profile pages.
	spot.Get("/employees/me", middleware.RequirePermission("orders.read"), deps.EmployeeHandler.GetMe)

	// Courier self-service — each courier toggles their own on-duty shift flag.
	spot.Get("/couriers/me/on-duty", middleware.RequirePermission("orders.read"), deps.EmployeeHandler.GetMyOnDutyStatus)
	spot.Patch("/couriers/me/on-duty", middleware.RequirePermission("orders.write"), deps.EmployeeHandler.SetMyOnDutyStatus)

	// Courier offer pool — on-duty couriers at the spot race to claim
	// delivery orders. The accept endpoint does an atomic DB claim, so only
	// one courier wins even under concurrent requests.
	spot.Get("/courier/offers", middleware.RequirePermission("orders.read"), deps.OrderHandler.ListCourierOffers)
	spot.Post("/courier/offers/:id/accept", middleware.RequirePermission("orders.write"), deps.OrderHandler.AcceptCourierOffer)
	spot.Post("/courier/offers/:id/decline", middleware.RequirePermission("orders.write"), deps.OrderHandler.DeclineCourierOffer)
	spot.Get("/courier/settings/target-minutes", middleware.RequirePermission("orders.read"), deps.OrderHandler.GetCourierTargetMinutes)

	// Customer routes
	customer := protected.Group("/customer")
	customer.Get("/profile", middleware.RequirePermission("customer.profile.read"), deps.CustomerHandler.Me)
	customer.Put("/profile", middleware.RequirePermission("customer.profile.write"), deps.CustomerHandler.UpdateMe)
	customer.Get("/bonus-history", middleware.RequirePermission("customer.profile.read"), deps.CustomerHandler.BonusActivity)
	customer.Get("/orders", middleware.RequirePermission("customer.order.read"), deps.OrderHandler.List)
	customer.Get("/orders/:id", middleware.RequirePermission("customer.order.read"), deps.OrderHandler.CustomerGetByID)
	customer.Post("/orders/preview", middleware.RequirePermission("customer.order.write"), deps.OrderHandler.Preview)
	customer.Post("/orders", middleware.RequirePermission("customer.order.write"), deps.OrderHandler.Create)

	// Customer address routes
	customer.Get("/addresses", middleware.RequirePermission("customer.profile.read"), deps.AddressHandler.List)
	customer.Post("/addresses", middleware.RequirePermission("customer.profile.write"), deps.AddressHandler.Create)
	customer.Put("/addresses/:id", middleware.RequirePermission("customer.profile.write"), deps.AddressHandler.Update)
	customer.Delete("/addresses/:id", middleware.RequirePermission("customer.profile.write"), deps.AddressHandler.Delete)
}
