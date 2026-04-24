package orders

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"sushimei/backend/internal/platform/realtime"
)

type pricingProduct struct {
	ID         string
	CategoryID string
	NameI18n   map[string]string
	BasePrice  float64
	IsActive   bool
}

type pricingSpot struct {
	ID           string
	Code         string
	Name         string
	DeliveryFee  float64
	MinimumOrder float64
	IsActive     bool
}

type pricingCustomer struct {
	ID           string
	FirstName    string
	LastName     string
	Phone        string
	BonusBalance int
}

type pricingPromo struct {
	ID                   string
	Code                 string
	RewardType           string
	AppliesTo            string
	DiscountType         string
	DiscountValue        float64
	MinOrderAmount       *float64
	MaxDiscountAmount    *float64
	BonusPoints          *int
	BonusProductID       *string
	BonusProductName     *string
	BonusProductQuantity int
	CategoryIDs          []string
	ProductIDs           []string
	SpotIDs              []string
	TotalUsageLimit      *int
	PerUserUsageLimit    *int
	ValidFrom            *time.Time
	ValidTo              *time.Time
	IsActive             bool
	UsageCount           int
}

type pricingBonusRule struct {
	ID              string
	IsActive        bool
	EarnPercent     float64
	SpendRate       float64
	MinOrderToEarn  float64
	MaxSpendPercent float64
	ExpiresInDays   *int
}

type pricedOrderContext struct {
	customer         *pricingCustomer
	spot             *pricingSpot
	promo            *pricingPromo
	bonusRule        *pricingBonusRule
	pricing          *PricingResponse
	promoUsageCount  int
	bonusPointsPromo int
}

func (s *Service) Preview(ctx context.Context, customerID string, req UpsertOrderRequest) (*PricingResponse, error) {
	priced, err := s.priceOrder(ctx, customerID, req)
	if err != nil {
		return nil, err
	}
	return priced.pricing, nil
}

func (s *Service) Create(ctx context.Context, customerID, createdByEmployeeID string, req UpsertOrderRequest) (*CreateOrderResponse, error) {
	priced, err := s.priceOrder(ctx, customerID, req)
	if err != nil {
		return nil, err
	}

	orderID, orderNumber, err := s.repo.CreatePricedOrder(ctx, priced, createdByEmployeeID, req)
	if err != nil {
		return nil, err
	}

	if s.hub != nil && priced.spot != nil {
		event := realtime.Event{
			Type:    realtime.EventOrderCreated,
			OrderID: orderID,
			Status:  "RECEIVED",
		}
		s.hub.PublishSpot(priced.spot.ID, event)
		if priced.customer != nil {
			s.hub.PublishCustomer(priced.customer.ID, event)
		}
	}

	return &CreateOrderResponse{
		OrderID:     orderID,
		OrderNumber: orderNumber,
		Pricing:     priced.pricing,
	}, nil
}

