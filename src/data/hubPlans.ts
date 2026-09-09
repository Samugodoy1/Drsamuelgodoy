/**
 * Canonical Hub catalog — the same product as www.odontohub.app.br.
 * Do not invent SKUs. Academy is out of scope.
 */

export const HUB_PRODUCT = 'odontohub' as const;

export type HubSku = 'odontohub' | 'plus';
export type HubCycle = 'monthly' | 'yearly';

export type HubPlan = {
  id: HubSku;
  name: string;
  monthly: number;
  yearly: number;
  line: string;
  cta: string;
  featured: boolean;
  features: readonly string[];
};

export const HUB_PLANS: HubPlan[] = [
  {
    id: 'odontohub',
    name: 'OdontoHub',
    monthly: 190,
    yearly: 1900,
    line: 'O sistema para o consultório.',
    cta: 'Assinar OdontoHub',
    featured: false,
    features: [
      'Agenda e confirmações',
      'Prontuário e fotos',
      'Pacientes ilimitados',
      'O dia, numa lista',
    ],
  },
  {
    id: 'plus',
    name: 'OdontoHub+',
    monthly: 290,
    yearly: 2900,
    line: 'Inteligência. O dia, resolvido.',
    cta: 'Assinar OdontoHub+',
    featured: true,
    features: [
      'Tudo no OdontoHub',
      'A inteligência que antecipa',
      'Encaixes e retornos',
      'Previsão de caixa',
    ],
  },
];

export const HUB_FROM_MONTHLY = HUB_PLANS[0].monthly;

export const HUB_HEADLINE = 'Escolha o seu plano.';
export const HUB_FROM_LINE = 'O primeiro mês está incluso. Nada é cobrado agora.';
export const HUB_NO_REFUND_LINE =
  'Não trabalhamos com reembolso. Valores pagos não são devolvidos.';
export const HUB_LEGAL_FOOTER =
  'O primeiro mês entra na primeira assinatura. Nada é cobrado nesse período. Depois, segue o valor do plano escolhido. Cancele quando quiser. Não trabalhamos com reembolso. OdontoHub+ inclui tudo o que está no OdontoHub.';
export const HUB_LEGAL_FOOTER_SUBSCRIBED =
  'Cancele quando quiser. Não trabalhamos com reembolso. OdontoHub+ inclui tudo o que está no OdontoHub.';

export const HUB_TRIAL_DAYS = 30;
export const HUB_CURRENCY = 'BRL';

/** Query values shown in the product. Aliases stay off-screen. */
const PUBLIC_PLAN_QUERY: Record<string, { sku: HubSku; cycle: HubCycle }> = {
  odontohub: { sku: 'odontohub', cycle: 'monthly' },
  'odontohub-anual': { sku: 'odontohub', cycle: 'yearly' },
  plus: { sku: 'plus', cycle: 'monthly' },
  'plus-anual': { sku: 'plus', cycle: 'yearly' },
};

/** Old landing links. Never display these names. */
const PLAN_QUERY_ALIASES: Record<string, { sku: HubSku; cycle: HubCycle }> = {
  essencial: { sku: 'odontohub', cycle: 'monthly' },
  'essencial-anual': { sku: 'odontohub', cycle: 'yearly' },
  pro: { sku: 'plus', cycle: 'monthly' },
  'pro-anual': { sku: 'plus', cycle: 'yearly' },
};

export type HubPlanSelection = {
  sku: HubSku;
  cycle: HubCycle;
  /** True when the URL named a SKU (including aliases). False = catalog default (yearly). */
  fromQuery: boolean;
};

export const DEFAULT_HUB_SELECTION: HubPlanSelection = {
  sku: 'odontohub',
  cycle: 'yearly',
  fromQuery: false,
};

const PLAN_QUERY_MAP: Record<string, { sku: HubSku; cycle: HubCycle }> = {
  ...PUBLIC_PLAN_QUERY,
  ...PLAN_QUERY_ALIASES,
};

