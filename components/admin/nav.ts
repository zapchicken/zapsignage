import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  LayoutDashboard,
  Layers3,
  ListOrdered,
  MessageSquareText,
  Newspaper,
  Settings,
  Tv,
  Upload,
  View,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mídias", href: "/midias", icon: Upload },
  { label: "Layouts", href: "/layouts", icon: Layers3 },
  { label: "Zonas", href: "/zonas", icon: View },
  { label: "Timelines", href: "/timelines", icon: ListOrdered },
  { label: "RSS", href: "/rss", icon: Newspaper },
  { label: "Mensagens", href: "/mensagens", icon: MessageSquareText },
  { label: "Agendamentos", href: "/agendamentos", icon: CalendarDays },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
  { label: "Player", href: "/player", icon: Tv },
];

