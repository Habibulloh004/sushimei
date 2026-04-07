package employees

import (
	"context"
	"errors"
	"strings"

	"sushimei/backend/internal/platform/pagination"
	"sushimei/backend/internal/platform/security"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

var SortColumns = map[string]string{
	"created_at": "e.created_at",
	"email":      "e.email",
	"name":       "CONCAT_WS(' ', e.first_name, e.last_name)",
}

func (s *Service) List(ctx context.Context, params pagination.ListParams, includeInactive bool) ([]ListItem, int64, error) {
	return s.repo.List(ctx, params, includeInactive)
}

func (s *Service) GetByID(ctx context.Context, id string) (*DetailItem, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("employee id is required")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, req CreateRequest) (string, error) {
	if strings.TrimSpace(req.RoleCode) == "" {
		return "", errors.New("role_code is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return "", errors.New("email is required")
	}
	if strings.TrimSpace(req.Password) == "" {
		return "", errors.New("password is required")
	}
	if len(req.Password) < 6 {
		return "", errors.New("password must be at least 6 characters")
	}

	passwordHash, err := security.HashPassword(req.Password)
	if err != nil {
		return "", err
	}

	return s.repo.Create(ctx, req, passwordHash)
}

func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("employee id is required")
	}

	var passwordHash *string
	if req.Password != nil && strings.TrimSpace(*req.Password) != "" {
		if len(*req.Password) < 6 {
			return errors.New("password must be at least 6 characters")
		}
		hash, err := security.HashPassword(*req.Password)
		if err != nil {
			return err
		}
		passwordHash = &hash
	}

	return s.repo.Update(ctx, id, req, passwordHash)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("employee id is required")
	}
	return s.repo.Delete(ctx, id)
}
