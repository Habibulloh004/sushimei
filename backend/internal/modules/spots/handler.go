package spots

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *fiber.Ctx) error {
	includeInactive := c.Query("include_inactive") == "true"

	items, err := h.service.List(c.Context(), includeInactive)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch spots", err.Error())
	}

	return response.OK(c, fiber.StatusOK, items, nil)
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing spot id", nil)
	}

	item, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		statusCode := fiber.StatusInternalServerError
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to fetch spot", err.Error())
	}

	return response.OK(c, fiber.StatusOK, item, nil)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	id, err := h.service.Create(c.Context(), req)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "failed to create spot", err.Error())
	}

	return response.OK(c, fiber.StatusCreated, fiber.Map{"id": id}, nil)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing spot id", nil)
	}

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	if err := h.service.Update(c.Context(), id, req); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to update spot", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true}, nil)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing spot id", nil)
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to delete spot", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"deleted": true}, nil)
}
