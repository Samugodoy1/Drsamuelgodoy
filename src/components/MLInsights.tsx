import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import {
  TrendingUp, AlertTriangle, Users, Calendar, DollarSign,
  Stethoscope, Clock, ChevronRight, Activity, Sparkles,
  UserX, Target, ArrowRight
} from '../icons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppointmentPrediction {
  patient_id: number;
  patient_name: string;
  no_show_probability: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  best_day_of_week: string | null;
  best_hour: number | null;
  avg_cancellation_rate: number;
  total_appointments: number;
  finished_count: number;
  no_show_count: number;
  cancelled_count: number;
  factors: string[];
}

interface DemandForecast {
  day_of_week: string;
  hour: number;
  expected_demand: number;
  peak_label: 'BAIXA' | 'MEDIA' | 'ALTA';
  historical_count: number;
}

interface DelinquencyPrediction {
  patient_id: number;
  patient_name: string;
  phone: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  total_plans: number;
  total_installments: number;
  paid_on_time: number;
  paid_late: number;
  overdue_count: number;
  avg_days_late: number;
  total_overdue_amount: number;
  payment_reliability: number;
  factors: string[];
}

interface TreatmentSuggestion {
  patient_id: number;
  patient_name: string;
  suggested_treatments: Array<{
    procedure: string;
    confidence: number;
    reason: string;
    based_on: 'HISTORY' | 'SIMILAR_PATIENTS' | 'ODONTOGRAM' | 'TIME_PATTERN';
  }>;
}

interface TreatmentTrend {
  procedure: string;
  total_count: number;
  last_30_days: number;
  last_90_days: number;
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
  avg_revenue: number;
}

interface MLDashboardData {
  appointment_predictions: {
    high_risk_no_show: AppointmentPrediction[];
    demand_forecast: DemandForecast[];
    overall_no_show_rate: number;
    overall_cancellation_rate: number;
  };
  delinquency_predictions: {
    high_risk_patients: DelinquencyPrediction[];
    total_at_risk_amount: number;
    overall_reliability: number;
  };
  treatment_insights: {
    top_suggestions: TreatmentSuggestion[];
    trends: TreatmentTrend[];
  };
}

interface MLInsightsProps {
  openPatientRecord: (id: number) => void;
  product: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const riskColors = {
  LOW:      { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  MEDIUM:   { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500' },
  HIGH:     { bg: 'bg-rose-50',    text: 'text-rose-700',    bar: 'bg-rose-500' },
  CRITICAL: { bg: 'bg-red-50',     text: 'text-red-800',     bar: 'bg-red-600' },
};

const riskLabels: Record<string, string> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
};

const trendIcons: Record<string, { icon: string; color: string }> = {
  GROWING:   { icon: '📈', color: 'text-emerald-600' },
  STABLE:    { icon: '📊', color: 'text-slate-500' },
  DECLINING: { icon: '📉', color: 'text-rose-500' },
};

const basedOnLabels: Record<string, string> = {
  HISTORY: 'Histórico',
  SIMILAR_PATIENTS: 'Pacientes similares',
  ODONTOGRAM: 'Odontograma',
  TIME_PATTERN: 'Padrão temporal',
};

const peakColors: Record<string, string> = {
  BAIXA: 'bg-emerald-200',
  MEDIA: 'bg-amber-300',
  ALTA:  'bg-rose-400',
};

// Tab states
type MLTab = 'overview' | 'appointments' | 'delinquency' | 'treatments';

// ─── Component ───────────────────────────────────────────────────────────────

export const MLInsights: React.FC<MLInsightsProps> = ({ openPatientRecord, product }) => {
  const [data, setData] = useState<MLDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MLTab>('overview');
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Accept': 'application/json', 'x-product': product };
        if (token && token !== 'null') {
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-auth-token'] = token;
        }
        const res = await fetch(`${API_URL}/api/ml/dashboard`, { headers });
        if (!res.ok) throw new Error('Erro ao carregar dados de ML');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [product]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Processando modelos preditivos…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
        <AlertTriangle size={32} className="text-amber-400" />
        <p className="text-sm text-slate-500">{error || 'Sem dados disponíveis'}</p>
      </div>
    );
  }

