package security

import (
	"testing"
	"time"
)

func TestGeneratePairCreatesUniqueRefreshTokens(t *testing.T) {
	tm := NewTokenManager("access-secret", "refresh-secret", 15*time.Minute, 24*time.Hour)

	_, refreshA, err := tm.GeneratePair("user-1", "CUSTOMER", "")
	if err != nil {
		t.Fatalf("GeneratePair first call failed: %v", err)
	}

	_, refreshB, err := tm.GeneratePair("user-1", "CUSTOMER", "")
	if err != nil {
		t.Fatalf("GeneratePair second call failed: %v", err)
	}

	if refreshA == refreshB {
		t.Fatal("expected different refresh tokens for consecutive calls")
	}
}
