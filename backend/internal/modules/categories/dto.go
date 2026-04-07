package categories

import "time"

type ListItem struct {
	ID          string            `json:"id"`
	ParentID    *string           `json:"parent_id"`
	Slug        string            `json:"slug"`
	NameI18n    map[string]string `json:"name_i18n"`
	ImageURL    *string           `json:"image_url"`
	SortOrder   int               `json:"sort_order"`
	IsActive    bool              `json:"is_active"`
	CreatedAt   time.Time         `json:"created_at"`
	ProductCount int              `json:"product_count"`
}

type CreateRequest struct {
	ParentID *string           `json:"parent_id"`
	Slug     string            `json:"slug"`
	NameI18n map[string]string `json:"name_i18n"`
	ImageURL *string           `json:"image_url"`
}

type UpdateRequest struct {
	ParentID *string           `json:"parent_id,omitempty"`
	Slug     *string           `json:"slug,omitempty"`
	NameI18n map[string]string `json:"name_i18n,omitempty"`
	ImageURL *string           `json:"image_url,omitempty"`
	IsActive *bool             `json:"is_active,omitempty"`
}