  const { appointment_predictions, delinquency_predictions, treatment_insights } = data;

  // ── Tab bar ──
  const tabs: Array<{ id: MLTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Visão Geral', icon: <Sparkles size={16} /> },
    { id: 'appointments', label: 'Agendamentos', icon: <Calendar size={16} /> },
    { id: 'delinquency', label: 'Inadimplência', icon: <DollarSign size={16} /> },
    { id: 'treatments', label: 'Tratamentos', icon: <Stethoscope size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-6 pb-32 pt-6 max-w-screen-xl mx-auto w-full px-2">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Inteligência Preditiva</h2>
          <span className="px-3 py-1 bg-violet-100 text-academy-primary-dark text-[11px] font-bold rounded-full uppercase tracking-wider">ML</span>
        </div>
        <p className="text-[13px] text-slate-400">Previsões baseadas no histórico da sua clínica</p>
      </div>

      {/* Tab bar */}
      <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* ════════════════ OVERVIEW ════════════════ */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                  label="Taxa de No-Show"
                  value={`${Math.round(appointment_predictions.overall_no_show_rate * 100)}%`}
                  subtitle="Probabilidade média de faltas"
                  color={appointment_predictions.overall_no_show_rate > 0.15 ? 'rose' : 'emerald'}
                  icon={<UserX size={18} />}
                />
                <KPICard
                  label="Taxa Cancelamento"
                  value={`${Math.round(appointment_predictions.overall_cancellation_rate * 100)}%`}
                  subtitle="Consultas canceladas"
                  color={appointment_predictions.overall_cancellation_rate > 0.2 ? 'amber' : 'emerald'}
                  icon={<Calendar size={18} />}
                />
                <KPICard
                  label="Confiabilidade Pgto"
                  value={`${Math.round(delinquency_predictions.overall_reliability * 100)}%`}
                  subtitle="Pagamentos em dia"
                  color={delinquency_predictions.overall_reliability >= 0.8 ? 'emerald' : 'amber'}
                  icon={<DollarSign size={18} />}
                />
                <KPICard
                  label="Valor em Risco"
                  value={delinquency_predictions.total_at_risk_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  subtitle="Pacientes alto risco"
                  color={delinquency_predictions.total_at_risk_amount > 0 ? 'rose' : 'emerald'}
                  icon={<AlertTriangle size={18} />}
                />
              </div>

              {/* Quick summaries */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* No-show alert */}
                {appointment_predictions.high_risk_no_show.length > 0 && (
                  <SummaryCard
                    title="Risco de Faltas"
                    icon={<Calendar size={16} />}
                    accent="rose"
                    items={appointment_predictions.high_risk_no_show.slice(0, 4).map(p => ({
                      label: p.patient_name,
                      value: `${Math.round(p.no_show_probability * 100)}%`,
                      sublabel: p.factors[0],
                      onClick: () => openPatientRecord(p.patient_id),
                    }))}
                    onViewAll={() => setActiveTab('appointments')}
                  />
                )}

                {/* Delinquency alert */}
                {delinquency_predictions.high_risk_patients.length > 0 && (
                  <SummaryCard
                    title="Risco de Inadimplência"
                    icon={<DollarSign size={16} />}
                    accent="amber"
                    items={delinquency_predictions.high_risk_patients.slice(0, 4).map(p => ({
                      label: p.patient_name,
                      value: `Score ${p.risk_score}`,
                      sublabel: p.factors[0],
                      onClick: () => openPatientRecord(p.patient_id),
                    }))}
                    onViewAll={() => setActiveTab('delinquency')}
                  />
                )}

                {/* Treatment trends */}
                {treatment_insights.trends.length > 0 && (
                  <SummaryCard
                    title="Tratamentos em Alta"
                    icon={<TrendingUp size={16} />}
                    accent="violet"
                    items={treatment_insights.trends.filter(t => t.trend === 'GROWING').slice(0, 4).map(t => ({
                      label: t.procedure,
                      value: `${t.last_30_days}/mês`,
                      sublabel: `${t.total_count} total • ${t.avg_revenue ? t.avg_revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}`,
                    }))}
                    onViewAll={() => setActiveTab('treatments')}
                  />
                )}
              </div>

              {/* Demand Heatmap */}
              {appointment_predictions.demand_forecast.length > 0 && (
                <DemandHeatmap forecast={appointment_predictions.demand_forecast} />
              )}
            </div>
          )}

          {/* ════════════════ APPOINTMENTS ════════════════ */}
          {activeTab === 'appointments' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3">
                <KPICard label="No-Show Geral" value={`${Math.round(appointment_predictions.overall_no_show_rate * 100)}%`} subtitle="Média da clínica" color="slate" icon={<UserX size={18} />} />
                <KPICard label="Pacientes em Risco" value={String(appointment_predictions.high_risk_no_show.length)} subtitle="Probabilidade alta de falta" color="rose" icon={<AlertTriangle size={18} />} />
              </div>

              {appointment_predictions.high_risk_no_show.length === 0 ? (
                <EmptyState message="Nenhum paciente com alto risco de no-show identificado." icon={<Calendar size={40} />} />
              ) : (
                <div className="flex flex-col gap-3">
                  {appointment_predictions.high_risk_no_show.map(p => (
                    <PatientRiskCard
                      key={p.patient_id}
                      name={p.patient_name}
                      riskValue={`${Math.round(p.no_show_probability * 100)}%`}
                      riskLevel={p.risk_level}
                      stats={[
                        { label: 'Consultas', value: String(p.total_appointments) },
                        { label: 'Finalizadas', value: String(p.finished_count) },
                        { label: 'Faltas', value: String(p.no_show_count) },
                        { label: 'Cancelamentos', value: String(p.cancelled_count) },
                      ]}
                      factors={p.factors}
                      extra={[
                        p.best_day_of_week ? `Prefere: ${p.best_day_of_week}` : null,
                        p.best_hour !== null ? `Melhor horário: ${p.best_hour}h` : null,
                      ].filter(Boolean) as string[]}
                      expanded={expandedPatient === p.patient_id}
                      onToggle={() => setExpandedPatient(expandedPatient === p.patient_id ? null : p.patient_id)}
                      onOpenRecord={() => openPatientRecord(p.patient_id)}
                    />
                  ))}
                </div>
              )}

              {appointment_predictions.demand_forecast.length > 0 && (
                <DemandHeatmap forecast={appointment_predictions.demand_forecast} />
              )}
            </div>
          )}

