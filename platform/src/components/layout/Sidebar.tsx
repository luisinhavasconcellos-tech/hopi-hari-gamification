import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Image,
  Music2,
  Briefcase,
  Users2,
  PlaySquare,
  Zap,
  BarChart3,
  Users,
  Database,
  Compass,
  Shield,
  Store,
  Layers,
  UserCircle,
  Package,
  Star,
  MapPin,
  CalendarDays,
  Calendar,
  Megaphone,
  Activity,
  Award,
  Sparkles,
  Ticket,
  Settings,
  Swords,
  Filter,
  Fingerprint,
  LogOut,
  ScrollText,
  MessageSquareWarning,
  Hash,
  Contact,
  Menu,
  X,
  DollarSign,
  Search,
  Globe,
  ShieldCheck,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";
import ExportPdfButton from "@/components/ExportPdfButton";
import { useAuth } from "@/hooks/useAuth";


type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

const socialNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/posts", label: "Instagram", icon: Image },
  { to: "/tiktok", label: "TikTok", icon: Music2 },
  { to: "/linkedin", label: "LinkedIn", icon: Briefcase },
  { to: "/facebook", label: "Facebook", icon: Users2 },
  { to: "/youtube", label: "YouTube", icon: PlaySquare },
  { to: "/audience/x-listening", label: "X", icon: X },
  { to: "/growth", label: "Estratégia IA", icon: Zap, badge: "AI" },
  { to: "/benchmarks", label: "Benchmarks", icon: BarChart3 },
  { to: "/followers", label: "Seguidores", icon: Users },
  { to: "/sources", label: "Fontes de Dados", icon: Database },
  { to: "/dominio", label: "Domínio & Verificação", icon: Globe },
];

const audienceNav: NavItem[] = [
  { to: "/audience", label: "Visão Geral", icon: Compass },
  { to: "/audience/channels", label: "Distribuidores", icon: Store },
  { to: "/audience/sales-channels", label: "Canais de Venda", icon: Layers },
  { to: "/audience/funnel", label: "Funil de Vendas", icon: Filter },
  { to: "/audience/visitors", label: "Cadastros", icon: Users },
  { to: "/audience/attendance", label: "Público & Visitantes", icon: Ticket },
  { to: "/audience/profile", label: "Perfil Consumidor", icon: UserCircle },
  { to: "/audience/segments", label: "Segmentos", icon: Layers },
  { to: "/audience/percapita", label: "Per Capita & Consumo", icon: DollarSign },
  { to: "/audience/products", label: "F&B / Produtos", icon: Package },
  { to: "/audience/attractions", label: "Atrações", icon: Star },
  { to: "/audience/heatmaps", label: "Heatmaps", icon: MapPin },
  { to: "/audience/weekdays", label: "Dias da Semana", icon: CalendarDays },
  { to: "/audience/events", label: "Eventos", icon: Calendar },
  { to: "/audience/campaigns", label: "Campanhas", icon: Megaphone },
  { to: "/audience/influencers", label: "Influenciadores", icon: Activity },
  { to: "/audience/crm", label: "Base de Leads (CRM)", icon: Contact },
  { to: "/audience/loyalty", label: "Fidelidade", icon: Award },
  { to: "/audience/insights", label: "AI Insights", icon: Sparkles, badge: "AI" },
  { to: "/audience/content-plan", label: "Plano de Conteúdo", icon: Megaphone, badge: "AI" },
  { to: "/audience/operations", label: "Operacional", icon: Ticket },
  { to: "/audience/search-demand", label: "Demanda de Busca", icon: Search },
  { to: "/audience/competitive", label: "Inteligência Competitiva", icon: Swords },
  { to: "/audience/reputation", label: "Reputação", icon: MessageSquareWarning },
  { to: "/audience/identity", label: "Identidade & LGPD", icon: Fingerprint },
  { to: "/audience/gender-audit", label: "Auditoria de Gênero", icon: ShieldCheck },
  { to: "/audience/transparency", label: "Transparência de Dados", icon: ScrollText },
  { to: "/audience/admin", label: "Admin", icon: Settings },
];


function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div className="mb-4">
      <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/audience"}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-muted/50 text-foreground ring-1 ring-border"
                  : "text-sidebar-foreground hover:bg-muted/50 hover:text-foreground",
              ].join(" ")
            }
            style={({ isActive }) =>
              isActive
                ? { boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.3)" }
                : undefined
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`size-4 shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className="truncate flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded-md font-semibold">
                    {item.badge}
                  </span>
                )}
                {isActive && !item.badge && (
                  <span
                    className="size-1.5 rounded-full bg-primary"
                    style={{ boxShadow: "0 0 12px hsl(var(--primary))" }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-50 flex items-center gap-3 px-4 bg-sidebar/85 backdrop-blur-xl border-b border-sidebar-border">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="size-9 grid place-items-center rounded-lg border border-border text-foreground hover:bg-muted/70"
        >
          <Menu className="size-5" />
        </button>
        <BrandMark className="size-8" />
        <div className="font-display font-bold tracking-tight truncate">
          Hopi <span className="text-gradient">Hari</span>
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-[100dvh] w-[17rem] max-w-[85vw] lg:w-64 bg-sidebar/95 lg:bg-sidebar/70 backdrop-blur-xl border-r border-sidebar-border flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
          className="lg:hidden absolute right-3 top-3 size-8 grid place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div className="leading-tight">
            <div className="font-display font-bold tracking-tight text-foreground">
              Hopi <span className="text-gradient">Hari</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Plataforma de Inteligência</div>
          </div>
        </div>
        <div className="brand-rule mt-4 opacity-80" />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 scrollbar-thin">
        <NavSection label="Social Insights" items={socialNav} />
        <NavSection label="Audience Intelligence" items={audienceNav} />
      </div>

      {/* Export PDF */}
      <div className="px-3 pt-2">
        <ExportPdfButton />
      </div>

      {/* Account */}
      <div className="m-3 p-3 rounded-xl glass space-y-2">
        <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
        {isAdmin && (
          <NavLink
            to="/users"
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
          >
            <Shield className="size-3.5 text-primary" />
            Usuários
          </NavLink>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="size-3.5" />
          Sair
        </button>
      </div>

      </aside>
    </>
  );
}

