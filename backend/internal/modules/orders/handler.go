package orders

import (
	"errors"
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

	// Courier sees only orders assigned to them
	if role == rbac.RoleCourier {
		params.AssignedCourierID = userID
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
	userID, _ := c.Locals(middleware.ContextUserID).(string)
	spotIDFromToken, _ := c.Locals(middleware.ContextSpotID).(string)
	isSpotBoundRole := role == rbac.RoleSpotOp || role == rbac.RoleKitchen ||
		role == rbac.RoleCashier || role == rbac.RoleCourier
	if isSpotBoundRole && strings.TrimSpace(spotIDFromToken) != "" && detail.SpotID != spotIDFromToken {
		return response.Fail(c, fiber.StatusForbidden, "cannot access other spot orders", nil)
	}

	// Couriers may only view orders assigned to them
	if role == rbac.RoleCourier {
		if detail.AssignedCourierID == nil || *detail.AssignedCourierID != userID {
			return response.Fail(c, fiber.StatusForbidden, "order is not assigned to you", nil)
		}
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

	if actorRole == rbac.RoleCourier {
		assignedID, err := h.service.GetAssignedCourierID(c.Context(), orderID)
		if err != nil {
			return response.Fail(c, fiber.StatusBadRequest, "failed to verify courier assignment", err.Error())
		}
		if assignedID != actorID {
			return response.Fail(c, fiber.StatusForbidden, "order is not assigned to you", nil)
		}
	}

	if err := h.service.UpdateStatus(c.Context(), orderID, req.Status, req.Reason, actorID, actorRole); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to update order status", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true, "order_id": orderID, "status": req.Status}, fiber.Map{"code": strconv.Itoa(fiber.StatusOK)})
}

func (h *Handler) UpdateItems(c *fiber.Ctx) error {
	orderID := c.Params("id")
	if orderID == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing order id", nil)
	}

	var req UpdateItemsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	if err := h.service.UpdateItems(c.Context(), orderID, req); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to update order items", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"updated": true, "order_id": orderID}, nil)
}

func (h *Handler) AssignCourier(c *fiber.Ctx) error {
	orderID := c.Params("id")
	if orderID == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing order id", nil)
	}

	var req AssignCourierRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	actorID, _ := c.Locals(middleware.ContextUserID).(string)
	if err := h.service.AssignCourier(c.Context(), orderID, strings.TrimSpace(req.CourierID), actorID); err != nil {
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to assign courier", err.Error())
	}

	return response.OK(c, fiber.StatusOK, fiber.Map{"assigned": true, "order_id": orderID, "courier_id": req.CourierID}, nil)
}

// ListCourierOffers returns delivery orders at the courier's spot that are
// READY but not yet claimed. Only COURIER role; empty list if off-duty.
func (h *Handler) ListCourierOffers(c *fiber.Ctx) error {
	role, _ := c.Locals(middleware.ContextRole).(string)
	if role != rbac.RoleCourier {
		return response.Fail(c, fiber.StatusForbidden, "only couriers can view offers", nil)
	}

	userID, _ := c.Locals(middleware.ContextUserID).(string)
	spotID, _ := c.Locals(middleware.ContextSpotID).(string)
	if strings.TrimSpace(spotID) == "" {
		return response.Fail(c, fiber.StatusForbidden, "courier is not bound to a spot", nil)
	}

	offers, err := h.service.ListCourierOffers(c.Context(), spotID, userID)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch offers", err.Error())
	}
	return response.OK(c, fiber.StatusOK, offers, nil)
}

// AcceptCourierOffer atomically claims the offer for the calling courier.
// Returns 409 if another courier won the race.
func (h *Handler) AcceptCourierOffer(c *fiber.Ctx) error {
	role, _ := c.Locals(middleware.ContextRole).(string)
	if role != rbac.RoleCourier {
		return response.Fail(c, fiber.StatusForbidden, "only couriers can accept offers", nil)
	}

	orderID := c.Params("id")
	if orderID == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing order id", nil)
	}

	userID, _ := c.Locals(middleware.ContextUserID).(string)
	if err := h.service.AcceptCourierOffer(c.Context(), orderID, userID, userID); err != nil {
		if errors.Is(err, ErrOfferAlreadyClaimed) {
			return response.Fail(c, fiber.StatusConflict, "offer already claimed", err.Error())
		}
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to accept offer", err.Error())
	}
	return response.OK(c, fiber.StatusOK, fiber.Map{"accepted": true, "order_id": orderID}, nil)
}

func (h *Handler) DeclineCourierOffer(c *fiber.Ctx) error {
	role, _ := c.Locals(middleware.ContextRole).(string)
	if role != rbac.RoleCourier {
		return response.Fail(c, fiber.StatusForbidden, "only couriers can decline offers", nil)
	}

	orderID := c.Params("id")
	if orderID == "" {
		return response.Fail(c, fiber.StatusBadRequest, "missing order id", nil)
	}

	var req DeclineCourierOfferRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	userID, _ := c.Locals(middleware.ContextUserID).(string)
	if err := h.service.DeclineCourierOffer(c.Context(), orderID, userID, userID, req.Reason); err != nil {
		if errors.Is(err, ErrOfferAlreadyClaimed) {
			return response.Fail(c, fiber.StatusConflict, "offer already claimed", err.Error())
		}
		statusCode := fiber.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = fiber.StatusNotFound
		}
		return response.Fail(c, statusCode, "failed to decline offer", err.Error())
	}
	return response.OK(c, fiber.StatusOK, fiber.Map{"declined": true, "order_id": orderID}, nil)
}

// GetCourierTargetMinutes exposes the admin-configured SLA window for the
// courier UI countdown and late-warning thresholds.
func (h *Handler) GetCourierTargetMinutes(c *fiber.Ctx) error {
	minutes, err := h.service.GetCourierTargetMinutes(c.Context())
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to read setting", err.Error())
	}
	return response.OK(c, fiber.StatusOK, CourierTargetSettings{TargetMinutes: minutes}, nil)
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

// GetDailySales returns daily revenue and order counts for the last N days (default 30, max 365).
func (h *Handler) GetDailySales(c *fiber.Ctx) error {
	days := 30
	if raw := strings.TrimSpace(c.Query("days")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 {
			return response.Fail(c, fiber.StatusBadRequest, "invalid days parameter", nil)
		}
		days = parsed
	}

	points, err := h.service.GetDailySales(c.Context(), days)
	if err != nil {
		return response.Fail(c, fiber.StatusInternalServerError, "failed to fetch daily sales", err.Error())
	}
	return response.OK(c, fiber.StatusOK, points, nil)
}