func (s *Service) priceOrder(ctx context.Context, customerID string, req UpsertOrderRequest) (*pricedOrderContext, error) {
	req.SpotID = strings.TrimSpace(req.SpotID)
	req.OrderType = strings.ToUpper(strings.TrimSpace(req.OrderType))
	req.PaymentType = strings.ToUpper(strings.TrimSpace(req.PaymentType))
	req.CustomerName = strings.TrimSpace(req.CustomerName)
	req.CustomerPhone = strings.TrimSpace(req.CustomerPhone)
	req.PromoCode = strings.ToUpper(strings.TrimSpace(req.PromoCode))
	req.Notes = strings.TrimSpace(req.Notes)

	if req.SpotID == "" {
		return nil, errors.New("spot_id is required")
	}
	if req.OrderType != "DELIVERY" && req.OrderType != "PICKUP" && req.OrderType != "WALK_IN" {
		return nil, errors.New("order_type must be DELIVERY, PICKUP or WALK_IN")
	}
	if req.PaymentType != "CARD" && req.PaymentType != "CASH" {
		return nil, errors.New("payment_type must be CARD or CASH")
	}
	if len(req.Items) == 0 {
		return nil, errors.New("at least one order item is required")
	}
	if req.BonusPointsToSpend < 0 {
		return nil, errors.New("bonus_points_to_spend cannot be negative")
	}

	spot, err := s.repo.GetSpotForPricing(ctx, req.SpotID)
	if err != nil {
		return nil, err
	}
	if !spot.IsActive {
		return nil, errors.New("spot is inactive")
	}

	var customer *pricingCustomer
	if customerID != "" {
		customer, err = s.repo.GetCustomerForPricing(ctx, customerID)
		if err != nil {
			return nil, err
		}
	}

	productIDs := make([]string, 0, len(req.Items))
	productIDSeen := make(map[string]struct{}, len(req.Items))
	for _, item := range req.Items {
		item.ProductID = strings.TrimSpace(item.ProductID)
		if item.ProductID == "" {
			return nil, errors.New("product_id is required for each item")
		}
		if item.Quantity <= 0 {
			return nil, errors.New("quantity must be greater than 0")
		}
		if _, ok := productIDSeen[item.ProductID]; ok {
			continue
		}
		productIDSeen[item.ProductID] = struct{}{}
		productIDs = append(productIDs, item.ProductID)
	}

	products, err := s.repo.GetProductsForPricing(ctx, productIDs)
	if err != nil {
		return nil, err
	}

	pricingItems := make([]PricingItem, 0, len(req.Items)+1)
	for _, item := range req.Items {
		product, ok := products[item.ProductID]
		if !ok {
			return nil, fmt.Errorf("product not found: %s", item.ProductID)
		}
		if !product.IsActive {
			return nil, fmt.Errorf("product is inactive: %s", item.ProductID)
		}
		lineTotal := roundCurrency(product.BasePrice * float64(item.Quantity))
		pricingItems = append(pricingItems, PricingItem{
			ProductID:   product.ID,
			ProductName: product.NameI18n,
			Quantity:    item.Quantity,
			UnitPrice:   roundCurrency(product.BasePrice),
			LineTotal:   lineTotal,
		})
	}

	subtotal := 0.0
	for _, item := range pricingItems {
		subtotal += item.LineTotal
	}
	subtotal = roundCurrency(subtotal)

	if spot.MinimumOrder > 0 && subtotal < spot.MinimumOrder {
		return nil, fmt.Errorf("minimum order amount is %.2f", spot.MinimumOrder)
	}

	var (
		promo           *pricingPromo
		promoUsageCount int
	)
	if req.PromoCode != "" {
		promo, err = s.repo.GetPromoByCode(ctx, req.PromoCode)
		if err != nil {
			return nil, err
		}
		if !promo.IsActive {
			return nil, errors.New("promo code is inactive")
		}
		now := time.Now().UTC()
		if promo.ValidFrom != nil && promo.ValidFrom.After(now) {
			return nil, errors.New("promo code is not active yet")
		}
		if promo.ValidTo != nil && promo.ValidTo.Before(now) {
			return nil, errors.New("promo code has expired")
		}
		if promo.MinOrderAmount != nil && subtotal < *promo.MinOrderAmount {
			return nil, fmt.Errorf("promo code requires minimum order of %.2f", *promo.MinOrderAmount)
		}
		if len(promo.SpotIDs) > 0 && !containsString(promo.SpotIDs, req.SpotID) {
			return nil, errors.New("promo code is not valid for this branch")
		}
		if promo.TotalUsageLimit != nil && promo.UsageCount >= *promo.TotalUsageLimit {
			return nil, errors.New("promo code usage limit reached")
		}
		if promo.PerUserUsageLimit != nil {
			if customer == nil {
				return nil, errors.New("promo code requires authenticated customer")
			}
			promoUsageCount, err = s.repo.GetCustomerPromoUsageCount(ctx, promo.ID, customer.ID)
			if err != nil {
				return nil, err
			}
			if promoUsageCount >= *promo.PerUserUsageLimit {
				return nil, errors.New("promo code per-user usage limit reached")
			}
		}
	}

	promoDiscountAmount := 0.0
	if promo != nil && promo.RewardType == "DISCOUNT" {
		eligibleIndices := make([]int, 0, len(pricingItems))
		for idx, item := range pricingItems {
			if promo.AppliesTo == "ORDER" || isPromoEligibleForProduct(promo, products[item.ProductID]) {
				eligibleIndices = append(eligibleIndices, idx)
			}
		}
		if promo.AppliesTo == "PRODUCT" && len(eligibleIndices) == 0 {
			return nil, errors.New("promo code does not match any products in the cart")
		}
		eligibleSubtotal := 0.0
		for _, idx := range eligibleIndices {
			eligibleSubtotal += pricingItems[idx].LineTotal
		}
		promoDiscountAmount = calculateDiscount(promo.DiscountType, promo.DiscountValue, eligibleSubtotal, promo.MaxDiscountAmount)
		promoDiscountAmount = allocateDiscountAcrossItems(pricingItems, eligibleIndices, promoDiscountAmount)
	}

	bonusProductPromoPoints := 0
	if promo != nil && promo.RewardType == "BONUS_POINTS" && promo.BonusPoints != nil {
		bonusProductPromoPoints = *promo.BonusPoints
	}

	if promo != nil && promo.RewardType == "BONUS_PRODUCT" && promo.BonusProductID != nil {
		bonusProduct, ok := products[*promo.BonusProductID]
		if !ok {
			bonusProductMap, err := s.repo.GetProductsForPricing(ctx, []string{*promo.BonusProductID})
			if err != nil {
				return nil, err
			}
			var exists bool
			bonusProduct, exists = bonusProductMap[*promo.BonusProductID]
			if !exists {
				return nil, errors.New("bonus product not found")
			}
		}
		pricingItems = append(pricingItems, PricingItem{
			ProductID:      bonusProduct.ID,
			ProductName:    bonusProduct.NameI18n,
			Quantity:       promo.BonusProductQuantity,
			UnitPrice:      0,
			LineTotal:      0,
			IsBonusProduct: true,
		})
	}

	deliveryFee := 0.0
	if req.OrderType == "DELIVERY" {
		deliveryFee = roundCurrency(spot.DeliveryFee)
	}

	preBonusTotal := roundCurrency(subtotal - promoDiscountAmount + deliveryFee)

	bonusRule, err := s.repo.GetActiveBonusRule(ctx)
	if err != nil {
		return nil, err
	}

	bonusPointsSpent := 0
	bonusSpentAmount := 0.0
	if req.BonusPointsToSpend > 0 {
		if customer == nil {
			return nil, errors.New("bonus spending requires authenticated customer")
		}
		if bonusRule == nil || !bonusRule.IsActive {
			return nil, errors.New("bonus spending is not configured")
		}
		maxSpendAmount := roundCurrency(preBonusTotal * bonusRule.MaxSpendPercent / 100)
		maxSpendPoints := int(math.Floor(maxSpendAmount * bonusRule.SpendRate))
		bonusPointsSpent = minInt(req.BonusPointsToSpend, customer.BonusBalance, maxSpendPoints)
		if bonusPointsSpent <= 0 {
			return nil, errors.New("requested bonus amount exceeds allowed spend limit")
		}
		bonusSpentAmount = roundCurrency(float64(bonusPointsSpent) / bonusRule.SpendRate)
		if bonusSpentAmount > preBonusTotal {
			bonusSpentAmount = preBonusTotal
			bonusPointsSpent = int(math.Floor(preBonusTotal * bonusRule.SpendRate))
		}
	}

	totalAmount := roundCurrency(preBonusTotal - bonusSpentAmount)
	if totalAmount < 0 {
		totalAmount = 0
	}

	bonusEarnedPoints := bonusProductPromoPoints
	if bonusRule != nil && bonusRule.IsActive && totalAmount >= bonusRule.MinOrderToEarn {
		bonusEarnedPoints += int(math.Floor(totalAmount * bonusRule.EarnPercent / 100))
	}

	var appliedPromo *AppliedPromo
	if promo != nil {
		appliedPromo = &AppliedPromo{
			ID:                   promo.ID,
			Code:                 promo.Code,
			RewardType:           promo.RewardType,
			AppliesTo:            promo.AppliesTo,
			DiscountAmount:       promoDiscountAmount,
			BonusPoints:          bonusProductPromoPoints,
			BonusProductID:       promo.BonusProductID,
			BonusProductName:     promo.BonusProductName,
			BonusProductQuantity: promo.BonusProductQuantity,
		}
	}

	return &pricedOrderContext{
		customer:        customer,
		spot:            spot,
		promo:           promo,
		bonusRule:       bonusRule,
		promoUsageCount: promoUsageCount,
		pricing: &PricingResponse{
			Items:               pricingItems,
			SubtotalAmount:      subtotal,
			PromoDiscountAmount: promoDiscountAmount,
			BonusSpentAmount:    bonusSpentAmount,
			BonusPointsSpent:    bonusPointsSpent,
			DeliveryFeeAmount:   deliveryFee,
			TotalAmount:         totalAmount,
			BonusEarnedPoints:   bonusEarnedPoints,
			AppliedPromo:        appliedPromo,
		},
	}, nil
}

