package spots

import (
	"context"
	"errors"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, includeInactive bool) ([]ListItem, error) {
	base := sq.Select(
		"id::text", "code", "name", "phone", "timezone",
		"address_line1", "address_line2", "city",
		"latitude::double precision", "longitude::double precision",
		"delivery_fee::double precision", "minimum_order::double precision",
		"pickup_enabled", "is_active", "created_at",
	).
		PlaceholderFormat(sq.Dollar).
		From("spots").
		Where(sq.Eq{"deleted_at": nil}).
		OrderBy("name ASC")

	if !includeInactive {
		base = base.Where(sq.Eq{"is_active": true})
	}

	sql, args, err := base.ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ListItem, 0)
	for rows.Next() {
		var item ListItem
		if err := rows.Scan(
			&item.ID, &item.Code, &item.Name, &item.Phone, &item.Timezone,
			&item.AddressLine1, &item.AddressLine2, &item.City,
			&item.Latitude, &item.Longitude,
			&item.DeliveryFee, &item.MinimumOrder,
			&item.PickupEnabled, &item.IsActive, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) GetByID(ctx context.Context, id string) (*DetailItem, error) {
	sql := `
		SELECT id::text, code, name, phone, timezone,
		       address_line1, address_line2, city,
		       latitude::double precision, longitude::double precision,
		       delivery_fee::double precision, minimum_order::double precision,
		       pickup_enabled, is_active, created_at
		FROM spots
		WHERE id = $1 AND deleted_at IS NULL
	`

	var item DetailItem
	err := r.db.QueryRow(ctx, sql, id).Scan(
		&item.ID, &item.Code, &item.Name, &item.Phone, &item.Timezone,
		&item.AddressLine1, &item.AddressLine2, &item.City,
		&item.Latitude, &item.Longitude,
		&item.DeliveryFee, &item.MinimumOrder,
		&item.PickupEnabled, &item.IsActive, &item.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("spot not found")
	}
	if err != nil {
		return nil, err
	}

	item.OperatingHours, _ = r.getOperatingHours(ctx, id)
	item.DeliveryZones, _ = r.getDeliveryZones(ctx, id)

	return &item, nil
}

func (r *Repository) getOperatingHours(ctx context.Context, spotID string) ([]OperatingHour, error) {
	sql := `
		SELECT weekday, opens_at::text, closes_at::text, is_closed
		FROM spot_operating_hours
		WHERE spot_id = $1
		ORDER BY weekday ASC
	`

	rows, err := r.db.Query(ctx, sql, spotID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	hours := make([]OperatingHour, 0)
	for rows.Next() {
		var h OperatingHour
		if err := rows.Scan(&h.Weekday, &h.OpensAt, &h.ClosesAt, &h.IsClosed); err != nil {
			return nil, err
		}
		hours = append(hours, h)
	}
	return hours, nil
}

func (r *Repository) getDeliveryZones(ctx context.Context, spotID string) ([]DeliveryZone, error) {
	sql := `
		SELECT id::text, name, extra_fee::double precision, min_eta_minutes, max_eta_minutes, is_active
		FROM spot_delivery_zones
		WHERE spot_id = $1
		ORDER BY name ASC
	`

	rows, err := r.db.Query(ctx, sql, spotID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	zones := make([]DeliveryZone, 0)
	for rows.Next() {
		var z DeliveryZone
		if err := rows.Scan(&z.ID, &z.Name, &z.ExtraFee, &z.MinETAMinutes, &z.MaxETAMinutes, &z.IsActive); err != nil {
			return nil, err
		}
		zones = append(zones, z)
	}
	return zones, nil
}

func (r *Repository) Create(ctx context.Context, req CreateRequest) (string, error) {
	if req.Timezone == "" {
		req.Timezone = "Asia/Tashkent"
	}

	sql := `
		INSERT INTO spots (code, name, phone, timezone, address_line1, address_line2, city, latitude, longitude, delivery_fee, minimum_order, pickup_enabled)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id::text
	`

	var id string
	err := r.db.QueryRow(ctx, sql, req.Code, req.Name, req.Phone, req.Timezone, req.AddressLine1, req.AddressLine2, req.City, req.Latitude, req.Longitude, req.DeliveryFee, req.MinimumOrder, req.PickupEnabled).Scan(&id)
	return id, err
}

func (r *Repository) Update(ctx context.Context, id string, req UpdateRequest) error {
	builder := sq.Update("spots").
		PlaceholderFormat(sq.Dollar).
		Set("updated_at", sq.Expr("NOW()")).
		Where(sq.Eq{"id": id, "deleted_at": nil})

	if req.Code != nil {
		builder = builder.Set("code", *req.Code)
	}
	if req.Name != nil {
		builder = builder.Set("name", *req.Name)
	}
	if req.Phone != nil {
		builder = builder.Set("phone", *req.Phone)
	}
	if req.Timezone != nil {
		builder = builder.Set("timezone", *req.Timezone)
	}
	if req.AddressLine1 != nil {
		builder = builder.Set("address_line1", *req.AddressLine1)
	}
	if req.AddressLine2 != nil {
		builder = builder.Set("address_line2", *req.AddressLine2)
	}
	if req.City != nil {
		builder = builder.Set("city", *req.City)
	}
	if req.Latitude != nil {
		builder = builder.Set("latitude", *req.Latitude)
	}
	if req.Longitude != nil {
		builder = builder.Set("longitude", *req.Longitude)
	}
	if req.DeliveryFee != nil {
		builder = builder.Set("delivery_fee", *req.DeliveryFee)
	}
	if req.MinimumOrder != nil {
		builder = builder.Set("minimum_order", *req.MinimumOrder)
	}
	if req.PickupEnabled != nil {
		builder = builder.Set("pickup_enabled", *req.PickupEnabled)
	}
	if req.IsActive != nil {
		builder = builder.Set("is_active", *req.IsActive)
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return err
	}

	tag, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("spot not found")
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	sql := `UPDATE spots SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("spot not found")
	}
	return nil
}
