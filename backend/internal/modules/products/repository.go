package products

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"sushimei/backend/internal/platform/pagination"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, params pagination.ListParams, categoryID string, includeInactive bool) ([]ListItem, int64, error) {
	base := sq.Select().
		PlaceholderFormat(sq.Dollar).
		From("products p").
		LeftJoin("categories c ON c.id = p.category_id").
		Where(sq.Eq{"p.deleted_at": nil})

	if !includeInactive {
		base = base.Where(sq.Eq{"p.is_active": true})
	}
	if categoryID != "" {
		base = base.Where(sq.Eq{"p.category_id": categoryID})
	}
	if params.Search != "" {
		like := "%" + params.Search + "%"
		base = base.Where(sq.Or{
			sq.Expr("p.name_i18n::text ILIKE ?", like),
			sq.Expr("p.sku ILIKE ?", like),
		})
	}

	countQuery := base.Column("COUNT(*)")
	countSQL, countArgs, err := countQuery.ToSql()
	if err != nil {
		return nil, 0, err
	}

	var total int64
	if err := r.db.QueryRow(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := base.
		Columns(
			"p.id::text",
			"p.category_id::text",
			"COALESCE(c.name_i18n->>'en', '')",
			"p.sku",
			"p.slug",
			"p.name_i18n",
			"COALESCE(p.description_i18n, '{}'::jsonb)",
			"p.base_price::double precision",
			"p.image_url",
			"COALESCE(p.tags, '{}')",
			"p.is_spicy",
			"p.is_vegan",
			"p.is_halal",
			"COALESCE(p.allergens, '{}')",
			"p.sort_order",
			"p.is_active",
			"p.created_at",
		).
		OrderBy("p.sort_order ASC", "p.created_at DESC").
		Limit(uint64(params.Limit)).
		Offset(params.Offset())

	dataSQL, dataArgs, err := dataQuery.ToSql()
	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, dataSQL, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]ListItem, 0, params.Limit)
	for rows.Next() {
		var item ListItem
		var nameI18nJSON, descI18nJSON []byte
		if err := rows.Scan(
			&item.ID,
			&item.CategoryID,
			&item.CategoryName,
			&item.SKU,
			&item.Slug,
			&nameI18nJSON,
			&descI18nJSON,
			&item.BasePrice,
			&item.ImageURL,
			&item.Tags,
			&item.IsSpicy,
			&item.IsVegan,
			&item.IsHalal,
			&item.Allergens,
			&item.SortOrder,
			&item.IsActive,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if err := json.Unmarshal(nameI18nJSON, &item.NameI18n); err != nil {
			item.NameI18n = make(map[string]string)
		}
		if err := json.Unmarshal(descI18nJSON, &item.DescI18n); err != nil {
			item.DescI18n = make(map[string]string)
		}
		items = append(items, item)
	}

	return items, total, rows.Err()
}

