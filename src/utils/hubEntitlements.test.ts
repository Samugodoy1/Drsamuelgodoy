import { describe, expect, it } from 'vitest';
import {
  canonicalizeHubSku,
  hasHubFeature,
  migrationNotice,
  resolveHubAccess,
} from './hubEntitlements';

describe('Hub entitlements', () => {
  it('maps legacy plans onto the two SKUs without touching Academy', () => {
    expect(canonicalizeHubSku('pro')).toBe('plus');
    expect(canonicalizeHubSku('plus')).toBe('plus');
    expect(canonicalizeHubSku('essencial')).toBe('odontohub');
    expect(canonicalizeHubSku('odontohub')).toBe('odontohub');
    expect(canonicalizeHubSku('free')).toBe('trial');
    expect(canonicalizeHubSku('student')).toBe('odontohub');
  });

  it('keeps agenda and unlimited patients on both SKUs', () => {
    for (const sku of ['odontohub', 'plus', 'trial'] as const) {
      expect(hasHubFeature(sku, 'agenda')).toBe(true);
      expect(hasHubFeature(sku, 'confirmations')).toBe(true);
      expect(hasHubFeature(sku, 'records')).toBe(true);
      expect(hasHubFeature(sku, 'photos')).toBe(true);
      expect(hasHubFeature(sku, 'unlimited_patients')).toBe(true);
      expect(hasHubFeature(sku, 'today_list')).toBe(true);
    }
  });

  it('keeps intelligence, slots, returns and cash forecast on plus and on the trial month', () => {
    expect(hasHubFeature('odontohub', 'anticipating_intelligence')).toBe(false);
    expect(hasHubFeature('odontohub', 'auto_slots')).toBe(false);
    expect(hasHubFeature('odontohub', 'auto_returns')).toBe(false);
    expect(hasHubFeature('odontohub', 'cash_forecast')).toBe(false);
    expect(hasHubFeature('odontohub', 'today_action_panel')).toBe(false);

    expect(hasHubFeature('plus', 'anticipating_intelligence')).toBe(true);
    expect(hasHubFeature('plus', 'auto_slots')).toBe(true);
    expect(hasHubFeature('plus', 'auto_returns')).toBe(true);
    expect(hasHubFeature('plus', 'cash_forecast')).toBe(true);
    expect(hasHubFeature('plus', 'today_action_panel')).toBe(true);

    expect(hasHubFeature('trial', 'anticipating_intelligence')).toBe(true);
    expect(hasHubFeature('trial', 'auto_slots')).toBe(true);
    expect(hasHubFeature('trial', 'cash_forecast')).toBe(true);
  });

  it('does not take IA away from a legacy Pro subscriber still in the paid cycle', () => {
    const access = resolveHubAccess({
      plan: 'pro',
      subscriptionStatus: 'authorized',
      subscriptionPlanType: 'pro',
      subscriptionAmount: '99.90',
    });
    expect(access.sku).toBe('plus');
    expect(access.plusEnabled).toBe(true);
    expect(access.migration).toBe('pro_to_plus');
    expect(access.displayName).toBe('OdontoHub+');
    expect(migrationNotice(access)).toMatch(/OdontoHub\+/);
    expect(migrationNotice(access)).not.toMatch(/Pro/i);
    expect(migrationNotice(access)).toMatch(/R\$ 290/);
  });

  it('opens the first month with the full OdontoHub+, then they choose a plan', () => {
    const access = resolveHubAccess({ plan: 'free', subscriptionStatus: null });
    expect(access.sku).toBe('odontohub');
    expect(access.plusEnabled).toBe(true);
    expect(access.onTrialFromFree).toBe(true);
    expect(access.migration).toBe('trial_from_free');
    expect(migrationNotice(access)).toMatch(/OdontoHub\+/);
    expect(migrationNotice(access)).toMatch(/Nada é cobrado agora/);
    expect(migrationNotice(access)).not.toMatch(/renovação é automática/);
    expect(migrationNotice(access)).not.toMatch(/grátis para sempre/i);
    expect(migrationNotice(access)).not.toMatch(/Gratuito/);
  });

  it('does not leave Plus on a paying OdontoHub account', () => {
    const access = resolveHubAccess({
      plan: 'odontohub',
      subscriptionStatus: 'authorized',
    });
    expect(access.plusEnabled).toBe(false);
    expect(access.subscribed).toBe(true);
    expect(access.onTrialFromFree).toBe(false);
  });

  it('grandfathers Essencial onto OdontoHub at the paid cycle', () => {
    const access = resolveHubAccess({
      plan: 'essencial',
      subscriptionStatus: 'authorized',
      subscriptionAmount: '49.90',
    });
    expect(access.sku).toBe('odontohub');
    expect(access.plusEnabled).toBe(false);
    expect(access.migration).toBe('essencial_to_odontohub');
    expect(migrationNotice(access)).toMatch(/OdontoHub/);
    expect(migrationNotice(access)).not.toMatch(/Essencial/);
    expect(migrationNotice(access)).toMatch(/R\$ 190/);
  });
});
