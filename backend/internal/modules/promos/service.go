package promos

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
	"created_at":     "pc.created_at",
	"code":           "pc.code",
	"discount_value": "pc.discount_value",
}

func (s *Service) List(ctx context.Context, params pagination.ListParams, includeInactive bool) ([]ListItem, int64, error) {
	return s.repo.List(ctx, params, includeInactive)
}

func (s *Service) GetByID(ctx context.Context, id string) (*ListItem, error) {
	if strings.TrimSpace(id) == "" {
		return nil, errors.New("promo code id is required")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, req CreateRequest) (string, error) {
	req.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	req.RewardType = strings.ToUpper(strings.TrimSpace(req.RewardType))
	req.AppliesTo = strings.ToUpper(strings.TrimSpace(req.AppliesTo))
	req.DiscountType = strings.ToUpper(strings.TrimSpace(req.DiscountType))

	if req.Code == "" {
		return "", errors.New("code is required")
	}
	if len(req.TitleI18n) == 0 {
		return "", errors.New("title is required")
	}
	if err := validatePromo(req); err != nil {
		return "", err
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("promo code id is required")
	}

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	merged := CreateRequest{
		Code:                 current.Code,
		TitleI18n:            current.TitleI18n,
		DescriptionI18n:      current.DescriptionI18n,
		RewardType:           current.RewardType,
		AppliesTo:            current.AppliesTo,
		DiscountType:         current.DiscountType,
		DiscountValue:        current.DiscountValue,
		MinOrderAmount:       current.MinOrderAmount,
		MaxDiscountAmount:    current.MaxDiscountAmount,
		BonusPoints:          current.BonusPoints,
		BonusProductID:       current.BonusProductID,
		CategoryIDs:          current.CategoryIDs,
		ProductIDs:           current.ProductIDs,
		SpotIDs:              current.SpotIDs,
		TotalUsageLimit:      current.TotalUsageLimit,
		PerUserUsageLimit:    current.PerUserUsageLimit,
		ValidFrom:            current.ValidFrom,
		ValidTo:              current.ValidTo,
	}
	if current.BonusProductQuantity > 0 {
		quantity := current.BonusProductQuantity
		merged.BonusProductQuantity = &quantity
	}

	if req.Code != nil {
		value := strings.ToUpper(strings.TrimSpace(*req.Code))
		req.Code = &value
		merged.Code = value
	}
	if req.RewardType != nil {
		value := strings.ToUpper(strings.TrimSpace(*req.RewardType))
		req.RewardType = &value
		merged.RewardType = value
	}
	if req.AppliesTo != nil {
		value := strings.ToUpper(strings.TrimSpace(*req.AppliesTo))
		req.AppliesTo = &value
		merged.AppliesTo = value
	}
	if req.DiscountType != nil {
		value := strings.ToUpper(strings.TrimSpace(*req.DiscountType))
		req.DiscountType = &value
		merged.DiscountType = value
	}
	if req.TitleI18n != nil {
		merged.TitleI18n = req.TitleI18n
	}
	if req.DescriptionI18n != nil {
		merged.DescriptionI18n = req.DescriptionI18n
	}
	if req.DiscountValue != nil {
		merged.DiscountValue = *req.DiscountValue
	}
	if req.MinOrderAmount != nil {
		merged.MinOrderAmount = req.MinOrderAmount
	}
	if req.MaxDiscountAmount != nil {
		merged.MaxDiscountAmount = req.MaxDiscountAmount
	}
	if req.BonusPoints != nil {
		merged.BonusPoints = req.BonusPoints
	}
	if req.BonusProductID != nil {
		trimmed := strings.TrimSpace(*req.BonusProductID)
		req.BonusProductID = &trimmed
		merged.BonusProductID = req.BonusProductID
	}
	if req.BonusProductQuantity != nil {
		merged.BonusProductQuantity = req.BonusProductQuantity
	}
	if req.CategoryIDs != nil {
		merged.CategoryIDs = req.CategoryIDs
	}
	if req.ProductIDs != nil {
		merged.ProductIDs = req.ProductIDs
	}
	if req.SpotIDs != nil {
		merged.SpotIDs = req.SpotIDs
	}
	if req.TotalUsageLimit != nil {
		merged.TotalUsageLimit = req.TotalUsageLimit
	}
	if req.PerUserUsageLimit != nil {
		merged.PerUserUsageLimit = req.PerUserUsageLimit
	}
	if req.ValidFrom != nil {
		merged.ValidFrom = req.ValidFrom
	}
	if req.ValidTo != nil {
		merged.ValidTo = req.ValidTo
	}

	if err := validatePromo(merged); err != nil {
		return err
	}
	return s.repo.Update(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("promo code id is required")
	}
	return s.repo.Delete(ctx, id)
}

func validatePromo(req CreateRequest) error {
	if req.RewardType == "" {
		req.RewardType = "DISCOUNT"
	}
	if req.AppliesTo == "" {
		req.AppliesTo = "ORDER"
	}
	if req.RewardType != "DISCOUNT" && req.RewardType != "BONUS_POINTS" && req.RewardType != "BONUS_PRODUCT" {
		return errors.New("reward_type must be DISCOUNT, BONUS_POINTS or BONUS_PRODUCT")
	}
	if req.AppliesTo != "ORDER" && req.AppliesTo != "PRODUCT" {
		return errors.New("applies_to must be ORDER or PRODUCT")
	}

	switch req.RewardType {
	case "DISCOUNT":
		if req.DiscountType != "FIXED" && req.DiscountType != "PERCENT" {
			return errors.New("discount_type must be FIXED or PERCENT")
		}
		if req.DiscountValue <= 0 {
			return errors.New("discount_value must be positive")
		}
		if req.DiscountType == "PERCENT" && req.DiscountValue > 100 {
			return errors.New("percent discount cannot exceed 100")
		}
		if req.AppliesTo == "PRODUCT" && len(req.ProductIDs) == 0 && len(req.CategoryIDs) == 0 {
			return errors.New("product discount requires at least one target product or category")
		}
	case "BONUS_POINTS":
		if req.BonusPoints == nil || *req.BonusPoints <= 0 {
			return errors.New("bonus_points must be greater than 0")
		}
	case "BONUS_PRODUCT":
		if req.BonusProductID == nil || strings.TrimSpace(*req.BonusProductID) == "" {
			return errors.New("bonus_product_id is required")
		}
		if req.BonusProductQuantity == nil || *req.BonusProductQuantity <= 0 {
			return errors.New("bonus_product_quantity must be greater than 0")
		}
	}

	if req.TotalUsageLimit != nil && *req.TotalUsageLimit <= 0 {
		return errors.New("total_usage_limit must be greater than 0")
	}
	if req.PerUserUsageLimit != nil && *req.PerUserUsageLimit <= 0 {
		return errors.New("per_user_usage_limit must be greater than 0")
	}
	return nil
}
