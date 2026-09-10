import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HUB_SELECTION,
  HUB_FROM_LINE,
  HUB_HEADLINE,
  HUB_LEGAL_FOOTER,
  HUB_NO_REFUND_LINE,
  HUB_PLANS,
  findMatchingHubApiPlan,
  hubChargeAfterTrialLine,
  hubCheckoutPayload,
  hubHeroFootnote,
  hubYearlyPerMonth,
  hubYearlyPerMonthLine,
  markShowPlansAfterSignup,
  parseHubPlanQuery,
  shouldShowPlansAfterSignup,
  storeCheckoutIntent,
  takeCheckoutIntent,
  toPublicPlanQuery,
  clearShowPlansAfterSignup,
} from './hubPlans';

describe('Hub catalog', () => {
  it('keeps the two SKUs and four prices of the landing', () => {
    expect(HUB_PLANS.map((p) => p.id)).toEqual(['odontohub', 'plus']);
    expect(HUB_PLANS[0]).toMatchObject({
      name: 'OdontoHub',
      monthly: 190,
      yearly: 1900,
      cta: 'Começar com OdontoHub',
    });
    expect(HUB_PLANS[1]).toMatchObject({
      name: 'OdontoHub+',
      monthly: 290,
      yearly: 2900,
      cta: 'Quero o OdontoHub+',
      featured: true,
    });
    expect(hubYearlyPerMonth(HUB_PLANS[0])).toBe(158);
    expect(hubYearlyPerMonth(HUB_PLANS[1])).toBe(242);
    expect(hubYearlyPerMonthLine(HUB_PLANS[0])).toBe('R$ 158/mês, cobrado anualmente.');
    expect(hubYearlyPerMonthLine(HUB_PLANS[1])).toBe('R$ 242/mês, cobrado anualmente.');
  });

  it('does not invent SKUs or reuse retired product names', () => {
    const blob = JSON.stringify(HUB_PLANS) + HUB_LEGAL_FOOTER;
    expect(blob).not.toMatch(/Essencial/i);
    expect(blob).not.toMatch(/Gratuito/i);
    expect(blob).not.toMatch(/49[,.]90/);
    expect(blob).not.toMatch(/99[,.]90/);
    expect(blob).not.toMatch(/150 pacientes/i);
    expect(blob).not.toMatch(/grátis para sempre/i);
    expect(blob).not.toMatch(/sem cartão/i);
    expect(blob.toLowerCase()).not.toContain('academy');
    expect(HUB_HEADLINE).toBe('1 mês incluso');
    expect(HUB_FROM_LINE).toMatch(/OdontoHub\+/);
    expect(HUB_LEGAL_FOOTER).toMatch(/OdontoHub\+/);
    expect(HUB_LEGAL_FOOTER).toMatch(/nada é cobrado agora/i);
    expect(HUB_LEGAL_FOOTER).toMatch(/Não trabalhamos com reembolso/);
    expect(HUB_NO_REFUND_LINE).toMatch(/Não trabalhamos com reembolso/);
    expect(HUB_LEGAL_FOOTER).not.toMatch(/renovação é automática/);
  });

  it('explains the included month before any charge', () => {
    expect(hubChargeAfterTrialLine(HUB_PLANS[0], 'monthly')).toBe(
      'Primeiro mês incluso. Depois, R$ 190/mês.',
    );
    expect(hubChargeAfterTrialLine(HUB_PLANS[0], 'yearly')).toBe(
      'Primeiro mês incluso. Depois, R$ 158/mês, cobrado anualmente.',
    );
    expect(hubHeroFootnote('monthly')).toMatch(/OdontoHub\+/);
    expect(hubHeroFootnote('monthly')).toMatch(/Nada é cobrado agora/);
    expect(hubHeroFootnote('yearly')).toMatch(/OdontoHub a partir de R\$ 190/);
    expect(hubHeroFootnote('yearly')).toMatch(/OdontoHub\+ a partir de R\$ 290/);
  });
});

