import React, { useEffect, useState } from 'react';
import { Activity, Users, TrendingUp, Clock, UserX, CheckCircle2 } from '../icons';

type ApiFetch = (url: string, options?: RequestInit & { product?: string }) => Promise<Response>;

interface AdminEngagementProps {
  apiFetch: ApiFetch;
  product: string;
}

interface Overview {
  total_users: string;
  approved_users: string;
  dau: string;
  wau: string;
  mau: string;
  never_logged_in: string;
  churned: string;
  onboarding_incomplete: string;
  welcome_seen_count: string;
  record_opened_count: string;
}

interface EngagementUser {
  id: number;
  name: string;
  email: string;
  product: string;
  plan: string;
  approval_status: string;
  engagement_status: string;
  product_last_login_at: string | null;
  product_last_seen_at: string | null;
  login_count: number;
  created_at: string;
  onboarding_completed: boolean;
  welcome_seen: boolean;
  record_opened: boolean;
  patient_count: number;
  appointment_count: number;
  last_patient_at: string | null;
  last_appointment_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inativo', color: 'bg-amber-100 text-amber-700' },
  churned: { label: 'Abandonou', color: 'bg-rose-100 text-rose-700' },
  never_logged_in: { label: 'Nunca entrou', color: 'bg-slate-100 text-slate-600' },
  unknown: { label: 'Indefinido', color: 'bg-slate-100 text-slate-500' },
};

function formatRelative(dateStr: string | null) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`;
  return `${Math.floor(diffDays / 30)} mês(es) atrás`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminEngagement({ apiFetch, product }: AdminEngagementProps) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<EngagementUser[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState<'all' | 'odontohub' | 'academy'>('all');
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes] = await Promise.all([
        apiFetch(`/api/admin/metrics/overview?product=${productFilter}`, { product }),
        apiFetch(`/api/admin/metrics/engagement?product=${productFilter}&status=${statusFilter}`, { product }),
      ]);
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.overview);
      }
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [productFilter, statusFilter]);

  const cards = overview ? [
    { label: 'Usuários aprovados', value: overview.approved_users, icon: Users, color: 'text-primary' },
    { label: 'Ativos (7 dias)', value: overview.wau, icon: Activity, color: 'text-emerald-600' },
    { label: 'Ativos (30 dias)', value: overview.mau, icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Nunca entraram', value: overview.never_logged_in, icon: Clock, color: 'text-slate-500' },
    { label: 'Abandonaram', value: overview.churned, icon: UserX, color: 'text-rose-600' },
    { label: 'Onboarding pendente', value: overview.onboarding_incomplete, icon: CheckCircle2, color: 'text-amber-600' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-slate-900">Engajamento de Usuários</h3>
          <p className="text-slate-500 text-sm">Veja quem usa o sistema de verdade e quem parou de voltar</p>
        </div>
        <div className="flex gap-2">
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value as typeof productFilter)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600"
          >
            <option value="all">Todos os produtos</option>
            <option value="odontohub">OdontoHub</option>
            <option value="academy">Academy</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="churned">Abandonaram</option>
            <option value="never_logged_in">Nunca entraram</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando métricas...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {cards.map((card) => (
              <div key={card.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon size={16} className={card.color} />
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{card.label}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value || '0'}</p>
              </div>
            ))}
          </div>

          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-700 uppercase">Ativação do onboarding</p>
                <p className="text-sm text-emerald-800 mt-1">
                  {overview.welcome_seen_count} viram o welcome · {overview.record_opened_count} abriram prontuário
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-xs font-bold text-blue-700 uppercase">Uso hoje (DAU)</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{overview.dau || '0'}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700 uppercase">Taxa de abandono</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {overview.approved_users && parseInt(overview.approved_users) > 0
                    ? `${Math.round((parseInt(overview.churned || '0') / parseInt(overview.approved_users)) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Último acesso</th>
                    <th className="px-4 py-3">Último login</th>
                    <th className="px-4 py-3">Logins</th>
                    <th className="px-4 py-3">Pacientes</th>
                    <th className="px-4 py-3">Consultas</th>
                    <th className="px-4 py-3">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const status = STATUS_LABELS[u.engagement_status] || STATUS_LABELS.unknown;
                    return (
                      <tr key={`${u.id}-${u.product}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-600">{u.product} · {u.plan}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <span title={formatDate(u.product_last_seen_at)}>{formatRelative(u.product_last_seen_at)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatRelative(u.product_last_login_at)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">{u.login_count || 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{u.patient_count}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{u.appointment_count}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{formatDate(u.created_at)}</td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhum usuário encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {users.map((u) => {
                const status = STATUS_LABELS[u.engagement_status] || STATUS_LABELS.unknown;
                return (
                  <div key={`${u.id}-${u.product}-mobile`} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{u.product} · {u.plan} · {u.login_count || 0} logins</p>
                    <p className="text-xs text-slate-500">Último acesso: {formatRelative(u.product_last_seen_at)}</p>
                    <p className="text-xs text-slate-500">{u.patient_count} pacientes · {u.appointment_count} consultas</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
