import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Clock,
  DollarSign,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
  UserCircle,
  UserCog,
  Users,
  X,
} from '../icons';
import {
  SIZE_LABEL,
  cycleWidgetSize,
  deriveControlCenter,
  firstGivenName,
  listHideableLiveWidgets,
  type ControlCenterInput,
  type ControlTab,
  type ControlWidget,
  type WidgetSize,
  type WidgetTone,
} from '../utils/controlCenter';

export type RailTab = ControlTab;

type TileDef = {
  id: RailTab;
  label: string;
  hint: string;
  icon: typeof Home;
};

const TILES: TileDef[] = [
  { id: 'dashboard', label: 'Hoje', hint: 'O dia da clínica', icon: Home },
  { id: 'agenda', label: 'Agenda', hint: 'Consultas', icon: Calendar },
  { id: 'pacientes', label: 'Pacientes', hint: 'Prontuários', icon: Users },
  { id: 'financeiro', label: 'Caixa', hint: 'Receber', icon: DollarSign },
  { id: 'documentos', label: 'Papéis', hint: 'Receita e atestado', icon: FileText },
  { id: 'configuracoes', label: 'Clínica', hint: 'Perfil e plano', icon: Settings },
  { id: 'admin', label: 'Equipe', hint: 'Dentistas', icon: UserCog },
];

const DEFAULT_PINS: RailTab[] = ['dashboard', 'agenda', 'pacientes', 'financeiro'];

const WIDGET_ICONS: Record<string, typeof Home> = {
  dashboard: Home,
  hoje: Home,
  proximo: Clock,
  confirmar: MessageCircle,
  caixa: DollarSign,
  financeiro: DollarSign,
  recuperar: AlertCircle,
  portal: CalendarPlus,
  amanha: Calendar,
  ritmo: Calendar,
  encaixe: CalendarPlus,
  agenda: Calendar,
  pacientes: Users,
  documentos: FileText,
  configuracoes: Settings,
  admin: UserCog,
};

const pinKey = (userId: string | number) => `odontohub.rail.${userId}`;
const hideKey = (userId: string | number) => `odontohub.cc.hide.${userId}`;
const layoutKey = (userId: string | number) => `odontohub.cc.layout.${userId}`;

type RailLayout = {
  hidden: string[];
  sizes: Record<string, WidgetSize>;
  order: string[];
  featuredSize: WidgetSize;
};

const EMPTY_LAYOUT: RailLayout = { hidden: [], sizes: {}, order: [], featuredSize: 'l' };

function loadPins(userId: string | number | undefined, allowAdmin: boolean): RailTab[] {
  const allowed = new Set(TILES.filter(t => allowAdmin || t.id !== 'admin').map(t => t.id));
  if (userId != null) {
    try {
      const raw = localStorage.getItem(pinKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const pins = parsed.filter((id: string) => allowed.has(id as RailTab)) as RailTab[];
          if (!pins.includes('dashboard')) pins.unshift('dashboard');
          if (pins.length) return pins;
        }
      }
    } catch {
      /* keep defaults */
    }
  }
  return DEFAULT_PINS.filter(id => allowed.has(id));
}

function loadLayout(userId: string | number | undefined): RailLayout {
  if (userId == null) return EMPTY_LAYOUT;
  try {
    const raw = localStorage.getItem(layoutKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((id: unknown) => typeof id === 'string') : [],
        sizes: parsed.sizes && typeof parsed.sizes === 'object' ? parsed.sizes : {},
        order: Array.isArray(parsed.order) ? parsed.order.filter((id: unknown) => typeof id === 'string') : [],
        featuredSize: parsed.featuredSize === 'm' || parsed.featuredSize === 'l' ? parsed.featuredSize : 'l',
      };
    }
    const legacy = localStorage.getItem(hideKey(userId));
    const hidden = legacy ? JSON.parse(legacy) : [];
    return {
      ...EMPTY_LAYOUT,
      hidden: Array.isArray(hidden) ? hidden.filter((id: unknown) => typeof id === 'string') : [],
    };
  } catch {
    return EMPTY_LAYOUT;
  }
}

