import { describe, expect, it } from 'vitest';
import { buildOnboardingDemo, getOnboardingDemoPatient, isOnboardingDemoId, ONBOARDING_DEMO_ID_BASE } from './demoSeed';

describe('buildOnboardingDemo', () => {
  it('builds the Clareza Viva home snapshot', () => {
    const now = new Date('2026-09-03T12:00:00');
    const demo = buildOnboardingDemo(now);

    expect(demo.patients).toHaveLength(6);
    expect(demo.patients.some((patient) => patient.name === 'Mariana Alves')).toBe(true);
    expect(demo.appointments.filter((appointment) => {
      const start = new Date(appointment.start_time);
      return start.toDateString() === now.toDateString();
    })).toHaveLength(2);
    expect(demo.appointments.some((appointment) => appointment.status === 'SCHEDULED' && new Date(appointment.start_time).getDate() === 4)).toBe(true);
    expect(demo.financialSummary.weekRevenue).toBe(2000);
    expect(demo.dashboardIntelligence.overdueReturns[0].patient_name).toBe('Mariana Alves');
    expect(demo.dashboardIntelligence.needsActionToday).toHaveLength(0);
    expect(demo.dashboardIntelligence.attentionNeeded).toHaveLength(0);
    expect(demo.dashboardIntelligence.abandonmentRisk).toHaveLength(1);
    expect(getOnboardingDemoPatient(ONBOARDING_DEMO_ID_BASE)?.name).toBe('Mariana Alves');
    expect(getOnboardingDemoPatient(ONBOARDING_DEMO_ID_BASE)?.odontogram?.[16]?.status).toBe('root_canal_needed');
    expect(isOnboardingDemoId(ONBOARDING_DEMO_ID_BASE)).toBe(true);
    expect(isOnboardingDemoId(1)).toBe(false);
  });
});
