package products

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/response"
	"sushimei/backend/internal/platform/pagination"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *fiber.Ctx) error {
	params, err := pagination.ParseListParams(c, SortColumns, "sort_order")
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid list parameters", err.Error())
	}

	categoryID := c.Query("category_id")
	includeInactive := c.Query("include_inactive") == "true"

	items, total, err := h.service.List(c.Context(), params, categoryID, includeInactive)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch products", err.Error())
	}

	meta := pagination.BuildMeta(params, total)
	return response.OK(c, fiber.StatusOK, items, meta)
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing product id", nil)
	}

	item, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		statusCode := fiber.StatusInternalServerError
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to fetch product", err.Error())
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
		return response.Fail(c, fiber.StatusBadRequest, "failed to create product", err.Error())
	}

	return response.OK(c, fiber.StatusCreated, fiber.Map{"id": id}, nil)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing product id", nil)
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
		return response.Fail(c, statusCode, "failed to update product", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true}, nil)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing product id", nil)
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to delete product", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"deleted": true}, nil)
}

// GetModifiers returns all modifier groups with their options
func (h *Handler) GetModifiers(c *fiber.Ctx) error {
	groups, err := h.service.GetAllModifierGroups(c.Context())
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch modifiers", err.Error())
	}
	return response.OK(c, fiber.StatusOK, groups, nil)
}

// GetDietaryOptions returns available dietary filter options
func (h *Handler) GetDietaryOptions(c *fiber.Ctx) error {
	options, err := h.service.GetDietaryOptions(c.Context())
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch dietary options", err.Error())
	}
	return response.OK(c, fiber.StatusOK, options, nil)
}
