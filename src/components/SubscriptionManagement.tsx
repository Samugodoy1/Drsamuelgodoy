import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard, AlertCircle, Shield, Clock } from '../icons';
import { API_URL } from '../config';
import {
  startHubCheckout,
  type HubApiPlan,
  type HubCycle,
  type HubSku,
} from '../data/hubPlans';
import { HubPlans } from './HubPlans';
import {
  displayHubName,
  migrationNotice,
  resolveHubAccess,
  type LegacyHubPlan,
} from '../utils/hubEntitlements';

interface SubscriptionPlan extends HubApiPlan {
  name: string;
  description: string | null;
}

interface Subscription {
  id: number;
  product: string;
  status: 'pending' | 'authorized' | 'paused' | 'cancelled' | 'expired';
  plan_name: string;
  plan_type: string;
  amount: string;
  start_date: string | null;
  next_payment_date: string | null;
  last_payment_date: string | null;
  paused_at: string | null;
  grace_expires_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  frequency?: number;
  frequency_type?: string;
}

interface Payment {
  id: number;
  amount: string;
  status: string;
  billing_date: string;
  paid_at: string | null;
}

interface SubscriptionManagementProps {
  apiFetch: (url: string, options?: any) => Promise<Response>;
  product: string;
  currentPlan: string;
  initialSku?: HubSku;
  initialCycle?: HubCycle;
  onBusyChange?: (busy: boolean) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  authorized: { label: 'Ativa', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  pending: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-50' },
  paused: { label: 'Pausada', color: 'text-orange-700', bg: 'bg-orange-50' },
  cancelled: { label: 'Cancelada', color: 'text-slate-500', bg: 'bg-slate-50' },
  expired: { label: 'Expirada', color: 'text-red-700', bg: 'bg-red-50' },
};

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function cycleFromSubscription(sub: Subscription | null): HubCycle {
  const type = String(sub?.frequency_type || '').toLowerCase();
  if (type.startsWith('year')) return 'yearly';
  if (type.startsWith('month') && Number(sub?.frequency) === 12) return 'yearly';
  return 'monthly';
}

function amountUnit(cycle: HubCycle): string {
  return cycle === 'yearly' ? '/ano' : '/mês';
}

export function SubscriptionManagement({
  apiFetch,
  product,
  currentPlan,
  initialSku,
  initialCycle = 'yearly',
  onBusyChange,
}: SubscriptionManagementProps) {
  const isAcademy = product === 'academy';
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [busySku, setBusySku] = useState<HubSku | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<HubCycle>(initialCycle);
  const [selectedSku, setSelectedSku] = useState<HubSku | undefined>(initialSku);

  useEffect(() => {
    setCycle(initialCycle);
  }, [initialCycle]);

  useEffect(() => {
    setSelectedSku(initialSku);
  }, [initialSku]);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/subscriptions/me?product=${product}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  }, [apiFetch, product]);

  const fetchPlans = useCallback(async () => {
    try {
      const fullUrl = `${API_URL}/api/subscriptions/plans`;
      const res = await fetch(fullUrl);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.filter((p: SubscriptionPlan) => p.product === product));
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  }, [product]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSubscription(), fetchPlans()]);
      setLoading(false);
    };
    load();
  }, [fetchSubscription, fetchPlans]);

  const redirectToCheckout = (initPoint: string) => {
    window.location.href = initPoint;
  };

  const handleCreateHub = async (sku: HubSku, chosenCycle: HubCycle) => {
    setCreateLoading(true);
    setBusySku(sku);
    setError(null);
    onBusyChange?.(true);
    try {
      const result = await startHubCheckout(apiFetch, sku, chosenCycle, plans);
      if (result.error) setError(result.error);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar assinatura');
    } finally {
      setCreateLoading(false);
      setBusySku(null);
      onBusyChange?.(false);
    }
  };

  const handleCreateAcademy = async (planId: number) => {
    setCreateLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/subscriptions/create', {
        method: 'POST',
        body: JSON.stringify({ product, plan_id: planId }),
      });
      const data = await res.json();
      if (res.ok && data.init_point) {
        redirectToCheckout(data.init_point);
      } else {
        setError(data.error || 'Erro ao criar assinatura');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar assinatura');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setCreateLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/subscriptions/resume', {
        method: 'POST',
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (res.ok && data.init_point) {
        redirectToCheckout(data.init_point);
      } else {
        setError(data.error || 'Erro ao retomar assinatura');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao retomar assinatura');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/subscriptions/cancel', {
        method: 'POST',
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchSubscription();
        setShowCancelConfirm(false);
      } else {
        setError(data.error || 'Erro ao cancelar assinatura');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar assinatura');
    } finally {
      setCancelLoading(false);
    }
  };

  const access = useMemo(
    () =>
      resolveHubAccess({
        plan: currentPlan as LegacyHubPlan,
        subscriptionStatus: subscription?.status,
        subscriptionPlanType: subscription?.plan_type,
        subscriptionAmount: subscription?.amount,
      }),
    [currentPlan, subscription],
  );

  const notice = isAcademy ? null : migrationNotice(access);
  const isProActive = subscription?.status === 'authorized' || subscription?.status === 'paused';
  const isPending = subscription?.status === 'pending';
  const hasSubscriptionCard = isProActive || isPending;
  const statusInfo = subscription ? STATUS_MAP[subscription.status] || STATUS_MAP.pending : null;
  const subCycle = cycleFromSubscription(subscription);
  const hubDisplayName = isAcademy
    ? subscription?.plan_name || 'Academy'
    : displayHubName(access.sku);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-10 bg-slate-50 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  if (isAcademy) {
    const isFree = currentPlan === 'free';
    const paidPlan = plans.find((p) => p.plan !== 'free');
    const subscribeCtaLabel = `Assinar ${paidPlan?.name || 'agora'}`;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[28px] overflow-hidden">
          <div className="px-6 py-4 bg-[#f5f5f7]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProActive ? 'bg-primary/15 text-primary' : isPending ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.025em] text-[#1d1d1f]">Minha assinatura</h3>
                  <p className="text-[11px] text-slate-400">
                    Academy — {isProActive ? subscription?.plan_name || 'Ilimitado' : 'Grátis'}
                  </p>
                </div>
              </div>
              {statusInfo && hasSubscriptionCard && (
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusInfo.color} ${statusInfo.bg}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {isProActive && subscription && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[11px] text-[#86868b] mb-0.5">Valor</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(subscription.amount)}/mês</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[11px] text-[#86868b] mb-0.5">Status</p>
                    <p className={`text-sm font-bold ${statusInfo?.color}`}>{statusInfo?.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  Cancelar assinatura
                </button>
              </>
            )}

            {isPending && subscription && paidPlan && (
              <button
                onClick={handleResumeSubscription}
                disabled={createLoading}
                className="w-full apple-btn disabled:opacity-50"
              >
                {createLoading ? 'Processando...' : 'Continuar assinatura'}
              </button>
            )}

            {isFree && !isPending && !isProActive && paidPlan && (
              <button
                onClick={() => handleCreateAcademy(paidPlan.id)}
                disabled={createLoading}
                className="w-full apple-btn disabled:opacity-50"
              >
                {createLoading ? 'Processando...' : subscribeCtaLabel}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f] mb-2">Cancelar assinatura?</h3>
                <p className="text-[15px] text-[#86868b] leading-relaxed">
                  A renovação automática para. Você pode assinar de novo quando quiser.
                </p>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 apple-btn-light">Manter</button>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="flex-1 py-2.5 rounded-full bg-[#ff3b30] text-white text-[15px] font-medium disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelando...' : 'Cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[28px] overflow-hidden">
        <div className="px-6 py-4 bg-[#f5f5f7]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProActive ? 'bg-primary/15 text-primary' : isPending ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.025em] text-[#1d1d1f]">Minha assinatura</h3>
                <p className="text-[11px] text-[#86868b]">
                  {hubDisplayName}
                  {isProActive ? '' : access.onTrialFromFree ? ' · mês para usar, sem cobrança agora' : ''}
                </p>
              </div>
            </div>
            {statusInfo && hasSubscriptionCard && (
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusInfo.color} ${statusInfo.bg}`}>
                {statusInfo.label}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {notice && (
            <div className="rounded-[18px] bg-[#f5f5f7] p-4">
              <p className="text-[13px] text-[#1d1d1f] leading-relaxed">{notice}</p>
            </div>
          )}

          {isProActive && subscription && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-[#86868b] mb-0.5">Valor</p>
                  <p className="text-sm font-semibold text-[#1d1d1f]">
                    {formatCurrency(subscription.amount)}{amountUnit(subCycle)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-[#86868b] mb-0.5">Status</p>
                  <p className={`text-sm font-semibold ${statusInfo?.color}`}>{statusInfo?.label}</p>
                </div>
              </div>

              {(subscription.next_payment_date || subscription.start_date) && (
                <div className="space-y-2">
                  {subscription.start_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={12} className="text-slate-300" />
                      <span>Início: {formatDate(subscription.start_date)}</span>
                    </div>
                  )}
                  {subscription.next_payment_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={12} className="text-slate-300" />
                      <span>Próxima cobrança: {formatDate(subscription.next_payment_date)}</span>
                    </div>
                  )}
                </div>
              )}

              {subscription.grace_expires_at && subscription.status === 'authorized' && (
                <div className="bg-[#f5f5f7] rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-[#86868b] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#6e6e73]">Período incluso até {formatDate(subscription.grace_expires_at)}.</p>
                </div>
              )}

              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full p-3 rounded-xl text-xs font-medium text-[#86868b] hover:text-[#ff3b30] transition-all"
              >
                Cancelar assinatura
              </button>
            </>
          )}

          {isPending && subscription && (
            <div className="space-y-3">
              <div className="rounded-[18px] bg-amber-50 p-3 flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  A assinatura ainda não foi concluída. Você pode continuar de onde parou.
                </p>
              </div>
              <button
                onClick={handleResumeSubscription}
                disabled={createLoading}
                className="w-full apple-btn disabled:opacity-50"
              >
                {createLoading ? 'Processando...' : 'Continuar assinatura'}
              </button>
              <div className="flex items-center gap-2 text-[11px] text-[#86868b]">
                <Shield size={12} className="shrink-0" />
                <span>A renovação é automática. Cancele quando quiser.</span>
              </div>
            </div>
          )}

          {payments.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[13px] text-[#86868b] mb-3">Pagamentos recentes</h4>
              <div className="space-y-2">
                {payments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${payment.status === 'approved' ? 'bg-emerald-400' : payment.status === 'pending' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                      <span className="text-xs text-slate-600">{formatDate(payment.billing_date)}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-700">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[20px] md:rounded-[28px] p-4 md:p-10">
        <HubPlans
          cycle={cycle}
          selectedSku={selectedSku}
          currentSku={isProActive ? access.sku : null}
          busySku={busySku}
          onCycleChange={(next) => {
            setCycle(next);
          }}
          onSubscribe={(sku, chosenCycle) => {
            setSelectedSku(sku);
            setCycle(chosenCycle);
            void handleCreateHub(sku, chosenCycle);
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f] mb-2">Cancelar assinatura?</h3>
              <p className="text-[15px] text-[#86868b] leading-relaxed">
                A renovação automática para. Você pode assinar de novo quando quiser.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 apple-btn-light"
              >
                Manter
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 py-2.5 rounded-full bg-[#ff3b30] text-white text-[15px] font-medium hover:opacity-90 transition-all disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelando...' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
