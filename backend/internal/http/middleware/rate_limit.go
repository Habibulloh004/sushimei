package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// NewRateLimiter returns a Fiber limiter keyed by JWT subject when available
// (falls back to client IP) so two staff members sharing the same NAT don't
// starve each other. WebSocket upgrades are skipped — they are long-lived
// single handshakes and would otherwise consume the hit budget.
func NewRateLimiter(max int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: window,
		Next: func(c *fiber.Ctx) bool {
			p := c.Path()
			// WebSocket upgrade — skip, it's one-shot and long-lived.
			if strings.HasSuffix(p, "/ws") {
				return true
			}
			// Health probes shouldn't eat into the budget.
			if strings.HasSuffix(p, "/health") {
				return true
			}
			return false
		},
		KeyGenerator: func(c *fiber.Ctx) string {
			if auth := c.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
				// Bucket by token fingerprint so one user's traffic is
				// isolated from others on the same IP. We only need uniqueness.
				token := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
				if len(token) > 0 {
					return "jwt:" + token[:min(24, len(token))]
				}
			}
			return "ip:" + c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": fiber.Map{"message": "rate limit exceeded"},
			})
		},
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
