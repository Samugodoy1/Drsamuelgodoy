import { useState } from 'react';
import {
  HUB_COMPARE_TITLE,
  HUB_FROM_LINE,
  HUB_HEADLINE,
  HUB_HERO_CTA,
  HUB_LEGAL_FOOTER,
  HUB_LEGAL_FOOTER_SUBSCRIBED,
  HUB_PLANS,
  HUB_PLUS_FOMO,
  HUB_SKIP,
  HUB_YEARLY_LINK,
  HUB_YEARLY_SAVINGS,
  brl,
  hubAmount,
  hubChargeAfterTrialLine,
  hubHeroFootnote,
  hubYearlyPerMonthLine,
  type HubCycle,
  type HubPlan,
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

function chargeLine(plan: HubPlan, cycle: HubCycle, trialIncluded: boolean): string {
  if (trialIncluded) return hubChargeAfterTrialLine(plan, cycle);
  return cycle === 'yearly' ? hubYearlyPerMonthLine(plan) : 'Cobrada no início de cada mês.';
}

function CycleToggle({
  cycle,
  onCycleChange,
  dark = false,
}: {
  cycle: HubCycle;
  onCycleChange: (cycle: HubCycle) => void;
  dark?: boolean;
}) {
  return (
    <div className="flex justify-center mb-4 md:mb-8">
      <div
        className={`inline-flex rounded-full p-1 ${dark ? 'bg-white/10' : 'bg-[#f5f5f7]'}`}
        role="tablist"
        aria-label="Ciclo da assinatura"
      >
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
            className="rounded-full px-4 py-1.5 md:px-5 md:py-2 text-[13px] font-medium transition-colors"
            style={
              cycle === item.id
                ? dark
                  ? { background: '#f5f5f7', color: '#1d1d1f' }
                  : { background: '#1d1d1f', color: '#f5f5f7' }
                : dark
                  ? { color: '#f5f5f7' }
                  : { color: '#1d1d1f' }
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Product-in-use collage — same job as the Fitness+ photos: you already see yourself inside. */
function DesireMosaic() {
  return (
    <div className="grid grid-cols-2 gap-1.5 max-w-[420px] mx-auto">
      <div className="rounded-[14px] overflow-hidden bg-[#1c2333] p-2.5 min-h-[78px] flex flex-col justify-between">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Agenda</p>
        <div>
          <p className="text-[13px] text-white font-medium leading-tight">09:30 · Marina</p>
          <p className="text-[11px] text-[#30d158] mt-0.5">Confirmada</p>
        </div>
      </div>
      <div className="rounded-[14px] overflow-hidden bg-[#2a1f18] p-2.5 min-h-[78px] flex flex-col justify-between">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">O dia</p>
        <div>
          <p className="text-[22px] text-white font-semibold tracking-tight leading-none">4</p>
          <p className="text-[11px] text-white/55 mt-1">pela frente</p>
        </div>
      </div>
      <div className="col-span-2 rounded-[14px] overflow-hidden bg-[#14261c] px-3 py-2.5 min-h-[60px]">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1.5">Lista</p>
        <div className="flex gap-2">
          {['João', 'Helena', 'Rafael'].map((name) => (
            <span
              key={name}
              className="flex-1 rounded-full bg-white/10 text-center text-[11px] text-white/80 py-1"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-[14px] overflow-hidden bg-[#231a2e] p-2.5 min-h-[72px] flex flex-col justify-between">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Prontuário</p>
        <div className="flex gap-1 mt-1.5">
          <span className="h-7 flex-1 rounded-md bg-white/15" />
          <span className="h-7 flex-1 rounded-md bg-white/10" />
          <span className="h-7 flex-1 rounded-md bg-white/20" />
        </div>
      </div>
      <div className="rounded-[14px] overflow-hidden bg-[#3a2208] p-2.5 min-h-[72px] flex flex-col justify-between">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#ccf53f]/70">Plus</p>
        <div>
          <p className="text-[13px] text-white font-medium leading-tight">Encaixe 16:40</p>
          <p className="text-[11px] text-white/50 mt-0.5">antes de escapar</p>
        </div>
      </div>
    </div>
  );
}

function PlanCards({
  cycle,
  selectedSku,
  currentSku,
  busySku,
  trialIncluded,
  onSubscribe,
  dark,
}: {
  cycle: HubCycle;
  selectedSku?: HubSku;
  currentSku?: HubSku | null;
  busySku?: HubSku | null;
  trialIncluded: boolean;
  onSubscribe: (sku: HubSku, cycle: HubCycle) => void;
  dark?: boolean;
}) {
  return (
    <>
      <div className="md:hidden space-y-2.5 max-w-[420px] mx-auto">
        {HUB_PLANS.map((plan) => {
          const amount = hubAmount(plan, cycle);
          const unit = cycle === 'yearly' ? '/ano' : '/mês';
          const featured = plan.featured;
          const selected = selectedSku === plan.id;
          const current = currentSku === plan.id;
          const busy = busySku === plan.id;
          const cardDark = dark || featured;
          return (
            <div
              key={plan.id}
              className={`rounded-[16px] px-4 py-3.5 ${
                cardDark ? 'bg-[#1c1c1e] text-white' : 'bg-[#f5f5f7] text-[#1d1d1f]'
              } ${selected ? 'ring-2 ring-[#ccf53f]' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-semibold tracking-tight">{plan.name}</h3>
                <p className="text-[15px] font-semibold tabular-nums shrink-0">
                  R$&nbsp;{brl(amount)}
                  <span className={`text-[12px] font-normal ${cardDark ? 'text-white/40' : 'text-[#86868b]'}`}>
                    {unit}
                  </span>
                </p>
              </div>
              <p className={`text-[12px] mt-0.5 ${cardDark ? 'text-white/50' : 'text-[#86868b]'}`}>{plan.line}</p>
              <p className={`text-[11px] mt-1 leading-snug ${cardDark ? 'text-white/40' : 'text-[#86868b]'}`}>
                {chargeLine(plan, cycle, trialIncluded)}
                {cycle === 'yearly' ? ` ${HUB_YEARLY_SAVINGS[plan.id]}` : ''}
              </p>
              <p className={`text-[12px] mt-2 leading-snug ${cardDark ? 'text-white/75' : 'text-[#1d1d1f]/75'}`}>
                {plan.features.join(' · ')}
              </p>
              <button
                type="button"
                onClick={() => onSubscribe(plan.id, cycle)}
                disabled={busy}
                className={`mt-3 w-full disabled:opacity-50 rounded-full text-[14px] py-2.5 px-4 font-medium ${
                  featured
                    ? 'bg-[#ccf53f] text-black'
                    : cardDark
                      ? 'bg-white text-black'
                      : 'bg-[#1d1d1f] text-white'
                }`}
              >
                {busy ? 'Processando...' : current ? `Continuar com ${plan.name}` : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div className="hidden md:grid grid-cols-2 gap-5 items-stretch max-w-[820px] mx-auto">
        {HUB_PLANS.map((plan) => {
          const amount = hubAmount(plan, cycle);
          const unit = cycle === 'yearly' ? '/ano' : '/mês';
          const featured = plan.featured;
          const selected = selectedSku === plan.id;
          const current = currentSku === plan.id;
          const busy = busySku === plan.id;
          const cardDark = dark || featured;
          return (
            <div
              key={plan.id}
              className={`h-full rounded-[28px] p-10 flex flex-col ${
                cardDark ? 'bg-[#1c1c1e] text-white' : 'bg-[#f5f5f7] text-[#1d1d1f]'
              } ${selected ? 'ring-2 ring-[#ccf53f] ring-offset-2 ring-offset-black' : ''}`}
            >
              <h3 className="text-[24px] font-semibold tracking-tight">{plan.name}</h3>
              <p className={`mt-2 text-[15px] ${cardDark ? 'text-white/50' : 'text-[#86868b]'}`}>{plan.line}</p>
              <p className="mt-6 text-[44px] font-semibold tracking-tight tabular-nums leading-none">
                R$&nbsp;{brl(amount)}
                <span className={`text-[17px] font-normal ${cardDark ? 'text-white/40' : 'text-[#86868b]'}`}>
                  {unit}
                </span>
              </p>
              <p className={`text-[13px] mt-2 mb-8 ${cardDark ? 'text-white/40' : 'text-[#86868b]'}`}>
                {chargeLine(plan, cycle, trialIncluded)}
                {cycle === 'yearly' ? ` ${HUB_YEARLY_SAVINGS[plan.id]}` : ''}
              </p>
              <ul className={`space-y-3 text-[14px] flex-grow mb-10 ${cardDark ? 'text-white/80' : 'text-[#1d1d1f]/80'}`}>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className={cardDark ? 'text-white/35' : 'text-[#86868b]'}>–</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onSubscribe(plan.id, cycle)}
                disabled={busy}
                className={`w-full disabled:opacity-50 rounded-full py-3 text-[17px] font-medium ${
                  featured
                    ? 'bg-[#ccf53f] text-black'
                    : cardDark
                      ? 'bg-white text-black'
                      : 'bg-[#1d1d1f] text-white'
                }`}
              >
                {busy ? 'Processando...' : current ? `Continuar com ${plan.name}` : plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function HubPlans({
  cycle,
  selectedSku,
  onCycleChange,
  onSubscribe,
  busySku = null,
  currentSku = null,
  compact = false,
}: HubPlansProps) {
  const trialIncluded = currentSku == null;

  return (
    <div className={compact ? '' : 'w-full'}>
      {!compact && (
        <div className="text-center mb-4 md:mb-10">
          <h2 className="apple-display-ink text-[22px] md:text-[40px] leading-tight">{HUB_COMPARE_TITLE}</h2>
        </div>
      )}
      <CycleToggle cycle={cycle} onCycleChange={onCycleChange} />
      <PlanCards
        cycle={cycle}
        selectedSku={selectedSku}
        currentSku={currentSku}
        busySku={busySku}
        trialIncluded={trialIncluded}
        onSubscribe={onSubscribe}
      />
      <p className="mt-4 md:mt-10 text-center text-[11px] md:text-[12px] text-[#86868b] max-w-[520px] mx-auto leading-relaxed">
        {trialIncluded ? HUB_LEGAL_FOOTER : HUB_LEGAL_FOOTER_SUBSCRIBED}
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
  const trialIncluded = currentSku == null;
  const [showCompare, setShowCompare] = useState(!trialIncluded || selectedSku === 'plus');

  const openYearly = () => {
    onCycleChange('yearly');
    setShowCompare(true);
  };

  if (!trialIncluded) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] px-3 py-5 sm:px-5 sm:py-12 md:py-24">
        <div className="max-w-[980px] mx-auto">
          {notice && (
            <p className="mb-4 md:mb-8 max-w-[560px] mx-auto text-center text-[13px] md:text-[15px] text-[#86868b] leading-relaxed">
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
            <div className="mt-5 md:mt-8 text-center">
              <button type="button" onClick={onContinue} className="text-[15px] md:text-[17px] text-[#2997ff]">
                {continueLabel || HUB_SKIP}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-8 pb-[calc(28px+env(safe-area-inset-bottom))] sm:px-8 sm:py-14">
      <div className="max-w-[430px] md:max-w-[820px] mx-auto">
        <p className="text-center text-[13px] tracking-[0.04em] text-white/55 mb-5">OdontoHub</p>

        {!showCompare && (
          <>
            <div className="relative">
              <DesireMosaic />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
            </div>

            <div className="text-center mt-8 md:mt-10">
              <h1 className="apple-display text-[34px] sm:text-[40px] md:text-[48px]">{HUB_HEADLINE}</h1>
              <p className="mt-3 text-[15px] sm:text-[17px] text-white/55 leading-snug max-w-[340px] mx-auto">
                {HUB_FROM_LINE}
              </p>
            </div>

            <div className="mt-8 max-w-[400px] mx-auto">
              <button
                type="button"
                onClick={() => onSubscribe('odontohub', cycle)}
                disabled={busySku === 'odontohub'}
                className="w-full rounded-full bg-[#ccf53f] text-black text-[17px] font-semibold py-3.5 disabled:opacity-50"
              >
                {busySku === 'odontohub' ? 'Processando...' : HUB_HERO_CTA}
              </button>
              <p className="mt-3 text-center text-[12px] text-white/45 leading-snug">
                {hubHeroFootnote(cycle)}
              </p>
              <button
                type="button"
                onClick={openYearly}
                className="mt-4 mx-auto flex items-center gap-1 text-[14px] text-white/70"
              >
                {HUB_YEARLY_LINK}
                <span aria-hidden>›</span>
              </button>
              <p className="mt-6 text-center text-[13px] text-white/40 leading-snug">{HUB_PLUS_FOMO}</p>
              <button
                type="button"
                onClick={() => onSubscribe('plus', cycle)}
                disabled={busySku === 'plus'}
                className="mt-3 w-full rounded-full bg-white/10 text-white text-[15px] font-medium py-3 disabled:opacity-50"
              >
                {busySku === 'plus' ? 'Processando...' : HUB_PLANS[1].cta}
              </button>
            </div>
          </>
        )}

        {showCompare && (
          <>
            <h2 className="apple-display text-[28px] md:text-[40px] text-center mb-2">{HUB_COMPARE_TITLE}</h2>
            <p className="text-center text-[14px] text-white/50 mb-6 max-w-[360px] mx-auto">{HUB_PLUS_FOMO}</p>
            <CycleToggle cycle={cycle} onCycleChange={onCycleChange} dark />
            <PlanCards
              cycle={cycle}
              selectedSku={selectedSku}
              currentSku={currentSku}
              busySku={busySku}
              trialIncluded={trialIncluded}
              onSubscribe={onSubscribe}
              dark
            />
            <p className="mt-6 text-center text-[11px] text-white/40 max-w-[520px] mx-auto leading-relaxed">
              {HUB_LEGAL_FOOTER}
            </p>
          </>
        )}

        {onContinue && (
          <div className="mt-8 text-center">
            <button type="button" onClick={onContinue} className="text-[14px] text-white/35">
              {continueLabel || HUB_SKIP}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
