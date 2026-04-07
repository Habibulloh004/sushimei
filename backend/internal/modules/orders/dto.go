package orders

import "time"

type ListItem struct {
	ID            string    `json:"id"`
	OrderNumber   string    `json:"order_number"`
	Status        string    `json:"status"`
	OrderType     string    `json:"order_type"`
	PaymentType   string    `json:"payment_type"`
	TotalAmount   float64   `json:"total_amount"`
	CustomerName  string    `json:"customer_name"`
	CustomerPhone string    `json:"customer_phone"`
	SpotName      string    `json:"spot_name"`
	CreatedAt     time.Time `json:"created_at"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

type UpsertOrderItemRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type UpsertOrderRequest struct {
	SpotID             string         `json:"spot_id"`
	OrderType          string         `json:"order_type"`
	PaymentType        string         `json:"payment_type"`
	CustomerName       string         `json:"customer_name"`
	CustomerPhone      string         `json:"customer_phone"`
	DeliveryAddress    map[string]any `json:"delivery_address"`
	PromoCode          string         `json:"promo_code"`
	BonusPointsToSpend int            `json:"bonus_points_to_spend"`
	Notes              string         `json:"notes"`
	Items              []UpsertOrderItemRequest `json:"items"`
}

type PricingItem struct {
	ProductID      string            `json:"product_id"`
	ProductName    map[string]string `json:"product_name"`
	Quantity       int               `json:"quantity"`
	UnitPrice      float64           `json:"unit_price"`
	LineTotal      float64           `json:"line_total"`
	DiscountAmount float64           `json:"discount_amount"`
	IsBonusProduct bool              `json:"is_bonus_product"`
}

type AppliedPromo struct {
	ID                  string   `json:"id"`
	Code                string   `json:"code"`
	RewardType          string   `json:"reward_type"`
	AppliesTo           string   `json:"applies_to"`
	DiscountAmount      float64  `json:"discount_amount"`
	BonusPoints         int      `json:"bonus_points"`
	BonusProductID      *string  `json:"bonus_product_id"`
	BonusProductName    *string  `json:"bonus_product_name"`
	BonusProductQuantity int     `json:"bonus_product_quantity"`
}

type PricingResponse struct {
	Items              []PricingItem `json:"items"`
	SubtotalAmount     float64       `json:"subtotal_amount"`
	PromoDiscountAmount float64      `json:"promo_discount_amount"`
	BonusSpentAmount   float64       `json:"bonus_spent_amount"`
	BonusPointsSpent   int           `json:"bonus_points_spent"`
	DeliveryFeeAmount  float64       `json:"delivery_fee_amount"`
	TotalAmount        float64       `json:"total_amount"`
	BonusEarnedPoints  int           `json:"bonus_earned_points"`
	AppliedPromo       *AppliedPromo `json:"applied_promo,omitempty"`
}

type CreateOrderResponse struct {
	OrderID     string           `json:"order_id"`
	OrderNumber string           `json:"order_number"`
	Pricing     *PricingResponse `json:"pricing"`
}

// DetailItem is a single order item returned in the order detail response.
type DetailItem struct {
	ID          string            `json:"id"`
	ProductID   string            `json:"product_id"`
	ProductName map[string]string `json:"product_name"`
	UnitPrice   float64           `json:"unit_price"`
	Quantity    int               `json:"quantity"`
	LineTotal   float64           `json:"line_total"`
	Note        string            `json:"note"`
}

// OrderDetail is the full order detail returned by GET /spot/orders/:id.
type OrderDetail struct {
	ID            string       `json:"id"`
	OrderNumber   string       `json:"order_number"`
	Status        string       `json:"status"`
	OrderType     string       `json:"order_type"`
	PaymentType   string       `json:"payment_type"`
	TotalAmount   float64      `json:"total_amount"`
	CustomerName  string       `json:"customer_name"`
	CustomerPhone string       `json:"customer_phone"`
	SpotName      string       `json:"spot_name"`
	SpotID        string       `json:"spot_id"`
	Notes         string       `json:"notes"`
	Items         []DetailItem `json:"items"`
	CreatedAt     time.Time    `json:"created_at"`
}