function toneValueClass(tone: WidgetTone) {
  if (tone === 'urgent') return 'text-[#ff3b30]';
  if (tone === 'warn') return 'text-[#c77d12]';
  if (tone === 'live') return 'text-[#0071e3]';
  return 'text-[#1d1d1f]';
}

function toneDotClass(tone: WidgetTone) {
  if (tone === 'urgent') return 'bg-[#ff3b30]';
  if (tone === 'warn') return 'bg-[#ff9f0a]';
  if (tone === 'live') return 'bg-[#0071e3]';
  if (tone === 'ok' || tone === 'money') return 'bg-[#30d158]';
  return '';
}

function sizeSpan(size: WidgetSize) {
  if (size === 'l') {
    return 'col-span-2 min-h-[132px] p-4 tablet-l:col-span-1 tablet-l:min-h-[52px] tablet-l:p-2 desktop:col-span-2 desktop:min-h-[132px] desktop:p-4';
  }
  if (size === 'm') {
    return 'col-span-2 min-h-[88px] p-3.5 tablet-l:col-span-1 tablet-l:min-h-[52px] tablet-l:p-2 desktop:col-span-2 desktop:min-h-[88px] desktop:p-3.5';
  }
  return 'col-span-1 min-h-[96px] p-3.5 tablet-l:min-h-[52px] tablet-l:p-2 desktop:min-h-[96px] desktop:p-3.5';
}

export interface ClinicRailSnapshot {
  now?: Date;
  appointments?: ControlCenterInput['appointments'];
  todayRevenue?: number;
  weekRevenue?: number;
  pendingReceivables?: number;
  portalPendingCount?: number;
  noShowRescheduleCount?: number;
  patientCount?: number;
  freeSlotCount?: number;
}

interface ClinicRailProps {
  activeTab: string;
  setActiveTab: (tab: RailTab) => void;
  setIsSidebarOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  isSidebarOpen: boolean;
  user: { id?: number | string; name?: string; role?: string } | null;
  profile: {
    name?: string;
    photo_url?: string;
    clinic_name?: string;
    cro?: string;
    specialty?: string;
  } | null;
  isAdmin?: boolean;
  onLogout: () => void;
  snapshot?: ClinicRailSnapshot;
  onOpenPortalInbox?: () => void;
}

