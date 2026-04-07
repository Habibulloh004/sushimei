package addresses

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/middleware"
	"sushimei/backend/internal/http/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *fiber.Ctx) error {
	customerID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(customerID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated customer", nil)
	}

	items, err := h.service.List(c.Context(), customerID)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch addresses", err.Error())
	}

	return response.OK(c, fiber.StatusOK, items, nil)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	customerID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(customerID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated customer", nil)
	}

	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	id, err := h.service.Create(c.Context(), customerID, req)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "failed to create address", err.Error())
	}

	return response.OK(c, fiber.StatusCreated, fiber.Map{"id": id}, nil)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	customerID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(customerID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated customer", nil)
	}

	addressID := c.Params("id")
	if strings.TrimSpace(addressID) == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing address id", nil)
	}

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	if err := h.service.Update(c.Context(), customerID, addressID, req); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to update address", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true}, nil)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	customerID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(customerID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated customer", nil)
	}

	addressID := c.Params("id")
	if strings.TrimSpace(addressID) == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing address id", nil)
	}

	if err := h.service.Delete(c.Context(), customerID, addressID); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to delete address", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"deleted": true}, nil)
}
