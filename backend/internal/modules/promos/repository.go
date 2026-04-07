package promos

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

func promoSelectBuilder() sq.SelectBuilder {
	return sq.Select().
		PlaceholderFormat(sq.Dollar).
		From("promo_codes pc").
		LeftJoin("products bp ON bp.id = pc.bonus_product_id").
		LeftJoin(`(SELECT promo_code_id, COUNT(*) as usage_count FROM promo_usages GROUP BY promo_code_id) pu ON pu.promo_code_id = pc.id`).
		Where(sq.Eq{"pc.deleted_at": nil})
}

func promoColumns() []string {
	return []string{
		"pc.id::text",
		"pc.code",
		"pc.title_i18n",
		"COALESCE(pc.description_i18n, '{}'::jsonb)",
		"pc.reward_type::text",
		"pc.applies_to::text",
		"pc.discount_type::text",
		"pc.discount_value::double precision",
		"pc.min_order_amount::double precision",
		"pc.max_discount_amount::double precision",
		"pc.bonus_points",
		"pc.bonus_product_id::text",
		"bp.name_i18n->>'en'",
		"pc.bonus_product_quantity",
		"COALESCE((SELECT ARRAY_AGG(category_id::text ORDER BY category_id::text) FROM promo_code_categories WHERE promo_code_id = pc.id), ARRAY[]::text[])",
		"COALESCE((SELECT ARRAY_AGG(product_id::text ORDER BY product_id::text) FROM promo_code_products WHERE promo_code_id = pc.id), ARRAY[]::text[])",
		"COALESCE((SELECT ARRAY_AGG(spot_id::text ORDER BY spot_id::text) FROM promo_code_spots WHERE promo_code_id = pc.id), ARRAY[]::text[])",
		"pc.total_usage_limit",
		"pc.per_user_usage_limit",
		"pc.valid_from",
		"pc.valid_to",
		"pc.is_active",
		"COALESCE(pu.usage_count, 0)",
		"pc.created_at",
	}
}

func scanPromo(scanner interface {
	Scan(dest ...any) error
}) (*ListItem, error) {
	var item ListItem
	var titleI18nJSON, descI18nJSON []byte

	if err := scanner.Scan(
		&item.ID,
		&item.Code,
		&titleI18nJSON,
		&descI18nJSON,
		&item.RewardType,
		&item.AppliesTo,
		&item.DiscountType,
		&item.DiscountValue,
		&item.MinOrderAmount,
		&item.MaxDiscountAmount,
		&item.BonusPoints,
		&item.BonusProductID,
		&item.BonusProductName,
		&item.BonusProductQuantity,
		&item.CategoryIDs,
		&item.ProductIDs,
		&item.SpotIDs,
		&item.TotalUsageLimit,
		&item.PerUserUsageLimit,
		&item.ValidFrom,
		&item.ValidTo,
		&item.IsActive,
		&item.UsageCount,
		&item.CreatedAt,
	); err != nil {
		return nil, err
	}

	if err := json.Unmarshal(titleI18nJSON, &item.TitleI18n); err != nil {
		item.TitleI18n = map[string]string{}
	}
	if err := json.Unmarshal(descI18nJSON, &item.DescriptionI18n); err != nil {
		item.DescriptionI18n = map[string]string{}
	}
	if item.CategoryIDs == nil {
		item.CategoryIDs = []string{}
	}
	if item.ProductIDs == nil {
		item.ProductIDs = []string{}
	}
	if item.SpotIDs == nil {
		item.SpotIDs = []string{}
	}

	return &item, nil
}