func (r *Repository) GetByID(ctx context.Context, id string) (*DetailItem, error) {
	sql := `
		SELECT p.id::text, p.category_id::text, COALESCE(c.name_i18n->>'en', ''),
		       p.sku, p.slug, p.name_i18n, COALESCE(p.description_i18n, '{}'::jsonb),
		       p.base_price::double precision, p.image_url, COALESCE(p.gallery, '[]'::jsonb),
		       COALESCE(p.tags, '{}'), p.is_spicy, p.is_vegan, p.is_halal,
		       COALESCE(p.allergens, '{}'), p.sort_order, p.is_active, p.created_at
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE p.id = $1 AND p.deleted_at IS NULL
	`

	var item DetailItem
	var nameI18nJSON, descI18nJSON, galleryJSON []byte
	err := r.db.QueryRow(ctx, sql, id).Scan(
		&item.ID, &item.CategoryID, &item.CategoryName,
		&item.SKU, &item.Slug, &nameI18nJSON, &descI18nJSON,
		&item.BasePrice, &item.ImageURL, &galleryJSON,
		&item.Tags, &item.IsSpicy, &item.IsVegan, &item.IsHalal,
		&item.Allergens, &item.SortOrder, &item.IsActive, &item.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("product not found")
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal(nameI18nJSON, &item.NameI18n)
	json.Unmarshal(descI18nJSON, &item.DescI18n)
	json.Unmarshal(galleryJSON, &item.Gallery)

	item.Variants, _ = r.getVariants(ctx, id)
	item.ModifierGroups, _ = r.getModifierGroups(ctx, id)

	return &item, nil
}

func (r *Repository) getVariants(ctx context.Context, productID string) ([]ProductVariant, error) {
	sql := `
		SELECT id::text, name_i18n, sku, price_delta::double precision, is_default, sort_order, is_active
		FROM product_variants
		WHERE product_id = $1 AND deleted_at IS NULL
		ORDER BY sort_order ASC
	`

	rows, err := r.db.Query(ctx, sql, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	variants := make([]ProductVariant, 0)
	for rows.Next() {
		var v ProductVariant
		var nameI18nJSON []byte
		if err := rows.Scan(&v.ID, &nameI18nJSON, &v.SKU, &v.PriceDelta, &v.IsDefault, &v.SortOrder, &v.IsActive); err != nil {
			return nil, err
		}
		json.Unmarshal(nameI18nJSON, &v.NameI18n)
		variants = append(variants, v)
	}
	return variants, nil
}

func (r *Repository) getModifierGroups(ctx context.Context, productID string) ([]ModifierGroup, error) {
	sql := `
		SELECT mg.id::text, mg.name_i18n, mg.min_select, mg.max_select, mg.required, mg.sort_order
		FROM modifier_groups mg
		JOIN product_modifier_groups pmg ON pmg.modifier_group_id = mg.id
		WHERE pmg.product_id = $1 AND mg.deleted_at IS NULL
		ORDER BY pmg.sort_order ASC
	`

	rows, err := r.db.Query(ctx, sql, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := make([]ModifierGroup, 0)
	for rows.Next() {
		var g ModifierGroup
		var nameI18nJSON []byte
		if err := rows.Scan(&g.ID, &nameI18nJSON, &g.MinSelect, &g.MaxSelect, &g.Required, &g.SortOrder); err != nil {
			return nil, err
		}
		json.Unmarshal(nameI18nJSON, &g.NameI18n)
		g.Options, _ = r.getModifierOptions(ctx, g.ID)
		groups = append(groups, g)
	}
	return groups, nil
}

func (r *Repository) getModifierOptions(ctx context.Context, groupID string) ([]ModifierOption, error) {
	sql := `
		SELECT id::text, name_i18n, price_delta::double precision, sort_order, is_active
		FROM modifier_options
		WHERE group_id = $1 AND deleted_at IS NULL AND is_active = true
		ORDER BY sort_order ASC
	`

	rows, err := r.db.Query(ctx, sql, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	options := make([]ModifierOption, 0)
	for rows.Next() {
		var o ModifierOption
		var nameI18nJSON []byte
		if err := rows.Scan(&o.ID, &nameI18nJSON, &o.PriceDelta, &o.SortOrder, &o.IsActive); err != nil {
			return nil, err
		}
		json.Unmarshal(nameI18nJSON, &o.NameI18n)
		options = append(options, o)
	}
	return options, nil
}

func (r *Repository) Create(ctx context.Context, req CreateRequest) (string, error) {
	nameI18nJSON, _ := json.Marshal(req.NameI18n)
	descI18nJSON, _ := json.Marshal(req.DescI18n)
	if req.Tags == nil {
		req.Tags = []string{}
	}
	if req.Allergens == nil {
		req.Allergens = []string{}
	}

	sql := `
		INSERT INTO products (category_id, sku, slug, name_i18n, description_i18n, base_price, image_url, tags, is_spicy, is_vegan, is_halal, allergens)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id::text
	`

	var id string
	err := r.db.QueryRow(ctx, sql, req.CategoryID, req.SKU, req.Slug, nameI18nJSON, descI18nJSON, req.BasePrice, req.ImageURL, req.Tags, req.IsSpicy, req.IsVegan, req.IsHalal, req.Allergens).Scan(&id)
	return id, err
}

func (r *Repository) Update(ctx context.Context, id string, req UpdateRequest) error {
	builder := sq.Update("products").
		PlaceholderFormat(sq.Dollar).
		Set("updated_at", sq.Expr("NOW()")).
		Where(sq.Eq{"id": id, "deleted_at": nil})

	if req.CategoryID != nil {
		builder = builder.Set("category_id", *req.CategoryID)
	}
	if req.SKU != nil {
		builder = builder.Set("sku", *req.SKU)
	}
	if req.Slug != nil {
		builder = builder.Set("slug", *req.Slug)
	}
	if req.NameI18n != nil {
		nameI18nJSON, _ := json.Marshal(req.NameI18n)
		builder = builder.Set("name_i18n", nameI18nJSON)
	}
	if req.DescI18n != nil {
		descI18nJSON, _ := json.Marshal(req.DescI18n)
		builder = builder.Set("description_i18n", descI18nJSON)
	}
	if req.BasePrice != nil {
		builder = builder.Set("base_price", *req.BasePrice)
	}
	if req.ImageURL != nil {
		builder = builder.Set("image_url", *req.ImageURL)
	}
	if req.Tags != nil {
		builder = builder.Set("tags", req.Tags)
	}
	if req.IsSpicy != nil {
		builder = builder.Set("is_spicy", *req.IsSpicy)
	}
	if req.IsVegan != nil {
		builder = builder.Set("is_vegan", *req.IsVegan)
	}
	if req.IsHalal != nil {
		builder = builder.Set("is_halal", *req.IsHalal)
	}
	if req.Allergens != nil {
		builder = builder.Set("allergens", req.Allergens)
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
		return fmt.Errorf("product not found")
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	sql := `UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("product not found")
	}
	return nil
}

// GetAllModifierGroups returns all modifier groups with their options (for add-ons)
func (r *Repository) GetAllModifierGroups(ctx context.Context) ([]ModifierGroup, error) {
	sql := `
		SELECT mg.id::text, mg.name_i18n, mg.min_select, mg.max_select, mg.required, mg.sort_order
		FROM modifier_groups mg
		WHERE mg.deleted_at IS NULL
		ORDER BY mg.sort_order ASC
	`

	rows, err := r.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := make([]ModifierGroup, 0)
	for rows.Next() {
		var g ModifierGroup
		var nameI18nJSON []byte
		if err := rows.Scan(&g.ID, &nameI18nJSON, &g.MinSelect, &g.MaxSelect, &g.Required, &g.SortOrder); err != nil {
			return nil, err
		}
		json.Unmarshal(nameI18nJSON, &g.NameI18n)
		g.Options, _ = r.getModifierOptions(ctx, g.ID)
		groups = append(groups, g)
	}
	return groups, nil
}

// GetDietaryOptions returns available dietary options based on products
func (r *Repository) GetDietaryOptions(ctx context.Context) ([]string, error) {
	options := []string{}

	sql := `
		SELECT
			EXISTS(SELECT 1 FROM products WHERE is_spicy = true AND is_active = true AND deleted_at IS NULL) as has_spicy,
			EXISTS(SELECT 1 FROM products WHERE is_vegan = true AND is_active = true AND deleted_at IS NULL) as has_vegan,
			EXISTS(SELECT 1 FROM products WHERE is_halal = true AND is_active = true AND deleted_at IS NULL) as has_halal
	`

	var hasSpicy, hasVegan, hasHalal bool
	if err := r.db.QueryRow(ctx, sql).Scan(&hasSpicy, &hasVegan, &hasHalal); err != nil {
		return options, err
	}

	if hasVegan {
		options = append(options, "Vegetarian")
		options = append(options, "Vegan")
	}
	if hasSpicy {
		options = append(options, "Spicy")
	}
	if hasHalal {
		options = append(options, "Halal")
	}

	return options, nil
}
