/** Local Clareza Viva demonstration used when POST /api/onboarding/demo-seed is missing. */

export const ONBOARDING_DEMO_ID_BASE = 900001;

export function isOnboardingDemoId(id: number | undefined | null): boolean {
  return typeof id === 'number' && id >= ONBOARDING_DEMO_ID_BASE && id < ONBOARDING_DEMO_ID_BASE + 100;
}

const isoAt = (base: Date, hours: number, minutes: number) => {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const addMinutes = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60_000);

const dateKey = (d: Date) => d.toLocaleDateString('en-CA');

export function buildOnboardingDemo(now = new Date()) {
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Keep two consultations on "today" even late at night: prefer upcoming slots,
  // otherwise park them earlier today so the home still looks full.
  const firstStart = addMinutes(now, 45);
  const secondStart = addMinutes(now, 150);
  const useRelativeToday = firstStart.getDate() === now.getDate() && secondStart.getDate() === now.getDate();
  const todayAppt1Start = useRelativeToday ? firstStart : new Date(isoAt(today, 10, 0));
  const todayAppt2Start = useRelativeToday ? secondStart : new Date(isoAt(today, 14, 30));

  const patients = [
    {
      id: ONBOARDING_DEMO_ID_BASE,
      name: 'Mariana Alves',
      cpf: '',
      phone: '11988880001',
      email: 'mariana.alves@demo.odontohub',
      is_demo: true,
    },
    {
      id: ONBOARDING_DEMO_ID_BASE + 1,
      name: 'João Pedro Almeida',
      cpf: '',
      phone: '11988880002',
      email: 'joao.almeida@demo.odontohub',
      is_demo: true,
    },
    {
      id: ONBOARDING_DEMO_ID_BASE + 2,
      name: 'Ana Carolina Souza',
      cpf: '',
      phone: '11988880003',
      email: 'ana.souza@demo.odontohub',
      is_demo: true,
    },
    {
      id: ONBOARDING_DEMO_ID_BASE + 3,
      name: 'Rafael Mendes',
      cpf: '',
      phone: '11988880004',
      email: 'rafael.mendes@demo.odontohub',
      is_demo: true,
    },
    {
      id: ONBOARDING_DEMO_ID_BASE + 4,
      name: 'Beatriz Lima',
      cpf: '',
      phone: '11988880005',
      email: 'beatriz.lima@demo.odontohub',
      is_demo: true,
    },
    {
      id: ONBOARDING_DEMO_ID_BASE + 5,
      name: 'Carlos Eduardo Santos',
      cpf: '',
      phone: '11988880006',
      email: 'carlos.santos@demo.odontohub',
      is_demo: true,
    },
  ];

  const appointments = [
    {
      id: ONBOARDING_DEMO_ID_BASE + 10,
      patient_id: patients[1].id,
      patient_name: patients[1].name,
      patient_phone: patients[1].phone,
      dentist_id: 0,
      dentist_name: '',
      start_time: todayAppt1Start.toISOString(),
      end_time: addMinutes(todayAppt1Start, 40).toISOString(),
      status: 'CONFIRMED' as const,
      notes: 'Limpeza e revisão',
      is_demo: true,
    },
    {
      id: ONBOARDING_DEMO_ID_BASE + 11,
      patient_id: patients[2].id,
      patient_name: patients[2].name,
      patient_phone: patients[2].phone,
      dentist_id: 0,
      dentist_name: '',
      start_time: todayAppt2Start.toISOString(),
      end_time: addMinutes(todayAppt2Start, 50).toISOString(),
      status: 'SCHEDULED' as const,
      notes: 'Restauração',
      is_demo: true,
    },
    {
      id: ONBOARDING_DEMO_ID_BASE + 12,
      patient_id: patients[3].id,
      patient_name: patients[3].name,
      patient_phone: patients[3].phone,
      dentist_id: 0,
      dentist_name: '',
      start_time: isoAt(tomorrow, 9, 0),
      end_time: isoAt(tomorrow, 9, 40),
      status: 'SCHEDULED' as const,
      notes: 'Avaliação inicial',
      is_demo: true,
    },
  ];

  const amounts = [450, 380, 420, 350, 400];
  const transactions = amounts.map((amount, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    return {
      id: ONBOARDING_DEMO_ID_BASE + 20 + index,
      dentist_id: 0,
      type: 'INCOME' as const,
      description: index === 0 ? 'Consulta + limpeza' : 'Procedimento clínico',
      category: 'Consultas',
      amount,
      payment_method: 'PIX',
      date: `${dateKey(day)}T12:00:00`,
      status: 'PAID',
      patient_id: patients[Math.min(index, patients.length - 1)].id,
      patient_name: patients[Math.min(index, patients.length - 1)].name,
      is_demo: true,
      created_at: day.toISOString(),
    };
  });

  const todayRevenue = amounts[0];
  const weekRevenue = amounts.reduce((sum, value) => sum + value, 0);

  const patientIntelligence = [
    {
      patient_id: patients[0].id,
      patient_name: patients[0].name,
      phone: patients[0].phone,
      photo_url: null,
      status: 'ATENCAO',
      priority: 'HIGH',
      priority_reason: 'Dor relatada e retorno atrasado',
      last_visit_date: dateKey(addMinutes(now, -14 * 24 * 60)),
      next_appointment_date: null,
      next_appointment_notes: null,
      days_since_last_visit: 14,
      has_active_treatment: true,
      has_future_appointment: false,
      pending_teeth: [16, 26],
      urgent_teeth: [16],
    },
    {
      patient_id: patients[5].id,
      patient_name: patients[5].name,
      phone: patients[5].phone,
      photo_url: null,
      status: 'ABANDONO',
      priority: 'MEDIUM',
      priority_reason: 'Sumiu no meio do tratamento',
      last_visit_date: dateKey(addMinutes(now, -45 * 24 * 60)),
      next_appointment_date: null,
      next_appointment_notes: null,
      days_since_last_visit: 45,
      has_active_treatment: true,
      has_future_appointment: false,
      pending_teeth: [36],
      urgent_teeth: [],
    },
  ];

  const dashboardIntelligence = {
    needsActionToday: [patientIntelligence[0]],
    abandonmentRisk: [patientIntelligence[1]],
    attentionNeeded: [patientIntelligence[0]],
    overdueReturns: [
      {
        patient_id: patients[0].id,
        patient_name: patients[0].name,
        phone: patients[0].phone,
        photo_url: null,
        return_date: dateKey(addMinutes(now, -3 * 24 * 60)),
        procedure_performed: 'Canal no 16',
        days_overdue: 3,
      },
    ],
    stats: {
      totalPatients: patients.length,
      inTreatment: 4,
      attention: 1,
      abandonment: 1,
      completed: 1,
    },
  };

  const freeSlot = addMinutes(now, 210);
  const slotStillToday = freeSlot.getDate() === now.getDate();
  const slotDate = slotStillToday ? freeSlot : addMinutes(tomorrow, 0);
  if (!slotStillToday) slotDate.setHours(15, 0, 0, 0);

  const schedulingSuggestions = [
    {
      patient: {
        patient_id: patients[4].id,
        patient_name: patients[4].name,
        phone: patients[4].phone,
        photo_url: null,
        status: 'EM_TRATAMENTO',
        priority: 'MEDIUM',
        priority_reason: 'Tratamento em andamento sem retorno marcado',
        last_visit_date: dateKey(addMinutes(now, -10 * 24 * 60)),
        next_appointment_date: null,
        next_appointment_notes: null,
        days_since_last_visit: 10,
        has_active_treatment: true,
        has_future_appointment: false,
        pending_teeth: [24],
        urgent_teeth: [],
      },
      suggested_slot: {
        date: dateKey(slotDate),
        start: slotDate.toTimeString().slice(0, 5),
        end: addMinutes(slotDate, 40).toTimeString().slice(0, 5),
      },
      reason: 'Horário livre que combina com o ritmo dela',
      procedure: 'Retorno de clareamento',
      duration_minutes: 40,
    },
  ];

  return {
    patients,
    appointments,
    transactions,
    financialSummary: { todayRevenue, weekRevenue },
    patientIntelligence,
    dashboardIntelligence,
    schedulingSuggestions,
  };
}

export type OnboardingDemoSnapshot = ReturnType<typeof buildOnboardingDemo>;
