package auth

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrCustomerPhoneExists = errors.New("customer phone already exists")
var ErrCustomerAlreadyExists = errors.New("customer already exists")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

type Customer struct {
	ID           string
	Phone        string
	Status       string
	PasswordHash string
}

type Employee struct {
	ID           string
	Email        string
	PasswordHash string
	RoleCode     string
	SpotID       *string
	IsActive     bool
}

func (r *Repository) GetCustomerByPhone(ctx context.Context, phone string) (*Customer, error) {
	q := `
		SELECT id::text, phone, status, COALESCE(password_hash, '')
		FROM customers
		WHERE phone = $1 AND deleted_at IS NULL
	`

	var c Customer
	err := r.db.QueryRow(ctx, q, phone).Scan(&c.ID, &c.Phone, &c.Status, &c.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) CreateCustomer(ctx context.Context, phone string) (*Customer, error) {
	q := `
		INSERT INTO customers (phone, status)
		VALUES ($1, 'ACTIVE')
		RETURNING id::text, phone, status, COALESCE(password_hash, '')
	`

	var c Customer
	if err := r.db.QueryRow(ctx, q, phone).Scan(&c.ID, &c.Phone, &c.Status, &c.PasswordHash); err != nil {
		if isCustomerPhoneConflict(err) {
			return nil, ErrCustomerPhoneExists
		}
		return nil, err
	}
	return &c, nil
}

func (r *Repository) CreateCustomerWithPassword(ctx context.Context, phone, passwordHash string) (*Customer, error) {
	q := `
		INSERT INTO customers (phone, status, password_hash)
		VALUES ($1, 'ACTIVE', $2)
		RETURNING id::text, phone, status, COALESCE(password_hash, '')
	`

	var c Customer
	if err := r.db.QueryRow(ctx, q, phone, passwordHash).Scan(&c.ID, &c.Phone, &c.Status, &c.PasswordHash); err != nil {
		if isCustomerPhoneConflict(err) {
			return nil, ErrCustomerPhoneExists
		}
		return nil, err
	}
	return &c, nil
}

func (r *Repository) SetCustomerPassword(ctx context.Context, customerID, passwordHash string) error {
	q := `
		UPDATE customers
		SET password_hash = $2, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, q, customerID, passwordHash)
	return err
}

func (r *Repository) RestoreSoftDeletedCustomerWithPassword(ctx context.Context, phone, passwordHash string) (*Customer, error) {
	q := `
		UPDATE customers
		SET deleted_at = NULL,
		    status = 'ACTIVE',
		    password_hash = $2,
		    updated_at = NOW()
		WHERE phone = $1
		  AND deleted_at IS NOT NULL
		RETURNING id::text, phone, status, COALESCE(password_hash, '')
	`

	var c Customer
	err := r.db.QueryRow(ctx, q, phone, passwordHash).Scan(&c.ID, &c.Phone, &c.Status, &c.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) GetEmployeeByEmail(ctx context.Context, email string) (*Employee, error) {
	q := `
		SELECT id::text, email, password_hash, role_code, spot_id::text, is_active
		FROM employees
		WHERE email = $1 AND deleted_at IS NULL
	`

	var e Employee
	if err := r.db.QueryRow(ctx, q, email).Scan(&e.ID, &e.Email, &e.PasswordHash, &e.RoleCode, &e.SpotID, &e.IsActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &e, nil
}

func (r *Repository) InsertRefreshToken(ctx context.Context, userID, role, tokenHash string, expiresAt time.Time) error {
	q := `
		INSERT INTO refresh_tokens (user_id, role_code, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)
	`
	_, err := r.db.Exec(ctx, q, userID, role, tokenHash, expiresAt)
	return err
}

func (r *Repository) IsRefreshTokenValid(ctx context.Context, userID, tokenHash string) (bool, error) {
	q := `
		SELECT EXISTS (
			SELECT 1
			FROM refresh_tokens
			WHERE user_id = $1
			  AND token_hash = $2
			  AND revoked_at IS NULL
			  AND expires_at > NOW()
		)
	`

	var exists bool
	if err := r.db.QueryRow(ctx, q, userID, tokenHash).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func (r *Repository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	q := `
		UPDATE refresh_tokens
		SET revoked_at = NOW()
		WHERE token_hash = $1 AND revoked_at IS NULL
	`
	_, err := r.db.Exec(ctx, q, tokenHash)
	return err
}

func isCustomerPhoneConflict(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}

	return pgErr.Code == "23505" && pgErr.ConstraintName == "customers_phone_key"
}
