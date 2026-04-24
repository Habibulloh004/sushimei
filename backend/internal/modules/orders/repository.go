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
		LeftJoin("employees cr ON cr.id = o.assigned_courier_id").
		LeftJoin("employees oc ON oc.id = o.offered_courier_id").
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
			"o.assigned_courier_id::text",
			"NULLIF(TRIM(CONCAT_WS(' ', cr.first_name, cr.last_name)), '')",
			"o.offered_courier_id::text",
			"NULLIF(TRIM(CONCAT_WS(' ', oc.first_name, oc.last_name)), '')",
			"COALESCE(o.courier_offer_status, 'NONE')",
			"NULLIF(o.courier_offer_decline_reason, '')",
			"o.courier_offered_at",
			"o.courier_offer_responded_at",
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
			&item.AssignedCourierID,
			&item.AssignedCourierName,
			&item.OfferedCourierID,
			&item.OfferedCourierName,
			&item.CourierOfferStatus,
			&item.CourierOfferDeclineReason,
			&item.CourierOfferedAt,
			&item.CourierOfferRespondedAt,
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
			dispatched_at = CASE WHEN $2 = 'ON_THE_WAY'::order_status AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
			delivered_at = CASE WHEN $2 = 'DELIVERED'::order_status AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
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

func (r *Repository) AssignCourier(ctx context.Context, orderID, courierID, actorID string) error {
	const verifyCourierSQL = `
		SELECT 1 FROM employees
		WHERE id = $1 AND role_code = 'COURIER' AND deleted_at IS NULL AND is_active = TRUE
		  AND on_duty = TRUE
	`
	var exists int
	if err := r.db.QueryRow(ctx, verifyCourierSQL, courierID).Scan(&exists); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("courier not found, inactive, or off duty")
		}
		return err
	}

	const q = `
		UPDATE orders
		SET assigned_courier_id = NULL,
			assigned_at = NULL,
			offered_courier_id = $2,
			courier_offer_status = 'PENDING',
			courier_offer_decline_reason = NULL,
			courier_offered_at = NOW(),
			courier_offer_responded_at = NULL,
			updated_at = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
		  AND order_type = 'DELIVERY'
		  AND status = 'READY'
		  AND assigned_courier_id IS NULL
		  AND COALESCE(courier_offer_status, 'NONE') <> 'PENDING'
	`
	tag, err := r.db.Exec(ctx, q, orderID, courierID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		var assigned, offered *string
		var status, offerStatus string
		if err := r.db.QueryRow(ctx,
			`SELECT assigned_courier_id::text, offered_courier_id::text, status::text, COALESCE(courier_offer_status, 'NONE') FROM orders WHERE id = $1 AND deleted_at IS NULL`,
			orderID,
		).Scan(&assigned, &offered, &status, &offerStatus); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return errors.New("order not found")
			}
			return err
		}
		if status != "READY" {
			return fmt.Errorf("order must be READY before assigning a courier (current: %s)", status)
		}
		if assigned != nil && *assigned != "" {
			return errors.New("order already has an accepted courier")
		}
		if offerStatus == "PENDING" && offered != nil && *offered != "" {
			return errors.New("courier response is still pending")
		}
		return errors.New("order is not available for courier assignment")
	}

	const logQ = `
		INSERT INTO order_status_timeline (order_id, status, changed_by, note)
		SELECT $1, status, $2, $3 FROM orders WHERE id = $1
	`
	_, err = r.db.Exec(ctx, logQ, orderID, actorID, "Courier offer sent")
	return err
}

func (r *Repository) GetOrderType(ctx context.Context, orderID string) (string, error) {
	var orderType string
	err := r.db.QueryRow(ctx, `SELECT order_type FROM orders WHERE id = $1 AND deleted_at IS NULL`, orderID).Scan(&orderType)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errors.New("order not found")
	}
	if err != nil {
		return "", err
	}
	return orderType, nil
}

