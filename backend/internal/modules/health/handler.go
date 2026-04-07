package health

import (
	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/response"
)

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

func (h *Handler) Check(c *fiber.Ctx) error {
	return response.OK(c, fiber.StatusOK, fiber.Map{"status": "ok"}, nil)
}
