import {
  Bell,
  ClipboardList,
  FolderTree,
  HelpCircle,
  Home,
  MapPinned,
  MessageSquare,
  PackageCheck,
  Paintbrush,
  Star,
  Trash2,
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

export const adminMenu: AdminMenuItem[] = [
  { label: "Boshqaruv paneli", href: "/admin", icon: Home },
  { label: "Foydalanuvchilar", href: "/admin/users", icon: Users },
  { label: "Artistlar", href: "/admin/artists", icon: Paintbrush },
  { label: "Arizalar", href: "/admin/applications", icon: ClipboardList },
  { label: "Kategoriyalar", href: "/admin/categories", icon: FolderTree },
  { label: "Xizmatlar", href: "/admin/services", icon: Wrench },
  { label: "Buyurtmalar", href: "/admin/orders", icon: PackageCheck },
  { label: "Hududlar", href: "/admin/regions", icon: MapPinned },
  { label: "Izohlar", href: "/admin/comments", icon: MessageSquare },
  { label: "Reytinglar", href: "/admin/ratings", icon: Star },
  { label: "Videolar", href: "/admin/videos", icon: Video },
  { label: "Xabarnomalar", href: "/admin/notifications", icon: Bell },
  { label: "Savol-javob", href: "/admin/faq", icon: HelpCircle },
  { label: "O'chirilganlar", href: "/admin/trash", icon: Trash2 },
];
