package orders

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/middleware"
	"sushimei/backend/internal/http/response"
	"sushimei/backend/internal/platform/pagination"
	"sushimei/backend/internal/platform/rbac"
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

	role, _ := c.Locals(middleware.ContextRole).(string)
	userID, _ := c.Locals(middleware.ContextUserID).(string)
	spotIDFromToken, _ := c.Locals(middleware.ContextSpotID).(string)

	// Staff roles with a spot_id in JWT must only see their own spot's orders
	isSpotBoundRole := role == rbac.RoleSpotOp || role == rbac.RoleKitchen ||
		role == rbac.RoleCashier || role == rbac.RoleCourier
	if isSpotBoundRole && strings.TrimSpace(spotIDFromToken) != "" {
		if params.SpotID != "" && params.SpotID != spotIDFromToken {
			return response.Fail(c, fiber.StatusForbidden, "cannot access other spot orders", nil)
		}
		params.SpotID = spotIDFromToken
	}

	customerID := ""
	if role == rbac.RoleCustomer {
		customerID = userID
	}

	items, total, err := h.service.List(c.Context(), params, customerID)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch orders", err.Error())
	}

	meta := pagination.BuildMeta(params, total)
	return response.OK(c, fiber.StatusOK, items, meta)
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	orderID := c.Params("id")
	if orderID == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing order id", nil)
	}

	detail, err := h.service.GetByID(c.Context(), orderID)
	if err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to fetch order", err.Error())
	}

	// Enforce spot-bound access: staff with a spot_id can only view their own spot's orders
	role, _ := c.Locals(middleware.ContextRole).(string)
	spotIDFromToken, _ := c.Locals(middleware.ContextSpotID).(string)
	isSpotBoundRole := role == rbac.RoleSpotOp || role == rbac.RoleKitchen ||
		role == rbac.RoleCashier || role == rbac.RoleCourier
	if isSpotBoundRole && strings.TrimSpace(spotIDFromToken) != "" && detail.SpotID != spotIDFromToken {
		return response.Fail(c, fiber.StatusForbidden, "cannot access other spot orders", nil)
	}

	return response.OK(c, fiber.StatusOK, detail, nil)
}

func (h *Handler) Preview(c *fiber.Ctx) error {
	customerID, _ := c.Locals(middleware.ContextUserID).(string)

	var req UpsertOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	pricing, err := h.service.Preview(c.Context(), customerID, req)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "failed to preview order", err.Error())
	}

	return response.OK(c, fiber.StatusOK, pricing, nil)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	customerID, _ := c.Locals(middleware.ContextUserID).(string)

	var req UpsertOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	order, err := h.service.Create(c.Context(), customerID, "", req)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "failed to create order", err.Error())
	}

	return response.OK(c, fiber.StatusCreated, order, nil)
}

func (h *Handler) UpdateStatus(c *fiber.Ctx) error {
	orderID := c.Params("id")
	if orderID == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing order id", nil)
	}

	var req UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	actorID, _ := c.Locals(middleware.ContextUserID).(string)
	actorRole, _ := c.Locals(middleware.ContextRole).(string)
	if err := h.service.UpdateStatus(c.Context(), orderID, req.Status, req.Reason, actorID, actorRole); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to update order status", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true, "order_id": orderID, "status": req.Status}, fiber.Map{"code": strconv.Itoa(fiber.StatusOK)})
}

func (h *Handler) CreateSpotOrder(c *fiber.Ctx) error {
	employeeID, _ := c.Locals(middleware.ContextUserID).(string)
	spotID, _ := c.Locals(middleware.ContextSpotID).(string)

	var req UpsertOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	if strings.TrimSpace(spotID) != "" {
		req.SpotID = spotID
	}

	order, err := h.service.Create(c.Context(), "", employeeID, req)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "failed to create order", err.Error())
	}

	return response.OK(c, fiber.StatusCreated, order, nil)
}

func (h *Handler) CustomerGetByID(c *fiber.Ctx) error {
	orderID := c.Params("id")
	if orderID == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing order id", nil)
	}

	customerID, _ := c.Locals(middleware.ContextUserID).(string)
	if strings.TrimSpace(customerID) == "" {
		return response.Fail(c, fiber.StatusUnauthorized, "missing authenticated customer", nil)
	}

	detail, err := h.service.GetByID(c.Context(), orderID)
	if err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to fetch order", err.Error())
	}

	// Verify the order belongs to the customer
	ownerID, ownerErr := h.service.GetOrderCustomerID(c.Context(), orderID)
	if ownerErr != nil || ownerID != customerID {
		return response.Fail(c, fiber.StatusNotFound, "order not found", nil)
	}

	return response.OK(c, fiber.StatusOK, detail, nil)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	orderID := c.Params("id")
	if orderID == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing order id", nil)
	}

	if err := h.service.Delete(c.Context(), orderID); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to delete order", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"deleted": true, "order_id": orderID}, fiber.Map{"code": strconv.Itoa(fiber.StatusOK)})
}

// GetDashboardStats returns admin dashboard statistics
func (h *Handler) GetDashboardStats(c *fiber.Ctx) error {
	stats, err := h.service.GetDashboardStats(c.Context())
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch dashboard stats", err.Error())
	}
	return response.OK(c, fiber.StatusOK, stats, nil)
}

// GetEfficiencyMetrics returns operational efficiency metrics
func (h *Handler) GetEfficiencyMetrics(c *fiber.Ctx) error {
	metrics, err := h.service.GetEfficiencyMetrics(c.Context())
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch efficiency metrics", err.Error())
	}
	return response.OK(c, fiber.StatusOK, metrics, nil)
}

// GetLoyaltyStats returns loyalty program statistics
func (h *Handler) GetLoyaltyStats(c *fiber.Ctx) error {
	stats, err := h.service.GetLoyaltyStats(c.Context())
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch loyalty stats", err.Error())
	}
	return response.OK(c, fiber.StatusOK, stats, nil)
}