func (r *Repository) List(ctx context.Context, params pagination.ListParams, includeInactive bool) ([]ListItem, int64, error) {
	base := promoSelectBuilder()

	if !includeInactive {
		base = base.Where(sq.Eq{"pc.is_active": true})
	}
	if params.Search != "" {
		like := "%" + params.Search + "%"
		base = base.Where(sq.Or{
			sq.Expr("pc.code ILIKE ?", like),
			sq.Expr("pc.title_i18n::text ILIKE ?", like),
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

	dataQuery := base.Columns(promoColumns()...).
		OrderBy("pc.created_at DESC").
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
		item, err := scanPromo(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}

	return items, total, rows.Err()
}

func (r *Repository) GetByID(ctx context.Context, id string) (*ListItem, error) {
	query := promoSelectBuilder().
		Columns(promoColumns()...).
		Where(sq.Eq{"pc.id": id})

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, err
	}

	item, err := scanPromo(r.db.QueryRow(ctx, sql, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("promo code not found")
	}
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (r *Repository) Create(ctx context.Context, req CreateRequest) (string, error) {
	titleI18nJSON, _ := json.Marshal(req.TitleI18n)
	descI18nJSON, _ := json.Marshal(req.DescriptionI18n)

	bonusProductQuantity := 1
	if req.BonusProductQuantity != nil {
		bonusProductQuantity = *req.BonusProductQuantity
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	sql := `
		INSERT INTO promo_codes (
			code, title_i18n, description_i18n, reward_type, applies_to,
			discount_type, discount_value, min_order_amount, max_discount_amount,
			bonus_points, bonus_product_id, bonus_product_quantity,
			total_usage_limit, per_user_usage_limit, valid_from, valid_to
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id::text
	`

	var id string
	err = tx.QueryRow(
		ctx,
		sql,
		req.Code,
		titleI18nJSON,
		descI18nJSON,
		req.RewardType,
		req.AppliesTo,
		req.DiscountType,
		req.DiscountValue,
		req.MinOrderAmount,
		req.MaxDiscountAmount,
		req.BonusPoints,
		req.BonusProductID,
		bonusProductQuantity,
		req.TotalUsageLimit,
		req.PerUserUsageLimit,
		req.ValidFrom,
		req.ValidTo,
	).Scan(&id)
	if err != nil {
		return "", err
	}

	if err := syncPromoTargets(ctx, tx, id, "promo_code_categories", "category_id", req.CategoryIDs); err != nil {
		return "", err
	}
	if err := syncPromoTargets(ctx, tx, id, "promo_code_products", "product_id", req.ProductIDs); err != nil {
		return "", err
	}
	if err := syncPromoTargets(ctx, tx, id, "promo_code_spots", "spot_id", req.SpotIDs); err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return id, nil
}

func (r *Repository) Update(ctx context.Context, id string, req UpdateRequest) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	builder := sq.Update("promo_codes").
		PlaceholderFormat(sq.Dollar).
		Set("updated_at", sq.Expr("NOW()")).
		Where(sq.Eq{"id": id, "deleted_at": nil})

	if req.Code != nil {
		builder = builder.Set("code", *req.Code)
	}
	if req.TitleI18n != nil {
		titleI18nJSON, _ := json.Marshal(req.TitleI18n)
		builder = builder.Set("title_i18n", titleI18nJSON)
	}
	if req.DescriptionI18n != nil {
		descI18nJSON, _ := json.Marshal(req.DescriptionI18n)
		builder = builder.Set("description_i18n", descI18nJSON)
	}
	if req.RewardType != nil {
		builder = builder.Set("reward_type", *req.RewardType)
	}
	if req.AppliesTo != nil {
		builder = builder.Set("applies_to", *req.AppliesTo)
	}
	if req.DiscountType != nil {
		builder = builder.Set("discount_type", *req.DiscountType)
	}
	if req.DiscountValue != nil {
		builder = builder.Set("discount_value", *req.DiscountValue)
	}
	if req.MinOrderAmount != nil {
		builder = builder.Set("min_order_amount", *req.MinOrderAmount)
	}
	if req.MaxDiscountAmount != nil {
		builder = builder.Set("max_discount_amount", *req.MaxDiscountAmount)
	}
	if req.BonusPoints != nil {
		builder = builder.Set("bonus_points", *req.BonusPoints)
	}
	if req.BonusProductID != nil {
		if *req.BonusProductID == "" {
			builder = builder.Set("bonus_product_id", nil)
		} else {
			builder = builder.Set("bonus_product_id", *req.BonusProductID)
		}
	}
	if req.BonusProductQuantity != nil {
		builder = builder.Set("bonus_product_quantity", *req.BonusProductQuantity)
	}
	if req.TotalUsageLimit != nil {
		builder = builder.Set("total_usage_limit", *req.TotalUsageLimit)
	}
	if req.PerUserUsageLimit != nil {
		builder = builder.Set("per_user_usage_limit", *req.PerUserUsageLimit)
	}
	if req.ValidFrom != nil {
		builder = builder.Set("valid_from", *req.ValidFrom)
	}
	if req.ValidTo != nil {
		builder = builder.Set("valid_to", *req.ValidTo)
	}
	if req.IsActive != nil {
		builder = builder.Set("is_active", *req.IsActive)
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("promo code not found")
	}

	if req.CategoryIDs != nil {
		if err := syncPromoTargets(ctx, tx, id, "promo_code_categories", "category_id", req.CategoryIDs); err != nil {
			return err
		}
	}
	if req.ProductIDs != nil {
		if err := syncPromoTargets(ctx, tx, id, "promo_code_products", "product_id", req.ProductIDs); err != nil {
			return err
		}
	}
	if req.SpotIDs != nil {
		if err := syncPromoTargets(ctx, tx, id, "promo_code_spots", "spot_id", req.SpotIDs); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func syncPromoTargets(ctx context.Context, tx pgx.Tx, promoID, tableName, columnName string, ids []string) error {
	deleteSQL := fmt.Sprintf(`DELETE FROM %s WHERE promo_code_id = $1`, tableName)
	if _, err := tx.Exec(ctx, deleteSQL, promoID); err != nil {
		return err
	}

	for _, id := range ids {
		if id == "" {
			continue
		}
		insertSQL := fmt.Sprintf(`INSERT INTO %s (promo_code_id, %s) VALUES ($1, $2)`, tableName, columnName)
		if _, err := tx.Exec(ctx, insertSQL, promoID, id); err != nil {
			return err
		}
	}

	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	sql := `UPDATE promo_codes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("promo code not found")
	}
	return nil
}
