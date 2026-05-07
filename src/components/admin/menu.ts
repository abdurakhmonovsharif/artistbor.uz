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

export type AdminMenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type AdminMenuGroup = {
  key: string;
  label: string;
  children: AdminMenuItem[];
};

export const adminMenuGroups: AdminMenuGroup[] = [
  {
    key: "main",
    label: "ASOSIY",
    children: [{ label: "Boshqaruv paneli", href: "/admin", icon: Home }],
  },
  {
    key: "users",
    label: "FOYDALANUVCHILAR",
    children: [
      { label: "Foydalanuvchilar", href: "/admin/users", icon: Users },
      { label: "Operatorlar", href: "/admin/operators", icon: UserCog },
      { label: "Artistlar", href: "/admin/artists", icon: Paintbrush },
      { label: "Arizalar", href: "/admin/applications", icon: ClipboardList },
    ],
  },
  {
    key: "catalog",
    label: "KATALOG",
    children: [
      { label: "Kategoriyalar", href: "/admin/categories", icon: FolderTree },
      { label: "Xizmatlar", href: "/admin/services", icon: Wrench },
    ],
  },
  {
    key: "orders",
    label: "BUYURTMALAR",
    children: [
      { label: "Buyurtmalar", href: "/admin/orders", icon: PackageCheck },
      { label: "Izohlar", href: "/admin/comments", icon: MessageSquare },
      { label: "Reytinglar", href: "/admin/ratings", icon: Star },
    ],
  },
  {
    key: "content",
    label: "KONTENT",
    children: [
      { label: "Videolar", href: "/admin/videos", icon: Video },
      { label: "Xabarnomalar", href: "/admin/notifications", icon: Bell },
      { label: "Savol-javob", href: "/admin/faq", icon: HelpCircle },
    ],
  },
  {
    key: "system",
    label: "TIZIM",
    children: [{ label: "O‘chirilganlar", href: "/admin/trash", icon: Trash2 }],
  },
];

export const adminMenu: AdminMenuItem[] = adminMenuGroups.flatMap((item) =>
  item.children,
);
