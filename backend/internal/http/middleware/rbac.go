package middleware

import (
	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/response"
	"sushimei/backend/internal/platform/rbac"
)

func RequirePermission(permission string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals(ContextRole).(string)
		if !rbac.HasPermission(role, permission) {
			return response.Fail(c, fiber.StatusForbidden, "permission denied", permission)
		}
		return c.Next()
	}
}
