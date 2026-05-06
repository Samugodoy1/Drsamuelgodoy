import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface SubscriptionCallbackProps {
  apiFetch: (url: string, options?: any) => Promise<Response>;
  product: string;
  onNavigate: () => void;
}

type CallbackStatus = 'loading' | 'success' | 'pending' | 'error';

export const SubscriptionCallback: React.FC<SubscriptionCallbackProps> = ({
  apiFetch,
  product,
  onNavigate,
}) => {
  const [status, setStatus] = useState<CallbackStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    const checkSubscription = async () => {
      try {
        const res = await apiFetch(`/api/subscriptions/me?product=${product}`);
        if (!res.ok) throw new Error('Erro ao verificar assinatura');
        const data = await res.json();

        if (cancelled) return;

        if (data.subscription?.status === 'authorized') {
          setStatus('success');
        } else if (data.subscription?.status === 'pending') {
          setStatus('pending');
        } else {
          setStatus('pending');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    // Pequeno delay para dar tempo ao webhook
    const timer = setTimeout(checkSubscription, 2000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [apiFetch, product]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-bold text-slate-800 mb-2">Processando pagamento...</h2>
            <p className="text-sm text-slate-500">Estamos verificando sua assinatura. Isso pode levar alguns segundos.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-50 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Assinatura ativada!</h2>
            <p className="text-sm text-slate-500 mb-6">
              Seu plano foi atualizado com sucesso. Aproveite todos os recursos premium!
            </p>
            <button
              onClick={onNavigate}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Ir para o sistema
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-50 mx-auto mb-4 flex items-center justify-center">
              <Clock size={32} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Pagamento em processamento</h2>
            <p className="text-sm text-slate-500 mb-2">
              Seu pagamento foi recebido e esta sendo processado pelo Mercado Pago.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Seu plano sera atualizado automaticamente assim que o pagamento for confirmado. Isso pode levar alguns minutos.
            </p>
            <button
              onClick={onNavigate}
              className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={14} />
              Voltar ao sistema
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 mx-auto mb-4 flex items-center justify-center">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Erro ao verificar</h2>
            <p className="text-sm text-slate-500 mb-6">
              Nao foi possivel verificar o status da sua assinatura. Tente novamente em alguns instantes.
            </p>
            <button
              onClick={onNavigate}
              className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={14} />
              Voltar ao sistema
            </button>
          </>
        )}
      </div>
    </div>
  );
};
