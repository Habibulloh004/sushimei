package rbac

import "strings"

const (
	RoleSuperAdmin = "SUPER_ADMIN"
	RoleAdmin      = "ADMIN"
	RoleManager    = "MANAGER"
	RoleCashier    = "CASHIER"
	RoleKitchen    = "KITCHEN"
	RoleCourier    = "COURIER"
	RoleSpotOp     = "SPOT_OPERATOR"
	RoleCustomer   = "CUSTOMER"
	PermissionAll  = "*"
)

var rolePermissions = map[string]map[string]struct{}{
	RoleSuperAdmin: {PermissionAll: {}},
	RoleAdmin: {
		"dashboard.read":        {},
		"customers.read":        {},
		"customers.write":       {},
		"customers.bonus.write": {},
		"promos.read":           {},
		"promos.write":          {},
		"menu.read":             {},
		"menu.write":            {},
		"spots.read":            {},
		"spots.write":           {},
		"orders.read":           {},
		"orders.write":          {},
		"employees.read":        {},
		"employees.write":       {},
		"reports.read":          {},
		"settings.write":        {},
	},
	RoleManager: {
		"dashboard.read": {},
		"orders.read":    {},
		"orders.write":   {},
		"menu.read":      {},
		"reports.read":   {},
	},
	RoleCashier: {
		"orders.read":  {},
		"orders.write": {},
	},
	RoleKitchen: {
		"orders.read":  {},
		"orders.write": {},
	},
	RoleCourier: {
		"orders.read":  {},
		"orders.write": {},
	},
	RoleSpotOp: {
		"orders.read":  {},
		"orders.write": {},
		"menu.read":    {},
	},
	RoleCustomer: {
		"customer.profile.read":  {},
		"customer.profile.write": {},
		"customer.order.read":    {},
		"customer.order.write":   {},
	},
}

func HasPermission(role, permission string) bool {
	role = strings.ToUpper(strings.TrimSpace(role))
	permission = strings.TrimSpace(permission)

	perms, ok := rolePermissions[role]
	if !ok {
		return false
	}

	if _, all := perms[PermissionAll]; all {
		return true
	}

	_, ok = perms[permission]
	return ok
}
