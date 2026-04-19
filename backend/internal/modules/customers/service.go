package customers

import (
	"context"
	"errors"
	"strings"
	"sushimei/backend/internal/platform/pagination"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

var SortColumns = map[string]string{
	"created_at":    "c.created_at",
	"bonus_balance": "c.bonus_balance",
	"total_orders":  "total_orders",
	"last_order_at": "last_order_at",
	"phone":         "c.phone",
}

func (s *Service) List(ctx context.Context, params pagination.ListParams, filters ListFilters) ([]ListItem, int64, error) {
	sortColumn, ok := SortColumns[params.SortBy]
	if !ok {
		sortColumn = SortColumns["created_at"]
	}
	return s.repo.List(ctx, params, filters, sortColumn)
}

func (s *Service) Create(ctx context.Context, req CreateRequest) (string, error) {
	req.Phone = strings.TrimSpace(req.Phone)
	if req.Phone == "" {
		return "", errors.New("phone is required")
	}

	if req.Status != nil {
		status := strings.ToUpper(strings.TrimSpace(*req.Status))
		if status != "ACTIVE" && status != "BLOCKED" {
			return "", errors.New("status must be ACTIVE or BLOCKED")
		}
		req.Status = &status
	}

	if req.LanguageCode != nil {
		lang := strings.TrimSpace(*req.LanguageCode)
		if lang != "" {
			req.LanguageCode = &lang
		}
	}

	return s.repo.Create(ctx, req)
}

func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("customer id is required")
	}

	if req.Phone != nil {
		phone := strings.TrimSpace(*req.Phone)
		if phone == "" {
			return errors.New("phone is required")
		}
		req.Phone = &phone
	}

	if req.Status != nil {
		status := strings.ToUpper(strings.TrimSpace(*req.Status))
		if status != "ACTIVE" && status != "BLOCKED" {
			return errors.New("status must be ACTIVE or BLOCKED")
		}
		req.Status = &status
	}

	if req.LanguageCode != nil {
		lang := strings.TrimSpace(*req.LanguageCode)
		if lang != "" {
			req.LanguageCode = &lang
		}
	}

	return s.repo.Update(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("customer id is required")
	}
	return s.repo.Delete(ctx, id)
}

func (s *Service) UpdateProfile(ctx context.Context, id string, req ProfileUpdateRequest) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("customer id is required")
	}

	if req.LanguageCode != nil {
		lang := strings.TrimSpace(*req.LanguageCode)
		if lang != "" {
			req.LanguageCode = &lang
		}
	}

	return s.repo.UpdateProfile(ctx, id, req)
}

func (s *Service) GetByID(ctx context.Context, id string) (*Profile, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("customer id is required")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) ListBonusActivity(ctx context.Context, id string, limit int) ([]BonusActivity, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("customer id is required")
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	return s.repo.ListBonusActivity(ctx, id, limit)
}
