package orders

import "time"

type ListItem struct {
	ID                        string     `json:"id"`
	OrderNumber               string     `json:"order_number"`
	Status                    string     `json:"status"`
	OrderType                 string     `json:"order_type"`
	PaymentType               string     `json:"payment_type"`
	TotalAmount               float64    `json:"total_amount"`
	CustomerName              string     `json:"customer_name"`
	CustomerPhone             string     `json:"customer_phone"`
	SpotName                  string     `json:"spot_name"`
	AssignedCourierID         *string    `json:"assigned_courier_id,omitempty"`
	AssignedCourierName       *string    `json:"assigned_courier_name,omitempty"`
	OfferedCourierID          *string    `json:"offered_courier_id,omitempty"`
	OfferedCourierName        *string    `json:"offered_courier_name,omitempty"`
	CourierOfferStatus        string     `json:"courier_offer_status"`
	CourierOfferDeclineReason *string    `json:"courier_offer_decline_reason,omitempty"`
	CourierOfferedAt          *time.Time `json:"courier_offered_at,omitempty"`
	CourierOfferRespondedAt   *time.Time `json:"courier_offer_responded_at,omitempty"`
	CreatedAt                 time.Time  `json:"created_at"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

type AssignCourierRequest struct {
	CourierID string `json:"courier_id"`
}

type DeclineCourierOfferRequest struct {
	Reason string `json:"reason"`
}

type UpdateItemsRequest struct {
	Items []UpsertOrderItemRequest `json:"items"`
	Notes *string                  `json:"notes,omitempty"`
}

type UpsertOrderItemRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type UpsertOrderRequest struct {
	SpotID             string                   `json:"spot_id"`
	OrderType          string                   `json:"order_type"`
	PaymentType        string                   `json:"payment_type"`
	CustomerName       string                   `json:"customer_name"`
	CustomerPhone      string                   `json:"customer_phone"`
	DeliveryAddress    map[string]any           `json:"delivery_address"`
	PromoCode          string                   `json:"promo_code"`
	BonusPointsToSpend int                      `json:"bonus_points_to_spend"`
	Notes              string                   `json:"notes"`
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
	ID                   string  `json:"id"`
	Code                 string  `json:"code"`
	RewardType           string  `json:"reward_type"`
	AppliesTo            string  `json:"applies_to"`
	DiscountAmount       float64 `json:"discount_amount"`
	BonusPoints          int     `json:"bonus_points"`
	BonusProductID       *string `json:"bonus_product_id"`
	BonusProductName     *string `json:"bonus_product_name"`
	BonusProductQuantity int     `json:"bonus_product_quantity"`
}

type PricingResponse struct {
	Items               []PricingItem `json:"items"`
	SubtotalAmount      float64       `json:"subtotal_amount"`
	PromoDiscountAmount float64       `json:"promo_discount_amount"`
	BonusSpentAmount    float64       `json:"bonus_spent_amount"`
	BonusPointsSpent    int           `json:"bonus_points_spent"`
	DeliveryFeeAmount   float64       `json:"delivery_fee_amount"`
	TotalAmount         float64       `json:"total_amount"`
	BonusEarnedPoints   int           `json:"bonus_earned_points"`
	AppliedPromo        *AppliedPromo `json:"applied_promo,omitempty"`
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
	ID                        string         `json:"id"`
	OrderNumber               string         `json:"order_number"`
	Status                    string         `json:"status"`
	OrderType                 string         `json:"order_type"`
	PaymentType               string         `json:"payment_type"`
	TotalAmount               float64        `json:"total_amount"`
	CustomerName              string         `json:"customer_name"`
	CustomerPhone             string         `json:"customer_phone"`
	SpotName                  string         `json:"spot_name"`
	SpotID                    string         `json:"spot_id"`
	Notes                     string         `json:"notes"`
	DeliveryAddress           map[string]any `json:"delivery_address,omitempty"`
	DeliveryLatitude          *float64       `json:"delivery_latitude,omitempty"`
	DeliveryLongitude         *float64       `json:"delivery_longitude,omitempty"`
	AssignedCourierID         *string        `json:"assigned_courier_id,omitempty"`
	AssignedCourierName       *string        `json:"assigned_courier_name,omitempty"`
	OfferedCourierID          *string        `json:"offered_courier_id,omitempty"`
	OfferedCourierName        *string        `json:"offered_courier_name,omitempty"`
	CourierOfferStatus        string         `json:"courier_offer_status"`
	CourierOfferDeclineReason *string        `json:"courier_offer_decline_reason,omitempty"`
	Items                     []DetailItem   `json:"items"`
	CreatedAt                 time.Time      `json:"created_at"`
	AssignedAt                *time.Time     `json:"assigned_at,omitempty"`
	CourierOfferedAt          *time.Time     `json:"courier_offered_at,omitempty"`
	CourierOfferRespondedAt   *time.Time     `json:"courier_offer_responded_at,omitempty"`
}

// CourierOffer is a lightweight view of a delivery order available for any
// on-duty courier at the spot to claim. Intentionally does NOT expose the
// customer's phone — phone is revealed only after the courier accepts.
type CourierOffer struct {
	ID              string         `json:"id"`
	OrderNumber     string         `json:"order_number"`
	TotalAmount     float64        `json:"total_amount"`
	PaymentType     string         `json:"payment_type"`
	OfferType       string         `json:"offer_type"`
	DeliveryAddress map[string]any `json:"delivery_address,omitempty"`
	DeliveryLat     *float64       `json:"delivery_latitude,omitempty"`
	DeliveryLng     *float64       `json:"delivery_longitude,omitempty"`
	ItemCount       int            `json:"item_count"`
	CreatedAt       time.Time      `json:"created_at"`
	OfferedAt       *time.Time     `json:"offered_at,omitempty"`
}

// CourierTargetSettings returns the admin-configured SLA window (in minutes)
// used by the courier UI for ETA countdowns and late-warning thresholds.
type CourierTargetSettings struct {
	TargetMinutes int `json:"target_minutes"`
}
