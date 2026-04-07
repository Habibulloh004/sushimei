package categories

import (
	"context"
	"errors"
	"strings"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, includeInactive bool) ([]ListItem, error) {
	return s.repo.List(ctx, includeInactive)
}

func (s *Service) GetByID(ctx context.Context, id string) (*ListItem, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("category id is required")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, req CreateRequest) (string, error) {
	if strings.TrimSpace(req.Slug) == "" {
		return "", errors.New("slug is required")
	}
	if len(req.NameI18n) == 0 {
		return "", errors.New("name is required")
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("category id is required")
	}
	return s.repo.Update(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("category id is required")
	}
	return s.repo.Delete(ctx, id)
}
