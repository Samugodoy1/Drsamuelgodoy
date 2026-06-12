import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarPlus,
  Clock,
  MessageCircle,
  Target,
  X,
} from '../icons';

// ─── Types (structural — match the shapes App.tsx already holds) ────────────

interface SlotPatient {
  id: number;
  name: string;
  phone?: string;
}

interface SlotIntel {
  patient_id: number;
  status?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  priority_reason?: string;
  days_since_last_visit?: number | null;
  pending_procedure?: string | null;
  has_future_appointment?: boolean;
}

interface SlotAppointment {
  patient_id: number;
  start_time: string;
  end_time: string;
  status: string;
}

interface SlotInstallment {
  patient_id: number;
  amount: number;
  status: string;
}

interface FillAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: SlotAppointment[];
  patients: SlotPatient[];
  patientIntelligence: SlotIntel[];
  installments: SlotInstallment[];
  onSchedule: (patientId: number, patientName: string, time: string, procedure?: string | null) => void;
  onOpenBlankSchedule: () => void;
}

// ─── Free-slot computation (shared with App.tsx for the CTA counter) ────────

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;
const SLOT_MINUTES = 30;
const BLOCKING_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED']);

/** Returns the start times (Date) of 30-min slots still free today, from now onwards. */
export function computeTodayFreeSlotTimes(appointments: SlotAppointment[], now: Date = new Date()): Date[] {
  const busy = appointments
    .filter(a => BLOCKING_STATUSES.has(a.status) && new Date(a.start_time).toDateString() === now.toDateString())
    .map(a => ({ start: new Date(a.start_time).getTime(), end: new Date(a.end_time).getTime() }));

  const cursor = new Date(now);
  // Round up to the next half hour, never before opening time
  cursor.setSeconds(0, 0);
  const remainder = cursor.getMinutes() % SLOT_MINUTES;
  if (remainder > 0) cursor.setMinutes(cursor.getMinutes() + (SLOT_MINUTES - remainder));
  if (cursor.getHours() < WORK_START_HOUR) cursor.setHours(WORK_START_HOUR, 0, 0, 0);

  const dayEnd = new Date(now);
  dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

  const free: Date[] = [];
  while (cursor.getTime() + SLOT_MINUTES * 60000 <= dayEnd.getTime()) {
    const slotStart = cursor.getTime();
    const slotEnd = slotStart + SLOT_MINUTES * 60000;
    const overlaps = busy.some(b => slotStart < b.end && slotEnd > b.start);
    if (!overlaps) free.push(new Date(slotStart));
    cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
  }
  return free;
}

// ─── Suggestion ranking ──────────────────────────────────────────────────────

interface Suggestion {
  patient: SlotPatient;
  reason: string;
  procedure: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  pendingAmount: number;
}

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function buildSuggestions(
  patients: SlotPatient[],
  intel: SlotIntel[],
  installments: SlotInstallment[],
  appointments: SlotAppointment[],
  now: Date,
): Suggestion[] {
  const intelMap = new Map<number, SlotIntel>();
  intel.forEach(i => intelMap.set(i.patient_id, i));

  const pendingByPatient = new Map<number, number>();
  installments
    .filter(i => i.status === 'PENDING' || i.status === 'OVERDUE')
    .forEach(i => pendingByPatient.set(i.patient_id, (pendingByPatient.get(i.patient_id) || 0) + Number(i.amount)));

  // Patients with anything already booked from now on shouldn't be suggested
  const alreadyBooked = new Set<number>();
  appointments.forEach(a => {
    if (BLOCKING_STATUSES.has(a.status) && new Date(a.start_time) >= now) alreadyBooked.add(a.patient_id);
  });

  return patients
    .filter(p => !alreadyBooked.has(p.id))
    .map(p => {
      const pi = intelMap.get(p.id);
      if (pi?.has_future_appointment) return null;

      const pendingAmount = pendingByPatient.get(p.id) || 0;
      const procedure = pi?.pending_procedure || null;
      const days = pi?.days_since_last_visit ?? null;

      const hasSignal = Boolean(procedure) || pendingAmount > 0 || pi?.priority === 'HIGH' || (days !== null && days >= 90);
      if (!hasSignal) return null;

      const parts: string[] = [];
      if (procedure) parts.push(`Tratamento pendente: ${procedure}`);
      else if (pi?.priority_reason) parts.push(pi.priority_reason);
      if (days !== null && days > 0) parts.push(`sem vir há ${days} dia${days !== 1 ? 's' : ''}`);
      if (pendingAmount > 0) parts.push(`${currency(pendingAmount)} em aberto`);

      return {
        patient: p,
        reason: parts.join(' · ') || 'Bom candidato pra retorno',
        procedure,
        priority: pi?.priority || 'LOW',
        pendingAmount,
      } as Suggestion;
    })
    .filter((s): s is Suggestion => s !== null)
    .sort((a, b) => {
      const pri = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      if (pri !== 0) return pri;
      if (Boolean(a.procedure) !== Boolean(b.procedure)) return a.procedure ? -1 : 1;
      return b.pendingAmount - a.pendingAmount;
    })
    .slice(0, 6);
}

