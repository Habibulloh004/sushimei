package orders

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

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

func (r *Repository) List(ctx context.Context, params pagination.ListParams, sortColumn, customerID string) ([]ListItem, int64, error) {
	base := sq.Select().
		PlaceholderFormat(sq.Dollar).
		From("orders o").
		LeftJoin("customers c ON c.id = o.customer_id").
		LeftJoin("spots s ON s.id = o.spot_id").
		Where(sq.Expr("o.deleted_at IS NULL"))

	base = applyFilters(base, params)
	if customerID != "" {
		base = base.Where(sq.Eq{"o.customer_id": customerID})
	}

	countQuery := base.
		Column("COUNT(*)")
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
			"o.id::text",
			"o.order_number",
			"o.status",
			"o.order_type",
			"o.payment_type",
			"o.total_amount::double precision",
			"COALESCE(CONCAT_WS(' ', c.first_name, c.last_name), '') as customer_name",
			"COALESCE(c.phone, '')",
			"COALESCE(s.name, '')",
			"o.created_at",
		).
		OrderBy(fmt.Sprintf("%s %s", sortColumn, params.SortOrder)).
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
		if err := rows.Scan(
			&item.ID,
			&item.OrderNumber,
			&item.Status,
			&item.OrderType,
			&item.PaymentType,
			&item.TotalAmount,
			&item.CustomerName,
			&item.CustomerPhone,
			&item.SpotName,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}

	return items, total, rows.Err()
}

func (r *Repository) UpdateStatus(ctx context.Context, orderID, status, reason, actorID string) error {
	q := `
		UPDATE orders
		SET status = $2,
			cancellation_reason = CASE WHEN $2 = 'CANCELLED'::order_status THEN $3 ELSE cancellation_reason END,
			updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`

	tag, err := r.db.Exec(ctx, q, orderID, status, reason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("order not found")
	}

	logQ := `
		INSERT INTO order_status_timeline (order_id, status, changed_by, note)
		VALUES ($1, $2, $3, $4)
	`
	_, err = r.db.Exec(ctx, logQ, orderID, status, actorID, reason)
	return err
}

func (r *Repository) GetStatus(ctx context.Context, orderID string) (string, error) {
	q := `SELECT status FROM orders WHERE id = $1 AND deleted_at IS NULL`
	var status string
	err := r.db.QueryRow(ctx, q, orderID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errors.New("order not found")
	}
	if err != nil {
		return "", err
	}
	return status, nil
}