// ReplaceItems swaps the order's items and updates the totals in a single
// transaction. The caller is expected to have re-priced already (priced).
func (r *Repository) ReplaceItems(ctx context.Context, orderID string, priced *pricedOrderContext, notes *string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM order_item_modifiers WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1)`, orderID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM order_items WHERE order_id = $1`, orderID); err != nil {
		return err
	}

	for _, item := range priced.pricing.Items {
		nameJSON, _ := json.Marshal(item.ProductName)
		if _, err := tx.Exec(
			ctx,
			`INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total) VALUES ($1, $2, $3, $4, $5, $6)`,
			orderID, item.ProductID, nameJSON, item.UnitPrice, item.Quantity, item.LineTotal,
		); err != nil {
			return err
		}
	}

	notesExpr := "notes"
	args := []any{
		orderID,
		priced.pricing.SubtotalAmount,
		priced.pricing.PromoDiscountAmount,
		priced.pricing.BonusSpentAmount,
		priced.pricing.DeliveryFeeAmount,
		priced.pricing.TotalAmount,
		priced.pricing.BonusEarnedPoints,
	}
	if notes != nil {
		notesExpr = "$8"
		args = append(args, *notes)
	}

	updateSQL := `
		UPDATE orders
		SET subtotal_amount = $2,
			promo_discount_amount = $3,
			bonus_spent_amount = $4,
			delivery_fee_amount = $5,
			total_amount = $6,
			bonus_earned_points = $7,
			notes = ` + notesExpr + `,
			updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`

	if _, err := tx.Exec(ctx, updateSQL, args...); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetOrderForRepricing fetches just enough order context to rebuild an
// UpsertOrderRequest for re-pricing on edit.
func (r *Repository) GetOrderForRepricing(ctx context.Context, orderID string) (status, spotID, orderType, paymentType, customerName, customerPhone, notes string, customerID *string, err error) {
	const q = `
		SELECT status, spot_id::text, order_type, payment_type,
		       COALESCE(customer_name,''), COALESCE(customer_phone,''), COALESCE(notes,''),
		       customer_id::text
		FROM orders
		WHERE id = $1 AND deleted_at IS NULL
	`
	var cust *string
	err = r.db.QueryRow(ctx, q, orderID).Scan(&status, &spotID, &orderType, &paymentType, &customerName, &customerPhone, &notes, &cust)
	return status, spotID, orderType, paymentType, customerName, customerPhone, notes, cust, err
}

// GetOrderRouting fetches the spot and assigned courier for broadcasting
// realtime events after an order mutation. Missing order yields empty
// strings rather than an error so the caller can publish defensively.
func (r *Repository) GetOrderRouting(ctx context.Context, orderID string) (spotID string, courierID string, err error) {
	var spot, courier *string
	err = r.db.QueryRow(
		ctx,
		`SELECT spot_id::text, assigned_courier_id::text FROM orders WHERE id = $1 AND deleted_at IS NULL`,
		orderID,
	).Scan(&spot, &courier)
	if err != nil {
		return "", "", err
	}
	if spot != nil {
		spotID = *spot
	}
	if courier != nil {
		courierID = *courier
	}
	return spotID, courierID, nil
}

