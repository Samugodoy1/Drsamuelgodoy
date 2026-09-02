import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Plus,
  Settings,
  UserCircle,
  UserCog,
  Users,
  X,
} from '../icons';

export type RailTab =
  | 'dashboard'
  | 'agenda'
  | 'pacientes'
  | 'financeiro'
  | 'documentos'
  | 'configuracoes'
  | 'admin';

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

const storageKey = (userId: string | number) => `odontohub.rail.${userId}`;

function loadPins(userId: string | number | undefined, allowAdmin: boolean): RailTab[] {
  const allowed = new Set(TILES.filter(t => allowAdmin || t.id !== 'admin').map(t => t.id));
  if (userId != null) {
    try {
      const raw = localStorage.getItem(storageKey(userId));
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

function greetingForHour(h: number) {
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function firstNameOf(name?: string | null) {
  const part = (name || '').trim().split(/\s+/)[0];
  return part || 'Doutor';
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
}: ClinicRailProps) {
  const [editing, setEditing] = useState(false);
  const [pins, setPins] = useState<RailTab[]>(() => loadPins(user?.id, isAdmin));
  const [dragging, setDragging] = useState<RailTab | null>(null);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  );

  useEffect(() => {
    setPins(loadPins(user?.id, isAdmin));
  }, [user?.id, isAdmin]);

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const persist = useCallback(
    (next: RailTab[]) => {
      setPins(next);
      if (user?.id != null) localStorage.setItem(storageKey(user.id), JSON.stringify(next));
    },
    [user?.id],
  );

  const catalog = useMemo(
    () => TILES.filter(t => isAdmin || t.id !== 'admin'),
    [isAdmin],
  );

  const featured = catalog.find(t => t.id === 'dashboard')!;
  const restPins = pins.filter(id => id !== 'dashboard').map(id => catalog.find(t => t.id === id)).filter(Boolean) as TileDef[];
  const unusedTiles = catalog.filter(t => t.id !== 'dashboard' && !pins.includes(t.id));

  const go = (id: RailTab) => {
    if (editing) return;
    setActiveTab(id);
    setIsSidebarOpen(false);
    navigate('/');
  };

  const togglePin = (id: RailTab) => {
    if (id === 'dashboard') return;
    if (pins.includes(id)) persist(pins.filter(p => p !== id));
    else persist([...pins, id]);
  };

  const onDrop = (target: RailTab) => {
    if (!dragging || dragging === target || target === 'dashboard') return;
    const next = pins.filter(p => p !== dragging);
    const at = next.indexOf(target);
    next.splice(at < 0 ? next.length : at, 0, dragging);
    if (!next.includes('dashboard')) next.unshift('dashboard');
    persist(next);
    setDragging(null);
  };

  const displayName = firstNameOf(profile?.name || user?.name);
  const clinicLine = profile?.clinic_name || (profile?.cro ? `CRO ${profile.cro}` : profile?.specialty) || 'Sua clínica';
  const hour = new Date().getHours();
  const FeaturedIcon = featured.icon;

  const widthClass = isSidebarOpen
    ? 'translate-x-0 w-[19rem]'
    : '-translate-x-full w-[19rem] tablet-l:w-[5.25rem] desktop:w-[19rem]';

  const tileClass = (on: boolean, extra = '') =>
    `relative flex flex-col text-left rounded-[26px] transition-colors duration-200 ${extra} ${
      on ? 'clinic-cc-tile-on text-white' : 'clinic-cc-tile text-[#1d1d1f] hover:bg-white'
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
      <div className="flex items-start justify-between px-4 pt-6 pb-4 desktop:px-5">
        <div className="min-w-0 tablet-l:hidden desktop:block">
          <p className="text-[12px] text-[#86868b] tracking-[-0.011em]">{greetingForHour(hour)}</p>
          <h1 className="apple-display-ink text-[28px] truncate mt-0.5">{displayName}</h1>
          <p className="text-[13px] text-[#6e6e73] truncate mt-1">{clinicLine}</p>
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
        <button
          type="button"
          onClick={() => (editing ? undefined : go('dashboard'))}
          className={`${tileClass(activeTab === 'dashboard', 'w-full min-h-[108px] p-4 tablet-l:min-h-[52px] tablet-l:items-center tablet-l:justify-center tablet-l:p-2 desktop:items-stretch desktop:min-h-[108px] desktop:p-4')}`}
        >
          <div className="flex w-full items-center justify-between tablet-l:justify-center desktop:justify-between">
            <FeaturedIcon size={22} className={activeTab === 'dashboard' ? 'text-white' : 'text-[#1d1d1f]'} />
            <span className={`tablet-l:hidden desktop:block text-[22px] font-semibold tracking-[-0.025em] tabular-nums ${activeTab === 'dashboard' ? 'text-white' : 'text-[#1d1d1f]'}`}>
              {clock}
            </span>
          </div>
          <div className="tablet-l:hidden desktop:block mt-auto">
            <p className="text-[15px] font-semibold tracking-[-0.016em]">{featured.label}</p>
            <p className={`text-[12px] mt-0.5 ${activeTab === 'dashboard' ? 'text-white/55' : 'text-[#86868b]'}`}>
              {featured.hint}
            </p>
          </div>
        </button>

        <div className="grid grid-cols-2 tablet-l:grid-cols-1 desktop:grid-cols-2 gap-2.5 mt-2.5">
          {restPins.map(tile => {
            const active = activeTab === tile.id;
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                type="button"
                draggable={editing}
                onDragStart={() => setDragging(tile.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(tile.id)}
                onClick={() => (editing ? togglePin(tile.id) : go(tile.id))}
                className={tileClass(
                  active,
                  'min-h-[96px] p-3.5 items-start justify-between tablet-l:min-h-[52px] tablet-l:items-center tablet-l:justify-center tablet-l:p-2 desktop:items-start desktop:min-h-[96px] desktop:p-3.5',
                )}
              >
                {editing && (
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#ff3b30] text-white flex items-center justify-center z-10">
                    <X size={11} />
                  </span>
                )}
                <Icon size={22} className={active ? 'text-white' : 'text-[#1d1d1f]'} />
                <span className="tablet-l:hidden desktop:block mt-3 text-[13px] font-semibold tracking-[-0.016em] leading-tight">
                  {tile.label}
                </span>
                <span className={`tablet-l:hidden desktop:block text-[11px] mt-0.5 leading-snug ${active ? 'text-white/55' : 'text-[#86868b]'}`}>
                  {tile.hint}
                </span>
              </button>
            );
          })}
        </div>

        {editing && unusedTiles.length > 0 && (
          <div className="mt-7 tablet-l:hidden desktop:block">
            <p className="text-[12px] text-[#86868b] px-1 mb-2.5">Galeria de controles</p>
            <div className="grid grid-cols-2 gap-2.5">
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
            </div>
          </div>
        )}
      </div>

      <div className="px-3 desktop:px-4 pb-6 pt-2 space-y-1.5">
        <button
          type="button"
          onClick={() => {
            if (editing) persist(pins);
            setEditing(v => !v);
          }}
          className="hidden desktop:block w-full text-[13px] text-[#0071e3] text-left px-1 py-2"
        >
          {editing ? 'OK' : 'Personalizar'}
        </button>

        <button
          type="button"
          onClick={() => go('configuracoes')}
          className={`w-full flex items-center gap-3 rounded-[22px] px-2 py-2 text-left ${
            activeTab === 'configuracoes' ? 'clinic-cc-tile' : 'hover:bg-white/50'
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
            <p className="text-[11px] text-[#86868b] truncate">{profile?.specialty || profile?.cro || 'Conta'}</p>
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
