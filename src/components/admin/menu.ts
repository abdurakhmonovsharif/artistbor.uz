import {
  Bell,
  ClipboardList,
  FolderTree,
  HelpCircle,
  Home,
  MessageSquare,
  PackageCheck,
  Paintbrush,
  Star,
  Trash2,
  UserCog,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translations";

export type AdminMenuItem = {
  labelKey: TranslationKey;
  href: string;
  icon: LucideIcon;
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
      { labelKey: "menu.users", href: "/admin/users", icon: Users },
      { labelKey: "menu.operators", href: "/admin/operators", icon: UserCog },
      { labelKey: "menu.applications", href: "/admin/applications", icon: ClipboardList },
    ],
  },
  {
    key: "catalog",
    labelKey: "menu.catalog",
    children: [
      { labelKey: "menu.categories", href: "/admin/categories", icon: FolderTree },
      { labelKey: "menu.services", href: "/admin/services", icon: Wrench },
    ],
  },
  {
    key: "orders",
    labelKey: "menu.ordersGroup",
    children: [
      { labelKey: "menu.orders", href: "/admin/orders", icon: PackageCheck },
      { labelKey: "menu.comments", href: "/admin/comments", icon: MessageSquare },
      { labelKey: "menu.ratings", href: "/admin/ratings", icon: Star },
    ],
  },
  {
    key: "content",
    labelKey: "menu.content",
    children: [
      { labelKey: "menu.videos", href: "/admin/videos", icon: Video },
      { labelKey: "menu.notifications", href: "/admin/notifications", icon: Bell },
      { labelKey: "menu.faq", href: "/admin/faq", icon: HelpCircle },
    ],
  },
  {
    key: "system",
    labelKey: "menu.system",
    children: [{ labelKey: "menu.trash", href: "/admin/trash", icon: Trash2 }],
  },
];

export const adminMenu: AdminMenuItem[] = adminMenuGroups.flatMap((item) =>
  item.children,
);
