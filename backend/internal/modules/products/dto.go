package products

import "time"

type ListItem struct {
	ID            string            `json:"id"`
	CategoryID    string            `json:"category_id"`
	CategoryName  string            `json:"category_name"`
	SKU           *string           `json:"sku"`
	Slug          *string           `json:"slug"`
	NameI18n      map[string]string `json:"name_i18n"`
	DescI18n      map[string]string `json:"description_i18n"`
	BasePrice     float64           `json:"base_price"`
	ImageURL      *string           `json:"image_url"`
	Tags          []string          `json:"tags"`
	IsSpicy       bool              `json:"is_spicy"`
	IsVegan       bool              `json:"is_vegan"`
	IsHalal       bool              `json:"is_halal"`
	Allergens     []string          `json:"allergens"`
	SortOrder     int               `json:"sort_order"`
	IsActive      bool              `json:"is_active"`
	CreatedAt     time.Time         `json:"created_at"`
}

type DetailItem struct {
	ListItem
	Gallery        []string         `json:"gallery"`
	Variants       []ProductVariant `json:"variants"`
	ModifierGroups []ModifierGroup  `json:"modifier_groups"`
}

type ProductVariant struct {
	ID         string            `json:"id"`
	NameI18n   map[string]string `json:"name_i18n"`
	SKU        *string           `json:"sku"`
	PriceDelta float64           `json:"price_delta"`
	IsDefault  bool              `json:"is_default"`
	SortOrder  int               `json:"sort_order"`
	IsActive   bool              `json:"is_active"`
}

type ModifierGroup struct {
	ID        string           `json:"id"`
	NameI18n  map[string]string `json:"name_i18n"`
	MinSelect int              `json:"min_select"`
	MaxSelect int              `json:"max_select"`
	Required  bool             `json:"required"`
	SortOrder int              `json:"sort_order"`
	Options   []ModifierOption `json:"options"`
}

type ModifierOption struct {
	ID         string            `json:"id"`
	NameI18n   map[string]string `json:"name_i18n"`
	PriceDelta float64           `json:"price_delta"`
	SortOrder  int               `json:"sort_order"`
	IsActive   bool              `json:"is_active"`
}

type CreateRequest struct {
	CategoryID string            `json:"category_id"`
	SKU        *string           `json:"sku"`
	Slug       *string           `json:"slug"`
	NameI18n   map[string]string `json:"name_i18n"`
	DescI18n   map[string]string `json:"description_i18n"`
	BasePrice  float64           `json:"base_price"`
	ImageURL   *string           `json:"image_url"`
	Tags       []string          `json:"tags"`
	IsSpicy    bool              `json:"is_spicy"`
	IsVegan    bool              `json:"is_vegan"`
	IsHalal    bool              `json:"is_halal"`
	Allergens  []string          `json:"allergens"`
}

type UpdateRequest struct {
	CategoryID *string           `json:"category_id,omitempty"`
	SKU        *string           `json:"sku,omitempty"`
	Slug       *string           `json:"slug,omitempty"`
	NameI18n   map[string]string `json:"name_i18n,omitempty"`
	DescI18n   map[string]string `json:"description_i18n,omitempty"`
	BasePrice  *float64          `json:"base_price,omitempty"`
	ImageURL   *string           `json:"image_url,omitempty"`
	Tags       []string          `json:"tags,omitempty"`
	IsSpicy    *bool             `json:"is_spicy,omitempty"`
	IsVegan    *bool             `json:"is_vegan,omitempty"`
	IsHalal    *bool             `json:"is_halal,omitempty"`
	Allergens  []string          `json:"allergens,omitempty"`
	IsActive   *bool             `json:"is_active,omitempty"`
}
