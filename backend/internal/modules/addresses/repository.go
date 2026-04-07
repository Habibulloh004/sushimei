package addresses

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, customerID string) ([]Address, error) {
	const q = `
		SELECT id::text, customer_id::text, label, city, street, house, entrance, floor, apartment,
		       latitude::double precision, longitude::double precision, delivery_notes,
		       is_default, created_at, updated_at
		FROM customer_addresses
		WHERE customer_id = $1 AND deleted_at IS NULL
		ORDER BY is_default DESC, created_at DESC
	`

	rows, err := r.db.Query(ctx, q, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Address, 0)
	for rows.Next() {
		var a Address
		if err := rows.Scan(
			&a.ID, &a.CustomerID, &a.Label, &a.City, &a.Street, &a.House,
			&a.Entrance, &a.Floor, &a.Apartment, &a.Latitude, &a.Longitude,
			&a.DeliveryNotes, &a.IsDefault, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, rows.Err()
}

func (r *Repository) Create(ctx context.Context, customerID string, req CreateRequest) (string, error) {
	isDefault := false
	if req.IsDefault != nil {
		isDefault = *req.IsDefault
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	if isDefault {
		if _, err := tx.Exec(ctx,
			`UPDATE customer_addresses SET is_default = FALSE, updated_at = NOW() WHERE customer_id = $1 AND deleted_at IS NULL`,
			customerID,
		); err != nil {
			return "", err
		}
	}

	const q = `
		INSERT INTO customer_addresses (customer_id, label, city, street, house, entrance, floor, apartment,
		                                latitude, longitude, delivery_notes, is_default)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id::text
	`

	var id string
	if err := tx.QueryRow(ctx, q,
		customerID, req.Label, req.City, req.Street, req.House,
		req.Entrance, req.Floor, req.Apartment, req.Latitude, req.Longitude,
		req.DeliveryNotes, isDefault,
	).Scan(&id); err != nil {
		return "", err
	}

	return id, tx.Commit(ctx)
}

func (r *Repository) Update(ctx context.Context, customerID, addressID string, req UpdateRequest) error {
	// Verify ownership
	var ownerID string
	err := r.db.QueryRow(ctx,
		`SELECT customer_id::text FROM customer_addresses WHERE id = $1 AND deleted_at IS NULL`,
		addressID,
	).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("address not found")
	}
	if err != nil {
		return err
	}
	if ownerID != customerID {
		return fmt.Errorf("address not found")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if req.IsDefault != nil && *req.IsDefault {
		if _, err := tx.Exec(ctx,
			`UPDATE customer_addresses SET is_default = FALSE, updated_at = NOW() WHERE customer_id = $1 AND deleted_at IS NULL`,
			customerID,
		); err != nil {
			return err
		}
	}

	q := `UPDATE customer_addresses SET updated_at = NOW()`
	args := []any{}
	argIdx := 1

	if req.Label != nil {
		q += fmt.Sprintf(", label = $%d", argIdx)
		args = append(args, *req.Label)
		argIdx++
	}
	if req.City != nil {
		q += fmt.Sprintf(", city = $%d", argIdx)
		args = append(args, *req.City)
		argIdx++
	}
	if req.Street != nil {
		q += fmt.Sprintf(", street = $%d", argIdx)
		args = append(args, *req.Street)
		argIdx++
	}
	if req.House != nil {
		q += fmt.Sprintf(", house = $%d", argIdx)
		args = append(args, *req.House)
		argIdx++
	}
	if req.Entrance != nil {
		q += fmt.Sprintf(", entrance = $%d", argIdx)
		args = append(args, *req.Entrance)
		argIdx++
	}
	if req.Floor != nil {
		q += fmt.Sprintf(", floor = $%d", argIdx)
		args = append(args, *req.Floor)
		argIdx++
	}
	if req.Apartment != nil {
		q += fmt.Sprintf(", apartment = $%d", argIdx)
		args = append(args, *req.Apartment)
		argIdx++
	}
	if req.Latitude != nil {
		q += fmt.Sprintf(", latitude = $%d", argIdx)
		args = append(args, *req.Latitude)
		argIdx++
	}
	if req.Longitude != nil {
		q += fmt.Sprintf(", longitude = $%d", argIdx)
		args = append(args, *req.Longitude)
		argIdx++
	}
	if req.DeliveryNotes != nil {
		q += fmt.Sprintf(", delivery_notes = $%d", argIdx)
		args = append(args, *req.DeliveryNotes)
		argIdx++
	}
	if req.IsDefault != nil {
		q += fmt.Sprintf(", is_default = $%d", argIdx)
		args = append(args, *req.IsDefault)
		argIdx++
	}

	q += fmt.Sprintf(" WHERE id = $%d AND deleted_at IS NULL", argIdx)
	args = append(args, addressID)

	tag, err := tx.Exec(ctx, q, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("address not found")
	}

	return tx.Commit(ctx)
}

func (r *Repository) Delete(ctx context.Context, customerID, addressID string) error {
	q := `UPDATE customer_addresses SET deleted_at = NOW() WHERE id = $1 AND customer_id = $2 AND deleted_at IS NULL`
	tag, err := r.db.Exec(ctx, q, addressID, customerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("address not found")
	}
	return nil
}
