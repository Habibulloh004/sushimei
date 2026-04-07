package bonusrules

import (
	"context"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context) ([]Rule, error) {
	sql := `
		SELECT id::text, is_active, earn_percent::double precision, spend_rate::double precision,
		       min_order_to_earn::double precision, max_spend_percent::double precision,
		       expires_in_days, created_at, updated_at
		FROM bonus_rules
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Rule, 0, 8)
	for rows.Next() {
		var item Rule
		if err := rows.Scan(
			&item.ID,
			&item.IsActive,
			&item.EarnPercent,
			&item.SpendRate,
			&item.MinOrderToEarn,
			&item.MaxSpendPercent,
			&item.ExpiresInDays,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) Create(ctx context.Context, req CreateRequest) (string, error) {
	sql := `
		INSERT INTO bonus_rules (
			is_active,
			earn_percent,
			spend_rate,
			min_order_to_earn,
			max_spend_percent,
			expires_in_days
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text
	`

	var id string
	err := r.db.QueryRow(
		ctx,
		sql,
		*req.IsActive,
		*req.EarnPercent,
		*req.SpendRate,
		*req.MinOrderToEarn,
		*req.MaxSpendPercent,
		req.ExpiresInDays,
	).Scan(&id)
	return id, err
}

func (r *Repository) Update(ctx context.Context, id string, req UpdateRequest) error {
	builder := sq.Update("bonus_rules").
		PlaceholderFormat(sq.Dollar).
		Set("updated_at", sq.Expr("NOW()")).
		Where(sq.Eq{"id": id})

	if req.IsActive != nil {
		builder = builder.Set("is_active", *req.IsActive)
	}
	if req.EarnPercent != nil {
		builder = builder.Set("earn_percent", *req.EarnPercent)
	}
	if req.SpendRate != nil {
		builder = builder.Set("spend_rate", *req.SpendRate)
	}
	if req.MinOrderToEarn != nil {
		builder = builder.Set("min_order_to_earn", *req.MinOrderToEarn)
	}
	if req.MaxSpendPercent != nil {
		builder = builder.Set("max_spend_percent", *req.MaxSpendPercent)
	}
	if req.ExpiresInDays != nil {
		builder = builder.Set("expires_in_days", *req.ExpiresInDays)
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
		return fmt.Errorf("bonus rule not found")
	}

	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	sql := `DELETE FROM bonus_rules WHERE id = $1`
	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("bonus rule not found")
	}
	return nil
}
