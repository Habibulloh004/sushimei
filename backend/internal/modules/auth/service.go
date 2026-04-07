package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"sushimei/backend/internal/platform/rbac"
	"sushimei/backend/internal/platform/security"
)

type OTPStore interface {
	Set(phone, code string, ttl time.Duration)
	Verify(phone, code string) error
}

type Service struct {
	repo         *Repository
	tokenManager *security.TokenManager
	otpStore     OTPStore
	appEnv       string
}

func NewService(repo *Repository, tokenManager *security.TokenManager, otpStore OTPStore, appEnv string) *Service {
	return &Service{repo: repo, tokenManager: tokenManager, otpStore: otpStore, appEnv: appEnv}
}

func (s *Service) RequestOTP(ctx context.Context, phone string) (OTPResponse, error) {
	phone = normalizePhone(phone)
	if phone == "" {
		return OTPResponse{}, errors.New("phone is required")
	}

	code, err := generateOTP()
	if err != nil {
		return OTPResponse{}, err
	}

	s.otpStore.Set(phone, code, 2*time.Minute)

	resp := OTPResponse{Message: "OTP sent successfully"}
	if strings.ToLower(s.appEnv) != "production" {
		resp.OTPCode = code
		resp.Debug = map[string]string{"otp": code}
	}
	return resp, nil
}

func (s *Service) VerifyCustomerOTP(ctx context.Context, phone, code string) (*TokenPairResponse, error) {
	phone = normalizePhone(phone)
	code = strings.TrimSpace(code)
	if phone == "" || code == "" {
		return nil, errors.New("phone and code are required")
	}

	if err := s.otpStore.Verify(phone, code); err != nil {
		return nil, err
	}

	customer, err := s.repo.GetCustomerByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}
	if customer == nil {
		customer, err = s.repo.CreateCustomer(ctx, phone)
		if err != nil {
			if errors.Is(err, ErrCustomerPhoneExists) {
				customer, err = s.repo.GetCustomerByPhone(ctx, phone)
				if err != nil {
					return nil, err
				}
				if customer == nil {
					return nil, ErrCustomerAlreadyExists
				}
			} else {
				return nil, err
			}
		}
	}

	return s.issueCustomerTokens(ctx, customer.ID)
}

func (s *Service) CustomerLogin(ctx context.Context, phone, password string) (*TokenPairResponse, error) {
	phone = normalizePhone(phone)
	password = strings.TrimSpace(password)
	if phone == "" || password == "" {
		return nil, errors.New("phone and password are required")
	}

	customer, err := s.repo.GetCustomerByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}
	if customer == nil {
		return nil, errors.New("customer not found")
	}
	if customer.Status != "ACTIVE" {
		return nil, errors.New("customer account is not active")
	}
	if strings.TrimSpace(customer.PasswordHash) == "" {
		return nil, errors.New("customer password not set")
	}
	if !security.CheckPassword(customer.PasswordHash, password) {
		return nil, errors.New("invalid credentials")
	}

	return s.issueCustomerTokens(ctx, customer.ID)
}

func (s *Service) CustomerRegister(ctx context.Context, phone, password string) (*TokenPairResponse, error) {
	phone = normalizePhone(phone)
	password = strings.TrimSpace(password)
	if phone == "" || password == "" {
		return nil, errors.New("phone and password are required")
	}
	if len(password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	passwordHash, err := security.HashPassword(password)
	if err != nil {
		return nil, err
	}

	customer, err := s.repo.GetCustomerByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}
	createdWithPassword := false

	if customer == nil {
		customer, err = s.repo.CreateCustomerWithPassword(ctx, phone, passwordHash)
		if err != nil {
			if !errors.Is(err, ErrCustomerPhoneExists) {
				return nil, err
			}

			restoredCustomer, restoreErr := s.repo.RestoreSoftDeletedCustomerWithPassword(ctx, phone, passwordHash)
			if restoreErr != nil {
				return nil, restoreErr
			}
			if restoredCustomer != nil {
				return s.issueCustomerTokens(ctx, restoredCustomer.ID)
			}

			customer, err = s.repo.GetCustomerByPhone(ctx, phone)
			if err != nil {
				return nil, err
			}
			if customer == nil {
				return nil, ErrCustomerAlreadyExists
			}
		} else {
			createdWithPassword = true
		}
	}

	if createdWithPassword {
		return s.issueCustomerTokens(ctx, customer.ID)
	}

	if strings.TrimSpace(customer.PasswordHash) != "" {
		return nil, ErrCustomerAlreadyExists
	}
	if customer.Status != "ACTIVE" {
		return nil, errors.New("customer account is not active")
	}
	if err := s.repo.SetCustomerPassword(ctx, customer.ID, passwordHash); err != nil {
		return nil, err
	}

	return s.issueCustomerTokens(ctx, customer.ID)
}

