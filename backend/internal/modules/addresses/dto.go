package addresses

import "time"

type Address struct {
	ID            string    `json:"id"`
	CustomerID    string    `json:"customer_id"`
	Label         *string   `json:"label"`
	City          *string   `json:"city"`
	Street        *string   `json:"street"`
	House         *string   `json:"house"`
	Entrance      *string   `json:"entrance"`
	Floor         *string   `json:"floor"`
	Apartment     *string   `json:"apartment"`
	Latitude      *float64  `json:"latitude"`
	Longitude     *float64  `json:"longitude"`
	DeliveryNotes *string   `json:"delivery_notes"`
	IsDefault     bool      `json:"is_default"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateRequest struct {
	Label         *string  `json:"label"`
	City          *string  `json:"city"`
	Street        *string  `json:"street"`
	House         *string  `json:"house"`
	Entrance      *string  `json:"entrance"`
	Floor         *string  `json:"floor"`
	Apartment     *string  `json:"apartment"`
	Latitude      *float64 `json:"latitude"`
	Longitude     *float64 `json:"longitude"`
	DeliveryNotes *string  `json:"delivery_notes"`
	IsDefault     *bool    `json:"is_default"`
}

type UpdateRequest struct {
	Label         *string  `json:"label"`
	City          *string  `json:"city"`
	Street        *string  `json:"street"`
	House         *string  `json:"house"`
	Entrance      *string  `json:"entrance"`
	Floor         *string  `json:"floor"`
	Apartment     *string  `json:"apartment"`
	Latitude      *float64 `json:"latitude"`
	Longitude     *float64 `json:"longitude"`
	DeliveryNotes *string  `json:"delivery_notes"`
	IsDefault     *bool    `json:"is_default"`
}
