package security

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID    string `json:"uid"`
	Role      string `json:"role"`
	SpotID    string `json:"spot_id,omitempty"`
	TokenType string `json:"type"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewTokenManager(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

func (tm *TokenManager) AccessTTL() time.Duration {
	return tm.accessTTL
}

func (tm *TokenManager) RefreshTTL() time.Duration {
	return tm.refreshTTL
}

func (tm *TokenManager) GeneratePair(userID, role, spotID string) (string, string, error) {
	access, err := tm.generate(userID, role, spotID, "access", tm.accessTTL, tm.accessSecret)
	if err != nil {
		return "", "", err
	}

	refresh, err := tm.generate(userID, role, spotID, "refresh", tm.refreshTTL, tm.refreshSecret)
	if err != nil {
		return "", "", err
	}

	return access, refresh, nil
}

func (tm *TokenManager) generate(userID, role, spotID, tokenType string, ttl time.Duration, secret []byte) (string, error) {
	now := time.Now().UTC()
	tokenID, err := generateTokenID()
	if err != nil {
		return "", fmt.Errorf("generate token id: %w", err)
	}

	claims := Claims{
		UserID:    userID,
		Role:      role,
		SpotID:    spotID,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ID:        tokenID,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return tokenString, nil
}

func (tm *TokenManager) ParseAccess(tokenString string) (*Claims, error) {
	return tm.parse(tokenString, tm.accessSecret, "access")
}

func (tm *TokenManager) ParseRefresh(tokenString string) (*Claims, error) {
	return tm.parse(tokenString, tm.refreshSecret, "refresh")
}

func (tm *TokenManager) parse(tokenString string, secret []byte, expectedType string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	if claims.TokenType != expectedType {
		return nil, errors.New("invalid token type")
	}

	return claims, nil
}

func generateTokenID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
