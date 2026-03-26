export function getPatientCardMeta(patient: any, appointments: any[], now: Date) {
  // Função idêntica à do App.tsx
  const lastVisitDate = getPatientLastVisitDate(patient, appointments);

  const hasActiveTreatment =
    (patient.treatmentPlan?.some(plan => plan.status === 'PLANEJADO' || plan.status === 'APROVADO') ?? false) ||
    appointments.some(app =>
      app.patient_id === patient.id &&
      new Date(app.start_time) > now &&
      app.status !== 'CANCELLED' && app.status !== 'FINISHED'
    );

  const scheduledAppointments = appointments
    .filter(app =>
      app.patient_id === patient.id &&
      (app.status === 'SCHEDULED' || app.status === 'CONFIRMED')
    )
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const nextVisitAppointment = scheduledAppointments.find(app => new Date(app.start_time) >= now) ?? null;
  const nextVisitDate: Date | null = nextVisitAppointment ? new Date(nextVisitAppointment.start_time) : null;

  const isInRecallProgram = lastVisitDate !== null;

  const daysSinceLastVisit = lastVisitDate
    ? Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
    : Number.POSITIVE_INFINITY;

  // Lead: nunca visitou, sem agendamento futuro, sem tratamento ativo
  const isLead = !isInRecallProgram && nextVisitDate === null && !hasActiveTreatment;

  return {
    isLead,
    lastVisitDate,
    hasActiveTreatment,
    nextVisitDate,
    isInRecallProgram,
    daysSinceLastVisit,
  };
}

function getPatientLastVisitDate(patient: any, appointments: any[]) {
  const finishedAppointments = appointments
    .filter(app => app.patient_id === patient.id && app.status === 'FINISHED')
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  if (finishedAppointments.length > 0) {
    return new Date(finishedAppointments[0].start_time);
  }

  if (patient.evolution && patient.evolution.length > 0) {
    const evolutionDates = patient.evolution
      .map(item => new Date(item.date))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return evolutionDates[0] || null;
  }

  return null;
}
