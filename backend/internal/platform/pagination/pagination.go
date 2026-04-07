package pagination

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ListParams struct {
	Page        int
	Limit       int
	Search      string
	Status      string
	SpotID      string
	PaymentType string
	OrderType   string
	SortBy      string
	SortOrder   string
	DateFrom    *time.Time
	DateTo      *time.Time
}

type Meta struct {
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
	Total      int64  `json:"total"`
	TotalPage  int    `json:"total_page"`
	TotalPages int    `json:"total_pages"`
	SortBy     string `json:"sort_by"`
	SortOrder  string `json:"sort_order"`
}

func ParseListParams(c *fiber.Ctx, allowedSort map[string]string, defaultSort string) (ListParams, error) {
	page := parseInt(c.Query("page", "1"), 1)
	if page < 1 {
		return ListParams{}, errors.New("page must be >= 1")
	}

	limit := parseInt(c.Query("limit", "20"), 20)
	if limit < 1 || limit > 100 {
		return ListParams{}, errors.New("limit must be in range 1..100")
	}

	sortBy := strings.TrimSpace(c.Query("sort_by", defaultSort))
	if _, ok := allowedSort[sortBy]; !ok {
		return ListParams{}, errors.New("invalid sort_by")
	}

	sortOrder := strings.ToUpper(strings.TrimSpace(c.Query("sort_order", "DESC")))
	if sortOrder != "ASC" && sortOrder != "DESC" {
		return ListParams{}, errors.New("invalid sort_order")
	}

	dateFrom, err := parseDatePointer(c.Query("date_from"))
	if err != nil {
		return ListParams{}, errors.New("invalid date_from")
	}

	dateTo, err := parseDatePointer(c.Query("date_to"))
	if err != nil {
		return ListParams{}, errors.New("invalid date_to")
	}

	return ListParams{
		Page:        page,
		Limit:       limit,
		Search:      strings.TrimSpace(c.Query("search")),
		Status:      strings.TrimSpace(c.Query("status")),
		SpotID:      strings.TrimSpace(c.Query("spot_id")),
		PaymentType: strings.TrimSpace(c.Query("payment_type")),
		OrderType:   strings.TrimSpace(c.Query("order_type")),
		SortBy:      sortBy,
		SortOrder:   sortOrder,
		DateFrom:    dateFrom,
		DateTo:      dateTo,
	}, nil
}

func (p ListParams) Offset() uint64 {
	return uint64((p.Page - 1) * p.Limit)
}

func BuildMeta(params ListParams, total int64) Meta {
	totalPage := int((total + int64(params.Limit) - 1) / int64(params.Limit))
	if totalPage == 0 {
		totalPage = 1
	}
	return Meta{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPage:  totalPage,
		TotalPages: totalPage,
		SortBy:     params.SortBy,
		SortOrder:  params.SortOrder,
	}
}

func parseInt(raw string, fallback int) int {
	v, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return v
}

func parseDatePointer(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}

	formats := []string{time.RFC3339, "2006-01-02"}
	for _, f := range formats {
		if t, err := time.Parse(f, raw); err == nil {
			t = t.UTC()
			return &t, nil
		}
	}

	return nil, errors.New("invalid date")
}