export function ClinicRail({
  activeTab,
  setActiveTab,
  setIsSidebarOpen,
  navigate,
  isSidebarOpen,
  user,
  profile,
  isAdmin = false,
  onLogout,
  snapshot,
  onOpenPortalInbox,
}: ClinicRailProps) {
  const [editing, setEditing] = useState(false);
  const [pins, setPins] = useState<RailTab[]>(() => loadPins(user?.id, isAdmin));
  const [layout, setLayout] = useState<RailLayout>(() => loadLayout(user?.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const [focusedWidget, setFocusedWidget] = useState<string>('dashboard');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setPins(loadPins(user?.id, isAdmin));
    setLayout(loadLayout(user?.id));
  }, [user?.id, isAdmin]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const persistPins = useCallback(
    (next: RailTab[]) => {
      setPins(next);
      if (user?.id != null) localStorage.setItem(pinKey(user.id), JSON.stringify(next));
    },
    [user?.id],
  );

  const persistLayout = useCallback(
    (next: RailLayout) => {
      setLayout(next);
      if (user?.id != null) {
        localStorage.setItem(layoutKey(user.id), JSON.stringify(next));
        localStorage.setItem(hideKey(user.id), JSON.stringify(next.hidden));
      }
    },
    [user?.id],
  );

  const catalog = useMemo(
    () => TILES.filter(t => isAdmin || t.id !== 'admin'),
    [isAdmin],
  );

  const input: ControlCenterInput = useMemo(() => ({
    now: snapshot?.now ?? now,
    appointments: snapshot?.appointments || [],
    todayRevenue: snapshot?.todayRevenue || 0,
    weekRevenue: snapshot?.weekRevenue || 0,
    pendingReceivables: snapshot?.pendingReceivables || 0,
    portalPendingCount: snapshot?.portalPendingCount || 0,
    noShowRescheduleCount: snapshot?.noShowRescheduleCount || 0,
    patientCount: snapshot?.patientCount || 0,
    freeSlotCount: snapshot?.freeSlotCount || 0,
  }), [now, snapshot]);

  const view = useMemo(
    () => deriveControlCenter(input, {
      hiddenLive: layout.hidden,
      pins,
      allowAdmin: isAdmin,
      sizes: layout.sizes,
      order: layout.order,
    }),
    [input, layout, pins, isAdmin],
  );

  const hiddenGallery = useMemo(
    () => listHideableLiveWidgets(input, layout.hidden),
    [input, layout.hidden],
  );

  const unusedTiles = catalog.filter(t => t.id !== 'dashboard' && !pins.includes(t.id));

  const go = (id: RailTab, widgetId?: string) => {
    if (editing) return;
    setFocusedWidget(widgetId || id);
    setActiveTab(id);
    setIsSidebarOpen(false);
    navigate('/');
  };

  const togglePin = (id: RailTab) => {
    if (id === 'dashboard') return;
    if (pins.includes(id)) persistPins(pins.filter(p => p !== id));
    else persistPins([...pins, id]);
  };

  const hideWidget = (id: string) => {
    if (id === 'dashboard') return;
    persistLayout({ ...layout, hidden: Array.from(new Set([...layout.hidden, id])) });
    if (id === 'agenda' || id === 'pacientes' || id === 'financeiro' || id === 'documentos' || id === 'configuracoes' || id === 'admin') {
      togglePin(id);
    }
  };

  const showWidget = (id: string) => {
    persistLayout({ ...layout, hidden: layout.hidden.filter(item => item !== id) });
  };

  const resizeWidget = (id: string, current: WidgetSize) => {
    persistLayout({
      ...layout,
      sizes: { ...layout.sizes, [id]: cycleWidgetSize(current) },
    });
  };

  const resizeFeatured = () => {
    persistLayout({
      ...layout,
      featuredSize: layout.featuredSize === 'l' ? 'm' : 'l',
    });
  };

  const activateWidget = (widget: ControlWidget) => {
    if (editing) {
      hideWidget(widget.id);
      return;
    }
    if (widget.id === 'portal' && onOpenPortalInbox) {
      setFocusedWidget(widget.id);
      onOpenPortalInbox();
      setIsSidebarOpen(false);
      return;
    }
    go(widget.tab, widget.id);
  };

  const onDrop = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const ids = view.widgets.map(widget => widget.id);
    const next = ids.filter(id => id !== dragging);
    const at = next.indexOf(targetId);
    next.splice(at < 0 ? next.length : at, 0, dragging);
    persistLayout({ ...layout, order: next });
    setDragging(null);
  };

  const displayName = firstGivenName(profile?.name || user?.name) || 'Doutor';
  const FeaturedIcon = Home;
  const featuredOn = focusedWidget === 'dashboard' && activeTab === 'dashboard';

  const widthClass = isSidebarOpen
    ? 'translate-x-0 w-[19rem]'
    : '-translate-x-full w-[19rem] tablet-l:w-[5.25rem] desktop:w-[19rem]';

  const tileClass = (on: boolean, extra = '') =>
    `relative flex flex-col text-left rounded-[26px] transition-colors duration-200 text-[#1d1d1f] ${extra} ${
      on ? 'clinic-cc-tile-on' : 'clinic-cc-tile hover:bg-white'
    } ${editing ? 'clinic-cc-jiggle' : ''}`;

  return (
    <aside
      className={`
        clinic-control-rail
        fixed inset-y-0 left-0 z-[110] flex flex-col
        transition-all duration-300 ease-in-out tablet-l:static tablet-l:translate-x-0 no-print
        ${widthClass}
      `}
    >
      <div className="flex items-start justify-between px-4 pt-6 pb-3 desktop:px-5">
        <div className="min-w-0 tablet-l:hidden desktop:block">
          <p className="text-[12px] text-[#86868b] tracking-[-0.011em]">
            {view.voice.greeting}
          </p>
          <h1 className="apple-display-ink text-[28px] truncate mt-0.5">{displayName}</h1>
          <p className="text-[14px] font-semibold text-[#1d1d1f] tracking-[-0.016em] mt-1.5 leading-snug">
            {view.voice.headline}
          </p>
          {view.voice.detail && (
            <p className="text-[12px] text-[#6e6e73] mt-0.5 leading-snug line-clamp-2">
              {view.voice.detail}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="tablet-l:hidden text-[#86868b] p-1 -mr-1"
          aria-label="Fechar"
        >
          <Plus size={22} className="rotate-45" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 desktop:px-4 pb-3 no-scrollbar">
        {editing && (
          <p className="tablet-l:hidden desktop:block text-[12px] text-[#86868b] px-1 mb-3 leading-relaxed">
            Arraste para reordenar. O canto altera o tamanho — 1×1, 2×1 ou 2×2.
          </p>
        )}

        <button
          type="button"
          onClick={() => (editing ? undefined : go('dashboard', 'dashboard'))}
          className={tileClass(
            featuredOn,
            `${layout.featuredSize === 'm' ? 'min-h-[88px] p-3.5 desktop:min-h-[88px]' : 'min-h-[108px] p-4 desktop:min-h-[108px]'} w-full tablet-l:min-h-[52px] tablet-l:items-center tablet-l:justify-center tablet-l:p-2 desktop:items-stretch desktop:p-4`,
          )}
        >
          {editing && (
            <span
              role="button"
              tabIndex={0}
              onClick={event => {
                event.stopPropagation();
                resizeFeatured();
              }}
              className="clinic-cc-resize tablet-l:hidden desktop:flex"
              title={`Tamanho ${SIZE_LABEL[layout.featuredSize]}`}
            >
              {SIZE_LABEL[layout.featuredSize]}
            </span>
          )}
          <div className="flex w-full items-center justify-between tablet-l:justify-center desktop:justify-between">
            <span className="relative">
              <FeaturedIcon size={22} className="text-[#1d1d1f]" />
              {view.featured.attending && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#30d158] clinic-cc-live-dot" />
              )}
            </span>
            <span className="tablet-l:hidden desktop:block text-[22px] font-semibold tracking-[-0.025em] tabular-nums text-[#1d1d1f]">
              {view.featured.clock}
            </span>
          </div>
          <div className="tablet-l:hidden desktop:block mt-auto">
            <p className="text-[15px] font-semibold tracking-[-0.016em]">{view.featured.label}</p>
            <p className="text-[12px] mt-0.5 truncate text-[#86868b]">
              {view.featured.hint}
            </p>
            {view.featured.total > 0 && (
              <p className="text-[11px] mt-1 tabular-nums text-[#86868b]">
                {view.featured.done} de {view.featured.total} concluídos
              </p>
            )}
          </div>
        </button>

        <div className="grid grid-cols-2 tablet-l:grid-cols-1 desktop:grid-cols-2 gap-2.5 mt-2.5">
          {view.widgets.map(widget => {
            const on = focusedWidget === widget.id;
            const Icon = WIDGET_ICONS[widget.icon] || WIDGET_ICONS[widget.tab] || Calendar;
            const showDot = widget.live && (widget.tone === 'urgent' || widget.tone === 'warn' || widget.tone === 'live');
            return (
              <button
                key={widget.id}
                type="button"
                draggable={editing}
                onDragStart={() => setDragging(widget.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(widget.id)}
                onClick={() => activateWidget(widget)}
                title={`${widget.title}${widget.value ? ` · ${widget.value}` : ''} · ${widget.hint}`}
                className={tileClass(on, `${sizeSpan(widget.size)} items-start justify-between tablet-l:items-center tablet-l:justify-center desktop:items-start`)}
              >
                {editing && (
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#ff3b30] text-white flex items-center justify-center z-10">
                    <X size={11} />
                  </span>
                )}
                {editing && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={event => {
                      event.stopPropagation();
                      resizeWidget(widget.id, widget.size);
                    }}
                    className="clinic-cc-resize tablet-l:hidden desktop:flex"
                    title={`Tamanho ${SIZE_LABEL[widget.size]}`}
                  >
                    {SIZE_LABEL[widget.size]}
                  </span>
                )}
                {showDot && !editing && (
                  <span className={`absolute top-3 right-3 tablet-l:top-1.5 tablet-l:right-1.5 desktop:top-3 desktop:right-3 w-2 h-2 rounded-full ${toneDotClass(widget.tone)} ${widget.tone === 'live' ? 'clinic-cc-live-dot' : ''}`} />
                )}
                <Icon size={22} className="text-[#1d1d1f]" />
                <span className="tablet-l:hidden desktop:flex flex-col mt-3 w-full min-w-0 pr-8">
                  <span className="text-[13px] font-semibold tracking-[-0.016em] leading-tight">
                    {widget.title}
                  </span>
                  {widget.value ? (
                    <span className={`text-[17px] font-semibold tracking-[-0.022em] tabular-nums mt-1 leading-none ${toneValueClass(widget.tone)}`}>
                      {widget.value}
                    </span>
                  ) : null}
                  <span className="text-[11px] mt-1 leading-snug truncate text-[#86868b]">
                    {widget.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {editing && (
          <div className="mt-7 tablet-l:hidden desktop:block space-y-6">
            <div>
              <p className="text-[12px] font-semibold text-[#1d1d1f] px-1 mb-1">Adicionar controles</p>
              <p className="text-[12px] text-[#86868b] px-1 mb-2.5 leading-relaxed">
                Toque no verde para devolver um widget à sua central.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {hiddenGallery.map(widget => {
                  const Icon = WIDGET_ICONS[widget.icon] || Calendar;
                  return (
                    <button
                      key={`hidden-${widget.id}`}
                      type="button"
                      onClick={() => showWidget(widget.id)}
                      className="clinic-cc-tile-add relative flex flex-col items-start justify-between text-left rounded-[26px] min-h-[96px] p-3.5 text-[#86868b]"
                    >
                      <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#30d158] text-white flex items-center justify-center">
                        <Plus size={11} />
                      </span>
                      <Icon size={22} />
                      <span className="mt-3 text-[13px] font-semibold text-[#1d1d1f]">{widget.title}</span>
                      <span className="text-[11px] mt-0.5">{widget.hint}</span>
                    </button>
                  );
                })}
                {unusedTiles.map(tile => {
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => togglePin(tile.id)}
                      className="clinic-cc-tile-add relative flex flex-col items-start justify-between text-left rounded-[26px] min-h-[96px] p-3.5 text-[#86868b]"
                    >
                      <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#30d158] text-white flex items-center justify-center">
                        <Plus size={11} />
                      </span>
                      <Icon size={22} />
                      <span className="mt-3 text-[13px] font-semibold text-[#1d1d1f]">{tile.label}</span>
                      <span className="text-[11px] mt-0.5">{tile.hint}</span>
                    </button>
                  );
                })}
                {hiddenGallery.length === 0 && unusedTiles.length === 0 && (
                  <p className="col-span-2 text-[12px] text-[#86868b] px-1">Todos os controles já estão na sua central.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 desktop:px-4 pb-6 pt-2 space-y-1.5">
        <button
          type="button"
          onClick={() => {
            if (editing) persistPins(pins);
            setEditing(v => !v);
          }}
          className={`w-full text-left ${
            editing
              ? 'h-11 rounded-full bg-[#e8e8ed] text-[#1d1d1f] text-[15px] font-semibold text-center'
              : 'text-[13px] text-[#0071e3] px-1 py-2 tablet-l:text-center desktop:text-left'
          }`}
        >
          {editing ? 'Concluído' : 'Personalizar'}
        </button>

        <button
          type="button"
          onClick={() => go('configuracoes')}
          className={`w-full flex items-center gap-3 rounded-[22px] px-2 py-2 text-left ${
            activeTab === 'configuracoes' ? 'clinic-cc-tile-on' : 'hover:bg-white/50'
          }`}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center text-[#86868b] shrink-0">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserCircle size={24} />
            )}
          </div>
          <div className="min-w-0 tablet-l:hidden desktop:block">
            <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{profile?.name || user?.name}</p>
            <p className="text-[11px] text-[#86868b] truncate">{profile?.clinic_name || profile?.specialty || profile?.cro || 'Conta'}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-2 py-2 text-[#86868b] hover:text-[#ff3b30] rounded-[18px]"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="text-[13px] tablet-l:hidden desktop:block">Sair</span>
        </button>
      </div>
    </aside>
  );
}
