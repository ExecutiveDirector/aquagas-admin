// src/config/rolePermissions.ts
//
// Single source of truth for which admin_role can see which section of the
// dashboard. Mirrors the backend guards exactly (see routes/admin.js,
// routes/support.js, routes/analytics.js, routes/adminFinance.js,
// routes/adminSettings.js) so the UI never shows a nav item that the API
// would reject anyway.
//
//   Overview            -> everyone
//   Users / Orders       -> operations_admin, support_admin, super_admin
//   Vendors / Riders /
//     Products           -> operations_admin, super_admin
//   Transactions          -> finance_admin, super_admin
//   Notifications         -> marketing_admin, super_admin
//   Support               -> support_admin, super_admin
//   Analytics             -> operations_admin, finance_admin, marketing_admin, super_admin
//   Settings / Admins     -> super_admin only

export type AdminRole =
  | 'super_admin'
  | 'operations_admin'
  | 'finance_admin'
  | 'support_admin'
  | 'marketing_admin';

const ALL_ROLES: AdminRole[] = [
  'super_admin',
  'operations_admin',
  'finance_admin',
  'support_admin',
  'marketing_admin',
];

export const PAGE_ACCESS: Record<string, AdminRole[]> = {
  '/': ALL_ROLES,
  '/users': ['super_admin', 'operations_admin', 'support_admin'],
  '/vendors': ['super_admin', 'operations_admin'],
  '/riders': ['super_admin', 'operations_admin'],
  '/orders': ['super_admin', 'operations_admin', 'support_admin'],
  '/products': ['super_admin', 'operations_admin'],
  '/transactions': ['super_admin', 'finance_admin'],
  '/notifications': ['super_admin', 'marketing_admin'],
  '/support': ['super_admin', 'support_admin'],
  '/analytics': ['super_admin', 'operations_admin', 'finance_admin', 'marketing_admin'],
  '/settings': ['super_admin'],
  '/admins': ['super_admin'],
};

// Maps each overridable nav path to the sectionKey used in
// admin_users.permissions.sections on the backend (must match
// middleware/authMiddleware.js exactly). Settings and Admins are
// intentionally absent — those stay super_admin-only and can't be granted
// away, to avoid ever locking every super_admin out.
export const SECTION_KEYS: Record<string, string> = {
  '/users': 'users',
  '/orders': 'orders',
  '/vendors': 'vendors',
  '/riders': 'riders',
  '/products': 'products',
  '/transactions': 'transactions',
  '/notifications': 'notifications',
  '/support': 'support',
  '/analytics': 'analytics',
};

// The list of grantable/withdrawable sections, in display order — used by
// the Admins page's per-admin access editor.
export const OVERRIDABLE_SECTIONS: { key: string; label: string; path: string }[] = [
  { key: 'users', label: 'Users', path: '/users' },
  { key: 'orders', label: 'Orders', path: '/orders' },
  { key: 'vendors', label: 'Vendors', path: '/vendors' },
  { key: 'riders', label: 'Riders', path: '/riders' },
  { key: 'products', label: 'Products', path: '/products' },
  { key: 'transactions', label: 'Transactions', path: '/transactions' },
  { key: 'notifications', label: 'Notifications', path: '/notifications' },
  { key: 'support', label: 'Support', path: '/support' },
  { key: 'analytics', label: 'Analytics', path: '/analytics' },
];

/**
 * Is this admin_role allowed to view the given nav/page path?
 *
 * Resolution order (mirrors requireAdminSubRole on the backend exactly):
 *   1. super_admin always passes, can't be restricted.
 *   2. An explicit per-admin override (granted or withdrawn by a super_admin
 *      via the Admins page) wins over the role default.
 *   3. Otherwise, fall back to the PAGE_ACCESS role-based default.
 *
 * `sections` is the logged-in admin's own permissions.sections map (from
 * getPermissions() in authService) — pass undefined/{} if not applicable.
 */
export function canAccess(
  pathname: string,
  adminRole: string | null,
  sections?: Record<string, boolean>
): boolean {
  const allowed = PAGE_ACCESS[pathname];
  if (!allowed) return true;
  if (!adminRole) return false;
  if (adminRole === 'super_admin') return true;

  const sectionKey = SECTION_KEYS[pathname];
  const override = sectionKey && sections ? sections[sectionKey] : undefined;
  if (override === true) return true;
  if (override === false) return false;

  return allowed.includes(adminRole as AdminRole);
}

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  operations_admin: 'Operations',
  finance_admin: 'Finance',
  support_admin: 'Support',
  marketing_admin: 'Marketing',
};

export function roleLabel(adminRole: string | null): string {
  if (!adminRole) return 'Admin';
  return ROLE_LABELS[adminRole as AdminRole] || adminRole;
}
