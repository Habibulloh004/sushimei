package orders

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"sushimei/backend/internal/platform/pagination"
	"sushimei/backend/internal/platform/rbac"
	"sushimei/backend/internal/platform/realtime"
)

type Service struct {
	repo *Repository
	hub  *realtime.Hub
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// WithHub wires the realtime broadcaster after construction (keeps the
// zero-value service usable in tests that don't care about events).
func (s *Service) WithHub(hub *realtime.Hub) *Service {
	s.hub = hub
	return s
}

var SortColumns = map[string]string{
	"created_at":   "o.created_at",
	"total_amount": "o.total_amount",
	"status":       "o.status",
	"order_number": "o.order_number",
}

func (s *Service) List(ctx context.Context, params pagination.ListParams, customerID string) ([]ListItem, int64, error) {
	sortColumn, ok := SortColumns[params.SortBy]
	if !ok {
		sortColumn = SortColumns["created_at"]
	}
	return s.repo.List(ctx, params, sortColumn, customerID)
}

func (s *Service) GetByID(ctx context.Context, orderID string) (*OrderDetail, error) {
	if strings.TrimSpace(orderID) == "" {
		return nil, errors.New("order id is required")
	}
	return s.repo.GetByID(ctx, orderID)
}

func (s *Service) GetOrderCustomerID(ctx context.Context, orderID string) (string, error) {
	if strings.TrimSpace(orderID) == "" {
		return "", errors.New("order id is required")
	}
	return s.repo.GetOrderCustomerID(ctx, orderID)
}

func (s *Service) UpdateStatus(ctx context.Context, orderID, nextStatus, reason, actorID, actorRole string) error {
	nextStatus = normalizeStatus(nextStatus)
	if nextStatus == "" {
		return errors.New("status is required")
	}

	if !isKnownStatus(nextStatus) {
		return fmt.Errorf("unknown status: %s", nextStatus)
	}

	current, err := s.repo.GetStatus(ctx, orderID)
	if err != nil {
		return err
	}
	current = normalizeStatus(current)

	if actorRole != rbac.RoleAdmin && actorRole != rbac.RoleSuperAdmin {
		if !canTransition(current, nextStatus) {
			return fmt.Errorf("transition %s -> %s is not allowed", current, nextStatus)
		}
	}

	if err := s.repo.UpdateStatus(ctx, orderID, nextStatus, reason, actorID); err != nil {
		return err
	}

	s.publishStatusChange(ctx, orderID, nextStatus)
	return nil
}

func (s *Service) publishStatusChange(ctx context.Context, orderID, status string) {
	if s.hub == nil {
		return
	}
	spotID, courierID, _ := s.repo.GetOrderRouting(ctx, orderID)
	customerID, _ := s.repo.GetOrderCustomerID(ctx, orderID)
	event := realtime.Event{
		Type:    realtime.EventOrderStatusChanged,
		OrderID: orderID,
		Status:  status,
	}
	s.hub.PublishSpot(spotID, event)
	if courierID != "" {
		s.hub.PublishCourier(courierID, event)
	}
	if customerID != "" {
		s.hub.PublishCustomer(customerID, event)
	}

	// When a delivery order becomes READY without a pre-assigned courier, it
	// enters the offer pool — broadcast to every on-duty courier at the spot
	// so their UI lights up without waiting for the next poll.
	if status == "READY" && courierID == "" && spotID != "" {
		if orderType, err := s.repo.GetOrderType(ctx, orderID); err == nil && orderType == "DELIVERY" {
			s.hub.PublishSpotCouriers(spotID, realtime.Event{
				Type:    realtime.EventOrderOffered,
				OrderID: orderID,
			})
		}
	}
}

func (s *Service) Delete(ctx context.Context, orderID string) error {
	return s.repo.Delete(ctx, orderID)
}

func (s *Service) AssignCourier(ctx context.Context, orderID, courierID, actorID string) error {
	if strings.TrimSpace(orderID) == "" {
		return errors.New("order id is required")
	}
	if strings.TrimSpace(courierID) == "" {
		return errors.New("courier id is required")
	}

	orderType, err := s.repo.GetOrderType(ctx, orderID)
	if err != nil {
		return err
	}
	if orderType != "DELIVERY" {
		return errors.New("only delivery orders can be assigned to a courier")
	}

	if err := s.repo.AssignCourier(ctx, orderID, courierID, actorID); err != nil {
		return err
	}

	if s.hub != nil {
		spotID, _, _ := s.repo.GetOrderRouting(ctx, orderID)
		event := realtime.Event{
			Type:    realtime.EventOrderOfferRequested,
			OrderID: orderID,
		}
		s.hub.PublishSpot(spotID, event)
		s.hub.PublishCourier(courierID, event)
	}

	return nil
}

func (s *Service) GetAssignedCourierID(ctx context.Context, orderID string) (string, error) {
	return s.repo.GetAssignedCourierID(ctx, orderID)
}

// ListCourierOffers exposes the pool of unclaimed delivery orders at a spot
// to the given courier. Returns empty if the courier is off-duty.
func (s *Service) ListCourierOffers(ctx context.Context, spotID, courierID string) ([]CourierOffer, error) {
	if strings.TrimSpace(spotID) == "" {
		return nil, errors.New("spot id is required")
	}
	if strings.TrimSpace(courierID) == "" {
		return nil, errors.New("courier id is required")
	}
	return s.repo.ListCourierOffers(ctx, spotID, courierID)
}

// AcceptCourierOffer atomically claims the order for the given courier.
// Returns ErrOfferAlreadyClaimed if another courier won the race.
// Broadcasts a claimed event to the spot's couriers so losing clients drop
// the offer from their UI without polling.
func (s *Service) AcceptCourierOffer(ctx context.Context, orderID, courierID, actorID string) error {
	if strings.TrimSpace(orderID) == "" {
		return errors.New("order id is required")
	}
	if strings.TrimSpace(courierID) == "" {
		return errors.New("courier id is required")
	}

	if err := s.repo.ClaimCourierOffer(ctx, orderID, courierID, actorID); err != nil {
		return err
	}

	if s.hub != nil {
		spotID, _, _ := s.repo.GetOrderRouting(ctx, orderID)
		customerID, _ := s.repo.GetOrderCustomerID(ctx, orderID)
		claimed := realtime.Event{
			Type:    realtime.EventOrderOfferClaimed,
			OrderID: orderID,
		}
		assigned := realtime.Event{
			Type:    realtime.EventOrderCourierAssigned,
			OrderID: orderID,
		}
		if spotID != "" {
			s.hub.PublishSpotCouriers(spotID, claimed)
			s.hub.PublishSpot(spotID, assigned)
		}
		s.hub.PublishCourier(courierID, assigned)
		if customerID != "" {
			s.hub.PublishCustomer(customerID, assigned)
		}
	}

	return nil
}

func (s *Service) DeclineCourierOffer(ctx context.Context, orderID, courierID, actorID, reason string) error {
	if strings.TrimSpace(orderID) == "" {
		return errors.New("order id is required")
	}
	if strings.TrimSpace(courierID) == "" {
		return errors.New("courier id is required")
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		reason = "Courier declined offer"
	}

	if err := s.repo.DeclineCourierOffer(ctx, orderID, courierID, actorID, reason); err != nil {
		return err
	}

	if s.hub != nil {
		spotID, _, _ := s.repo.GetOrderRouting(ctx, orderID)
		s.hub.PublishSpot(spotID, realtime.Event{
			Type:    realtime.EventOrderOfferDeclined,
			OrderID: orderID,
		})
	}

	return nil
}

// GetCourierTargetMinutes returns the admin-configured SLA window used by the
// courier UI for ETA and late-warning thresholds.
func (s *Service) GetCourierTargetMinutes(ctx context.Context) (int, error) {
	return s.repo.GetCourierTargetMinutes(ctx)
}

// UpdateItems replaces the product list of an existing order and recomputes
// totals. Only allowed while the order is still in RECEIVED — once kitchen
// picks it up the cart is locked to avoid conflicts with the prep flow.
func (s *Service) UpdateItems(ctx context.Context, orderID string, req UpdateItemsRequest) error {
	if strings.TrimSpace(orderID) == "" {
		return errors.New("order id is required")
	}
	if len(req.Items) == 0 {
		return errors.New("at least one order item is required")
	}

	status, spotID, orderType, paymentType, customerName, customerPhone, notes, customerID, err := s.repo.GetOrderForRepricing(ctx, orderID)
	if err != nil {
		return err
	}
	if status != "RECEIVED" {
		return fmt.Errorf("order items can only be edited while status is RECEIVED (current: %s)", status)
	}

	if req.Notes != nil {
		notes = *req.Notes
	}

	upsert := UpsertOrderRequest{
		SpotID:        spotID,
		OrderType:     orderType,
		PaymentType:   paymentType,
		CustomerName:  customerName,
		CustomerPhone: customerPhone,
		Notes:         notes,
		Items:         req.Items,
	}

	custID := ""
	if customerID != nil {
		custID = *customerID
	}
	priced, err := s.priceOrder(ctx, custID, upsert)
	if err != nil {
		return err
	}

	if err := s.repo.ReplaceItems(ctx, orderID, priced, req.Notes); err != nil {
		return err
	}

	// Notify subscribers that the order changed (treated as status update so
	// existing client handlers refresh without extra wiring).
	s.publishStatusChange(ctx, orderID, status)
	return nil
}

var allowedTransitions = map[string]map[string]struct{}{
	"RECEIVED":   {"CONFIRMED": {}, "PREPARING": {}, "CANCELLED": {}},
	"CONFIRMED":  {"PREPARING": {}, "CANCELLED": {}},
	"PREPARING":  {"READY": {}, "CANCELLED": {}},
	"READY":      {"ON_THE_WAY": {}, "COMPLETED": {}},
	"ON_THE_WAY": {"DELIVERED": {}, "CANCELLED": {}},
	"DELIVERED":  {"COMPLETED": {}},
	"COMPLETED":  {},
	"CANCELLED":  {},
	"REJECTED":   {},
}

func canTransition(current, next string) bool {
	nextSet, ok := allowedTransitions[current]
	if !ok {
		return false
	}
	_, ok = nextSet[next]
	return ok
}

func normalizeStatus(status string) string {
	status = strings.TrimSpace(strings.ToUpper(status))
	status = strings.ReplaceAll(status, " ", "_")
	return status
}

func isKnownStatus(status string) bool {
	_, ok := allowedTransitions[status]
	return ok
}

func (s *Service) GetDashboardStats(ctx context.Context) (*DashboardOverview, error) {
	return s.repo.GetDashboardOverview(ctx)
}

func (s *Service) GetEfficiencyMetrics(ctx context.Context) (*EfficiencyMetrics, error) {
	return s.repo.GetEfficiencyMetrics(ctx)
}

func (s *Service) GetLoyaltyStats(ctx context.Context) (*LoyaltyStats, error) {
	return s.repo.GetLoyaltyStats(ctx)
}

func (s *Service) GetDailySales(ctx context.Context, days int) ([]DailySalesPoint, error) {
	return s.repo.GetDailySales(ctx, days)
}