func (r *Repository) GetByID(ctx context.Context, orderID string) (*OrderDetail, error) {
	q := `
		SELECT
			o.id::text,
			o.order_number,
			o.status,
			o.order_type,
			o.payment_type,
			o.total_amount::double precision,
			COALESCE(CONCAT_WS(' ', c.first_name, c.last_name), '') AS customer_name,
			COALESCE(c.phone, '') AS customer_phone,
			COALESCE(s.name, '') AS spot_name,
			COALESCE(o.spot_id::text, '') AS spot_id,
			COALESCE(o.notes, '') AS notes,
			o.created_at
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id
		LEFT JOIN spots s ON s.id = o.spot_id
		WHERE o.id = $1 AND o.deleted_at IS NULL
	`

	var d OrderDetail
	err := r.db.QueryRow(ctx, q, orderID).Scan(
		&d.ID, &d.OrderNumber, &d.Status, &d.OrderType, &d.PaymentType,
		&d.TotalAmount, &d.CustomerName, &d.CustomerPhone, &d.SpotName,
		&d.SpotID, &d.Notes, &d.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("order not found")
	}
	if err != nil {
		return nil, err
	}

	itemsQ := `
		SELECT
			oi.id::text,
			oi.product_id::text,
			oi.product_name_snapshot,
			oi.unit_price::double precision,
			oi.quantity,
			oi.line_total::double precision,
			COALESCE(oi.note, '')
		FROM order_items oi
		WHERE oi.order_id = $1
		ORDER BY oi.created_at
	`

	rows, err := r.db.Query(ctx, itemsQ, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	d.Items = make([]DetailItem, 0)
	for rows.Next() {
		var item DetailItem
		var nameJSON []byte
		if err := rows.Scan(&item.ID, &item.ProductID, &nameJSON, &item.UnitPrice, &item.Quantity, &item.LineTotal, &item.Note); err != nil {
			return nil, err
		}
		item.ProductName = make(map[string]string)
		_ = json.Unmarshal(nameJSON, &item.ProductName)
		d.Items = append(d.Items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &d, nil
}

func (r *Repository) GetOrderCustomerID(ctx context.Context, orderID string) (string, error) {
	q := `SELECT COALESCE(customer_id::text, '') FROM orders WHERE id = $1 AND deleted_at IS NULL`
	var customerID string
	err := r.db.QueryRow(ctx, q, orderID).Scan(&customerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errors.New("order not found")
	}
	if err != nil {
		return "", err
	}
	return customerID, nil
}

func (r *Repository) Delete(ctx context.Context, orderID string) error {
	q := `
		UPDATE orders
		SET deleted_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`

	tag, err := r.db.Exec(ctx, q, orderID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("order not found")
	}

	return nil
}

func applyFilters(base sq.SelectBuilder, params pagination.ListParams) sq.SelectBuilder {
	if params.Status != "" {
		base = base.Where(sq.Eq{"o.status": params.Status})
	}
	if params.SpotID != "" {
		base = base.Where(sq.Eq{"o.spot_id": params.SpotID})
	}
	if params.PaymentType != "" {
		base = base.Where(sq.Eq{"o.payment_type": params.PaymentType})
	}
	if params.OrderType != "" {
		base = base.Where(sq.Eq{"o.order_type": params.OrderType})
	}
	if params.Search != "" {
		like := "%" + params.Search + "%"
		base = base.Where(sq.Or{
			sq.Expr("o.order_number ILIKE ?", like),
			sq.Expr("c.phone ILIKE ?", like),
			sq.Expr("CONCAT_WS(' ', c.first_name, c.last_name) ILIKE ?", like),
		})
	}
	if params.DateFrom != nil {
		base = base.Where(sq.GtOrEq{"o.created_at": *params.DateFrom})
	}
	if params.DateTo != nil {
		to := params.DateTo.Add(24 * time.Hour)
		base = base.Where(sq.Lt{"o.created_at": to})
	}

	return base
}

// DashboardStats returns admin dashboard statistics
type DashboardStats struct {
	TodayRevenue       float64 `json:"today_revenue"`
	TodayRevenueChange float64 `json:"today_revenue_change"`
	ActiveOrders       int64   `json:"active_orders"`
	ActiveOrdersChange int64   `json:"active_orders_change"`
	TotalCustomers     int64   `json:"total_customers"`
	CustomersChange    float64 `json:"customers_change"`
	TotalProducts      int64   `json:"total_products"`
	ProductsChange     int64   `json:"products_change"`
}

type EfficiencyMetrics struct {
	AvgPrepTimeMinutes     float64 `json:"avg_prep_time_minutes"`
	AvgDeliveryTimeMinutes float64 `json:"avg_delivery_time_minutes"`
	OrderErrorRate         float64 `json:"order_error_rate"`
}

type LoyaltyStats struct {
	TotalPointsIssued    float64 `json:"total_points_issued"`
	TotalPointsUsed      float64 `json:"total_points_used"`
	TotalPointsRemaining float64 `json:"total_points_remaining"`
	YearOverYearChange   float64 `json:"year_over_year_change"`
}

type DashboardOverview struct {
	DashboardStats
	RecentOrders []ListItem        `json:"recent_orders"`
	Efficiency   EfficiencyMetrics `json:"efficiency"`
	Loyalty      LoyaltyStats      `json:"loyalty"`
}

func (r *Repository) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
	stats := &DashboardStats{}

	// Today's revenue
	todaySQL := `
		SELECT COALESCE(SUM(total_amount), 0)::double precision
		FROM orders
		WHERE created_at >= CURRENT_DATE
		AND deleted_at IS NULL
		AND status NOT IN ('CANCELLED', 'REJECTED')
	`
	r.db.QueryRow(ctx, todaySQL).Scan(&stats.TodayRevenue)

	// Yesterday's revenue for comparison
	var yesterdayRevenue float64
	yesterdaySQL := `
		SELECT COALESCE(SUM(total_amount), 0)::double precision
		FROM orders
		WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
		AND created_at < CURRENT_DATE
		AND deleted_at IS NULL
		AND status NOT IN ('CANCELLED', 'REJECTED')
	`
	r.db.QueryRow(ctx, yesterdaySQL).Scan(&yesterdayRevenue)
	if yesterdayRevenue > 0 {
		stats.TodayRevenueChange = ((stats.TodayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
	}

	// Active orders
	activeSQL := `
		SELECT COUNT(*)
		FROM orders
		WHERE deleted_at IS NULL
		AND status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED')
	`
	r.db.QueryRow(ctx, activeSQL).Scan(&stats.ActiveOrders)

	// Total customers
	customersSQL := `SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL`
	r.db.QueryRow(ctx, customersSQL).Scan(&stats.TotalCustomers)

	// Customers last month for comparison
	var lastMonthCustomers int64
	lastMonthSQL := `
		SELECT COUNT(*) FROM customers
		WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
		AND deleted_at IS NULL
	`
	r.db.QueryRow(ctx, lastMonthSQL).Scan(&lastMonthCustomers)
	if lastMonthCustomers > 0 {
		stats.CustomersChange = float64(stats.TotalCustomers-lastMonthCustomers) / float64(lastMonthCustomers) * 100
	}

	// Total products
	productsSQL := `SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND is_active = true`
	r.db.QueryRow(ctx, productsSQL).Scan(&stats.TotalProducts)

	return stats, nil
}

func (r *Repository) GetDashboardOverview(ctx context.Context) (*DashboardOverview, error) {
	stats, err := r.GetDashboardStats(ctx)
	if err != nil {
		return nil, err
	}

	efficiency, err := r.GetEfficiencyMetrics(ctx)
	if err != nil {
		return nil, err
	}

	loyalty, err := r.GetLoyaltyStats(ctx)
	if err != nil {
		return nil, err
	}

	recentOrders, err := r.GetRecentOrders(ctx, 10)
	if err != nil {
		return nil, err
	}

	overview := &DashboardOverview{
		DashboardStats: *stats,
		RecentOrders:   recentOrders,
	}

	if efficiency != nil {
		overview.Efficiency = *efficiency
	}
	if loyalty != nil {
		overview.Loyalty = *loyalty
	}

	return overview, nil
}

func (r *Repository) GetRecentOrders(ctx context.Context, limit int) ([]ListItem, error) {
	if limit < 1 {
		limit = 1
	}

	q := `
		SELECT
			o.id::text,
			o.order_number,
			o.status,
			o.order_type,
			o.payment_type,
			o.total_amount::double precision,
			COALESCE(CONCAT_WS(' ', c.first_name, c.last_name), '') as customer_name,
			COALESCE(c.phone, ''),
			COALESCE(s.name, ''),
			o.created_at
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id
		LEFT JOIN spots s ON s.id = o.spot_id
		WHERE o.deleted_at IS NULL
		ORDER BY o.created_at DESC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ListItem, 0, limit)
	for rows.Next() {
		var item ListItem
		if err := rows.Scan(
			&item.ID,
			&item.OrderNumber,
			&item.Status,
			&item.OrderType,
			&item.PaymentType,
			&item.TotalAmount,
			&item.CustomerName,
			&item.CustomerPhone,
			&item.SpotName,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) GetEfficiencyMetrics(ctx context.Context) (*EfficiencyMetrics, error) {
	metrics := &EfficiencyMetrics{}

	// Get average prep time (from RECEIVED to READY status)
	prepSQL := `
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (ready_time - received_time)) / 60), 15)::double precision
		FROM (
			SELECT
				o.id,
				MIN(CASE WHEN ost.status = 'RECEIVED' THEN ost.changed_at END) as received_time,
				MIN(CASE WHEN ost.status = 'READY' THEN ost.changed_at END) as ready_time
			FROM orders o
			LEFT JOIN order_status_timeline ost ON ost.order_id = o.id
			WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
			AND o.deleted_at IS NULL
			GROUP BY o.id
			HAVING MIN(CASE WHEN ost.status = 'READY' THEN ost.changed_at END) IS NOT NULL
		) sub
	`
	r.db.QueryRow(ctx, prepSQL).Scan(&metrics.AvgPrepTimeMinutes)

	// Get average delivery time (from READY to DELIVERED)
	deliverySQL := `
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (delivered_time - ready_time)) / 60), 30)::double precision
		FROM (
			SELECT
				o.id,
				MIN(CASE WHEN ost.status = 'READY' THEN ost.changed_at END) as ready_time,
				MIN(CASE WHEN ost.status = 'DELIVERED' THEN ost.changed_at END) as delivered_time
			FROM orders o
			LEFT JOIN order_status_timeline ost ON ost.order_id = o.id
			WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
			AND o.deleted_at IS NULL
			AND o.order_type = 'DELIVERY'
			GROUP BY o.id
			HAVING MIN(CASE WHEN ost.status = 'DELIVERED' THEN ost.changed_at END) IS NOT NULL
		) sub
	`
	r.db.QueryRow(ctx, deliverySQL).Scan(&metrics.AvgDeliveryTimeMinutes)

	// Order error rate (cancelled + rejected / total)
	errorSQL := `
		SELECT
			CASE WHEN COUNT(*) > 0
			THEN (COUNT(*) FILTER (WHERE status IN ('CANCELLED', 'REJECTED'))::double precision / COUNT(*)::double precision) * 100
			ELSE 0 END
		FROM orders
		WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
		AND deleted_at IS NULL
	`
	r.db.QueryRow(ctx, errorSQL).Scan(&metrics.OrderErrorRate)

	return metrics, nil
}

func (r *Repository) GetLoyaltyStats(ctx context.Context) (*LoyaltyStats, error) {
	stats := &LoyaltyStats{}

	// Total points in customer balances
	balanceSQL := `SELECT COALESCE(SUM(bonus_balance), 0)::double precision FROM customers WHERE deleted_at IS NULL`
	r.db.QueryRow(ctx, balanceSQL).Scan(&stats.TotalPointsRemaining)

	// Total points issued and used from bonus_ledger
	ledgerSQL := `
		SELECT
			COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::double precision as issued,
			COALESCE(SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END), 0)::double precision as used
		FROM bonus_ledger
	`
	r.db.QueryRow(ctx, ledgerSQL).Scan(&stats.TotalPointsIssued, &stats.TotalPointsUsed)

	// Last year comparison
	var lastYearIssued float64
	lastYearSQL := `
		SELECT COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::double precision
		FROM bonus_ledger
		WHERE created_at < CURRENT_DATE - INTERVAL '1 year'
	`
	r.db.QueryRow(ctx, lastYearSQL).Scan(&lastYearIssued)
	if lastYearIssued > 0 {
		stats.YearOverYearChange = ((stats.TotalPointsIssued - lastYearIssued) / lastYearIssued) * 100
	}

	return stats, nil
}
