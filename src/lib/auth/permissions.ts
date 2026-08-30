import type { StaffRole } from "@/lib/api/admin-content";
import type { User } from "@/types/api";

export const STAFF_ROLES = [20, 25, 30] as const;
export const ADMIN_ROLE: StaffRole = 30;
export const MODERATOR_ROLE: StaffRole = 25;
export const OPERATOR_ROLE: StaffRole = 20;
export const MODERATOR_OR_ADMIN_ROLES = [MODERATOR_ROLE, ADMIN_ROLE] as const;

export type AdminRouteRule = {
  path: string;
  roles: readonly StaffRole[];
};

const STAFF_ROLE_LABELS: Record<string, StaffRole> = {
  operator: OPERATOR_ROLE,
  moderator: MODERATOR_ROLE,
  admin: ADMIN_ROLE,
};

export const ADMIN_ROUTE_RULES: AdminRouteRule[] = [
  { path: "/admin/comments", roles: MODERATOR_OR_ADMIN_ROLES },
  { path: "/admin/videos", roles: MODERATOR_OR_ADMIN_ROLES },
  { path: "/admin/users", roles: [ADMIN_ROLE] },
  { path: "/admin/operators", roles: [ADMIN_ROLE] },
  { path: "/admin/regions", roles: [ADMIN_ROLE] },
  { path: "/admin/settings", roles: [ADMIN_ROLE] },
  { path: "/admin/audit-logs", roles: [ADMIN_ROLE] },
  { path: "/admin/artist-quotas", roles: [ADMIN_ROLE] },
  { path: "/admin/contracts", roles: [ADMIN_ROLE] },
  { path: "/admin/trash", roles: [ADMIN_ROLE] },
];

export type AdminAction =
  | "artistAvailabilityManage"
  | "artistCommentsModerate"
  | "artistGalleryManage"
  | "artistServicesManage"
  | "artistQuotaManage"
  | "artistVideosManage"
  | "artistVideosRead";

const ADMIN_ACTION_RULES: Record<AdminAction, readonly StaffRole[]> = {
  artistAvailabilityManage: STAFF_ROLES,
  artistCommentsModerate: MODERATOR_OR_ADMIN_ROLES,
  artistGalleryManage: MODERATOR_OR_ADMIN_ROLES,
  artistVideosRead: MODERATOR_OR_ADMIN_ROLES,
  artistVideosManage: MODERATOR_OR_ADMIN_ROLES,
  artistServicesManage: MODERATOR_OR_ADMIN_ROLES,
  artistQuotaManage: [ADMIN_ROLE],
};

export function normalizeStaffRole(role: User["role"]): StaffRole | null {
  if (role === OPERATOR_ROLE || role === MODERATOR_ROLE || role === ADMIN_ROLE) {
    return role;
  }

  if (typeof role === "string") {
    const normalized = role.trim().toLowerCase();
    if (normalized === "20") return OPERATOR_ROLE;
    if (normalized === "25") return MODERATOR_ROLE;
    if (normalized === "30") return ADMIN_ROLE;
    return STAFF_ROLE_LABELS[normalized] ?? null;
  }

  return null;
}

export function canAccessAdminPanel(role: User["role"]) {
  return normalizeStaffRole(role) !== null;
}

export function canAccessAdminRoute(role: User["role"], pathname: string) {
  const normalized = normalizeStaffRole(role);
  if (!normalized) return false;

  const rule = ADMIN_ROUTE_RULES.find((item) =>
    pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  return rule ? rule.roles.includes(normalized) : true;
}

export function isAdminRole(role: User["role"]) {
  return normalizeStaffRole(role) === ADMIN_ROLE;
}

export function canUseAdminAction(role: User["role"] | null | undefined, action: AdminAction) {
  if (role === null || role === undefined) return false;
  const normalized = normalizeStaffRole(role);
  if (!normalized) return false;
  return ADMIN_ACTION_RULES[action].includes(normalized);
}