func (r *Repository) GetSpotForPricing(ctx context.Context, spotID string) (*pricingSpot, error) {
	const sql = `
		SELECT id::text, code, name, delivery_fee::double precision, minimum_order::double precision, is_active
		FROM spots
		WHERE id = $1 AND deleted_at IS NULL
	`
	var spot pricingSpot
	if err := r.db.QueryRow(ctx, sql, spotID).Scan(&spot.ID, &spot.Code, &spot.Name, &spot.DeliveryFee, &spot.MinimumOrder, &spot.IsActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("spot not found")
		}
		return nil, err
	}
	return &spot, nil
}

func (r *Repository) GetCustomerForPricing(ctx context.Context, customerID string) (*pricingCustomer, error) {
	const sql = `
		SELECT id::text, COALESCE(first_name, ''), COALESCE(last_name, ''), phone, bonus_balance
		FROM customers
		WHERE id = $1 AND deleted_at IS NULL
	`
	var customer pricingCustomer
	if err := r.db.QueryRow(ctx, sql, customerID).Scan(&customer.ID, &customer.FirstName, &customer.LastName, &customer.Phone, &customer.BonusBalance); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("customer not found")
		}
		return nil, err
	}
	return &customer, nil
}

func (r *Repository) GetProductsForPricing(ctx context.Context, productIDs []string) (map[string]pricingProduct, error) {
	if len(productIDs) == 0 {
		return map[string]pricingProduct{}, nil
	}

	const sql = `
		SELECT id::text, category_id::text, name_i18n, base_price::double precision, is_active
		FROM products
		WHERE id = ANY($1) AND deleted_at IS NULL
	`

	rows, err := r.db.Query(ctx, sql, productIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make(map[string]pricingProduct, len(productIDs))
	for rows.Next() {
		var (
			product  pricingProduct
			nameJSON []byte
		)
		if err := rows.Scan(&product.ID, &product.CategoryID, &nameJSON, &product.BasePrice, &product.IsActive); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(nameJSON, &product.NameI18n); err != nil {
			product.NameI18n = map[string]string{}
		}
		products[product.ID] = product
	}
	return products, rows.Err()
}

func (r *Repository) GetPromoByCode(ctx context.Context, code string) (*pricingPromo, error) {
	const sql = `
		SELECT
			pc.id::text,
			pc.code,
			pc.reward_type::text,
			pc.applies_to::text,
			pc.discount_type::text,
			pc.discount_value::double precision,
			pc.min_order_amount::double precision,
			pc.max_discount_amount::double precision,
			pc.bonus_points,
			pc.bonus_product_id::text,
			bp.name_i18n->>'en',
			pc.bonus_product_quantity,
			COALESCE((SELECT ARRAY_AGG(category_id::text ORDER BY category_id::text) FROM promo_code_categories WHERE promo_code_id = pc.id), ARRAY[]::text[]),
			COALESCE((SELECT ARRAY_AGG(product_id::text ORDER BY product_id::text) FROM promo_code_products WHERE promo_code_id = pc.id), ARRAY[]::text[]),
			COALESCE((SELECT ARRAY_AGG(spot_id::text ORDER BY spot_id::text) FROM promo_code_spots WHERE promo_code_id = pc.id), ARRAY[]::text[]),
			pc.total_usage_limit,
			pc.per_user_usage_limit,
			pc.valid_from,
			pc.valid_to,
			pc.is_active,
			COALESCE((SELECT COUNT(*) FROM promo_usages WHERE promo_code_id = pc.id), 0)
		FROM promo_codes pc
		LEFT JOIN products bp ON bp.id = pc.bonus_product_id
		WHERE UPPER(pc.code) = UPPER($1) AND pc.deleted_at IS NULL
	`

	var promo pricingPromo
	if err := r.db.QueryRow(ctx, sql, code).Scan(
		&promo.ID,
		&promo.Code,
		&promo.RewardType,
		&promo.AppliesTo,
		&promo.DiscountType,
		&promo.DiscountValue,
		&promo.MinOrderAmount,
		&promo.MaxDiscountAmount,
		&promo.BonusPoints,
		&promo.BonusProductID,
		&promo.BonusProductName,
		&promo.BonusProductQuantity,
		&promo.CategoryIDs,
		&promo.ProductIDs,
		&promo.SpotIDs,
		&promo.TotalUsageLimit,
		&promo.PerUserUsageLimit,
		&promo.ValidFrom,
		&promo.ValidTo,
		&promo.IsActive,
		&promo.UsageCount,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("promo code not found")
		}
		return nil, err
	}
	return &promo, nil
}

