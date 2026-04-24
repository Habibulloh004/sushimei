// Package realtime implements a minimal WebSocket hub that fans out order
// events to subscribed staff clients (kitchen / cashier / courier).
//
// Each client is indexed by spot_id (staff roles) and user_id (courier only).
// Order changes are published via Hub.Publish*; the hub writes JSON frames
// back to the matching connections on a dedicated goroutine per client.
package realtime

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// EventType enumerates realtime messages the backend pushes to clients.
type EventType string

const (
	EventOrderCreated         EventType = "order.created"
	EventOrderStatusChanged   EventType = "order.status_changed"
	EventOrderCourierAssigned EventType = "order.courier_assigned"
	EventOrderOfferRequested  EventType = "order.offer_requested"
	EventOrderOfferDeclined   EventType = "order.offer_declined"
	// EventOrderOffered is pushed to every on-duty courier at the spot when a
	// delivery order becomes READY with no courier yet — they race to accept.
	EventOrderOffered EventType = "order.offered"
	// EventOrderOfferClaimed tells the losing couriers to drop an offer from
	// their pending list because someone else already accepted.
	EventOrderOfferClaimed EventType = "order.offer_claimed"
)

// Event is the payload sent over the wire.
type Event struct {
	Type    EventType `json:"type"`
	OrderID string    `json:"order_id,omitempty"`
	SpotID  string    `json:"spot_id,omitempty"`
	Status  string    `json:"status,omitempty"`
	// CourierID, when set, targets a specific courier connection.
	CourierID string    `json:"courier_id,omitempty"`
	At        time.Time `json:"at"`
}

// Client represents a single WebSocket connection.
type Client struct {
	ID         string
	UserID     string
	SpotID     string
	Role       string
	CourierID  string // same as UserID when Role==COURIER, empty otherwise
	CustomerID string // same as UserID when Role==CUSTOMER, empty otherwise
	send       chan []byte
	closeOnce  sync.Once
	closed     chan struct{}
}

// Send returns the channel the transport layer should read frames from.
func (c *Client) Send() <-chan []byte { return c.send }

// Closed returns a channel that unblocks after Close is called.
func (c *Client) Closed() <-chan struct{} { return c.closed }

// Close signals the writer goroutine to stop. Safe to call multiple times.
func (c *Client) Close() {
	c.closeOnce.Do(func() {
		close(c.closed)
		close(c.send)
	})
}

// Hub tracks all active clients and dispatches events.
type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*Client]struct{})}
}

// Register adds a client. The caller must invoke Unregister when the
// transport terminates so the map does not leak.
func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
	c.Close()
}

// NewClient constructs a client with a small send buffer. The transport
// layer copies frames from Send() to the socket.
func NewClient(id, userID, role, spotID, courierID, customerID string) *Client {
	return &Client{
		ID:         id,
		UserID:     userID,
		Role:       role,
		SpotID:     spotID,
		CourierID:  courierID,
		CustomerID: customerID,
		send:       make(chan []byte, 16),
		closed:     make(chan struct{}),
	}
}

// PublishSpot broadcasts to every client subscribed to the given spot.
// Used for kitchen/cashier/spot operators who need to see all orders at
// their location.
func (h *Hub) PublishSpot(spotID string, event Event) {
	if spotID == "" {
		return
	}
	event.SpotID = spotID
	if event.At.IsZero() {
		event.At = time.Now().UTC()
	}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("realtime: marshal event: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.SpotID == "" || c.SpotID != spotID {
			continue
		}
		// Couriers only receive events about orders assigned to them,
		// delivered via PublishCourier. Skip spot-wide broadcasts so they
		// don't see orders they cannot access.
		if c.CourierID != "" {
			continue
		}
		h.trySend(c, payload)
	}
}

// PublishSpotCouriers broadcasts to every courier currently connected at the
// given spot. Used for offer/claim events where the pool of candidates is all
// on-duty couriers at the branch rather than a specific assignee.
func (h *Hub) PublishSpotCouriers(spotID string, event Event) {
	if spotID == "" {
		return
	}
	event.SpotID = spotID
	if event.At.IsZero() {
		event.At = time.Now().UTC()
	}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("realtime: marshal event: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.CourierID == "" || c.SpotID != spotID {
			continue
		}
		h.trySend(c, payload)
	}
}

// PublishCourier targets a single courier by their user id.
func (h *Hub) PublishCourier(courierID string, event Event) {
	if courierID == "" {
		return
	}
	event.CourierID = courierID
	if event.At.IsZero() {
		event.At = time.Now().UTC()
	}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("realtime: marshal event: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.CourierID == "" || c.CourierID != courierID {
			continue
		}
		h.trySend(c, payload)
	}
}

// PublishCustomer targets the order owner (customer) by their user id.
// Customers see only their own order updates; the event does not leak
// cross-account data because we filter on CustomerID here.
func (h *Hub) PublishCustomer(customerID string, event Event) {
	if customerID == "" {
		return
	}
	if event.At.IsZero() {
		event.At = time.Now().UTC()
	}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("realtime: marshal event: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.CustomerID == "" || c.CustomerID != customerID {
			continue
		}
		h.trySend(c, payload)
	}
}

// trySend does a non-blocking send; if the client is slow we drop the frame
// rather than stalling the publisher. Staff clients refetch on any event,
// so occasional drops are tolerable.
func (h *Hub) trySend(c *Client, payload []byte) {
	select {
	case c.send <- payload:
	default:
		log.Printf("realtime: dropping frame for slow client %s", c.ID)
	}
}
