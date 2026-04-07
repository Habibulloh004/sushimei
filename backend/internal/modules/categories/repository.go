package categories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

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
		"c.id::text",
		"c.parent_id::text",
		"c.slug",
		"c.name_i18n",
		"c.image_url",
		"c.sort_order",
		"c.is_active",
		"c.created_at",
		"COALESCE(pc.product_count, 0) as product_count",
	).
		PlaceholderFormat(sq.Dollar).
		From("categories c").
		LeftJoin(`(SELECT category_id, COUNT(*) as product_count FROM products WHERE deleted_at IS NULL GROUP BY category_id) pc ON pc.category_id = c.id`).
		Where(sq.Eq{"c.deleted_at": nil}).
		OrderBy("c.sort_order ASC", "c.created_at ASC")

	if !includeInactive {
		base = base.Where(sq.Eq{"c.is_active": true})
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
		var nameI18nJSON []byte
		if err := rows.Scan(
			&item.ID,
			&item.ParentID,
			&item.Slug,
			&nameI18nJSON,
			&item.ImageURL,
			&item.SortOrder,
			&item.IsActive,
			&item.CreatedAt,
			&item.ProductCount,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(nameI18nJSON, &item.NameI18n); err != nil {
			item.NameI18n = make(map[string]string)
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) GetByID(ctx context.Context, id string) (*ListItem, error) {
	sql := `
		SELECT c.id::text, c.parent_id::text, c.slug, c.name_i18n, c.image_url, c.sort_order, c.is_active, c.created_at,
		       COALESCE((SELECT COUNT(*) FROM products WHERE category_id = c.id AND deleted_at IS NULL), 0)
		FROM categories c
		WHERE c.id = $1 AND c.deleted_at IS NULL
	`

	var item ListItem
	var nameI18nJSON []byte
	err := r.db.QueryRow(ctx, sql, id).Scan(
		&item.ID,
		&item.ParentID,
		&item.Slug,
		&nameI18nJSON,
		&item.ImageURL,
		&item.SortOrder,
		&item.IsActive,
		&item.CreatedAt,
		&item.ProductCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("category not found")
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(nameI18nJSON, &item.NameI18n); err != nil {
		item.NameI18n = make(map[string]string)
	}
	return &item, nil
}

func (r *Repository) Create(ctx context.Context, req CreateRequest) (string, error) {
	nameI18nJSON, _ := json.Marshal(req.NameI18n)
	parentID := normalizeOptionalID(req.ParentID)

	sql := `
		INSERT INTO categories (slug, name_i18n, parent_id, image_url)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`

	var id string
	err := r.db.QueryRow(ctx, sql, req.Slug, nameI18nJSON, parentID, req.ImageURL).Scan(&id)
	return id, err
}

func (r *Repository) Update(ctx context.Context, id string, req UpdateRequest) error {
	builder := sq.Update("categories").
		PlaceholderFormat(sq.Dollar).
		Set("updated_at", sq.Expr("NOW()")).
		Where(sq.Eq{"id": id, "deleted_at": nil})

	if req.Slug != nil {
		builder = builder.Set("slug", *req.Slug)
	}
	if req.NameI18n != nil {
		nameI18nJSON, _ := json.Marshal(req.NameI18n)
		builder = builder.Set("name_i18n", nameI18nJSON)
	}
	if req.ParentID != nil {
		parentID := normalizeOptionalID(req.ParentID)
		builder = builder.Set("parent_id", parentID)
	}
	if req.ImageURL != nil {
		builder = builder.Set("image_url", *req.ImageURL)
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
		return fmt.Errorf("category not found")
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	sql := `UPDATE categories SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("category not found")
	}
	return nil
}

func normalizeOptionalID(value *string) any {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}
