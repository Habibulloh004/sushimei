package employees

import (
	"context"
	"errors"
	"fmt"
	"strings"

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

func (r *Repository) List(ctx context.Context, params pagination.ListParams, includeInactive bool) ([]ListItem, int64, error) {
	base := sq.Select().
		PlaceholderFormat(sq.Dollar).
		From("employees e").
		LeftJoin("roles r ON r.code = e.role_code").
		LeftJoin("spots s ON s.id = e.spot_id").
		Where(sq.Eq{"e.deleted_at": nil})

	if !includeInactive {
		base = base.Where(sq.Eq{"e.is_active": true})
	}
	if params.Search != "" {
		like := "%" + params.Search + "%"
		base = base.Where(sq.Or{
			sq.Expr("e.email ILIKE ?", like),
			sq.Expr("e.phone ILIKE ?", like),
			sq.Expr("CONCAT_WS(' ', e.first_name, e.last_name) ILIKE ?", like),
		})
	}
	if params.Status != "" {
		base = base.Where(sq.Eq{"e.status": params.Status})
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
			"e.id::text",
			"e.role_code",
			"COALESCE(r.title, e.role_code)",
			"e.spot_id::text",
			"s.name",
			"e.email",
			"e.phone",
			"e.avatar_url",
			"e.first_name",
			"e.last_name",
			"e.status",
			"e.is_active",
			"e.last_login_at",
			"e.created_at",
		).
		OrderBy("e.created_at DESC").
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
			&item.RoleCode,
			&item.RoleTitle,
			&item.SpotID,
			&item.SpotName,
			&item.Email,
			&item.Phone,
			&item.AvatarURL,
			&item.FirstName,
			&item.LastName,
			&item.Status,
			&item.IsActive,
			&item.LastLoginAt,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}

	return items, total, rows.Err()
}

func (r *Repository) GetByID(ctx context.Context, id string) (*DetailItem, error) {
	sql := `
		SELECT e.id::text, e.role_code, COALESCE(r.title, e.role_code),
		       e.spot_id::text, s.name, e.email, e.phone, e.avatar_url,
		       e.first_name, e.last_name, e.status, e.is_active,
		       e.last_login_at, e.created_at
		FROM employees e
		LEFT JOIN roles r ON r.code = e.role_code
		LEFT JOIN spots s ON s.id = e.spot_id
		WHERE e.id = $1 AND e.deleted_at IS NULL
	`

	var item DetailItem
	err := r.db.QueryRow(ctx, sql, id).Scan(
		&item.ID, &item.RoleCode, &item.RoleTitle,
		&item.SpotID, &item.SpotName, &item.Email, &item.Phone, &item.AvatarURL,
		&item.FirstName, &item.LastName, &item.Status, &item.IsActive,
		&item.LastLoginAt, &item.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("employee not found")
	}
	if err != nil {
		return nil, err
	}

	item.Spots, _ = r.getEmployeeSpots(ctx, id)

	return &item, nil
}

