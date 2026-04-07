package spots

import "time"

type ListItem struct {
	ID            string    `json:"id"`
	Code          string    `json:"code"`
	Name          string    `json:"name"`
	Phone         *string   `json:"phone"`
	Timezone      string    `json:"timezone"`
	AddressLine1  *string   `json:"address_line1"`
	AddressLine2  *string   `json:"address_line2"`
	City          *string   `json:"city"`
	Latitude      *float64  `json:"latitude"`
	Longitude     *float64  `json:"longitude"`
	DeliveryFee   float64   `json:"delivery_fee"`
	MinimumOrder  float64   `json:"minimum_order"`
	PickupEnabled bool      `json:"pickup_enabled"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
}

type DetailItem struct {
	ListItem
	OperatingHours []OperatingHour `json:"operating_hours"`
	DeliveryZones  []DeliveryZone  `json:"delivery_zones"`
}

type OperatingHour struct {
	Weekday  int     `json:"weekday"`
	OpensAt  *string `json:"opens_at"`
	ClosesAt *string `json:"closes_at"`
	IsClosed bool    `json:"is_closed"`
}

type DeliveryZone struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	ExtraFee      float64  `json:"extra_fee"`
	MinETAMinutes *int     `json:"min_eta_minutes"`
	MaxETAMinutes *int     `json:"max_eta_minutes"`
	IsActive      bool     `json:"is_active"`
}

type CreateRequest struct {
	Code          string   `json:"code"`
	Name          string   `json:"name"`
	Phone         *string  `json:"phone"`
	Timezone      string   `json:"timezone"`
	AddressLine1  *string  `json:"address_line1"`
	AddressLine2  *string  `json:"address_line2"`
	City          *string  `json:"city"`
	Latitude      *float64 `json:"latitude"`
	Longitude     *float64 `json:"longitude"`
	DeliveryFee   float64  `json:"delivery_fee"`
	MinimumOrder  float64  `json:"minimum_order"`
	PickupEnabled bool     `json:"pickup_enabled"`
}

type UpdateRequest struct {
	Code          *string  `json:"code,omitempty"`
	Name          *string  `json:"name,omitempty"`
	Phone         *string  `json:"phone,omitempty"`
	Timezone      *string  `json:"timezone,omitempty"`
	AddressLine1  *string  `json:"address_line1,omitempty"`
	AddressLine2  *string  `json:"address_line2,omitempty"`
	City          *string  `json:"city,omitempty"`
	Latitude      *float64 `json:"latitude,omitempty"`
	Longitude     *float64 `json:"longitude,omitempty"`
	DeliveryFee   *float64 `json:"delivery_fee,omitempty"`
	MinimumOrder  *float64 `json:"minimum_order,omitempty"`
	PickupEnabled *bool    `json:"pickup_enabled,omitempty"`
	IsActive      *bool    `json:"is_active,omitempty"`
}
