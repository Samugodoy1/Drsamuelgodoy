import {
  HUB_FROM_LINE,
  HUB_HEADLINE,
  HUB_LEGAL_FOOTER,
  HUB_PLANS,
  brl,
  hubAmount,
  hubYearlyPerMonthLine,
  type HubCycle,
  type HubSku,
} from '../data/hubPlans';

export type HubPlansProps = {
  cycle: HubCycle;
  selectedSku?: HubSku;
  onCycleChange: (cycle: HubCycle) => void;
  onSubscribe: (sku: HubSku, cycle: HubCycle) => void;
  busySku?: HubSku | null;
  currentSku?: HubSku | null;
  compact?: boolean;
};

export function HubPlans({
  cycle,
  selectedSku,
  onCycleChange,
  onSubscribe,
  busySku = null,
  currentSku = null,
  compact = false,
}: HubPlansProps) {
  return (
    <div className={compact ? '' : 'w-full'}>
      {!compact && (
        <div className="text-center mb-10 md:mb-12">
          <h2 className="apple-display-ink text-[34px] md:text-[48px]">{HUB_HEADLINE}</h2>
          <p className="apple-subhead text-[17px] md:text-[21px] mt-4">{HUB_FROM_LINE}</p>
        </div>
      )}

      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-full bg-[#f5f5f7] p-1" role="tablist" aria-label="Ciclo da assinatura">
          {(
            [
              { id: 'monthly' as const, label: 'Mensal' },
              { id: 'yearly' as const, label: 'Anual' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={cycle === item.id}
              onClick={() => onCycleChange(item.id)}
              className="rounded-full px-5 py-2 text-[13px] font-medium transition-colors"
              style={
                cycle === item.id
                  ? { background: '#1d1d1f', color: '#f5f5f7' }
                  : { color: '#1d1d1f' }
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-stretch max-w-[820px] mx-auto">
        {HUB_PLANS.map((plan) => {
          const amount = hubAmount(plan, cycle);
          const unit = cycle === 'yearly' ? '/ano' : '/mês';
          const dark = plan.featured;
          const selected = selectedSku === plan.id;
          const current = currentSku === plan.id;
          const busy = busySku === plan.id;
          return (
            <div
              key={plan.id}
              className={`h-full rounded-[28px] p-8 md:p-10 flex flex-col ${
                dark ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7] text-[#1d1d1f]'
              } ${selected ? 'ring-2 ring-[#0071e3] ring-offset-2 ring-offset-white' : ''}`}
            >
              <h3 className="text-[24px] font-semibold tracking-tight">{plan.name}</h3>
              <p className={`mt-2 text-[15px] ${dark ? 'text-white/50' : 'text-[#86868b]'}`}>{plan.line}</p>
              <p className="mt-6 text-[40px] md:text-[44px] font-semibold tracking-tight tabular-nums leading-none">
                R$&nbsp;{brl(amount)}
                <span className={`text-[17px] font-normal ${dark ? 'text-white/40' : 'text-[#86868b]'}`}>
                  {unit}
                </span>
              </p>
              <p className={`text-[13px] mt-2 mb-8 ${dark ? 'text-white/40' : 'text-[#86868b]'}`}>
                {cycle === 'yearly' ? hubYearlyPerMonthLine(plan) : 'Cobrada no início de cada mês.'}
              </p>
              <ul className={`space-y-3 text-[14px] flex-grow mb-10 ${dark ? 'text-white/80' : 'text-[#1d1d1f]/80'}`}>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className={dark ? 'text-white/35' : 'text-[#86868b]'}>–</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onSubscribe(plan.id, cycle)}
                disabled={busy}
                className={`w-full disabled:opacity-50 ${dark ? 'apple-btn-light' : 'apple-btn'}`}
              >
                {busy ? 'Processando...' : current ? `Continuar com ${plan.name}` : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-[12px] text-[#86868b] max-w-[520px] mx-auto leading-relaxed">
        {HUB_LEGAL_FOOTER}
      </p>
    </div>
  );
}

export function HubPlansScreen({
  cycle,
  selectedSku,
  onCycleChange,
  onSubscribe,
  busySku,
  currentSku,
  notice,
  onContinue,
  continueLabel,
}: HubPlansProps & { notice?: string | null; onContinue?: () => void; continueLabel?: string }) {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] px-5 py-16 md:py-24">
      <div className="max-w-[980px] mx-auto">
        {notice && (
          <p className="mb-8 max-w-[560px] mx-auto text-center text-[15px] text-[#86868b] leading-relaxed">
            {notice}
          </p>
        )}
        <HubPlans
          cycle={cycle}
          selectedSku={selectedSku}
          onCycleChange={onCycleChange}
          onSubscribe={onSubscribe}
          busySku={busySku}
          currentSku={currentSku}
        />
        {onContinue && (
          <div className="mt-8 text-center">
            <button type="button" onClick={onContinue} className="text-[17px] text-[#2997ff]">
              {continueLabel || 'Continuar no OdontoHub ›'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
