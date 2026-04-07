package otp

import (
	"errors"
	"sync"
	"time"
)

type entry struct {
	code      string
	expiresAt time.Time
}

type MemoryStore struct {
	mu   sync.RWMutex
	data map[string]entry
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{data: make(map[string]entry)}
}

func (s *MemoryStore) Set(phone, code string, ttl time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[phone] = entry{code: code, expiresAt: time.Now().UTC().Add(ttl)}
}

func (s *MemoryStore) Verify(phone, code string) error {
	s.mu.RLock()
	e, ok := s.data[phone]
	s.mu.RUnlock()

	if !ok {
		return errors.New("otp not found")
	}

	if time.Now().UTC().After(e.expiresAt) {
		return errors.New("otp expired")
	}

	if e.code != code {
		return errors.New("invalid otp code")
	}

	s.mu.Lock()
	delete(s.data, phone)
	s.mu.Unlock()
	return nil
}
