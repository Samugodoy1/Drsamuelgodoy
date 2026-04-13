import { query } from '../utils/db.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ML Prediction Service — OdontoHub
// Três modelos preditivos baseados em dados históricos:
//   1. Previsão de agendamentos (no-show, melhor horário, demanda futura)
//   2. Previsão de inadimplência (risco de calote por paciente)
//   3. Sugestão de tratamentos frequentes (próximo provável tratamento)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppointmentPrediction {
  patient_id: number;
  patient_name: string;
  no_show_probability: number;        // 0-1
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  best_day_of_week: string | null;    // 'Segunda', 'Terça', etc.
  best_hour: number | null;           // 0-23
  avg_cancellation_rate: number;      // 0-1
  total_appointments: number;
  finished_count: number;
  no_show_count: number;
  cancelled_count: number;
  factors: string[];                  // human-readable factors
}

export interface DemandForecast {
  day_of_week: string;
  hour: number;
  expected_demand: number;            // average #appointments
  peak_label: 'BAIXA' | 'MEDIA' | 'ALTA';
  historical_count: number;
}

export interface DelinquencyPrediction {
  patient_id: number;
  patient_name: string;
  phone: string;
  risk_score: number;                 // 0-100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  total_plans: number;
  total_installments: number;
  paid_on_time: number;
  paid_late: number;
  overdue_count: number;
  avg_days_late: number;
  total_overdue_amount: number;
  payment_reliability: number;        // 0-1
  factors: string[];
}

export interface TreatmentSuggestion {
  patient_id: number;
  patient_name: string;
  suggested_treatments: Array<{
    procedure: string;
    confidence: number;               // 0-1
    reason: string;
    based_on: 'HISTORY' | 'SIMILAR_PATIENTS' | 'ODONTOGRAM' | 'TIME_PATTERN';
  }>;
}

export interface TreatmentTrend {
  procedure: string;
  total_count: number;
  last_30_days: number;
  last_90_days: number;
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
  avg_revenue: number;
}

