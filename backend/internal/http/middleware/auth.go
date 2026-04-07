package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/response"
	"sushimei/backend/internal/platform/security"
)

const (
	ContextUserID = "auth.user_id"
	ContextRole   = "auth.role"
	ContextSpotID = "auth.spot_id"
)

func RequireAuth(tokenManager *security.TokenManager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return response.Fail(c, fiber.StatusUnauthorized, "missing bearer token", nil)
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := tokenManager.ParseAccess(strings.TrimSpace(token))
		if err != nil {
			return response.Fail(c, fiber.StatusUnauthorized, "invalid access token", err.Error())
		}

		c.Locals(ContextUserID, claims.UserID)
		c.Locals(ContextRole, claims.Role)
		c.Locals(ContextSpotID, claims.SpotID)
		return c.Next()
	}
}
