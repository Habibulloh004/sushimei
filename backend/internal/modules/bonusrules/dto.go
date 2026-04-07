package bonusrules

import "time"

type Rule struct {
	ID              string    `json:"id"`
	IsActive        bool      `json:"is_active"`
	EarnPercent     float64   `json:"earn_percent"`
	SpendRate       float64   `json:"spend_rate"`
	MinOrderToEarn  float64   `json:"min_order_to_earn"`
	MaxSpendPercent float64   `json:"max_spend_percent"`
	ExpiresInDays   *int      `json:"expires_in_days"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type CreateRequest struct {
	IsActive        *bool    `json:"is_active"`
	EarnPercent     *float64 `json:"earn_percent"`
	SpendRate       *float64 `json:"spend_rate"`
	MinOrderToEarn  *float64 `json:"min_order_to_earn"`
	MaxSpendPercent *float64 `json:"max_spend_percent"`
	ExpiresInDays   *int     `json:"expires_in_days"`
}

type UpdateRequest struct {
	IsActive        *bool    `json:"is_active,omitempty"`
	EarnPercent     *float64 `json:"earn_percent,omitempty"`
	SpendRate       *float64 `json:"spend_rate,omitempty"`
	MinOrderToEarn  *float64 `json:"min_order_to_earn,omitempty"`
	MaxSpendPercent *float64 `json:"max_spend_percent,omitempty"`
	ExpiresInDays   *int     `json:"expires_in_days,omitempty"`
}
