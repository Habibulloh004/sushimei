package customers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/middleware"
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
	params, err := pagination.ParseListParams(c, SortColumns, "created_at")
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid list parameters", err.Error())
	}

	filters := ListFilters{
		Name:           strings.TrimSpace(c.Query("name")),
		Phone:          strings.TrimSpace(c.Query("phone")),
		MinTotalOrders: parsePositiveInt(c.Query("min_total_orders")),
		MaxTotalOrders: parsePositiveInt(c.Query("max_total_orders")),
	}

	items, total, err := h.service.List(c.Context(), params, filters)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch customers", err.Error())
	}

	meta := pagination.BuildMeta(params, total)
	return response.OK(c, fiber.StatusOK, items, meta)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	id, err := h.service.Create(c.Context(), req)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "failed to create customer", err.Error())
	}

	return response.OK(c, fiber.StatusCreated, fiber.Map{"id": id}, nil)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	if strings.TrimSpace(id) == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing customer id", nil)
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
		return response.Fail(c, statusCode, "failed to update customer", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true}, nil)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if strings.TrimSpace(id) == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing customer id", nil)
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to delete customer", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"deleted": true}, nil)
}

func (h *Handler) UpdateMe(c *fiber.Ctx) error {
	userID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(userID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated customer", nil)
	}

	var req ProfileUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	if err := h.service.UpdateProfile(c.Context(), userID, req); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to update profile", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true}, nil)
}

func (h *Handler) Me(c *fiber.Ctx) error {
	userID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(userID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated customer", nil)
	}

	profile, err := h.service.GetByID(c.Context(), userID)
	if err != nil {
		statusCode := fiber.StatusInternalServerError
		if strings.Contains(strings.ToLower(err.Error()), "no rows") || strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to fetch customer profile", err.Error())
	}

	return response.OK(c, fiber.StatusOK, profile, nil)
}

func parsePositiveInt(raw string) int {
	n := 0
	for _, r := range raw {
		if r < '0' || r > '9' {
			return 0
		}
		n = n*10 + int(r-'0')
	}
	if n < 0 {
		return 0
	}
	return n
}
