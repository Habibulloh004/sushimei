package bonusrules

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

func (s *Service) List(ctx context.Context) ([]Rule, error) {
	return s.repo.List(ctx)
}

func (s *Service) Create(ctx context.Context, req CreateRequest) (string, error) {
	defaultActive := true
	defaultEarn := 1.0
	defaultSpend := 1.0
	defaultMinOrder := 0.0
	defaultMaxSpend := 50.0

	if req.IsActive == nil {
		req.IsActive = &defaultActive
	}
	if req.EarnPercent == nil {
		req.EarnPercent = &defaultEarn
	}
	if req.SpendRate == nil {
		req.SpendRate = &defaultSpend
	}
	if req.MinOrderToEarn == nil {
		req.MinOrderToEarn = &defaultMinOrder
	}
	if req.MaxSpendPercent == nil {
		req.MaxSpendPercent = &defaultMaxSpend
	}

	if err := validate(*req.EarnPercent, *req.SpendRate, *req.MinOrderToEarn, *req.MaxSpendPercent, req.ExpiresInDays); err != nil {
		return "", err
	}

	return s.repo.Create(ctx, req)
}

func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("bonus rule id is required")
	}

	if req.EarnPercent != nil || req.SpendRate != nil || req.MinOrderToEarn != nil || req.MaxSpendPercent != nil || req.ExpiresInDays != nil {
		earn := 1.0
		spend := 1.0
		minOrder := 0.0
		maxSpend := 50.0

		if req.EarnPercent != nil {
			earn = *req.EarnPercent
		}
		if req.SpendRate != nil {
			spend = *req.SpendRate
		}
		if req.MinOrderToEarn != nil {
			minOrder = *req.MinOrderToEarn
		}
		if req.MaxSpendPercent != nil {
			maxSpend = *req.MaxSpendPercent
		}

		if err := validate(earn, spend, minOrder, maxSpend, req.ExpiresInDays); err != nil {
			return err
		}
	}

	return s.repo.Update(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("bonus rule id is required")
	}
	return s.repo.Delete(ctx, id)
}

func validate(earnPercent, spendRate, minOrderToEarn, maxSpendPercent float64, expiresInDays *int) error {
	if earnPercent < 0 || earnPercent > 100 {
		return errors.New("earn_percent must be between 0 and 100")
	}
	if spendRate <= 0 {
		return errors.New("spend_rate must be greater than 0")
	}
	if minOrderToEarn < 0 {
		return errors.New("min_order_to_earn must be non-negative")
	}
	if maxSpendPercent <= 0 || maxSpendPercent > 100 {
		return errors.New("max_spend_percent must be between 0 and 100")
	}
	if expiresInDays != nil && *expiresInDays <= 0 {
		return errors.New("expires_in_days must be greater than 0")
	}
	return nil
}
