package customers

import "time"

type ListItem struct {
	ID             string     `json:"id"`
	FirstName      string     `json:"first_name"`
	LastName       string     `json:"last_name"`
	Phone          string     `json:"phone"`
	Email          *string    `json:"email"`
	AvatarURL      *string    `json:"avatar_url"`
	Status         string     `json:"status"`
	LanguageCode   string     `json:"language_code"`
	BonusBalance   int        `json:"bonus_balance"`
	MarketingOptIn bool       `json:"marketing_opt_in"`
	LastLoginAt    *time.Time `json:"last_login_at"`
	TotalOrders    int64      `json:"total_orders"`
	LastOrderAt    *time.Time `json:"last_order_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type ListFilters struct {
	Name           string
	Phone          string
	MinTotalOrders int
	MaxTotalOrders int
}

type CreateRequest struct {
	Phone          string  `json:"phone"`
	FirstName      *string `json:"first_name"`
	LastName       *string `json:"last_name"`
	Email          *string `json:"email"`
	AvatarURL      *string `json:"avatar_url"`
	Status         *string `json:"status"`
	LanguageCode   *string `json:"language_code"`
	BonusBalance   *int    `json:"bonus_balance"`
	MarketingOptIn *bool   `json:"marketing_opt_in"`
}

type UpdateRequest struct {
	Phone          *string `json:"phone"`
	FirstName      *string `json:"first_name"`
	LastName       *string `json:"last_name"`
	Email          *string `json:"email"`
	AvatarURL      *string `json:"avatar_url"`
	Status         *string `json:"status"`
	LanguageCode   *string `json:"language_code"`
	BonusBalance   *int    `json:"bonus_balance"`
	MarketingOptIn *bool   `json:"marketing_opt_in"`
}

// ProfileUpdateRequest is the self-service profile update (customer only).
type ProfileUpdateRequest struct {
	FirstName      *string `json:"first_name"`
	LastName       *string `json:"last_name"`
	Email          *string `json:"email"`
	AvatarURL      *string `json:"avatar_url"`
	LanguageCode   *string `json:"language_code"`
	MarketingOptIn *bool   `json:"marketing_opt_in"`
}

type Profile struct {
	ID             string     `json:"id"`
	Phone          string     `json:"phone"`
	FirstName      *string    `json:"first_name"`
	LastName       *string    `json:"last_name"`
	Email          *string    `json:"email"`
	AvatarURL      *string    `json:"avatar_url"`
	Status         string     `json:"status"`
	BonusBalance   int        `json:"bonus_balance"`
	MarketingOptIn bool       `json:"marketing_opt_in"`
	LanguageCode   string     `json:"language_code"`
	LastLoginAt    *time.Time `json:"last_login_at"`
	TotalOrders    int64      `json:"total_orders"`
	LastOrderAt    *time.Time `json:"last_order_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

type BonusActivity struct {
	ID           string     `json:"id"`
	OrderID      *string    `json:"order_id"`
	OrderNumber  *string    `json:"order_number"`
	TxnType      string     `json:"txn_type"`
	Points       int        `json:"points"`
	BalanceAfter int        `json:"balance_after"`
	Reason       *string    `json:"reason"`
	ExpiresAt    *time.Time `json:"expires_at"`
	CreatedAt    time.Time  `json:"created_at"`
}