func (s *Service) EmployeeLogin(ctx context.Context, email, password string) (*TokenPairResponse, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	password = strings.TrimSpace(password)
	if email == "" || password == "" {
		return nil, errors.New("email and password are required")
	}

	employee, err := s.repo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil || !employee.IsActive {
		return nil, errors.New("invalid credentials")
	}

	if !security.CheckPassword(employee.PasswordHash, password) {
		return nil, errors.New("invalid credentials")
	}

	spotID := ""
	if employee.SpotID != nil {
		spotID = *employee.SpotID
	}

	access, refresh, err := s.tokenManager.GeneratePair(employee.ID, employee.RoleCode, spotID)
	if err != nil {
		return nil, err
	}

	tokenHash := hashToken(refresh)
	err = s.repo.InsertRefreshToken(ctx, employee.ID, employee.RoleCode, tokenHash, time.Now().UTC().Add(s.tokenManager.RefreshTTL()))
	if err != nil {
		return nil, err
	}

	return &TokenPairResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		TokenType:    "Bearer",
		ExpiresInSec: int64(s.tokenManager.AccessTTL().Seconds()),
	}, nil
}

func (s *Service) RefreshTokens(ctx context.Context, refreshToken string) (*TokenPairResponse, error) {
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return nil, errors.New("refresh_token is required")
	}

	claims, err := s.tokenManager.ParseRefresh(refreshToken)
	if err != nil {
		return nil, err
	}

	oldHash := hashToken(refreshToken)
	valid, err := s.repo.IsRefreshTokenValid(ctx, claims.UserID, oldHash)
	if err != nil {
		return nil, err
	}
	if !valid {
		return nil, errors.New("refresh token revoked or expired")
	}

	if err := s.repo.RevokeRefreshToken(ctx, oldHash); err != nil {
		return nil, err
	}

	access, refresh, err := s.tokenManager.GeneratePair(claims.UserID, claims.Role, claims.SpotID)
	if err != nil {
		return nil, err
	}

	newHash := hashToken(refresh)
	err = s.repo.InsertRefreshToken(ctx, claims.UserID, claims.Role, newHash, time.Now().UTC().Add(s.tokenManager.RefreshTTL()))
	if err != nil {
		return nil, err
	}

	return &TokenPairResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		TokenType:    "Bearer",
		ExpiresInSec: int64(s.tokenManager.AccessTTL().Seconds()),
	}, nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (s *Service) issueCustomerTokens(ctx context.Context, customerID string) (*TokenPairResponse, error) {
	access, refresh, err := s.tokenManager.GeneratePair(customerID, rbac.RoleCustomer, "")
	if err != nil {
		return nil, err
	}

	tokenHash := hashToken(refresh)
	err = s.repo.InsertRefreshToken(ctx, customerID, rbac.RoleCustomer, tokenHash, time.Now().UTC().Add(s.tokenManager.RefreshTTL()))
	if err != nil {
		return nil, err
	}

	return &TokenPairResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		TokenType:    "Bearer",
		ExpiresInSec: int64(s.tokenManager.AccessTTL().Seconds()),
	}, nil
}

func generateOTP() (string, error) {
	max := big.NewInt(900000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("generate otp: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

func normalizePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return ""
	}

	var b strings.Builder
	for i, r := range phone {
		if i == 0 && r == '+' {
			b.WriteRune(r)
			continue
		}
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}

	clean := b.String()
	if len(clean) < 9 {
		return ""
	}
	return clean
}