func (r *Repository) GetAssignedCourierID(ctx context.Context, orderID string) (string, error) {
	var courierID *string
	err := r.db.QueryRow(ctx, `SELECT assigned_courier_id::text FROM orders WHERE id = $1 AND deleted_at IS NULL`, orderID).Scan(&courierID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errors.New("order not found")
	}
	if err != nil {
		return "", err
	}
	if courierID == nil {
		return "", nil
	}
	return *courierID, nil
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
			o.delivery_address,
			o.delivery_latitude::double precision,
			o.delivery_longitude::double precision,
			o.assigned_courier_id::text,
			NULLIF(TRIM(CONCAT_WS(' ', cr.first_name, cr.last_name)), ''),
			o.offered_courier_id::text,
			NULLIF(TRIM(CONCAT_WS(' ', oc.first_name, oc.last_name)), ''),
			COALESCE(o.courier_offer_status, 'NONE'),
			NULLIF(o.courier_offer_decline_reason, ''),
			o.created_at,
			o.assigned_at,
			o.courier_offered_at,
			o.courier_offer_responded_at
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id
		LEFT JOIN spots s ON s.id = o.spot_id
		LEFT JOIN employees cr ON cr.id = o.assigned_courier_id
		LEFT JOIN employees oc ON oc.id = o.offered_courier_id
		WHERE o.id = $1 AND o.deleted_at IS NULL
	`

	var d OrderDetail
	var deliveryAddrJSON []byte
	err := r.db.QueryRow(ctx, q, orderID).Scan(
		&d.ID, &d.OrderNumber, &d.Status, &d.OrderType, &d.PaymentType,
		&d.TotalAmount, &d.CustomerName, &d.CustomerPhone, &d.SpotName,
		&d.SpotID, &d.Notes,
		&deliveryAddrJSON, &d.DeliveryLatitude, &d.DeliveryLongitude,
		&d.AssignedCourierID, &d.AssignedCourierName,
		&d.OfferedCourierID, &d.OfferedCourierName,
		&d.CourierOfferStatus, &d.CourierOfferDeclineReason,
		&d.CreatedAt, &d.AssignedAt,
		&d.CourierOfferedAt, &d.CourierOfferRespondedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("order not found")
	}
	if err != nil {
		return nil, err
	}

	if len(deliveryAddrJSON) > 0 {
		_ = json.Unmarshal(deliveryAddrJSON, &d.DeliveryAddress)
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
	if params.AssignedCourierID != "" {
		base = base.Where(sq.Eq{"o.assigned_courier_id": params.AssignedCourierID})
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

// ListCourierOffers returns delivery orders at the given spot that are READY
// but not yet claimed by any courier. Off-duty couriers receive an empty
// list — the EXISTS guard makes the on-duty check a single round trip.
func (r *Repository) ListCourierOffers(ctx context.Context, spotID, courierID string) ([]CourierOffer, error) {
	const q = `
		SELECT
			o.id::text,
			o.order_number,
			o.total_amount::double precision,
			o.payment_type::text,
			CASE
				WHEN o.offered_courier_id = $2 AND o.courier_offer_status = 'PENDING' THEN 'DIRECT'
				ELSE 'POOL'
			END AS offer_type,
			o.delivery_address,
			o.delivery_latitude::double precision,
			o.delivery_longitude::double precision,
			COALESCE((SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id), 0),
			o.created_at,
			o.courier_offered_at
		FROM orders o
		WHERE o.deleted_at IS NULL
		  AND o.spot_id = $1
		  AND o.order_type = 'DELIVERY'
		  AND o.status = 'READY'
		  AND o.assigned_courier_id IS NULL
		  AND (
		    (o.offered_courier_id IS NULL AND COALESCE(o.courier_offer_status, 'NONE') = 'NONE')
		    OR (o.offered_courier_id = $2 AND o.courier_offer_status = 'PENDING')
		  )
		  AND EXISTS (
		    SELECT 1 FROM employees e
		    WHERE e.id = $2
		      AND e.role_code = 'COURIER'
		      AND e.deleted_at IS NULL
		      AND e.is_active = TRUE
		      AND e.on_duty = TRUE
		  )
		ORDER BY
		  CASE WHEN o.offered_courier_id = $2 AND o.courier_offer_status = 'PENDING' THEN 0 ELSE 1 END,
		  COALESCE(o.courier_offered_at, o.created_at) ASC
	`

	rows, err := r.db.Query(ctx, q, spotID, courierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	offers := make([]CourierOffer, 0)
	for rows.Next() {
		var o CourierOffer
		var addrJSON []byte
		if err := rows.Scan(
			&o.ID, &o.OrderNumber, &o.TotalAmount, &o.PaymentType,
			&o.OfferType,
			&addrJSON, &o.DeliveryLat, &o.DeliveryLng,
			&o.ItemCount, &o.CreatedAt, &o.OfferedAt,
		); err != nil {
			return nil, err
		}
		if len(addrJSON) > 0 {
			_ = json.Unmarshal(addrJSON, &o.DeliveryAddress)
		}
		offers = append(offers, o)
	}
	return offers, rows.Err()
}

// ErrOfferAlreadyClaimed signals that another courier won the race before the
// current call reached the DB. Callers map this to HTTP 409.
var ErrOfferAlreadyClaimed = errors.New("offer already claimed")

// ClaimCourierOffer atomically assigns the order to the given courier, but
// only if no courier is assigned yet. The conditional WHERE guarantees a
// single winner under concurrent accept calls — no extra locking needed.
// Returns ErrOfferAlreadyClaimed when another courier already won.
func (r *Repository) ClaimCourierOffer(ctx context.Context, orderID, courierID, actorID string) error {
	const claimSQL = `
		UPDATE orders
		SET assigned_courier_id = $2,
		    offered_courier_id = $2,
		    courier_offer_status = 'ACCEPTED',
		    courier_offer_decline_reason = NULL,
		    assigned_at = NOW(),
		    courier_offer_responded_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
		  AND order_type = 'DELIVERY'
		  AND status = 'READY'
		  AND assigned_courier_id IS NULL
		  AND (
		    (offered_courier_id IS NULL AND COALESCE(courier_offer_status, 'NONE') = 'NONE')
		    OR (offered_courier_id = $2 AND courier_offer_status = 'PENDING')
		  )
	`
	tag, err := r.db.Exec(ctx, claimSQL, orderID, courierID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		// Distinguish between "already claimed" and "never existed / wrong state".
		// We do a lightweight follow-up read so the API returns 409 vs 404/400.
		var assigned, offered *string
		var status, offerStatus string
		if err := r.db.QueryRow(ctx,
			`SELECT assigned_courier_id::text, offered_courier_id::text, status::text, COALESCE(courier_offer_status, 'NONE') FROM orders WHERE id = $1 AND deleted_at IS NULL`,
			orderID,
		).Scan(&assigned, &offered, &status, &offerStatus); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return errors.New("order not found")
			}
			return err
		}
		if assigned != nil && *assigned != "" {
			return ErrOfferAlreadyClaimed
		}
		if offered != nil && *offered != "" && *offered != courierID && offerStatus == "PENDING" {
			return errors.New("order is offered to another courier")
		}
		if offered != nil && *offered == courierID && offerStatus == "DECLINED" {
			return errors.New("you already declined this order")
		}
		return fmt.Errorf("order is not in READY state (current: %s)", status)
	}

	const logSQL = `
		INSERT INTO order_status_timeline (order_id, status, changed_by, note)
		SELECT $1, status, $2, 'Courier accepted offer' FROM orders WHERE id = $1
	`
	_, err = r.db.Exec(ctx, logSQL, orderID, actorID)
	return err
}

func (r *Repository) DeclineCourierOffer(ctx context.Context, orderID, courierID, actorID, reason string) error {
	const declineSQL = `
		UPDATE orders
		SET courier_offer_status = 'DECLINED',
		    courier_offer_decline_reason = $3,
		    courier_offer_responded_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
		  AND order_type = 'DELIVERY'
		  AND status = 'READY'
		  AND assigned_courier_id IS NULL
		  AND offered_courier_id = $2
		  AND courier_offer_status = 'PENDING'
	`
	tag, err := r.db.Exec(ctx, declineSQL, orderID, courierID, reason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		var assigned, offered *string
		var status, offerStatus string
		if err := r.db.QueryRow(ctx,
			`SELECT assigned_courier_id::text, offered_courier_id::text, status::text, COALESCE(courier_offer_status, 'NONE') FROM orders WHERE id = $1 AND deleted_at IS NULL`,
			orderID,
		).Scan(&assigned, &offered, &status, &offerStatus); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return errors.New("order not found")
			}
			return err
		}
		if assigned != nil && *assigned != "" {
			return ErrOfferAlreadyClaimed
		}
		if offered == nil || *offered != courierID {
			return errors.New("order is not offered to you")
		}
		if offerStatus == "DECLINED" {
			return errors.New("offer already declined")
		}
		return fmt.Errorf("order is not in READY state (current: %s)", status)
	}

	const logSQL = `
		INSERT INTO order_status_timeline (order_id, status, changed_by, note)
		SELECT $1, status, $2, $3 FROM orders WHERE id = $1
	`
	_, err = r.db.Exec(ctx, logSQL, orderID, actorID, reason)
	return err
}

// GetCourierTargetMinutes reads the admin-configured SLA window from
// system_settings. Falls back to a sensible default if the row is missing
// or malformed so the courier UI always has a usable number.
func (r *Repository) GetCourierTargetMinutes(ctx context.Context) (int, error) {
	const defaultMinutes = 30
	var raw []byte
	err := r.db.QueryRow(ctx,
		`SELECT value FROM system_settings WHERE key = 'delivery.courier_target_minutes'`,
	).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return defaultMinutes, nil
	}
	if err != nil {
		return defaultMinutes, err
	}
	var minutes int
	if err := json.Unmarshal(raw, &minutes); err != nil || minutes <= 0 {
		return defaultMinutes, nil
	}
	return minutes, nil
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

type DailySalesPoint struct {
	Date       string  `json:"date"`
	Revenue    float64 `json:"revenue"`
	OrderCount int64   `json:"order_count"`
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
			o.assigned_courier_id::text,
			NULLIF(TRIM(CONCAT_WS(' ', cr.first_name, cr.last_name)), ''),
			o.created_at
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id
		LEFT JOIN spots s ON s.id = o.spot_id
		LEFT JOIN employees cr ON cr.id = o.assigned_courier_id
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
			&item.AssignedCourierID,
			&item.AssignedCourierName,
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

// GetDailySales returns a time-series of revenue and order counts for the last N days.
// Dates are returned in ascending order (oldest first). Days without orders are
// filled with zero values so the chart always shows a contiguous range.
func (r *Repository) GetDailySales(ctx context.Context, days int) ([]DailySalesPoint, error) {
	if days < 1 {
		days = 7
	}
	if days > 365 {
		days = 365
	}

	q := `
		WITH series AS (
			SELECT generate_series(
				CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day',
				CURRENT_DATE,
				INTERVAL '1 day'
			)::date AS day
		),
		daily AS (
			SELECT
				date_trunc('day', created_at)::date AS day,
				COALESCE(SUM(total_amount), 0)::double precision AS revenue,
				COUNT(*)::bigint AS order_count
			FROM orders
			WHERE created_at >= CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day'
			AND deleted_at IS NULL
			AND status NOT IN ('CANCELLED', 'REJECTED')
			GROUP BY 1
		)
		SELECT
			to_char(s.day, 'YYYY-MM-DD') AS date,
			COALESCE(d.revenue, 0)::double precision AS revenue,
			COALESCE(d.order_count, 0)::bigint AS order_count
		FROM series s
		LEFT JOIN daily d ON d.day = s.day
		ORDER BY s.day ASC
	`

	rows, err := r.db.Query(ctx, q, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := make([]DailySalesPoint, 0, days)
	for rows.Next() {
		var p DailySalesPoint
		if err := rows.Scan(&p.Date, &p.Revenue, &p.OrderCount); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, rows.Err()
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
