package realtime

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"strings"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/platform/rbac"
	"sushimei/backend/internal/platform/security"
)

// allowedRoles lists every role permitted to open the realtime stream.
// Customers subscribe to their own order updates; staff receive spot-wide
// or courier-specific events (see Hub.PublishSpot / PublishCourier).
var allowedRoles = map[string]struct{}{
	rbac.RoleKitchen:    {},
	rbac.RoleCashier:    {},
	rbac.RoleCourier:    {},
	rbac.RoleSpotOp:     {},
	rbac.RoleManager:    {},
	rbac.RoleAdmin:      {},
	rbac.RoleSuperAdmin: {},
	rbac.RoleCustomer:   {},
}

// UpgradeGuard is the pre-upgrade middleware. Fiber requires `IsWebSocketUpgrade`
// to be checked inside a middleware that sits in front of websocket.New.
func UpgradeGuard() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

// Handler authenticates the JWT from the `token` query param, registers the
// client with the hub, and then fans frames out to the socket until the
// connection closes.
func Handler(hub *Hub, tm *security.TokenManager) fiber.Handler {
	return websocket.New(func(conn *websocket.Conn) {
		defer conn.Close()

		tokenString := strings.TrimSpace(conn.Query("token"))
		if tokenString == "" {
			_ = conn.WriteJSON(fiber.Map{"type": "error", "message": "missing token"})
			return
		}

		claims, err := tm.ParseAccess(tokenString)
		if err != nil {
			_ = conn.WriteJSON(fiber.Map{"type": "error", "message": "invalid token"})
			return
		}
		if _, ok := allowedRoles[claims.Role]; !ok {
			_ = conn.WriteJSON(fiber.Map{"type": "error", "message": "role not allowed"})
			return
		}

		courierID := ""
		customerID := ""
		if claims.Role == rbac.RoleCourier {
			courierID = claims.UserID
		}
		if claims.Role == rbac.RoleCustomer {
			customerID = claims.UserID
		}

		client := NewClient(randomID(), claims.UserID, claims.Role, claims.SpotID, courierID, customerID)
		hub.Register(client)
		defer hub.Unregister(client)

		// Greeting: helps frontend confirm connection before switching off polling.
		_ = conn.WriteJSON(fiber.Map{
			"type":    "hello",
			"role":    claims.Role,
			"spot_id": claims.SpotID,
			"at":      time.Now().UTC(),
		})

		// Reader: discard client messages but watch for close/errors so we can exit.
		readErr := make(chan error, 1)
		go func() {
			for {
				if _, _, err := conn.ReadMessage(); err != nil {
					readErr <- err
					return
				}
			}
		}()

		// Writer: forward hub frames + periodic pings.
		pingTicker := time.NewTicker(30 * time.Second)
		defer pingTicker.Stop()

		for {
			select {
			case <-readErr:
				return
			case <-client.Closed():
				return
			case msg, ok := <-client.Send():
				if !ok {
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					log.Printf("realtime: write frame: %v", err)
					return
				}
			case <-pingTicker.C:
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	})
}

func randomID() string {
	buf := make([]byte, 8)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