describe('Landing query string', () => {
  it('maps public queries onto SKU and cycle', () => {
    expect(parseHubPlanQuery('odontohub')).toEqual({ sku: 'odontohub', cycle: 'monthly', fromQuery: true });
    expect(parseHubPlanQuery('odontohub-anual')).toEqual({ sku: 'odontohub', cycle: 'yearly', fromQuery: true });
    expect(parseHubPlanQuery('plus')).toEqual({ sku: 'plus', cycle: 'monthly', fromQuery: true });
    expect(parseHubPlanQuery('plus-anual')).toEqual({ sku: 'plus', cycle: 'yearly', fromQuery: true });
  });

  it('keeps old aliases off-screen and pointing at the new SKUs', () => {
    expect(parseHubPlanQuery('essencial')).toEqual({ sku: 'odontohub', cycle: 'monthly', fromQuery: true });
    expect(parseHubPlanQuery('essencial-anual')).toEqual({ sku: 'odontohub', cycle: 'yearly', fromQuery: true });
    expect(parseHubPlanQuery('pro')).toEqual({ sku: 'plus', cycle: 'monthly', fromQuery: true });
    expect(parseHubPlanQuery('pro-anual')).toEqual({ sku: 'plus', cycle: 'yearly', fromQuery: true });
    expect(toPublicPlanQuery('plus', 'monthly')).toBe('plus');
    expect(toPublicPlanQuery('plus', 'yearly')).toBe('plus-anual');
  });

  it('defaults to yearly OdontoHub when no query is present', () => {
    expect(parseHubPlanQuery(null)).toEqual(DEFAULT_HUB_SELECTION);
    expect(parseHubPlanQuery('')).toEqual(DEFAULT_HUB_SELECTION);
    expect(parseHubPlanQuery('unknown')).toEqual(DEFAULT_HUB_SELECTION);
    expect(DEFAULT_HUB_SELECTION.cycle).toBe('yearly');
    expect(DEFAULT_HUB_SELECTION.fromQuery).toBe(false);
  });
});

describe('Checkout payload', () => {
  it('sends sku, cycle, amount and the first-month trial', () => {
    expect(hubCheckoutPayload('odontohub', 'monthly')).toMatchObject({
      product: 'odontohub',
      plan: 'odontohub',
      cycle: 'monthly',
      amount: 190,
      currency: 'BRL',
      trial_days: 30,
    });
    expect(hubCheckoutPayload('plus', 'yearly', 44)).toMatchObject({
      plan: 'plus',
      cycle: 'yearly',
      amount: 2900,
      plan_id: 44,
      trial_days: 30,
    });
  });

  it('never binds a new purchase to the old R$ 99 price', () => {
    const apiPlans = [
      {
        id: 1,
        product: 'odontohub',
        plan: 'pro',
        amount: '99.00',
        frequency: 1,
        frequency_type: 'months',
        active: true,
      },
      {
        id: 2,
        product: 'academy',
        plan: 'student',
        amount: '25.00',
        frequency: 1,
        frequency_type: 'months',
        active: true,
      },
      {
        id: 10,
        product: 'odontohub',
        plan: 'plus',
        amount: '2900.00',
        frequency: 1,
        frequency_type: 'years',
        active: true,
      },
    ];
    expect(findMatchingHubApiPlan(apiPlans, 'plus', 'monthly')).toBeUndefined();
    expect(findMatchingHubApiPlan(apiPlans, 'plus', 'yearly')?.id).toBe(10);
    expect(findMatchingHubApiPlan(apiPlans, 'odontohub', 'monthly')).toBeUndefined();
  });
});

describe('Checkout intent', () => {
  it('stores a checkout intent until it is consumed', () => {
    const memory = new Map<string, string>();
    (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => { memory.set(k, v); },
      removeItem: (k: string) => { memory.delete(k); },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    };
    storeCheckoutIntent('plus', 'yearly');
    expect(takeCheckoutIntent()).toEqual({ sku: 'plus', cycle: 'yearly' });
    expect(takeCheckoutIntent()).toBeNull();
  });

  it('remembers to show plans only after a new account', () => {
    const memory = new Map<string, string>();
    (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => { memory.set(k, v); },
      removeItem: (k: string) => { memory.delete(k); },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    };
    expect(shouldShowPlansAfterSignup()).toBe(false);
    markShowPlansAfterSignup();
    expect(shouldShowPlansAfterSignup()).toBe(true);
    clearShowPlansAfterSignup();
    expect(shouldShowPlansAfterSignup()).toBe(false);
  });
});