// ─── WhatsApp helper (same normalization used elsewhere in the app) ──────────

function openWhatsApp(patient: SlotPatient, time: string, procedure: string | null) {
  if (!patient.phone) return;
  let phone = patient.phone.replace(/\D/g, '');
  if ((phone.length === 10 || phone.length === 11) || (phone.length > 11 && !phone.startsWith('55'))) {
    phone = `55${phone}`;
  }
  const firstName = (patient.name || '').split(' ')[0];
  const purpose = procedure ? ` pra gente dar continuidade no seu tratamento (${procedure.toLowerCase()})` : ' pra sua consulta';
  const message = `Olá ${firstName}, tudo bem? Abriu um horário hoje às ${time} aqui no consultório${purpose}. Quer que eu reserve pra você?`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FillAgendaModal({
  isOpen,
  onClose,
  appointments,
  patients,
  patientIntelligence,
  installments,
  onSchedule,
  onOpenBlankSchedule,
}: FillAgendaModalProps) {
  const now = useMemo(() => new Date(), [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const freeSlots = useMemo(
    () => (isOpen ? computeTodayFreeSlotTimes(appointments, now) : []),
    [isOpen, appointments, now],
  );

  const suggestions = useMemo(
    () => (isOpen ? buildSuggestions(patients, patientIntelligence, installments, appointments, now) : []),
    [isOpen, patients, patientIntelligence, installments, appointments, now],
  );

  const slotChips = freeSlots.slice(0, 8);
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedSlot(slotChips[0] ? slotChips[0].toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Preencher agenda de hoje</h2>
                  <p className="text-[13px] text-slate-500 mt-0.5">
                    {freeSlots.length > 0
                      ? `${freeSlots.length} horário${freeSlots.length !== 1 ? 's' : ''} livre${freeSlots.length !== 1 ? 's' : ''} até às ${WORK_END_HOUR}h`
                      : 'Sem horários livres até o fim do expediente'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
                >
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              {slotChips.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {slotChips.map(slot => {
                    const label = fmtTime(slot);
                    const active = label === selectedSlot;
                    return (
                      <button
                        key={label}
                        onClick={() => setSelectedSlot(label)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors border ${
                          active
                            ? 'bg-primary text-white border-primary'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Clock size={13} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {freeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-semibold text-slate-700">Sua agenda de hoje já está completa 🎉</p>
                  <p className="text-[13px] text-slate-500 mt-1">Que tal já garantir os próximos dias?</p>
                  <button
                    onClick={onOpenBlankSchedule}
                    className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-all active:scale-95"
                  >
                    <CalendarPlus size={16} />
                    Agendar pra outro dia
                  </button>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-semibold text-slate-700">Nenhum paciente com pendência pra chamar agora</p>
                  <p className="text-[13px] text-slate-500 mt-1">Você pode agendar manualmente no horário selecionado.</p>
                </div>
              ) : (
                <>
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    <Target size={13} />
                    Quem vale a pena chamar
                  </p>
                  <div className="space-y-2.5">
                    {suggestions.map(({ patient, reason, procedure }) => (
                      <div
                        key={patient.id}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm font-bold text-slate-900">{patient.name}</p>
                        <p className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">{reason}</p>
                        <div className="flex gap-2 mt-2.5">
                          {patient.phone && (
                            <button
                              onClick={() => openWhatsApp(patient, selectedSlot, procedure)}
                              disabled={!selectedSlot}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <MessageCircle size={14} />
                              Chamar às {selectedSlot}
                            </button>
                          )}
                          <button
                            onClick={() => onSchedule(patient.id, patient.name, selectedSlot, procedure)}
                            disabled={!selectedSlot}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-bold bg-primary/10 text-primary hover:bg-primary/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <CalendarPlus size={14} />
                            Agendar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {freeSlots.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-100">
                <button
                  onClick={onOpenBlankSchedule}
                  className="w-full py-2.5 rounded-full text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Agendar manualmente
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