func (r *Repository) getEmployeeSpots(ctx context.Context, employeeID string) ([]SpotItem, error) {
	sql := `
		SELECT s.id::text, s.code, s.name
		FROM spots s
		JOIN employee_spots es ON es.spot_id = s.id
		WHERE es.employee_id = $1 AND s.deleted_at IS NULL
		ORDER BY s.name ASC
	`

	rows, err := r.db.Query(ctx, sql, employeeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	spots := make([]SpotItem, 0)
	for rows.Next() {
		var s SpotItem
		if err := rows.Scan(&s.ID, &s.Code, &s.Name); err != nil {
			return nil, err
		}
		spots = append(spots, s)
	}
	return spots, nil
}

func (r *Repository) Create(ctx context.Context, req CreateRequest, passwordHash string) (string, error) {
	sql := `
		INSERT INTO employees (role_code, spot_id, email, phone, avatar_url, first_name, last_name, password_hash)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id::text
	`

	var avatarURL any
	if req.AvatarURL != nil {
		trimmed := strings.TrimSpace(*req.AvatarURL)
		if trimmed != "" {
			avatarURL = trimmed
		}
	}

	var id string
	err := r.db.QueryRow(ctx, sql, req.RoleCode, req.SpotID, req.Email, req.Phone, avatarURL, req.FirstName, req.LastName, passwordHash).Scan(&id)
	return id, err
}

func (r *Repository) Update(ctx context.Context, id string, req UpdateRequest, passwordHash *string) error {
	builder := sq.Update("employees").
		PlaceholderFormat(sq.Dollar).
		Set("updated_at", sq.Expr("NOW()")).
		Where(sq.Eq{"id": id, "deleted_at": nil})

	if req.RoleCode != nil {
		builder = builder.Set("role_code", *req.RoleCode)
	}
	if req.SpotID != nil {
		builder = builder.Set("spot_id", *req.SpotID)
	}
	if req.Email != nil {
		builder = builder.Set("email", *req.Email)
	}
	if req.Phone != nil {
		builder = builder.Set("phone", *req.Phone)
	}
	if req.AvatarURL != nil {
		trimmed := strings.TrimSpace(*req.AvatarURL)
		if trimmed == "" {
			builder = builder.Set("avatar_url", nil)
		} else {
			builder = builder.Set("avatar_url", trimmed)
		}
	}
	if req.FirstName != nil {
		builder = builder.Set("first_name", *req.FirstName)
	}
	if req.LastName != nil {
		builder = builder.Set("last_name", *req.LastName)
	}
	if passwordHash != nil {
		builder = builder.Set("password_hash", *passwordHash)
	}
	if req.Status != nil {
		builder = builder.Set("status", *req.Status)
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
		return fmt.Errorf("employee not found")
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	sql := `UPDATE employees SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("employee not found")
	}
	return nil
}

func (r *Repository) ListCouriers(ctx context.Context, spotID string, onlyOnDuty bool) ([]ListItem, error) {
	base := sq.Select(
		"e.id::text",
		"e.role_code",
		"COALESCE(r.title, e.role_code)",
		"e.spot_id::text",
		"s.name",
		"e.email",
		"e.phone",
		"e.avatar_url",
		"e.first_name",
		"e.last_name",
		"e.status",
		"e.is_active",
		"e.on_duty",
		"e.last_login_at",
		"e.created_at",
	).
		PlaceholderFormat(sq.Dollar).
		From("employees e").
		LeftJoin("roles r ON r.code = e.role_code").
		LeftJoin("spots s ON s.id = e.spot_id").
		Where(sq.Eq{"e.role_code": "COURIER", "e.deleted_at": nil, "e.is_active": true}).
		OrderBy("e.on_duty DESC, e.first_name ASC NULLS LAST, e.last_name ASC NULLS LAST")

	if spotID != "" {
		base = base.Where(sq.Or{sq.Eq{"e.spot_id": spotID}, sq.Eq{"e.spot_id": nil}})
	}
	if onlyOnDuty {
		base = base.Where(sq.Eq{"e.on_duty": true})
	}

	sqlStr, args, err := base.ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, sqlStr, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ListItem, 0)
	for rows.Next() {
		var item ListItem
		if err := rows.Scan(
			&item.ID,
			&item.RoleCode,
			&item.RoleTitle,
			&item.SpotID,
			&item.SpotName,
			&item.Email,
			&item.Phone,
			&item.AvatarURL,
			&item.FirstName,
			&item.LastName,
			&item.Status,
			&item.IsActive,
			&item.OnDuty,
			&item.LastLoginAt,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) SetOnDuty(ctx context.Context, employeeID string, onDuty bool) error {
	const q = `
		UPDATE employees
		SET on_duty = $2, on_duty_changed_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`
	tag, err := r.db.Exec(ctx, q, employeeID, onDuty)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("employee not found")
	}
	return nil
}

func (r *Repository) GetOnDuty(ctx context.Context, employeeID string) (bool, error) {
	var onDuty bool
	err := r.db.QueryRow(ctx, `SELECT on_duty FROM employees WHERE id = $1 AND deleted_at IS NULL`, employeeID).Scan(&onDuty)
	return onDuty, err
}
