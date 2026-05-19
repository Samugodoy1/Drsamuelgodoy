import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, ChevronRight, Shield, Clock, X, Zap } from '../icons';
import { API_URL } from '../config';

interface SubscriptionPlan {
  id: number;
  product: string;
  plan: string;
  name: string;
  description: string | null;
  amount: string;
  currency: string;
  frequency: number;
  frequency_type: string;
  active: boolean;
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

export function SubscriptionManagement({ apiFetch, product, currentPlan }: SubscriptionManagementProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/subscriptions/me?product=${product}`, { product });
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

  const handleCreateSubscription = async (planId: number) => {
    setCreateLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/subscriptions/create', {
        method: 'POST',
        product,
        body: JSON.stringify({ product, plan_id: planId }),
      });
      const data = await res.json();
      if (res.ok && data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError(data.error || 'Erro ao criar assinatura');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar assinatura');
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
        product,
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

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-10 bg-slate-50 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  const isFree = currentPlan === 'free';
  const hasActiveSubscription = subscription && ['authorized', 'pending', 'paused'].includes(subscription.status);
  const paidPlan = plans.find(p => p.plan !== 'free');
  const statusInfo = subscription ? STATUS_MAP[subscription.status] || STATUS_MAP.pending : null;

  return (
    <div className="space-y-4">
      {/* Subscription Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header gradient */}
        <div className={`px-6 py-4 ${hasActiveSubscription ? 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent' : 'bg-gradient-to-r from-slate-50 to-transparent'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasActiveSubscription ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Minha Assinatura</h3>
                <p className="text-[11px] text-slate-400">
                  {product === 'academy' ? 'Academy' : 'OdontoHub'} — {isFree && !hasActiveSubscription ? 'Plano Free' : subscription?.plan_name || 'Free'}
                </p>
              </div>
            </div>
            {statusInfo && hasActiveSubscription && (
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusInfo.color} ${statusInfo.bg}`}>
                {statusInfo.label}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Active subscription details */}
          {hasActiveSubscription && subscription && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Valor</p>
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(subscription.amount)}/mês</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
                  <p className={`text-sm font-bold ${statusInfo?.color}`}>{statusInfo?.label}</p>
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

              {subscription.status === 'pending' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">Aguardando confirmação de pagamento. Você permanece no plano Free até a aprovação.</p>
                </div>
              )}

              {subscription.grace_expires_at && subscription.status === 'authorized' && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-orange-700">Período de carência ativo até {formatDate(subscription.grace_expires_at)}.</p>
                </div>
              )}

              {/* Cancel button */}
              {['authorized', 'paused'].includes(subscription.status) && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  Cancelar assinatura
                </button>
              )}
            </>
          )}

          {/* Free plan — upgrade CTA */}
          {isFree && !hasActiveSubscription && paidPlan && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{paidPlan.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(paidPlan.amount)}/mês</p>
                  </div>
                </div>
                {paidPlan.description && (
                  <p className="text-xs text-slate-500 mb-3">{paidPlan.description}</p>
                )}
                <button
                  onClick={() => handleCreateSubscription(paidPlan.id)}
                  disabled={createLoading}
                  className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-[0_8px_24px_rgba(38,78,54,0.15)] hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {createLoading ? 'Processando...' : 'Assinar agora'}
                </button>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Shield size={12} className="shrink-0" />
                <span>Pagamento seguro via Mercado Pago. Cancele quando quiser.</span>
              </div>
            </div>
          )}

          {/* Cancelled / expired — resubscribe */}
          {subscription && ['cancelled', 'expired'].includes(subscription.status) && paidPlan && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-600">
                    Sua assinatura foi {subscription.status === 'cancelled' ? 'cancelada' : 'expirou'}{subscription.cancelled_at ? ` em ${formatDate(subscription.cancelled_at)}` : ''}.
                  </p>
                  {subscription.cancel_reason && subscription.cancel_reason !== 'user_request' && (
                    <p className="text-[11px] text-slate-400 mt-1">Motivo: {subscription.cancel_reason}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleCreateSubscription(paidPlan.id)}
                disabled={createLoading}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {createLoading ? 'Processando...' : 'Assinar novamente'}
              </button>
            </div>
          )}

          {/* Recent payments */}
          {payments.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Pagamentos recentes</h4>
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

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Cancelar assinatura?</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ao cancelar, seu plano será alterado para Free imediatamente. Você pode assinar novamente a qualquer momento.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Manter
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 py-2.5 rounded-full bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
