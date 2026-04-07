package products

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
	"created_at": "p.created_at",
	"base_price": "p.base_price",
	"name":       "p.name_i18n->>'en'",
	"sort_order": "p.sort_order",
}

func (s *Service) List(ctx context.Context, params pagination.ListParams, categoryID string, includeInactive bool) ([]ListItem, int64, error) {
	return s.repo.List(ctx, params, categoryID, includeInactive)
}

func (s *Service) GetByID(ctx context.Context, id string) (*DetailItem, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("product id is required")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, req CreateRequest) (string, error) {
	if strings.TrimSpace(req.CategoryID) == "" {
		return "", errors.New("category_id is required")
	}
	if len(req.NameI18n) == 0 {
		return "", errors.New("name is required")
	}
	if req.BasePrice < 0 {
		return "", errors.New("base_price cannot be negative")
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("product id is required")
	}
	return s.repo.Update(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("product id is required")
	}
	return s.repo.Delete(ctx, id)
}

func (s *Service) GetAllModifierGroups(ctx context.Context) ([]ModifierGroup, error) {
	return s.repo.GetAllModifierGroups(ctx)
}

func (s *Service) GetDietaryOptions(ctx context.Context) ([]string, error) {
	return s.repo.GetDietaryOptions(ctx)
}