export interface MLDashboardSummary {
  appointment_predictions: {
    high_risk_no_show: AppointmentPrediction[];
    demand_forecast: DemandForecast[];
    overall_no_show_rate: number;
    overall_cancellation_rate: number;
  };
  delinquency_predictions: {
    high_risk_patients: DelinquencyPrediction[];
    total_at_risk_amount: number;
    overall_reliability: number;
  };
  treatment_insights: {
    top_suggestions: TreatmentSuggestion[];
    trends: TreatmentTrend[];
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PREVISÃO DE AGENDAMENTOS
// ═══════════════════════════════════════════════════════════════════════════════

export async function predictAppointments(dentistId: number): Promise<{
  predictions: AppointmentPrediction[];
  demand_forecast: DemandForecast[];
  overall_no_show_rate: number;
  overall_cancellation_rate: number;
}> {
  // Buscar histórico de agendamentos por paciente
  const patientStats = await query(`
    SELECT
      p.id as patient_id,
      p.name as patient_name,
      COUNT(a.id) as total_appointments,
      COUNT(CASE WHEN a.status = 'FINISHED' THEN 1 END) as finished_count,
      COUNT(CASE WHEN a.status = 'NO_SHOW' THEN 1 END) as no_show_count,
      COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END) as cancelled_count,
      COUNT(CASE WHEN a.status = 'CONFIRMED' THEN 1 END) as confirmed_count,
      -- Hora preferida (moda das consultas finalizadas)
      MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM a.start_time)) FILTER (WHERE a.status = 'FINISHED') as preferred_hour,
      -- Dia da semana preferido
      MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM a.start_time)) FILTER (WHERE a.status = 'FINISHED') as preferred_dow,
      -- Dias desde última consulta
      EXTRACT(DAY FROM NOW() - MAX(a.start_time) FILTER (WHERE a.status = 'FINISHED'))::int as days_since_last,
      -- Histórico recente (últimos 90 dias)
      COUNT(CASE WHEN a.status = 'NO_SHOW' AND a.start_time > NOW() - INTERVAL '90 days' THEN 1 END) as recent_no_shows,
      COUNT(CASE WHEN a.status = 'CANCELLED' AND a.start_time > NOW() - INTERVAL '90 days' THEN 1 END) as recent_cancellations,
      COUNT(CASE WHEN a.start_time > NOW() - INTERVAL '90 days' THEN 1 END) as recent_total
    FROM patients p
    LEFT JOIN appointments a ON a.patient_id = p.id AND a.dentist_id = $1
    WHERE p.dentist_id = $1
    GROUP BY p.id, p.name
    HAVING COUNT(a.id) >= 1
    ORDER BY COUNT(CASE WHEN a.status = 'NO_SHOW' THEN 1 END)::float / NULLIF(COUNT(a.id), 0) DESC
  `, [dentistId]);

  // Stats globais
  const globalStats = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as total_no_show,
      COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as total_cancelled,
      COUNT(CASE WHEN status = 'FINISHED' THEN 1 END) as total_finished
    FROM appointments
    WHERE dentist_id = $1
  `, [dentistId]);

  const global = globalStats.rows[0] || { total: 0, total_no_show: 0, total_cancelled: 0, total_finished: 0 };
  const totalRelevant = parseInt(global.total_finished) + parseInt(global.total_no_show) + parseInt(global.total_cancelled);
  const overall_no_show_rate = totalRelevant > 0 ? parseInt(global.total_no_show) / totalRelevant : 0;
  const overall_cancellation_rate = totalRelevant > 0 ? parseInt(global.total_cancelled) / totalRelevant : 0;

  // Calcular previsões por paciente
  const predictions: AppointmentPrediction[] = patientStats.rows.map((row: any) => {
    const total = parseInt(row.total_appointments) || 1;
    const finished = parseInt(row.finished_count) || 0;
    const noShows = parseInt(row.no_show_count) || 0;
    const cancelled = parseInt(row.cancelled_count) || 0;
    const recentNoShows = parseInt(row.recent_no_shows) || 0;
    const recentTotal = parseInt(row.recent_total) || 0;
    const daysSince = row.days_since_last !== null ? parseInt(row.days_since_last) : null;

    // ── Modelo de regressão logística simplificado ──
    // Features com pesos calibrados
    let logit = -1.5; // bias (base = baixa probabilidade)

    // Taxa histórica de no-show
    const historicalNoShowRate = noShows / Math.max(total, 1);
    logit += historicalNoShowRate * 4.0;

    // Taxa recente de no-show (peso maior para tendência recente)
    if (recentTotal >= 2) {
      const recentRate = recentNoShows / recentTotal;
      logit += recentRate * 3.0;
    }

    // Dias sem visitar (quanto mais tempo, mais risco)
    if (daysSince !== null) {
      if (daysSince > 180) logit += 1.5;
      else if (daysSince > 90) logit += 0.8;
      else if (daysSince > 60) logit += 0.4;
    }

    // Poucos agendamentos = mais incerteza
    if (total < 3) logit += 0.3;

    // Histórico de cancelamentos também pesa
    const cancelRate = cancelled / Math.max(total, 1);
    logit += cancelRate * 1.5;

    const no_show_probability = clamp(sigmoid(logit), 0, 1);
    const avg_cancellation_rate = cancelRate;

    // Risk level
    let risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    if (no_show_probability >= 0.6) risk_level = 'HIGH';
    else if (no_show_probability >= 0.3) risk_level = 'MEDIUM';
    else risk_level = 'LOW';

    // Fatores explicativos
    const factors: string[] = [];
    if (historicalNoShowRate > 0.3) factors.push(`${Math.round(historicalNoShowRate * 100)}% de histórico de faltas`);
    if (recentNoShows > 0) factors.push(`${recentNoShows} falta(s) nos últimos 90 dias`);
    if (daysSince && daysSince > 90) factors.push(`${daysSince} dias sem visita`);
    if (cancelRate > 0.3) factors.push(`${Math.round(cancelRate * 100)}% de cancelamentos`);
    if (total < 3) factors.push('Poucos agendamentos (incerteza maior)');
    if (factors.length === 0) factors.push('Paciente com bom histórico');

    const preferredHour = row.preferred_hour !== null ? parseInt(row.preferred_hour) : null;
    const preferredDow = row.preferred_dow !== null ? parseInt(row.preferred_dow) : null;

    return {
      patient_id: row.patient_id,
      patient_name: row.patient_name,
      no_show_probability: Math.round(no_show_probability * 1000) / 1000,
      risk_level,
      best_day_of_week: preferredDow !== null ? DAY_NAMES[preferredDow] : null,
      best_hour: preferredHour,
      avg_cancellation_rate: Math.round(avg_cancellation_rate * 1000) / 1000,
      total_appointments: total,
      finished_count: finished,
      no_show_count: noShows,
      cancelled_count: cancelled,
      factors,
    };
  });

  // ── Previsão de demanda por horário e dia da semana ──
  const demandResult = await query(`
    SELECT
      EXTRACT(DOW FROM start_time)::int as dow,
      EXTRACT(HOUR FROM start_time)::int as hour,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE start_time > NOW() - INTERVAL '90 days') as recent
    FROM appointments
    WHERE dentist_id = $1
      AND status NOT IN ('CANCELLED')
    GROUP BY EXTRACT(DOW FROM start_time), EXTRACT(HOUR FROM start_time)
    ORDER BY dow, hour
  `, [dentistId]);

  // Calcular semanas de dados para normalizar
  const weeksResult = await query(`
    SELECT EXTRACT(DAY FROM NOW() - MIN(start_time)) / 7.0 as weeks
    FROM appointments WHERE dentist_id = $1
  `, [dentistId]);
  const totalWeeks = Math.max(parseFloat(weeksResult.rows[0]?.weeks) || 1, 1);

  const maxDemand = Math.max(...demandResult.rows.map((r: any) => parseInt(r.total) / totalWeeks), 1);

  const demand_forecast: DemandForecast[] = demandResult.rows
    .filter((r: any) => {
      const hour = parseInt(r.hour);
      return hour >= 7 && hour <= 19;
    })
    .map((r: any) => {
      const avgPerWeek = parseInt(r.total) / totalWeeks;
      const ratio = avgPerWeek / maxDemand;
      let peak_label: 'BAIXA' | 'MEDIA' | 'ALTA';
      if (ratio >= 0.66) peak_label = 'ALTA';
      else if (ratio >= 0.33) peak_label = 'MEDIA';
      else peak_label = 'BAIXA';

      return {
        day_of_week: DAY_NAMES[parseInt(r.dow)],
        hour: parseInt(r.hour),
        expected_demand: Math.round(avgPerWeek * 100) / 100,
        peak_label,
        historical_count: parseInt(r.total),
      };
    });

  return {
    predictions: predictions.sort((a, b) => b.no_show_probability - a.no_show_probability),
    demand_forecast,
    overall_no_show_rate: Math.round(overall_no_show_rate * 1000) / 1000,
    overall_cancellation_rate: Math.round(overall_cancellation_rate * 1000) / 1000,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PREVISÃO DE INADIMPLÊNCIA
// ═══════════════════════════════════════════════════════════════════════════════

export async function predictDelinquency(dentistId: number): Promise<{
  predictions: DelinquencyPrediction[];
  total_at_risk_amount: number;
  overall_reliability: number;
}> {
  const result = await query(`
    SELECT
      p.id as patient_id,
      p.name as patient_name,
      p.phone,
      -- Planos de pagamento
      COUNT(DISTINCT pp.id) as total_plans,
      -- Parcelas
      COUNT(i.id) as total_installments,
      COUNT(CASE WHEN i.status = 'PAID' AND i.payment_date <= i.due_date THEN 1 END) as paid_on_time,
      COUNT(CASE WHEN i.status = 'PAID' AND i.payment_date > i.due_date THEN 1 END) as paid_late,
      COUNT(CASE WHEN i.status = 'PENDING' AND i.due_date < CURRENT_DATE THEN 1 END) as overdue_count,
      COUNT(CASE WHEN i.status = 'PENDING' THEN 1 END) as pending_count,
      -- Valor em atraso
      COALESCE(SUM(
        CASE WHEN i.status = 'PENDING' AND i.due_date < CURRENT_DATE
        THEN i.amount ELSE 0 END
      ), 0) as total_overdue_amount,
      -- Valor pendente total
      COALESCE(SUM(
        CASE WHEN i.status = 'PENDING'
        THEN i.amount ELSE 0 END
      ), 0) as total_pending_amount,
      -- Média de dias de atraso nas parcelas pagas
      AVG(
        CASE WHEN i.status = 'PAID' AND i.payment_date > i.due_date
        THEN i.payment_date - i.due_date
        ELSE NULL END
      )::float as avg_days_late,
      -- Máximo de dias de atraso
      MAX(
        CASE WHEN i.status = 'PENDING' AND i.due_date < CURRENT_DATE
        THEN CURRENT_DATE - i.due_date
        ELSE 0 END
      ) as max_days_overdue,
      -- Inadimplência registrada
      COUNT(DISTINCT dr.id) FILTER (WHERE dr.status = 'OPEN') as open_delinquencies
    FROM patients p
    LEFT JOIN payment_plans pp ON pp.patient_id = p.id AND pp.dentist_id = $1
    LEFT JOIN installments i ON i.patient_id = p.id AND i.dentist_id = $1
    LEFT JOIN delinquency_records dr ON dr.patient_id = p.id AND dr.dentist_id = $1
    WHERE p.dentist_id = $1
    GROUP BY p.id, p.name, p.phone
    HAVING COUNT(i.id) > 0
    ORDER BY COUNT(CASE WHEN i.status = 'PENDING' AND i.due_date < CURRENT_DATE THEN 1 END) DESC
  `, [dentistId]);

  let totalAtRisk = 0;
  let totalReliability = 0;
  let reliabilityCount = 0;

  const predictions: DelinquencyPrediction[] = result.rows.map((row: any) => {
    const totalInstallments = parseInt(row.total_installments) || 1;
    const paidOnTime = parseInt(row.paid_on_time) || 0;
    const paidLate = parseInt(row.paid_late) || 0;
    const overdueCount = parseInt(row.overdue_count) || 0;
    const pendingCount = parseInt(row.pending_count) || 0;
    const totalPaid = paidOnTime + paidLate;
    const avgDaysLate = parseFloat(row.avg_days_late) || 0;
    const maxDaysOverdue = parseInt(row.max_days_overdue) || 0;
    const totalOverdueAmount = parseFloat(row.total_overdue_amount) || 0;
    const totalPendingAmount = parseFloat(row.total_pending_amount) || 0;
    const openDelinquencies = parseInt(row.open_delinquencies) || 0;

    // ── Modelo de scoring de risco (0-100) ──
    let riskScore = 0;

    // Fator 1: Taxa de atraso histórica (0-30 pontos)
    if (totalPaid > 0) {
      const lateRate = paidLate / totalPaid;
      riskScore += lateRate * 30;
    }

    // Fator 2: Parcelas atualmente em atraso (0-25 pontos)
    if (pendingCount > 0) {
      const overdueRate = overdueCount / pendingCount;
      riskScore += overdueRate * 25;
    }

    // Fator 3: Severidade do atraso (0-20 pontos)
    if (maxDaysOverdue > 0) {
      if (maxDaysOverdue > 90) riskScore += 20;
      else if (maxDaysOverdue > 60) riskScore += 15;
      else if (maxDaysOverdue > 30) riskScore += 10;
      else riskScore += 5;
    }

    // Fator 4: Média de dias de atraso (0-15 pontos)
    if (avgDaysLate > 0) {
      riskScore += Math.min(avgDaysLate / 2, 15);
    }

    // Fator 5: Inadimplência registrada (0-10 pontos)
    if (openDelinquencies > 0) {
      riskScore += Math.min(openDelinquencies * 5, 10);
    }

    riskScore = clamp(Math.round(riskScore), 0, 100);

    // Risk level
    let risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 75) risk_level = 'CRITICAL';
    else if (riskScore >= 50) risk_level = 'HIGH';
    else if (riskScore >= 25) risk_level = 'MEDIUM';
    else risk_level = 'LOW';

    // Payment reliability (complemento do risco)
    const reliability = totalPaid > 0 ? paidOnTime / totalPaid : (pendingCount > 0 ? 0.5 : 1);
    totalReliability += reliability;
    reliabilityCount++;

    if (risk_level === 'HIGH' || risk_level === 'CRITICAL') {
      totalAtRisk += totalPendingAmount;
    }

    // Fatores explicativos
    const factors: string[] = [];
    if (overdueCount > 0) factors.push(`${overdueCount} parcela(s) em atraso`);
    if (totalOverdueAmount > 0) factors.push(`R$ ${totalOverdueAmount.toFixed(2)} em atraso`);
    if (paidLate > 0 && totalPaid > 0) factors.push(`${Math.round((paidLate / totalPaid) * 100)}% das parcelas pagas com atraso`);
    if (avgDaysLate > 0) factors.push(`Média de ${Math.round(avgDaysLate)} dias de atraso`);
    if (maxDaysOverdue > 30) factors.push(`Parcela mais antiga: ${maxDaysOverdue} dias de atraso`);
    if (openDelinquencies > 0) factors.push(`${openDelinquencies} registro(s) de inadimplência aberto(s)`);
    if (reliability >= 0.9 && factors.length === 0) factors.push('Excelente histórico de pagamento');
    else if (factors.length === 0) factors.push('Histórico de pagamento regular');

    return {
      patient_id: row.patient_id,
      patient_name: row.patient_name,
      phone: row.phone || '',
      risk_score: riskScore,
      risk_level,
      total_plans: parseInt(row.total_plans) || 0,
      total_installments: totalInstallments,
      paid_on_time: paidOnTime,
      paid_late: paidLate,
      overdue_count: overdueCount,
      avg_days_late: Math.round(avgDaysLate),
      total_overdue_amount: totalOverdueAmount,
      payment_reliability: Math.round(reliability * 1000) / 1000,
      factors,
    };
  });

  return {
    predictions: predictions.sort((a, b) => b.risk_score - a.risk_score),
    total_at_risk_amount: Math.round(totalAtRisk * 100) / 100,
    overall_reliability: reliabilityCount > 0 ? Math.round((totalReliability / reliabilityCount) * 1000) / 1000 : 1,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SUGESTÃO DE TRATAMENTOS FREQUENTES
// ═══════════════════════════════════════════════════════════════════════════════

export async function suggestTreatments(dentistId: number): Promise<{
  suggestions: TreatmentSuggestion[];
  trends: TreatmentTrend[];
}> {
  // ── Trends: procedimentos mais frequentes da clínica ──
  const trendResult = await query(`
    SELECT
      LOWER(TRIM(procedure_performed)) as procedure,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE date > CURRENT_DATE - INTERVAL '30 days') as last_30,
      COUNT(*) FILTER (WHERE date > CURRENT_DATE - INTERVAL '90 days') as last_90,
      COUNT(*) FILTER (WHERE date > CURRENT_DATE - INTERVAL '90 days' AND date <= CURRENT_DATE - INTERVAL '30 days') as mid_period
    FROM clinical_evolution
    WHERE dentist_id = $1
      AND procedure_performed IS NOT NULL
      AND TRIM(procedure_performed) != ''
    GROUP BY LOWER(TRIM(procedure_performed))
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `, [dentistId]);

  // Receita média por procedimento
  const revenueResult = await query(`
    SELECT
      LOWER(TRIM(procedure)) as procedure,
      AVG(amount) as avg_revenue
    FROM transactions
    WHERE dentist_id = $1
      AND type = 'INCOME'
      AND procedure IS NOT NULL
      AND TRIM(procedure) != ''
    GROUP BY LOWER(TRIM(procedure))
  `, [dentistId]);

  const revenueMap = new Map<string, number>();
  for (const r of revenueResult.rows) {
    revenueMap.set(r.procedure, parseFloat(r.avg_revenue) || 0);
  }

  const trends: TreatmentTrend[] = trendResult.rows.map((r: any) => {
    const last30 = parseInt(r.last_30) || 0;
    const mid = parseInt(r.mid_period) || 0;
    let trend: 'GROWING' | 'STABLE' | 'DECLINING';
    if (last30 > mid * 1.3) trend = 'GROWING';
    else if (last30 < mid * 0.7) trend = 'DECLINING';
    else trend = 'STABLE';

    return {
      procedure: r.procedure,
      total_count: parseInt(r.total_count),
      last_30_days: last30,
      last_90_days: parseInt(r.last_90) || 0,
      trend,
      avg_revenue: Math.round((revenueMap.get(r.procedure) || 0) * 100) / 100,
    };
  });

  // ── Sugestões por paciente: baseado em histórico + odontograma + padrões ──
  const patientData = await query(`
    SELECT
      p.id as patient_id,
      p.name as patient_name,
      p.treatment_plan,
      p.birth_date,
      o.data as odontogram_data,
      (
        SELECT json_agg(json_build_object(
          'procedure', LOWER(TRIM(ce.procedure_performed)),
          'date', ce.date
        ) ORDER BY ce.date DESC)
        FROM clinical_evolution ce
        WHERE ce.patient_id = p.id
          AND ce.procedure_performed IS NOT NULL
          AND TRIM(ce.procedure_performed) != ''
      ) as history,
      (
        SELECT MAX(a.start_time)
        FROM appointments a
        WHERE a.patient_id = p.id AND a.status = 'FINISHED'
      ) as last_visit
    FROM patients p
    LEFT JOIN odontograms o ON o.patient_id = p.id
    WHERE p.dentist_id = $1
    ORDER BY p.name
  `, [dentistId]);

  // Frequência global de procedimentos para priorização
  const globalProcFreq = new Map<string, number>();
  for (const t of trends) {
    globalProcFreq.set(t.procedure, t.total_count);
  }

  // Sequências de tratamento comuns (se A, então provavelmente B)
  const sequenceResult = await query(`
    SELECT
      LOWER(TRIM(ce1.procedure_performed)) as proc_a,
      LOWER(TRIM(ce2.procedure_performed)) as proc_b,
      COUNT(*) as seq_count
    FROM clinical_evolution ce1
    JOIN clinical_evolution ce2
      ON ce1.patient_id = ce2.patient_id
      AND ce2.date > ce1.date
      AND ce2.id != ce1.id
    WHERE ce1.dentist_id = $1
      AND ce2.dentist_id = $1
      AND ce1.procedure_performed IS NOT NULL
      AND ce2.procedure_performed IS NOT NULL
      AND TRIM(ce1.procedure_performed) != ''
      AND TRIM(ce2.procedure_performed) != ''
    GROUP BY LOWER(TRIM(ce1.procedure_performed)), LOWER(TRIM(ce2.procedure_performed))
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC
    LIMIT 50
  `, [dentistId]);

  // Mapa de transição: proc_a → [{proc_b, count}]
  const transitionMap = new Map<string, Array<{ next: string; count: number }>>();
  for (const r of sequenceResult.rows) {
    if (!transitionMap.has(r.proc_a)) transitionMap.set(r.proc_a, []);
    transitionMap.get(r.proc_a)!.push({ next: r.proc_b, count: parseInt(r.seq_count) });
  }

  const suggestions: TreatmentSuggestion[] = [];

  for (const patient of patientData.rows) {
    const suggested: TreatmentSuggestion['suggested_treatments'] = [];
    const alreadySuggested = new Set<string>();

    // 1. Baseado no odontograma (ODONTOGRAM)
    if (patient.odontogram_data) {
      try {
        const odontoData = typeof patient.odontogram_data === 'string'
          ? JSON.parse(patient.odontogram_data) : patient.odontogram_data;
        for (const [toothStr, toothData] of Object.entries(odontoData)) {
          const status = (toothData as any)?.status;
          if (!status) continue;
          let proc: string | null = null;
          if (status === 'decay') proc = 'restauração';
          else if (status === 'root_canal_needed') proc = 'endodontia';
          else if (status === 'extraction_needed') proc = 'extração';
          else if (status === 'fracture') proc = 'restauração';
          if (proc && !alreadySuggested.has(proc)) {
            suggested.push({
              procedure: `${proc} (dente ${toothStr})`,
              confidence: 0.95,
              reason: `Odontograma indica ${status} no dente ${toothStr}`,
              based_on: 'ODONTOGRAM',
            });
            alreadySuggested.add(proc);
          }
        }
      } catch { /* ignore */ }
    }

    // 2. Baseado em tratamento planejado (HISTORY)
    if (patient.treatment_plan) {
      try {
        const plan = typeof patient.treatment_plan === 'string'
          ? JSON.parse(patient.treatment_plan) : patient.treatment_plan;
        if (Array.isArray(plan)) {
          for (const item of plan) {
            if (['PLANEJADO', 'APROVADO'].includes(String(item.status || '').toUpperCase())) {
              const proc = (item.procedure || '').toLowerCase().trim();
              if (proc && !alreadySuggested.has(proc)) {
                suggested.push({
                  procedure: item.procedure + (item.tooth_number ? ` (dente ${item.tooth_number})` : ''),
                  confidence: 0.9,
                  reason: 'Procedimento planejado no prontuário',
                  based_on: 'HISTORY',
                });
                alreadySuggested.add(proc);
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    // 3. Baseado em sequência de tratamentos (SIMILAR_PATIENTS)
    if (patient.history) {
      const history = Array.isArray(patient.history) ? patient.history : [];
      if (history.length > 0) {
        const lastProc = history[0]?.procedure;
        if (lastProc && transitionMap.has(lastProc)) {
          const transitions = transitionMap.get(lastProc)!;
          const totalTransitions = transitions.reduce((s, t) => s + t.count, 0);
          for (const t of transitions.slice(0, 3)) {
            const proc = t.next;
            if (!alreadySuggested.has(proc)) {
              suggested.push({
                procedure: proc,
                confidence: Math.round((t.count / totalTransitions) * 100) / 100,
                reason: `${t.count} pacientes fizeram "${proc}" após "${lastProc}"`,
                based_on: 'SIMILAR_PATIENTS',
              });
              alreadySuggested.add(proc);
            }
          }
        }
      }

      // 4. Padrão temporal: tratamentos que o paciente costuma repetir (TIME_PATTERN)
      const procDates = new Map<string, Date[]>();
      for (const h of history) {
        if (!h.procedure || !h.date) continue;
        if (!procDates.has(h.procedure)) procDates.set(h.procedure, []);
        procDates.get(h.procedure)!.push(new Date(h.date));
      }

      for (const [proc, dates] of procDates) {
        if (dates.length < 2 || alreadySuggested.has(proc)) continue;
        // Calcular intervalo médio
        const sorted = dates.map(d => d.getTime()).sort((a, b) => a - b);
        let totalInterval = 0;
        for (let i = 1; i < sorted.length; i++) {
          totalInterval += (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24);
        }
        const avgInterval = totalInterval / (sorted.length - 1);
        const lastDate = new Date(sorted[sorted.length - 1]);
        const daysSinceLast = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

        // Se está na hora ou passou do intervalo habitual
        if (daysSinceLast >= avgInterval * 0.8) {
          const confidence = clamp(0.5 + (daysSinceLast / avgInterval - 1) * 0.3, 0.4, 0.85);
          suggested.push({
            procedure: proc,
            confidence: Math.round(confidence * 100) / 100,
            reason: `Paciente faz "${proc}" a cada ~${Math.round(avgInterval)} dias (último: ${Math.round(daysSinceLast)} dias atrás)`,
            based_on: 'TIME_PATTERN',
          });
          alreadySuggested.add(proc);
        }
      }
    }

    if (suggested.length > 0) {
      suggestions.push({
        patient_id: patient.patient_id,
        patient_name: patient.patient_name,
        suggested_treatments: suggested.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
      });
    }
  }

  return {
    suggestions: suggestions.sort((a, b) =>
      Math.max(...b.suggested_treatments.map(t => t.confidence)) -
      Math.max(...a.suggested_treatments.map(t => t.confidence))
    ),
    trends,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DASHBOARD CONSOLIDADO
// ═══════════════════════════════════════════════════════════════════════════════

export async function getMLDashboard(dentistId: number): Promise<MLDashboardSummary> {
  const [appointmentData, delinquencyData, treatmentData] = await Promise.all([
    predictAppointments(dentistId),
    predictDelinquency(dentistId),
    suggestTreatments(dentistId),
  ]);

  return {
    appointment_predictions: {
      high_risk_no_show: appointmentData.predictions.filter(p => p.risk_level === 'HIGH').slice(0, 10),
      demand_forecast: appointmentData.demand_forecast,
      overall_no_show_rate: appointmentData.overall_no_show_rate,
      overall_cancellation_rate: appointmentData.overall_cancellation_rate,
    },
    delinquency_predictions: {
      high_risk_patients: delinquencyData.predictions.filter(p => p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL').slice(0, 10),
      total_at_risk_amount: delinquencyData.total_at_risk_amount,
      overall_reliability: delinquencyData.overall_reliability,
    },
    treatment_insights: {
      top_suggestions: treatmentData.suggestions.slice(0, 10),
      trends: treatmentData.trends,
    },
  };
}
