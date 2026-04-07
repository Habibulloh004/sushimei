package addresses

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

func (s *Service) List(ctx context.Context, customerID string) ([]Address, error) {
	if strings.TrimSpace(customerID) == "" {
		return nil, errors.New("customer id is required")
	}
	return s.repo.List(ctx, customerID)
}

func (s *Service) Create(ctx context.Context, customerID string, req CreateRequest) (string, error) {
	if strings.TrimSpace(customerID) == "" {
		return "", errors.New("customer id is required")
	}
	return s.repo.Create(ctx, customerID, req)
}

func (s *Service) Update(ctx context.Context, customerID, addressID string, req UpdateRequest) error {
	if strings.TrimSpace(customerID) == "" || strings.TrimSpace(addressID) == "" {
		return errors.New("customer id and address id are required")
	}
	return s.repo.Update(ctx, customerID, addressID, req)
}

func (s *Service) Delete(ctx context.Context, customerID, addressID string) error {
	if strings.TrimSpace(customerID) == "" || strings.TrimSpace(addressID) == "" {
		return errors.New("customer id and address id are required")
	}
	return s.repo.Delete(ctx, customerID, addressID)
}
