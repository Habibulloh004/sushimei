package customers

import (
	"context"
	"fmt"
	"strings"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5/pgxpool"
	"sushimei/backend/internal/platform/pagination"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, params pagination.ListParams, filters ListFilters, sortColumn string) ([]ListItem, int64, error) {
	base := sq.Select().
		PlaceholderFormat(sq.Dollar).
		From("customers c").
		LeftJoin("orders o ON o.customer_id = c.id AND o.deleted_at IS NULL").
		Where("c.deleted_at IS NULL")

	base = applyFilters(base, params, filters)

	countInner := base.
		Columns("c.id").
		GroupBy("c.id")
	countInner = applyHaving(countInner, filters)

	innerSQL, innerArgs, err := countInner.ToSql()
	if err != nil {
		return nil, 0, err
	}

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM (%s) t", innerSQL)
	var total int64
	if err := r.db.QueryRow(ctx, countSQL, innerArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := base.
		Columns(
			"c.id::text",
			"c.first_name",
			"c.last_name",
			"c.phone",
			"c.email",
			"c.status",
			"c.language_code",
			"c.bonus_balance",
			"c.marketing_opt_in",
			"c.last_login_at",
			"COUNT(o.id)::bigint as total_orders",
			"MAX(o.created_at) as last_order_at",
			"c.created_at",
		).
		GroupBy("c.id").
		OrderBy(fmt.Sprintf("%s %s", sortColumn, params.SortOrder)).
		Limit(uint64(params.Limit)).
		Offset(params.Offset())
	dataQuery = applyHaving(dataQuery, filters)

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
		var firstName, lastName *string
		if err := rows.Scan(
			&item.ID,
			&firstName,
			&lastName,
			&item.Phone,
			&item.Email,
			&item.Status,
			&item.LanguageCode,
			&item.BonusBalance,
			&item.MarketingOptIn,
			&item.LastLoginAt,
			&item.TotalOrders,
			&item.LastOrderAt,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		item.FirstName = optionalString(firstName)
		item.LastName = optionalString(lastName)
		items = append(items, item)
	}

	return items, total, rows.Err()
}

func (r *Repository) Create(ctx context.Context, req CreateRequest) (string, error) {
	status := "ACTIVE"
	if req.Status != nil && strings.TrimSpace(*req.Status) != "" {
		status = strings.ToUpper(strings.TrimSpace(*req.Status))
	}

	languageCode := "en"
	if req.LanguageCode != nil && strings.TrimSpace(*req.LanguageCode) != "" {
		languageCode = strings.TrimSpace(*req.LanguageCode)
	}

	bonusBalance := 0
	if req.BonusBalance != nil {
		bonusBalance = *req.BonusBalance
	}

	marketingOptIn := false
	if req.MarketingOptIn != nil {
		marketingOptIn = *req.MarketingOptIn
	}

	q := `
		INSERT INTO customers (
			phone,
			first_name,
			last_name,
			email,
			status,
			language_code,
			bonus_balance,
			marketing_opt_in
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id::text
	`

	var id string
	if err := r.db.QueryRow(
		ctx,
		q,
		req.Phone,
		req.FirstName,
		req.LastName,
		req.Email,
		status,
		languageCode,
		bonusBalance,
		marketingOptIn,
	).Scan(&id); err != nil {
		return "", err
	}

	return id, nil
}

func (r *Repository) Update(ctx context.Context, id string, req UpdateRequest) error {
	builder := sq.Update("customers").
		PlaceholderFormat(sq.Dollar).
		Set("updated_at", sq.Expr("NOW()")).
		Where(sq.Eq{"id": id, "deleted_at": nil})

	if req.Phone != nil {
		builder = builder.Set("phone", *req.Phone)
	}
	if req.FirstName != nil {
		builder = builder.Set("first_name", *req.FirstName)
	}
	if req.LastName != nil {
		builder = builder.Set("last_name", *req.LastName)
	}
	if req.Email != nil {
		builder = builder.Set("email", *req.Email)
	}
	if req.Status != nil {
		builder = builder.Set("status", *req.Status)
	}
	if req.LanguageCode != nil {
		builder = builder.Set("language_code", *req.LanguageCode)
	}
	if req.BonusBalance != nil {
		builder = builder.Set("bonus_balance", *req.BonusBalance)
	}
	if req.MarketingOptIn != nil {
		builder = builder.Set("marketing_opt_in", *req.MarketingOptIn)
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
		return fmt.Errorf("customer not found")
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	sql := `UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("customer not found")
	}
	return nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Profile, error) {
	const sql = `
		SELECT
			c.id::text,
			c.phone,
			c.first_name,
			c.last_name,
			c.email,
			c.status,
			c.bonus_balance,
			c.marketing_opt_in,
			c.language_code,
			c.last_login_at,
			COUNT(o.id)::bigint as total_orders,
			MAX(o.created_at) as last_order_at,
			c.created_at
		FROM customers c
		LEFT JOIN orders o ON o.customer_id = c.id AND o.deleted_at IS NULL
		WHERE c.id = $1 AND c.deleted_at IS NULL
		GROUP BY c.id
	`

	var profile Profile
	if err := r.db.QueryRow(ctx, sql, id).Scan(
		&profile.ID,
		&profile.Phone,
		&profile.FirstName,
		&profile.LastName,
		&profile.Email,
		&profile.Status,
		&profile.BonusBalance,
		&profile.MarketingOptIn,
		&profile.LanguageCode,
		&profile.LastLoginAt,
		&profile.TotalOrders,
		&profile.LastOrderAt,
		&profile.CreatedAt,
	); err != nil {
		return nil, err
	}

	return &profile, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id string, req ProfileUpdateRequest) error {
	builder := sq.Update("customers").
		PlaceholderFormat(sq.Dollar).
		Set("updated_at", sq.Expr("NOW()")).
		Where(sq.Eq{"id": id, "deleted_at": nil})

	if req.FirstName != nil {
		builder = builder.Set("first_name", *req.FirstName)
	}
	if req.LastName != nil {
		builder = builder.Set("last_name", *req.LastName)
	}
	if req.Email != nil {
		builder = builder.Set("email", *req.Email)
	}
	if req.LanguageCode != nil {
		builder = builder.Set("language_code", *req.LanguageCode)
	}
	if req.MarketingOptIn != nil {
		builder = builder.Set("marketing_opt_in", *req.MarketingOptIn)
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
		return fmt.Errorf("customer not found")
	}
	return nil
}

func applyFilters(base sq.SelectBuilder, params pagination.ListParams, filters ListFilters) sq.SelectBuilder {
	if params.Status != "" {
		base = base.Where(sq.Eq{"c.status": params.Status})
	}
	if params.SpotID != "" {
		base = base.Where(sq.Expr("EXISTS (SELECT 1 FROM orders os WHERE os.customer_id = c.id AND os.spot_id = ?)", params.SpotID))
	}
	if params.DateFrom != nil {
		base = base.Where(sq.GtOrEq{"c.created_at": *params.DateFrom})
	}
	if params.DateTo != nil {
		to := params.DateTo.Add(24 * time.Hour)
		base = base.Where(sq.Lt{"c.created_at": to})
	}

	search := strings.TrimSpace(params.Search)
	if search != "" {
		like := "%" + search + "%"
		base = base.Where(sq.Or{
			sq.Expr("c.phone ILIKE ?", like),
			sq.Expr("COALESCE(c.first_name, '') ILIKE ?", like),
			sq.Expr("COALESCE(c.last_name, '') ILIKE ?", like),
		})
	}

	if filters.Name != "" {
		like := "%" + strings.TrimSpace(filters.Name) + "%"
		base = base.Where(sq.Expr("CONCAT_WS(' ', COALESCE(c.first_name, ''), COALESCE(c.last_name, '')) ILIKE ?", like))
	}
	if filters.Phone != "" {
		like := "%" + strings.TrimSpace(filters.Phone) + "%"
		base = base.Where(sq.Expr("c.phone ILIKE ?", like))
	}

	return base
}

func applyHaving(base sq.SelectBuilder, filters ListFilters) sq.SelectBuilder {
	if filters.MinTotalOrders > 0 {
		base = base.Having("COUNT(o.id) >= ?", filters.MinTotalOrders)
	}
	if filters.MaxTotalOrders > 0 {
		base = base.Having("COUNT(o.id) <= ?", filters.MaxTotalOrders)
	}
	return base
}

func optionalString(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}
