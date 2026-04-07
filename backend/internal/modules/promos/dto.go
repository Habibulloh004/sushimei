package promos

import "time"

type ListItem struct {
	ID                  string            `json:"id"`
	Code                string            `json:"code"`
	TitleI18n           map[string]string `json:"title_i18n"`
	DescriptionI18n     map[string]string `json:"description_i18n"`
	RewardType          string            `json:"reward_type"`
	AppliesTo           string            `json:"applies_to"`
	DiscountType        string            `json:"discount_type"`
	DiscountValue       float64           `json:"discount_value"`
	MinOrderAmount      *float64          `json:"min_order_amount"`
	MaxDiscountAmount   *float64          `json:"max_discount_amount"`
	BonusPoints         *int              `json:"bonus_points"`
	BonusProductID      *string           `json:"bonus_product_id"`
	BonusProductName    *string           `json:"bonus_product_name"`
	BonusProductQuantity int              `json:"bonus_product_quantity"`
	CategoryIDs         []string          `json:"category_ids"`
	ProductIDs          []string          `json:"product_ids"`
	SpotIDs             []string          `json:"spot_ids"`
	TotalUsageLimit     *int              `json:"total_usage_limit"`
	PerUserUsageLimit   *int              `json:"per_user_usage_limit"`
	ValidFrom           *time.Time        `json:"valid_from"`
	ValidTo             *time.Time        `json:"valid_to"`
	IsActive            bool              `json:"is_active"`
	UsageCount          int               `json:"usage_count"`
	CreatedAt           time.Time         `json:"created_at"`
}

type CreateRequest struct {
	Code                 string            `json:"code"`
	TitleI18n            map[string]string `json:"title_i18n"`
	DescriptionI18n      map[string]string `json:"description_i18n"`
	RewardType           string            `json:"reward_type"`
	AppliesTo            string            `json:"applies_to"`
	DiscountType         string            `json:"discount_type"`
	DiscountValue        float64           `json:"discount_value"`
	MinOrderAmount       *float64          `json:"min_order_amount"`
	MaxDiscountAmount    *float64          `json:"max_discount_amount"`
	BonusPoints          *int              `json:"bonus_points"`
	BonusProductID       *string           `json:"bonus_product_id"`
	BonusProductQuantity *int              `json:"bonus_product_quantity"`
	CategoryIDs          []string          `json:"category_ids"`
	ProductIDs           []string          `json:"product_ids"`
	SpotIDs              []string          `json:"spot_ids"`
	TotalUsageLimit      *int              `json:"total_usage_limit"`
	PerUserUsageLimit    *int              `json:"per_user_usage_limit"`
	ValidFrom            *time.Time        `json:"valid_from"`
	ValidTo              *time.Time        `json:"valid_to"`
}

type UpdateRequest struct {
	Code                 *string           `json:"code,omitempty"`
	TitleI18n            map[string]string `json:"title_i18n,omitempty"`
	DescriptionI18n      map[string]string `json:"description_i18n,omitempty"`
	RewardType           *string           `json:"reward_type,omitempty"`
	AppliesTo            *string           `json:"applies_to,omitempty"`
	DiscountType         *string           `json:"discount_type,omitempty"`
	DiscountValue        *float64          `json:"discount_value,omitempty"`
	MinOrderAmount       *float64          `json:"min_order_amount,omitempty"`
	MaxDiscountAmount    *float64          `json:"max_discount_amount,omitempty"`
	BonusPoints          *int              `json:"bonus_points,omitempty"`
	BonusProductID       *string           `json:"bonus_product_id,omitempty"`
	BonusProductQuantity *int              `json:"bonus_product_quantity,omitempty"`
	CategoryIDs          []string          `json:"category_ids,omitempty"`
	ProductIDs           []string          `json:"product_ids,omitempty"`
	SpotIDs              []string          `json:"spot_ids,omitempty"`
	TotalUsageLimit      *int              `json:"total_usage_limit,omitempty"`
	PerUserUsageLimit    *int              `json:"per_user_usage_limit,omitempty"`
	ValidFrom            *time.Time        `json:"valid_from,omitempty"`
	ValidTo              *time.Time        `json:"valid_to,omitempty"`
	IsActive             *bool             `json:"is_active,omitempty"`
}
