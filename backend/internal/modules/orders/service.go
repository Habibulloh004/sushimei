package orders

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"sushimei/backend/internal/platform/pagination"
	"sushimei/backend/internal/platform/rbac"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
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

	return s.repo.UpdateStatus(ctx, orderID, nextStatus, reason, actorID)
}

func (s *Service) Delete(ctx context.Context, orderID string) error {
	return s.repo.Delete(ctx, orderID)
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