func (r *Repository) GetCustomerPromoUsageCount(ctx context.Context, promoID, customerID string) (int, error) {
	const sql = `SELECT COUNT(*) FROM promo_usages WHERE promo_code_id = $1 AND customer_id = $2`
	var count int
	if err := r.db.QueryRow(ctx, sql, promoID, customerID).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *Repository) GetActiveBonusRule(ctx context.Context) (*pricingBonusRule, error) {
	const sql = `
		SELECT id::text, is_active, earn_percent::double precision, spend_rate::double precision,
		       min_order_to_earn::double precision, max_spend_percent::double precision, expires_in_days
		FROM bonus_rules
		WHERE is_active = TRUE
		ORDER BY created_at DESC
		LIMIT 1
	`
	var rule pricingBonusRule
	if err := r.db.QueryRow(ctx, sql).Scan(
		&rule.ID,
		&rule.IsActive,
		&rule.EarnPercent,
		&rule.SpendRate,
		&rule.MinOrderToEarn,
		&rule.MaxSpendPercent,
		&rule.ExpiresInDays,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &rule, nil
}

func (r *Repository) CreatePricedOrder(ctx context.Context, priced *pricedOrderContext, createdByEmployeeID string, req UpsertOrderRequest) (string, string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", "", err
	}
	defer tx.Rollback(ctx)

	orderID := ""
	orderNumber, err := generateOrderNumber()
	if err != nil {
		return "", "", err
	}

	customerName := req.CustomerName
	customerPhone := req.CustomerPhone
	currentBalance := 0
	if priced.customer != nil {
		var lockedCustomer pricingCustomer
		const customerSQL = `
			SELECT id::text, COALESCE(first_name, ''), COALESCE(last_name, ''), phone, bonus_balance
			FROM customers
			WHERE id = $1 AND deleted_at IS NULL
			FOR UPDATE
		`
		if err := tx.QueryRow(ctx, customerSQL, priced.customer.ID).Scan(
			&lockedCustomer.ID,
			&lockedCustomer.FirstName,
			&lockedCustomer.LastName,
			&lockedCustomer.Phone,
			&lockedCustomer.BonusBalance,
		); err != nil {
			return "", "", err
		}
		currentBalance = lockedCustomer.BonusBalance
		if currentBalance < priced.pricing.BonusPointsSpent {
			return "", "", errors.New("customer bonus balance changed, please refresh the order")
		}
		if customerName == "" {
			customerName = strings.TrimSpace(strings.TrimSpace(lockedCustomer.FirstName + " " + lockedCustomer.LastName))
		}
		if customerPhone == "" {
			customerPhone = lockedCustomer.Phone
		}
	}

	deliveryAddressJSON, _ := json.Marshal(req.DeliveryAddress)
	deliveryLat, deliveryLng := extractCoordinates(req.DeliveryAddress)

	var promoID *string
	if priced.promo != nil {
		promoID = &priced.promo.ID
	}
	var createdBy *string
	if strings.TrimSpace(createdByEmployeeID) != "" {
		createdBy = &createdByEmployeeID
	}

	const insertOrderSQL = `
		INSERT INTO orders (
			order_number, customer_id, spot_id, status, order_type, payment_type,
			customer_name, customer_phone, delivery_address,
			delivery_latitude, delivery_longitude,
			subtotal_amount, promo_discount_amount, bonus_spent_amount,
			delivery_fee_amount, total_amount, promo_code_id, bonus_earned_points,
			notes, created_by_employee_id
		)
		VALUES ($1, $2, $3, 'RECEIVED', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING id::text
	`

	var customerID any
	if priced.customer != nil {
		customerID = priced.customer.ID
	}
	if err := tx.QueryRow(
		ctx,
		insertOrderSQL,
		orderNumber,
		customerID,
		priced.spot.ID,
		req.OrderType,
		req.PaymentType,
		customerName,
		customerPhone,
		deliveryAddressJSON,
		deliveryLat,
		deliveryLng,
		priced.pricing.SubtotalAmount,
		priced.pricing.PromoDiscountAmount,
		priced.pricing.BonusSpentAmount,
		priced.pricing.DeliveryFeeAmount,
		priced.pricing.TotalAmount,
		promoID,
		priced.pricing.BonusEarnedPoints,
		req.Notes,
		createdBy,
	).Scan(&orderID); err != nil {
		return "", "", err
	}

	for _, item := range priced.pricing.Items {
		nameJSON, _ := json.Marshal(item.ProductName)
		const itemSQL = `
			INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total)
			VALUES ($1, $2, $3, $4, $5, $6)
		`
		if _, err := tx.Exec(ctx, itemSQL, orderID, item.ProductID, nameJSON, item.UnitPrice, item.Quantity, item.LineTotal); err != nil {
			return "", "", err
		}
	}

	if priced.customer != nil && priced.promo != nil {
		const promoUsageSQL = `
			INSERT INTO promo_usages (promo_code_id, customer_id, order_id, discount_amount, used_at)
			VALUES ($1, $2, $3, $4, NOW())
		`
		if _, err := tx.Exec(ctx, promoUsageSQL, priced.promo.ID, priced.customer.ID, orderID, priced.pricing.PromoDiscountAmount); err != nil {
			return "", "", err
		}
	}

	if priced.customer != nil {
		balanceAfter := currentBalance
		if priced.pricing.BonusPointsSpent > 0 {
			balanceAfter -= priced.pricing.BonusPointsSpent
			if _, err := tx.Exec(ctx, `UPDATE customers SET bonus_balance = $2, updated_at = NOW() WHERE id = $1`, priced.customer.ID, balanceAfter); err != nil {
				return "", "", err
			}
			if _, err := tx.Exec(
				ctx,
				`INSERT INTO bonus_ledger (customer_id, order_id, txn_type, points, balance_after, reason, created_by) VALUES ($1, $2, 'SPEND', $3, $4, $5, $6)`,
				priced.customer.ID,
				orderID,
				-priced.pricing.BonusPointsSpent,
				balanceAfter,
				fmt.Sprintf("Used for order %s", orderNumber),
				createdBy,
			); err != nil {
				return "", "", err
			}
		}

		if priced.pricing.BonusEarnedPoints > 0 {
			balanceAfter += priced.pricing.BonusEarnedPoints
			if _, err := tx.Exec(ctx, `UPDATE customers SET bonus_balance = $2, updated_at = NOW() WHERE id = $1`, priced.customer.ID, balanceAfter); err != nil {
				return "", "", err
			}

			var expiresAt any
			if priced.bonusRule != nil && priced.bonusRule.ExpiresInDays != nil {
				expiresAt = time.Now().UTC().Add(time.Duration(*priced.bonusRule.ExpiresInDays) * 24 * time.Hour)
			}
			if _, err := tx.Exec(
				ctx,
				`INSERT INTO bonus_ledger (customer_id, order_id, txn_type, points, balance_after, reason, expires_at, created_by) VALUES ($1, $2, 'EARN', $3, $4, $5, $6, $7)`,
				priced.customer.ID,
				orderID,
				priced.pricing.BonusEarnedPoints,
				balanceAfter,
				fmt.Sprintf("Earned from order %s", orderNumber),
				expiresAt,
				createdBy,
			); err != nil {
				return "", "", err
			}
		}
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO order_status_timeline (order_id, status, changed_by, note) VALUES ($1, 'RECEIVED', $2, $3)`,
		orderID,
		createdBy,
		"Order created",
	); err != nil {
		return "", "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", "", err
	}
	return orderID, orderNumber, nil
}

func isPromoEligibleForProduct(promo *pricingPromo, product pricingProduct) bool {
	if promo == nil {
		return false
	}
	if len(promo.ProductIDs) == 0 && len(promo.CategoryIDs) == 0 {
		return true
	}
	return containsString(promo.ProductIDs, product.ID) || containsString(promo.CategoryIDs, product.CategoryID)
}

func calculateDiscount(discountType string, discountValue, base float64, maxDiscountAmount *float64) float64 {
	if base <= 0 {
		return 0
	}
	discount := 0.0
	if discountType == "PERCENT" {
		discount = base * discountValue / 100
	} else {
		discount = discountValue
	}
	if maxDiscountAmount != nil && discount > *maxDiscountAmount {
		discount = *maxDiscountAmount
	}
	if discount > base {
		discount = base
	}
	return roundCurrency(discount)
}

func allocateDiscountAcrossItems(items []PricingItem, eligibleIndices []int, totalDiscount float64) float64 {
	if totalDiscount <= 0 || len(eligibleIndices) == 0 {
		return 0
	}

	eligibleSubtotal := 0.0
	for _, idx := range eligibleIndices {
		eligibleSubtotal += items[idx].LineTotal
	}
	if eligibleSubtotal <= 0 {
		return 0
	}

	allocated := 0.0
	for i, idx := range eligibleIndices {
		share := 0.0
		if i == len(eligibleIndices)-1 {
			share = roundCurrency(totalDiscount - allocated)
		} else {
			share = roundCurrency(totalDiscount * (items[idx].LineTotal / eligibleSubtotal))
			allocated += share
		}
		items[idx].DiscountAmount = share
	}

	return roundCurrency(totalDiscount)
}

func roundCurrency(value float64) float64 {
	return math.Round(value*100) / 100
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func minInt(values ...int) int {
	if len(values) == 0 {
		return 0
	}
	current := values[0]
	for _, value := range values[1:] {
		if value < current {
			current = value
		}
	}
	return current
}

// extractCoordinates pulls latitude/longitude from the delivery_address payload.
// Customer/staff apps may send them as floats or strings under multiple key aliases.
func extractCoordinates(addr map[string]any) (any, any) {
	if len(addr) == 0 {
		return nil, nil
	}
	lat := readCoord(addr, "latitude", "lat")
	lng := readCoord(addr, "longitude", "lng", "lon")
	if lat == nil || lng == nil {
		return nil, nil
	}
	return lat, lng
}

func readCoord(addr map[string]any, keys ...string) any {
	for _, k := range keys {
		raw, ok := addr[k]
		if !ok || raw == nil {
			continue
		}
		switch v := raw.(type) {
		case float64:
			return v
		case float32:
			return float64(v)
		case int:
			return float64(v)
		case int64:
			return float64(v)
		case string:
			trimmed := strings.TrimSpace(v)
			if trimmed == "" {
				continue
			}
			f, err := strconv.ParseFloat(trimmed, 64)
			if err == nil {
				return f
			}
		}
	}
	return nil
}

func generateOrderNumber() (string, error) {
	var suffix [3]byte
	if _, err := rand.Read(suffix[:]); err != nil {
		return "", err
	}
	return fmt.Sprintf("ORD-%s-%s", time.Now().UTC().Format("20060102150405"), strings.ToUpper(hex.EncodeToString(suffix[:]))), nil
}