          {/* ════════════════ DELINQUENCY ════════════════ */}
          {activeTab === 'delinquency' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <KPICard label="Confiabilidade" value={`${Math.round(delinquency_predictions.overall_reliability * 100)}%`} subtitle="Pagamentos em dia" color="emerald" icon={<Target size={18} />} />
                <KPICard label="Valor em Risco" value={delinquency_predictions.total_at_risk_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} subtitle="Risco alto/crítico" color="rose" icon={<DollarSign size={18} />} />
                <KPICard label="Pacientes em Risco" value={String(delinquency_predictions.high_risk_patients.length)} subtitle="Score ≥ 50" color="amber" icon={<Users size={18} />} />
              </div>

              {delinquency_predictions.high_risk_patients.length === 0 ? (
                <EmptyState message="Nenhum paciente com alto risco de inadimplência identificado." icon={<DollarSign size={40} />} />
              ) : (
                <div className="flex flex-col gap-3">
                  {delinquency_predictions.high_risk_patients.map(p => (
                    <PatientRiskCard
                      key={p.patient_id}
                      name={p.patient_name}
                      riskValue={`Score ${p.risk_score}`}
                      riskLevel={p.risk_level}
                      stats={[
                        { label: 'Parcelas', value: String(p.total_installments) },
                        { label: 'Em dia', value: String(p.paid_on_time) },
                        { label: 'Atrasadas', value: String(p.paid_late) },
                        { label: 'Vencidas', value: String(p.overdue_count) },
                      ]}
                      factors={p.factors}
                      extra={[
                        p.total_overdue_amount > 0 ? `R$ ${p.total_overdue_amount.toFixed(2)} em atraso` : null,
                        p.avg_days_late > 0 ? `Média ${p.avg_days_late} dias de atraso` : null,
                        `Confiabilidade: ${Math.round(p.payment_reliability * 100)}%`,
                      ].filter(Boolean) as string[]}
                      expanded={expandedPatient === p.patient_id}
                      onToggle={() => setExpandedPatient(expandedPatient === p.patient_id ? null : p.patient_id)}
                      onOpenRecord={() => openPatientRecord(p.patient_id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ TREATMENTS ════════════════ */}
          {activeTab === 'treatments' && (
            <div className="flex flex-col gap-6">
              {/* Treatment Trends */}
              {treatment_insights.trends.length > 0 && (
                <div className="bg-white rounded-[20px] border border-slate-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <TrendingUp size={16} className="text-violet-500" />
                    <h3 className="text-[15px] font-bold text-slate-800">Tendências de Tratamentos</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {treatment_insights.trends.map((t, i) => {
                      const trendInfo = trendIcons[t.trend];
                      return (
                        <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold text-slate-800 capitalize truncate">{t.procedure}</span>
                              <span className="text-[12px]">{trendInfo.icon}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[12px] text-slate-400">
                              <span>{t.total_count} total</span>
                              <span>•</span>
                              <span>{t.last_30_days} último mês</span>
                              <span>•</span>
                              <span>{t.last_90_days} últimos 3 meses</span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-0.5">
                            {t.avg_revenue > 0 && (
                              <span className="text-[13px] font-bold text-slate-700">
                                {t.avg_revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                            <span className={`text-[11px] font-bold uppercase ${trendInfo.color}`}>
                              {t.trend === 'GROWING' ? 'Em alta' : t.trend === 'DECLINING' ? 'Em queda' : 'Estável'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Patient Suggestions */}
              {treatment_insights.top_suggestions.length > 0 && (
                <div className="bg-white rounded-[20px] border border-slate-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Stethoscope size={16} className="text-primary" />
                    <h3 className="text-[15px] font-bold text-slate-800">Sugestões por Paciente</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {treatment_insights.top_suggestions.map((s, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => openPatientRecord(s.patient_id)}
                            className="text-[14px] font-semibold text-primary hover:underline truncate"
                          >
                            {s.patient_name}
                          </button>
                          <span className="text-[11px] text-slate-400">{s.suggested_treatments.length} sugestão(ões)</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {s.suggested_treatments.map((t, j) => (
                            <div key={j} className="flex items-start gap-3 bg-slate-50 rounded-xl px-3.5 py-2.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold text-slate-700 capitalize">{t.procedure}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    t.confidence >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                                    t.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {Math.round(t.confidence * 100)}%
                                  </span>
                                </div>
                                <p className="text-[12px] text-slate-400 mt-0.5">{t.reason}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-academy-soft text-academy-primary whitespace-nowrap">
                                {basedOnLabels[t.based_on]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {treatment_insights.trends.length === 0 && treatment_insights.top_suggestions.length === 0 && (
                <EmptyState message="Registre procedimentos clínicos para gerar sugestões de tratamentos." icon={<Stethoscope size={40} />} />
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function KPICard({ label, value, subtitle, color, icon }: {
  label: string; value: string; subtitle: string; color: string; icon: React.ReactNode;
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    rose:    'bg-rose-50 text-rose-700',
    amber:   'bg-amber-50 text-amber-700',
    violet:  'bg-academy-soft text-academy-primary-dark',
    slate:   'bg-slate-100 text-slate-700',
  };
  const cls = colorClasses[color] || colorClasses.slate;

  return (
    <div className="bg-white rounded-[18px] border border-slate-100 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}>{icon}</div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-900 tracking-tight">{value}</div>
      <span className="text-[11px] text-slate-400">{subtitle}</span>
    </div>
  );
}

function SummaryCard({ title, icon, accent, items, onViewAll }: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  items: Array<{ label: string; value: string; sublabel?: string; onClick?: () => void }>;
  onViewAll: () => void;
}) {
  const dotColor: Record<string, string> = {
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    violet: 'bg-violet-400',
    emerald: 'bg-emerald-400',
  };

  return (
    <div className="bg-white rounded-[18px] border border-slate-100 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
        <span className={`${dotColor[accent] || 'bg-slate-300'} w-2 h-2 rounded-full`} />
        {icon}
        <h4 className="text-[13px] font-bold text-slate-700">{title}</h4>
      </div>
      <div className="flex-1 divide-y divide-slate-50">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-slate-400">Sem dados</div>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className={`px-4 py-2.5 flex items-center justify-between gap-2 ${item.onClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
              onClick={item.onClick}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-700 truncate">{item.label}</p>
                {item.sublabel && <p className="text-[11px] text-slate-400 truncate">{item.sublabel}</p>}
              </div>
              <span className="text-[13px] font-bold text-slate-600 whitespace-nowrap">{item.value}</span>
            </div>
          ))
        )}
      </div>
      <button
        onClick={onViewAll}
        className="px-4 py-2.5 border-t border-slate-50 text-[12px] font-bold text-primary hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
      >
        Ver todos <ArrowRight size={12} />
      </button>
    </div>
  );
}

function PatientRiskCard({ name, riskValue, riskLevel, stats, factors, extra, expanded, onToggle, onOpenRecord }: {
  key?: React.Key;
  name: string;
  riskValue: string;
  riskLevel: string;
  stats: Array<{ label: string; value: string }>;
  factors: string[];
  extra: string[];
  expanded: boolean;
  onToggle: () => void;
  onOpenRecord: () => void;
}) {
  const colors = riskColors[riskLevel as keyof typeof riskColors] || riskColors.LOW;

  return (
    <div className="bg-white rounded-[18px] border border-slate-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg}`}>
            <AlertTriangle size={16} className={colors.text} />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[14px] font-semibold text-slate-800 truncate">{name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}>
                {riskLabels[riskLevel] || riskLevel}
              </span>
              <span className="text-[12px] text-slate-400">{factors[0]}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[15px] font-bold ${colors.text}`}>{riskValue}</span>
          <ChevronRight size={14} className={`text-slate-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 flex flex-col gap-3">
              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2">
                {stats.map((s, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-[16px] font-bold text-slate-800">{s.value}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Factors */}
              <div className="flex flex-col gap-1">
                {factors.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-slate-500">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${colors.bar}`} />
                    {f}
                  </div>
                ))}
              </div>

              {/* Extra info */}
              {extra.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {extra.map((e, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-medium">
                      {e}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={onOpenRecord}
                className="mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-[13px] font-bold hover:bg-primary/15 transition-colors"
              >
                Abrir prontuário <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DemandHeatmap({ forecast }: { forecast: DemandForecast[] }) {
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const hours = Array.from(new Set(forecast.map(f => f.hour))).sort((a, b) => a - b);
  if (hours.length === 0) return null;

  const getCell = (day: string, hour: number) => {
    return forecast.find(f => f.day_of_week === day && f.hour === hour);
  };

  return (
    <div className="bg-white rounded-[20px] border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        <h3 className="text-[15px] font-bold text-slate-800">Mapa de Demanda</h3>
        <span className="text-[11px] text-slate-400 ml-auto">Baseado no histórico de agendamentos</span>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `80px repeat(${hours.length}, 44px)` }}>
          {/* Header */}
          <div />
          {hours.map(h => (
            <div key={h} className="text-center text-[10px] font-bold text-slate-400">{h}h</div>
          ))}
          {/* Rows */}
          {days.map(day => (
            <React.Fragment key={day}>
              <div className="text-[11px] font-semibold text-slate-600 flex items-center pr-2 truncate">{day.substring(0, 3)}</div>
              {hours.map(hour => {
                const cell = getCell(day, hour);
                if (!cell) return <div key={hour} className="w-10 h-10 rounded-lg bg-slate-50" />;
                return (
                  <div
                    key={hour}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${peakColors[cell.peak_label]}`}
                    title={`${day} ${hour}h: ${cell.expected_demand.toFixed(1)} consultas/semana (${cell.peak_label})`}
                  >
                    {cell.expected_demand.toFixed(1)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200" /> Baixa</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300" /> Média</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-400" /> Alta</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="text-slate-200">{icon}</div>
      <p className="text-[13px] text-slate-400 text-center max-w-xs">{message}</p>
    </div>
  );
}