export function brl(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function hubPlanById(id: HubSku): HubPlan {
  return HUB_PLANS.find((plan) => plan.id === id) ?? HUB_PLANS[0];
}

export function hubAmount(plan: HubPlan, cycle: HubCycle): number {
  return cycle === 'yearly' ? plan.yearly : plan.monthly;
}

export function hubYearlyPerMonth(plan: HubPlan): number {
  return Math.round(plan.yearly / 12);
}

export function hubYearlyPerMonthLine(plan: HubPlan): string {
  return `R$ ${brl(hubYearlyPerMonth(plan))}/mês, cobrado anualmente.`;
}

export function hubChargeAfterTrialLine(plan: HubPlan, cycle: HubCycle): string {
  if (cycle === 'yearly') {
    return `Primeiro mês incluso. Depois, ${hubYearlyPerMonthLine(plan)}`;
  }
  return `Primeiro mês incluso. Depois, R$ ${brl(plan.monthly)}/mês.`;
}

export function toPublicPlanQuery(sku: HubSku, cycle: HubCycle): string {
  return cycle === 'yearly' ? `${sku}-anual` : sku;
}

export function parseHubPlanQuery(raw: string | null | undefined): HubPlanSelection {
  if (raw == null || String(raw).trim() === '') {
    return { ...DEFAULT_HUB_SELECTION };
  }
  const key = String(raw).trim().toLowerCase();
  const match = PLAN_QUERY_MAP[key];
  if (!match) return { ...DEFAULT_HUB_SELECTION };
  return { sku: match.sku, cycle: match.cycle, fromQuery: true };
}

export function isPublicPlanQuery(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  return Object.prototype.hasOwnProperty.call(PUBLIC_PLAN_QUERY, String(raw).trim().toLowerCase());
}

export type HubApiPlan = {
  id: number;
  product: string;
  plan: string;
  name?: string;
  amount: string | number;
  currency?: string;
  frequency: number;
  frequency_type: string;
  active?: boolean;
};

function amountNumber(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  return Number.isFinite(num) ? num : NaN;
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05;
}

function isYearlyFrequency(plan: HubApiPlan): boolean {
  const type = String(plan.frequency_type || '').toLowerCase();
  if (type.startsWith('year')) return Number(plan.frequency) === 1;
  if (type.startsWith('month')) return Number(plan.frequency) === 12;
  return false;
}

function isMonthlyFrequency(plan: HubApiPlan): boolean {
  const type = String(plan.frequency_type || '').toLowerCase();
  return type.startsWith('month') && Number(plan.frequency) === 1;
}

/**
 * Bind a catalog SKU+cycle to a live API price only when the amount matches.
 * Never reuse the old R$ 99 / R$ 49.90 price IDs for a new purchase.
 */
export function findMatchingHubApiPlan(
  plans: HubApiPlan[],
  sku: HubSku,
  cycle: HubCycle,
): HubApiPlan | undefined {
  const catalog = hubPlanById(sku);
  const expected = hubAmount(catalog, cycle);
  const skuAliases = sku === 'plus' ? ['plus'] : ['odontohub'];

  return plans.find((plan) => {
    if (plan.product && plan.product !== HUB_PRODUCT) return false;
    if (plan.active === false) return false;
    if (!amountsMatch(amountNumber(plan.amount), expected)) return false;
    const cycleOk = cycle === 'yearly' ? isYearlyFrequency(plan) : isMonthlyFrequency(plan);
    if (!cycleOk) return false;
    const planKey = String(plan.plan || '').toLowerCase();
    return skuAliases.includes(planKey) || planKey === '';
  });
}

export function hubCheckoutPayload(sku: HubSku, cycle: HubCycle, apiPlanId?: number) {
  const catalog = hubPlanById(sku);
  return {
    product: HUB_PRODUCT,
    plan: sku,
    cycle,
    amount: hubAmount(catalog, cycle),
    currency: HUB_CURRENCY,
    frequency: 1,
    frequency_type: cycle === 'yearly' ? 'years' : 'months',
    trial_days: HUB_TRIAL_DAYS,
    ...(apiPlanId != null ? { plan_id: apiPlanId } : {}),
  };
}

export async function startHubCheckout(
  apiFetch: (url: string, options?: { method?: string; body?: string }) => Promise<Response>,
  sku: HubSku,
  cycle: HubCycle,
  apiPlans: HubApiPlan[] = [],
): Promise<{ error?: string }> {
  const match = findMatchingHubApiPlan(apiPlans, sku, cycle);
  const payload = hubCheckoutPayload(sku, cycle, match?.id);
  const res = await apiFetch('/api/subscriptions/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({} as { error?: string; init_point?: string }));
  if (res.ok && data.init_point) {
    window.location.href = data.init_point;
    return {};
  }
  return { error: data.error || 'Erro ao criar assinatura' };
}

export const CHECKOUT_INTENT_STORAGE_KEY = 'odontohub.checkoutIntent';
export const PLAN_QUERY_STORAGE_KEY = 'odontohub.planQuery';

export function storeCheckoutIntent(sku: HubSku, cycle: HubCycle): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(CHECKOUT_INTENT_STORAGE_KEY, `${sku}:${cycle}`);
  } catch {
    /* ignore */
  }
}

export function takeCheckoutIntent(): { sku: HubSku; cycle: HubCycle } | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_INTENT_STORAGE_KEY);
    sessionStorage.removeItem(CHECKOUT_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const [sku, cycle] = raw.split(':');
    if ((sku === 'odontohub' || sku === 'plus') && (cycle === 'monthly' || cycle === 'yearly')) {
      return { sku, cycle };
    }
    return null;
  } catch {
    return null;
  }
}
export const PLANS_DISMISSED_STORAGE_KEY = 'odontohub.plansDismissed';
export const SHOW_PLANS_AFTER_SIGNUP_KEY = 'odontohub.showPlansAfterSignup';

export function markShowPlansAfterSignup(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SHOW_PLANS_AFTER_SIGNUP_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearShowPlansAfterSignup(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(SHOW_PLANS_AFTER_SIGNUP_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldShowPlansAfterSignup(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(SHOW_PLANS_AFTER_SIGNUP_KEY) === '1';
  } catch {
    return false;
  }
}

export function readStoredPlanQuery(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(PLAN_QUERY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storePlanQuery(raw: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(PLAN_QUERY_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
}

export function clearStoredPlanQuery(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(PLAN_QUERY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
