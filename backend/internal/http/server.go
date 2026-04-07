package http

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"sushimei/backend/internal/config"
	appmw "sushimei/backend/internal/http/middleware"
)

func NewServer(cfg config.Config) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName: cfg.AppName,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fiber.Map{
					"message": "internal server error",
					"detail":  err.Error(),
				},
			})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(compress.New())
	app.Use(helmet.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowCredentials: true,
	}))
	app.Use(appmw.NewRateLimiter(cfg.RateLimitMax, cfg.RateLimitWindow))

	return app
}

func Listen(app *fiber.App, port string) error {
	return app.Listen(fmt.Sprintf(":%s", port))
}
