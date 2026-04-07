package employees

import "time"

type ListItem struct {
	ID          string     `json:"id"`
	RoleCode    string     `json:"role_code"`
	RoleTitle   string     `json:"role_title"`
	SpotID      *string    `json:"spot_id"`
	SpotName    *string    `json:"spot_name"`
	Email       string     `json:"email"`
	Phone       *string    `json:"phone"`
	AvatarURL   *string    `json:"avatar_url"`
	FirstName   *string    `json:"first_name"`
	LastName    *string    `json:"last_name"`
	Status      string     `json:"status"`
	IsActive    bool       `json:"is_active"`
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

type DetailItem struct {
	ListItem
	Spots []SpotItem `json:"spots"`
}

type SpotItem struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

type CreateRequest struct {
	RoleCode  string  `json:"role_code"`
	SpotID    *string `json:"spot_id"`
	Email     string  `json:"email"`
	Phone     *string `json:"phone"`
	AvatarURL *string `json:"avatar_url"`
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Password  string  `json:"password"`
}

type UpdateRequest struct {
	RoleCode  *string `json:"role_code,omitempty"`
	SpotID    *string `json:"spot_id,omitempty"`
	Email     *string `json:"email,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	Password  *string `json:"password,omitempty"`
	Status    *string `json:"status,omitempty"`
	IsActive  *bool   `json:"is_active,omitempty"`
}
