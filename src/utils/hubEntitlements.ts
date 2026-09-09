import {
  HUB_PLANS,
  type HubCycle,
  type HubSku,
  hubPlanById,
} from '../data/hubPlans';

export type LegacyHubPlan =
  | 'free'
  | 'gratuito'
  | 'essencial'
  | 'pro'
  | 'student'
  | 'odontohub'
  | 'plus'
  | string
  | null
  | undefined;

export type HubFeature =
  | 'agenda'
  | 'confirmations'
  | 'records'
  | 'photos'
  | 'unlimited_patients'
  | 'today_list'
  | 'anticipating_intelligence'
  | 'auto_slots'
  | 'auto_returns'
  | 'cash_forecast'
  | 'today_action_panel';

const BASE_FEATURES: HubFeature[] = [
  'agenda',
  'confirmations',
  'records',
  'photos',
  'unlimited_patients',
  'today_list',
];

const PLUS_FEATURES: HubFeature[] = [
  ...BASE_FEATURES,
  'anticipating_intelligence',
  'auto_slots',
  'auto_returns',
  'cash_forecast',
  'today_action_panel',
];

const PLUS_ONLY = new Set<HubFeature>([
  'anticipating_intelligence',
  'auto_slots',
  'auto_returns',
  'cash_forecast',
  'today_action_panel',
]);

export type MigrationKind = 'trial_from_free' | 'essencial_to_odontohub' | 'pro_to_plus' | null;

export type CanonicalHubAccess = {
  sku: HubSku;
  plusEnabled: boolean;
  /** Paid (or grandfathered) Hub SKU — not the old free product. */
  subscribed: boolean;
  onTrialFromFree: boolean;
  migration: MigrationKind;
  displayName: string;
};

const OLD_ESSENCIAL_AMOUNTS = [49.9, 49.90];
const OLD_PRO_AMOUNTS = [99, 99.9, 99.90];

function amountClose(value: number, expected: number): boolean {
  return Math.abs(value - expected) < 0.05;
}

export function parsePlanAmount(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  return Number.isFinite(num) ? num : null;
}

export function isOldEssencialAmount(amount: number): boolean {
  return OLD_ESSENCIAL_AMOUNTS.some((expected) => amountClose(amount, expected));
}

export function isOldProAmount(amount: number): boolean {
  return OLD_PRO_AMOUNTS.some((expected) => amountClose(amount, expected));
}

/**
 * Map whatever the API still sends onto the two Hub SKUs.
 * Academy `student` is ignored here — Hub only.
 */
export function canonicalizeHubSku(plan: LegacyHubPlan): HubSku | 'trial' {
  const key = String(plan || 'free').trim().toLowerCase();
  if (key === 'plus' || key === 'pro') return 'plus';
  if (key === 'odontohub' || key === 'essencial') return 'odontohub';
  if (key === 'student') return 'odontohub';
  return 'trial';
}

export function displayHubName(sku: HubSku): string {
  return hubPlanById(sku).name;
}

export function resolveHubAccess(input: {
  plan?: LegacyHubPlan;
  subscriptionStatus?: string | null;
  subscriptionPlanType?: string | null;
  subscriptionAmount?: string | number | null;
}): CanonicalHubAccess {
  const status = String(input.subscriptionStatus || '').toLowerCase();
  const paidStatus = status === 'authorized' || status === 'paused';
  const rawPlan = input.subscriptionPlanType || input.plan;
  const amount = parsePlanAmount(input.subscriptionAmount);

  let sku: HubSku = 'odontohub';
  let migration: MigrationKind = null;
  let onTrialFromFree = false;

  const canonical = canonicalizeHubSku(rawPlan);

  if (canonical === 'plus' || (amount != null && isOldProAmount(amount))) {
    sku = 'plus';
    const fromLegacyPro =
      String(rawPlan || '').toLowerCase() === 'pro' || (amount != null && isOldProAmount(amount));
    if (fromLegacyPro) migration = 'pro_to_plus';
  } else if (canonical === 'odontohub') {
    sku = 'odontohub';
    const fromEssencial =
      String(rawPlan || '').toLowerCase() === 'essencial' ||
      (amount != null && isOldEssencialAmount(amount));
    if (fromEssencial) migration = 'essencial_to_odontohub';
  } else {
    sku = 'odontohub';
    onTrialFromFree = !paidStatus;
    migration = 'trial_from_free';
  }

  const subscribed = paidStatus || canonical === 'plus' || canonical === 'odontohub';
  const plusEnabled = sku === 'plus';

  return {
    sku,
    plusEnabled,
    subscribed: subscribed && !onTrialFromFree ? true : paidStatus,
    onTrialFromFree,
    migration,
    displayName: displayHubName(sku),
  };
}

export function hasHubFeature(sku: HubSku | 'trial', feature: HubFeature): boolean {
  const resolved: HubSku = sku === 'trial' ? 'odontohub' : sku;
  if (PLUS_ONLY.has(feature)) return resolved === 'plus';
  return BASE_FEATURES.includes(feature) || PLUS_FEATURES.includes(feature);
}

export function plusEnabledFromAccess(access: CanonicalHubAccess): boolean {
  return access.plusEnabled;
}

export function nextCycleAmount(sku: HubSku, cycle: HubCycle): number {
  const plan = hubPlanById(sku);
  return cycle === 'yearly' ? plan.yearly : plan.monthly;
}

export function migrationNotice(access: CanonicalHubAccess): string | null {
  if (access.migration === 'trial_from_free') {
    return 'Você tem um mês para usar o OdontoHub. Nada é cobrado agora. Quando quiser, escolha um plano.';
  }
  if (access.migration === 'essencial_to_odontohub') {
    return 'Você continua no OdontoHub. O valor atual vale até o fim deste ciclo. Depois, R$ 190 por mês ou R$ 1.900 por ano.';
  }
  if (access.migration === 'pro_to_plus') {
    return 'Você continua no OdontoHub+. O valor atual vale até o fim deste ciclo. Depois, R$ 290 por mês ou R$ 2.900 por ano.';
  }
  return null;
}

export function hubFeaturesForSku(sku: HubSku): readonly string[] {
  return hubPlanById(sku).features;
}

export { HUB_PLANS, PLUS_ONLY, BASE_FEATURES };
