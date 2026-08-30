import {
  Bell,
  BookOpenCheck,
  ClipboardList,
  FolderTree,
  Gauge,
  HelpCircle,
  Home,
  MessageSquare,
  MapPinned,
  PackageCheck,
  Paintbrush,
  Settings,
  ScrollText,
  Star,
  Trash2,
  UserCog,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ADMIN_ROLE,
  MODERATOR_OR_ADMIN_ROLES,
  normalizeStaffRole,
  type AdminRouteRule,
} from "@/lib/auth/permissions";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { User } from "@/types/api";

export type AdminMenuItem = {
  labelKey: TranslationKey;
  href: string;
  icon: LucideIcon;
  roles?: AdminRouteRule["roles"];
};

export type AdminMenuGroup = {
  key: string;
  labelKey: TranslationKey;
  children: AdminMenuItem[];
};

export const adminMenuGroups: AdminMenuGroup[] = [
  {
    key: "main",
    labelKey: "menu.main",
    children: [{ labelKey: "menu.dashboard", href: "/admin", icon: Home }],
  },
  {
    key: "users",
    labelKey: "menu.usersGroup",
    children: [
      { labelKey: "menu.artists", href: "/admin/artists", icon: Paintbrush },
      { labelKey: "menu.artistQuotas", href: "/admin/artist-quotas", icon: Gauge, roles: [ADMIN_ROLE] },
      { labelKey: "menu.users", href: "/admin/users", icon: Users, roles: [ADMIN_ROLE] },
      { labelKey: "menu.operators", href: "/admin/operators", icon: UserCog, roles: [ADMIN_ROLE] },
      { labelKey: "menu.applications", href: "/admin/applications", icon: ClipboardList },
    ],
  },
  {
    key: "catalog",
    labelKey: "menu.catalog",
    children: [
      { labelKey: "menu.categories", href: "/admin/categories", icon: FolderTree },
      { labelKey: "menu.services", href: "/admin/services", icon: Wrench },
      { labelKey: "menu.regions", href: "/admin/regions", icon: MapPinned, roles: [ADMIN_ROLE] },
    ],
  },
  {
    key: "orders",
    labelKey: "menu.ordersGroup",
    children: [
      { labelKey: "menu.orders", href: "/admin/orders", icon: PackageCheck },
      { labelKey: "menu.contracts", href: "/admin/contracts", icon: BookOpenCheck, roles: [ADMIN_ROLE] },
      { labelKey: "menu.comments", href: "/admin/comments", icon: MessageSquare, roles: MODERATOR_OR_ADMIN_ROLES },
      { labelKey: "menu.ratings", href: "/admin/ratings", icon: Star },
    ],
  },
  {
    key: "content",
    labelKey: "menu.content",
    children: [
      { labelKey: "menu.videos", href: "/admin/videos", icon: Video, roles: MODERATOR_OR_ADMIN_ROLES },
      { labelKey: "menu.notifications", href: "/admin/notifications", icon: Bell },
      { labelKey: "menu.faq", href: "/admin/faq", icon: HelpCircle },
    ],
  },
  {
    key: "system",
    labelKey: "menu.system",
    children: [
      { labelKey: "menu.settings", href: "/admin/settings", icon: Settings, roles: [ADMIN_ROLE] },
      { labelKey: "menu.auditLogs", href: "/admin/audit-logs", icon: ScrollText, roles: [ADMIN_ROLE] },
      { labelKey: "menu.trash", href: "/admin/trash", icon: Trash2, roles: [ADMIN_ROLE] },
    ],
  },
];

export const adminMenu: AdminMenuItem[] = adminMenuGroups.flatMap((item) =>
  item.children,
);

export function getAdminMenuGroupsForRole(role: User["role"]): AdminMenuGroup[] {
  const staffRole = normalizeStaffRole(role);

  return adminMenuGroups
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => !item.roles || (staffRole ? item.roles.includes(staffRole) : false)),
    }))
    .filter((group) => group.children.length > 0);
}
