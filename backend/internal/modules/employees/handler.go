package employees

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

	includeInactive := c.Query("include_inactive") == "true"

	items, total, err := h.service.List(c.Context(), params, includeInactive)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch employees", err.Error())
	}

	meta := pagination.BuildMeta(params, total)
	return response.OK(c, fiber.StatusOK, items, meta)
}

// GetMe returns the signed-in employee's full profile (name, email, phone,
// avatar, spot, on_duty...) so the courier/cashier UIs can render a proper
// profile page without storing extra data in the JWT.
func (h *Handler) GetMe(c *fiber.Ctx) error {
	userID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(userID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated user", nil)
	}

	item, err := h.service.GetByID(c.Context(), userID)
	if err != nil {
		statusCode := fiber.StatusInternalServerError
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to fetch profile", err.Error())
	}

	// On-duty comes from a separate column not included in DetailItem; inject it
	// here so the client doesn't need a second round trip.
	onDuty, _ := h.service.GetOnDuty(c.Context(), userID)
	return response.OK(c, fiber.StatusOK, fiber.Map{
		"employee": item,
		"on_duty":  onDuty,
	}, nil)
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing employee id", nil)
	}

	item, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		statusCode := fiber.StatusInternalServerError
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to fetch employee", err.Error())
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
		return response.Fail(c, fiber.StatusBadRequest, "failed to create employee", err.Error())
	}

	return response.OK(c, fiber.StatusCreated, fiber.Map{"id": id}, nil)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing employee id", nil)
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
		return response.Fail(c, statusCode, "failed to update employee", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true}, nil)
}

func (h *Handler) ListCouriers(c *fiber.Ctx) error {
	spotID, _ := c.Locals(middleware.ContextSpotID).(string)
	spotIDOverride := strings.TrimSpace(c.Query("spot_id"))
	if spotIDOverride != "" {
		spotID = spotIDOverride
	}
	onlyOnDuty := strings.EqualFold(c.Query("on_duty"), "true")

	items, err := h.service.ListCouriers(c.Context(), spotID, onlyOnDuty)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch couriers", err.Error())
	}

	return response.OK(c, fiber.StatusOK, items, nil)
}

func (h *Handler) GetMyOnDutyStatus(c *fiber.Ctx) error {
	userID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(userID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated user", nil)
	}

	onDuty, err := h.service.GetOnDuty(c.Context(), userID)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to read status", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"on_duty": onDuty}, nil)
}

func (h *Handler) SetMyOnDutyStatus(c *fiber.Ctx) error {
	userID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(userID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated user", nil)
	}

	var req SetOnDutyRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	if err := h.service.SetOnDuty(c.Context(), userID, req.OnDuty); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "failed to update status", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"on_duty": req.OnDuty}, nil)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing employee id", nil)
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to delete employee", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"deleted": true}, nil)
}
