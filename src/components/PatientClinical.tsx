import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  CreditCard,
  FileText,
  Info,
  Lock,
  Loader2,
  Phone,
  Plus,
  Shield,
  Trash2,
  User,
  UserRound,
  WalletCards,
  Zap,
} from '../icons';
import { AnimatePresence, motion } from 'motion/react';
import { NovaEvolucao } from './NovaEvolucao';
import { Odontogram } from './Odontogram';
import { formatDate } from '../utils/dateUtils';

interface PatientClinicalProps {
  patient: any;
  appointments: any[];
  onUpdatePatient: (updatedPatient: any) => Promise<void>;
  onAddEvolution: (evolutionData: any) => Promise<void>;
  onRefreshPatient?: () => Promise<void>;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  setAppActiveTab: (tab: any) => void;
  navigate: any;
}

type InfoTab = 'anamneses' | 'dados' | 'imagens' | 'financeiro';

type ClinicalStatus = 'EM_TRATAMENTO' | 'REVISAO' | 'ABANDONADO' | 'NOVO';

const statusConfig: Record<ClinicalStatus, { label: string; className: string }> = {
  EM_TRATAMENTO: {
    label: 'Em tratamento',
    className: 'bg-emerald-100 ring-1 ring-emerald-200 text-emerald-900',
  },
  REVISAO: {
    label: 'Em revisão',
    className: 'bg-amber-100 ring-1 ring-amber-200 text-amber-900',
  },
  ABANDONADO: {
    label: 'Abandonado',
    className: 'bg-rose-100 ring-1 ring-rose-200 text-rose-900',
  },
  NOVO: {
    label: 'Novo paciente',
    className: 'bg-sky-100 ring-1 ring-sky-200 text-sky-900',
  },
};

const getAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age -= 1;
  return age;
};

const formatTime = (dateValue?: string) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrencyInputBRL = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '0,00';
  const cents = Number(digits);
  const amount = cents / 100;
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrencyInputBRL = (value: string) => {
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const resolveClinicalStatus = (patient: any, appointments: any[]): ClinicalStatus => {
  const now = new Date();

  const patientAppointments = (appointments || [])
    .filter((a: any) => a.patient_id === patient.id)
    .filter((a: any) => !['CANCELLED', 'NO_SHOW'].includes(String(a.status || '').toUpperCase()));

  const hasAnyHistory =
    (patient?.evolution || []).length > 0 ||
    patientAppointments.some((a: any) => ['FINISHED', 'IN_PROGRESS'].includes(String(a.status || '').toUpperCase()));

  if (!hasAnyHistory) return 'NOVO';

  const hasFutureVisit = patientAppointments.some((a: any) => new Date(a.start_time) >= now);
  const hasOngoingTreatment = (patient?.treatmentPlan || []).some((item: any) =>
    ['APROVADO', 'PENDENTE', 'PLANEJADO'].includes(String(item.status || '').toUpperCase())
  );

  if (hasFutureVisit || hasOngoingTreatment) return 'EM_TRATAMENTO';

  const latestEvolution = (patient?.evolution || [])[0]?.date;
  const latestFinishedAppointment = patientAppointments
    .filter((a: any) => String(a.status || '').toUpperCase() === 'FINISHED')
    .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]?.start_time;

  const latestActivityRaw = latestEvolution || latestFinishedAppointment;
  if (!latestActivityRaw) return 'REVISAO';

  const latestActivity = new Date(latestActivityRaw);
  const daysSinceLast = Math.floor((now.getTime() - latestActivity.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLast > 180) return 'ABANDONADO';
  return 'REVISAO';
};

const resolveTimelineIcon = (label: string) => {
  const lower = (label || '').toLowerCase();
  if (/canal|endo/.test(lower)) return Activity;
  if (/restaura|resina/.test(lower)) return CheckCircle2;
  if (/extra|exo|cirurg/.test(lower)) return Zap;
  if (/limpeza|profilax|raspagem/.test(lower)) return Circle;
  return FileText;
};

const resolveProcedureCategory = (title: string) => {
  const lower = (title || '').toLowerCase();
  if (/canal|endo|obtur|pulp|odontometr|instrument|lima/.test(lower))
    return { label: 'Endodontia', dotCls: 'bg-indigo-500', tagCls: 'bg-indigo-50 text-indigo-700', borderCls: 'border-l-indigo-400' };
  if (/restaura|resina|c[aá]ri|classe|adesiv|restor/.test(lower))
    return { label: 'Restauração', dotCls: 'bg-amber-500', tagCls: 'bg-amber-50 text-amber-700', borderCls: 'border-l-amber-400' };
  if (/extra|exo|cirurg|sutur|anestes|exodont/.test(lower))
    return { label: 'Cirurgia', dotCls: 'bg-rose-500', tagCls: 'bg-rose-50 text-rose-700', borderCls: 'border-l-rose-400' };
  if (/limpeza|profilax|raspagem|t[aá]rtaro|calcul|poliment/.test(lower))
    return { label: 'Profilaxia', dotCls: 'bg-emerald-500', tagCls: 'bg-emerald-50 text-emerald-700', borderCls: 'border-l-emerald-400' };
  if (/avalia|consulta|retorno|anamnese|revisão|revisao/.test(lower))
    return { label: 'Consulta', dotCls: 'bg-sky-500', tagCls: 'bg-sky-50 text-sky-700', borderCls: 'border-l-sky-400' };
  return { label: 'Evolução', dotCls: 'bg-slate-400', tagCls: 'bg-slate-100 text-slate-600', borderCls: 'border-l-slate-300' };
};

const TIMELINE_STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  CONCLUIDO:    { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Concluído' },
  EM_ANDAMENTO: { dot: 'bg-amber-500',   text: 'text-amber-700',   label: 'Em andamento' },
  OBSERVACAO:   { dot: 'bg-sky-500',     text: 'text-sky-600',     label: 'Observação' },
};

const resolveTimelineMonthGroup = (dateStr: string) => {
  if (!dateStr) return '';
  const datePart = dateStr.split('T')[0];
  const [year, month] = datePart.split('-');
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const now = new Date();
  const monthName = months[parseInt(month, 10) - 1] || month;
  return String(now.getFullYear()) === year ? monthName : `${monthName} ${year}`;
};

type ClinicalEventType = 'TREATMENT_START' | 'PLAN_CHANGE' | 'PROCEDURE_COMPLETION' | 'OBSERVATION' | 'DIAGNOSIS';

const resolveClinicalEventType = (entry: any): ClinicalEventType => {
  const explicitType = String(entry?.event_type || '').toUpperCase();
  if (explicitType === 'TREATMENT_START') return 'TREATMENT_START';
  if (explicitType === 'PLAN_CHANGE') return 'PLAN_CHANGE';
  if (explicitType === 'PROCEDURE_COMPLETION') return 'PROCEDURE_COMPLETION';
  if (explicitType === 'OBSERVATION') return 'OBSERVATION';
  if (explicitType === 'DIAGNOSIS') return 'DIAGNOSIS';

  const procedure = String(entry?.procedure || entry?.procedure_performed || '').toLowerCase();
  const notes = String(entry?.notes || '').toLowerCase();

  if (procedure.includes('diagnostico') || notes.includes('diagnóstico registrado') || notes.includes('diagnostico registrado')) {
    return 'DIAGNOSIS';
  }
  if (procedure.includes('conclus') || notes.includes('procedimento conclu')) {
    return 'PROCEDURE_COMPLETION';
  }
  if (procedure.includes('convers') || notes.includes('convertido') || notes.includes('ajustado')) {
    return 'PLAN_CHANGE';
  }
  if (procedure.includes('inicio') || procedure.includes('início')) {
    return 'TREATMENT_START';
  }

  return 'OBSERVATION';
};

export const PatientClinical: React.FC<PatientClinicalProps> = ({
  patient,
  appointments,
  onUpdatePatient,
  onAddEvolution,
  onRefreshPatient,
  apiFetch,
  setAppActiveTab,
  navigate: appNavigate,
}) => {
  const [isAddingEvolution, setIsAddingEvolution] = useState(false);
  const [infoTab, setInfoTab] = useState<InfoTab>('anamneses');
  const [showAllEvolutions, setShowAllEvolutions] = useState(false);
  const [highlightedTreatmentId, setHighlightedTreatmentId] = useState<string | null>(null);
  const [highlightedTimelineId, setHighlightedTimelineId] = useState<string | null>(null);
  const [highlightedToothNumber, setHighlightedToothNumber] = useState<number | null>(null);
  const [selectedTreatmentAction, setSelectedTreatmentAction] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [optimisticOdontogram, setOptimisticOdontogram] = useState<Record<number, any>>({});
  const [optimisticTreatments, setOptimisticTreatments] = useState<any[]>([]);
  const [optimisticEvolutions, setOptimisticEvolutions] = useState<any[]>([]);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isUploadingClinicalImage, setIsUploadingClinicalImage] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Auto-dismiss upload feedback
  useEffect(() => {
    if (!uploadFeedback) return;
    const timer = setTimeout(() => setUploadFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [uploadFeedback]);
  const [isEditingAnamnese, setIsEditingAnamnese] = useState(false);
  const [anamneseForm, setAnamneseForm] = useState({ medical_history: '', allergies: '', medications: '' });
  const [isSavingAnamnese, setIsSavingAnamnese] = useState(false);
  const [showAnamneseExtra, setShowAnamneseExtra] = useState(false);
  const [showDadosExtra, setShowDadosExtra] = useState(false);
  const [patientFinancial, setPatientFinancial] = useState<{ transactions: any[]; paymentPlans: any[]; installments: any[] } | null>(null);
  const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);
  const infoPanelRef = useRef<HTMLElement | null>(null);
  const odontogramRef = useRef<HTMLElement | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const clinicalImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (infoTab !== 'financeiro' || !patient?.id) return;
    let cancelled = false;
    setIsLoadingFinancial(true);
    apiFetch(`/api/patients/${patient.id}/financial`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPatientFinancial(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingFinancial(false);
      });
    return () => { cancelled = true; };
  }, [infoTab, patient?.id]);

  const age = getAge(patient?.birth_date);
  const clinicalStatus = resolveClinicalStatus(patient, appointments);
  const clinicalBadge = statusConfig[clinicalStatus];
  const patientAppointments = useMemo(
    () =>
      (appointments || [])
        .filter((appointment: any) => appointment.patient_id === patient?.id)
        .filter((appointment: any) => !['CANCELLED', 'NO_SHOW'].includes(String(appointment.status || '').toUpperCase())),
    [appointments, patient?.id]
  );

  const mergedTreatmentPlan = useMemo(() => {
    const serverItems = patient?.treatmentPlan || [];
    if (optimisticTreatments.length === 0) return serverItems;

    const knownIds = new Set(serverItems.map((item: any) => item.id));
    const optimisticMap = new Map(optimisticTreatments.map((item: any) => [item.id, item]));
    const mergedKnown = serverItems.map((item: any) => optimisticMap.get(item.id) || item);
    const optimisticOnly = optimisticTreatments.filter((item: any) => !knownIds.has(item.id));
    return [...optimisticOnly, ...mergedKnown];
  }, [patient?.treatmentPlan, optimisticTreatments]);

  const treatmentInProgress = useMemo(
    () =>
      mergedTreatmentPlan.filter((item: any) =>
        ['APROVADO', 'PENDENTE', 'PLANEJADO'].includes(String(item.status || '').toUpperCase())
      ),
    [mergedTreatmentPlan]
  );

  const timelineItems = useMemo(() => {
    const mergedEvolutions = [
      ...optimisticEvolutions,
      ...(patient?.evolution || []).filter(
        (e: any) => !optimisticEvolutions.some((opt) => opt.id === e.id)
      ),
    ];

    const evolutionEvents = mergedEvolutions
      .map((e: any) => {
        const eventType = resolveClinicalEventType(e);
        return {
          id: `evo-${e.id}`,
          date: e.date,
          title: e.procedure || 'Evolução clínica',
          notes: e.notes || '',
          status:
            eventType === 'PROCEDURE_COMPLETION'
              ? 'CONCLUIDO'
              : eventType === 'OBSERVATION'
                ? 'OBSERVACAO'
                : 'EM_ANDAMENTO',
          type: eventType,
        };
      })
      .filter((event: any) => event.type !== 'DIAGNOSIS');

    return evolutionEvents.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [patient?.evolution, optimisticEvolutions]);

  const mergedOdontogram = useMemo(
    () => ({
      ...(patient?.odontogram || {}),
      ...optimisticOdontogram,
    }),
    [patient?.odontogram, optimisticOdontogram]
  );

  const persistTreatmentValue = async (treatmentId: string, rawValue: string) => {
    const normalized = String(rawValue || '').trim();
    if (!normalized) return;

    const parsed = parseCurrencyInputBRL(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    const nextPlan = (mergedTreatmentPlan || []).map((item: any) =>
      item.id === treatmentId
        ? { ...item, value: parsed, updated_at: new Date().toISOString() }
        : item
    );

    setOptimisticTreatments((prev) => {
      const ids = new Set(nextPlan.map((item: any) => item.id));
      const prevOnly = prev.filter((item: any) => !ids.has(item.id));
      return [...prevOnly, ...nextPlan];
    });

    try {
      await onUpdatePatient({
        ...patient,
        treatmentPlan: nextPlan,
      });
    } catch (error) {
      console.error('Error updating treatment value:', error);
    }
  };

  const togglePrepaymentAll = async () => {
    const activeItems = mergedTreatmentPlan.filter((item: any) =>
      ['APROVADO', 'PENDENTE', 'PLANEJADO'].includes(String(item.status || '').toUpperCase())
    );
    if (activeItems.length === 0) return;
    const allActive = activeItems.every((item: any) => item.requires_prepayment);
    const nextValue = !allActive;
    const nowIso = new Date().toISOString();
    const nextPlan = mergedTreatmentPlan.map((item: any) => {
      const isActive = ['APROVADO', 'PENDENTE', 'PLANEJADO'].includes(String(item.status || '').toUpperCase());
      if (!isActive) return item;
      if (item.prepayment_confirmed) return item; // don't toggle already paid
      return { ...item, requires_prepayment: nextValue, prepayment_confirmed: false, updated_at: nowIso };
    });
    setOptimisticTreatments((prev) => {
      const ids = new Set(nextPlan.map((i: any) => i.id));
      return [...prev.filter((i: any) => !ids.has(i.id)), ...nextPlan];
    });
    try {
      await onUpdatePatient({ ...patient, treatmentPlan: nextPlan });
    } catch (error) {
      console.error('Error toggling prepayment:', error);
    }
  };

  const confirmPrepayment = async (treatment: any) => {
    const nowIso = new Date().toISOString();
    const nextPlan = (mergedTreatmentPlan || []).map((item: any) =>
      item.id === treatment.id
        ? { ...item, prepayment_confirmed: true, prepayment_confirmed_at: nowIso, updated_at: nowIso }
        : item
    );
    setOptimisticTreatments((prev) => {
      const ids = new Set(nextPlan.map((i: any) => i.id));
      return [...prev.filter((i: any) => !ids.has(i.id)), ...nextPlan];
    });
    try {
      await onUpdatePatient({ ...patient, treatmentPlan: nextPlan });

      // Registrar transação financeira automaticamente
      const treatmentValue = Number(treatment.value) || 0;
      if (treatmentValue > 0) {
        const procedureLabel = treatment.procedure || 'Procedimento';
        const toothLabel = treatment.tooth_number ? ` — dente ${treatment.tooth_number}` : '';
        apiFetch('/api/finance', {
          method: 'POST',
          body: JSON.stringify({
            type: 'INCOME',
            description: `Pagamento antecipado: ${procedureLabel}${toothLabel}`,
            category: 'Procedimentos',
            amount: treatmentValue,
            payment_method: 'Indefinido',
            date: nowIso.split('T')[0],
            status: 'PAID',
            patient_id: patient.id,
            procedure: procedureLabel,
            notes: 'Pagamento recebido antes da execução do procedimento.',
          }),
        }).catch((err) => {
          console.error('Error creating prepayment transaction:', err);
        });
      }
    } catch (error) {
      console.error('Error confirming prepayment:', error);
    }
    setSelectedTreatmentAction(null);
  };

  const confirmPrepaymentAll = async (paymentMethod: string = 'Indefinido') => {
    const nowIso = new Date().toISOString();
    const unpaid = mergedTreatmentPlan.filter(
      (item: any) =>
        ['APROVADO', 'PENDENTE', 'PLANEJADO'].includes(String(item.status || '').toUpperCase()) &&
        !(item.requires_prepayment && item.prepayment_confirmed)
    );
    if (unpaid.length === 0) return;

    const totalAmount = unpaid.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0);

    const nextPlan = mergedTreatmentPlan.map((item: any) => {
      const isTarget = unpaid.some((u: any) => u.id === item.id);
      return isTarget
        ? { ...item, requires_prepayment: true, prepayment_confirmed: true, prepayment_confirmed_at: nowIso, updated_at: nowIso }
        : item;
    });

    setOptimisticTreatments((prev) => {
      const ids = new Set(nextPlan.map((i: any) => i.id));
      return [...prev.filter((i: any) => !ids.has(i.id)), ...nextPlan];
    });

    try {
      await onUpdatePatient({ ...patient, treatmentPlan: nextPlan });

      if (totalAmount > 0) {
        const procedures = unpaid.map((i: any) => i.procedure || 'Procedimento').join(', ');
        apiFetch('/api/finance', {
          method: 'POST',
          body: JSON.stringify({
            type: 'INCOME',
            description: `Pagamento integral do orçamento`,
            category: 'Procedimentos',
            amount: totalAmount,
            payment_method: paymentMethod,
            date: nowIso.split('T')[0],
            status: 'PAID',
            patient_id: patient.id,
            procedure: procedures,
            notes: `Pagamento integral: ${unpaid.length} procedimento(s).`,
          }),
        }).then(() => {
          if (infoTab === 'financeiro') {
            apiFetch(`/api/patients/${patient.id}/financial`)
              .then((r) => r.json())
              .then((data) => setPatientFinancial(data))
              .catch(() => {});
          }
        }).catch((err) => {
          console.error('Error creating full budget payment transaction:', err);
        });
      }
    } catch (error) {
      console.error('Error confirming full budget prepayment:', error);
    }
  };

  const handleOdontogramStatusChange = (toothNumber: number, toothData: any) => {
    setOptimisticOdontogram((prev) => ({ ...prev, [toothNumber]: toothData }));

    const updatedOdontogram = {
      ...(patient?.odontogram || {}),
      [toothNumber]: toothData,
    };

    apiFetch(`/api/patients/${patient.id}/odontogram`, {
      method: 'POST',
      body: JSON.stringify({ data: updatedOdontogram }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Falha ao salvar odontograma');
        }
      })
      .catch((error) => {
        console.error('Error updating odontogram tooth status:', error);
      });
  };

  const persistEvolution = async (payload: { notes: string; procedure_performed: string }) => {
    const res = await apiFetch(`/api/patients/${patient.id}/evolution`, {
      method: 'POST',
      body: JSON.stringify({
        notes: payload.notes,
        procedure_performed: payload.procedure_performed,
        materials: '',
        observations: '',
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'Falha ao salvar evolução clínica');
    }
  };

  const handleOdontoProcedureSelect = async ({
    toothNumber,
    procedure,
    category,
    mode,
  }: {
    toothNumber: number;
    procedure: string;
    category: 'diagnosis' | 'procedure';
    mode: 'initial' | 'continuity';
    status: any;
  }) => {
    const ts = Date.now();
    const treatmentId = `tp-${ts}-${Math.random().toString(36).slice(2, 9)}`;
    const evolutionId = `evo-odonto-${ts}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();

    const values: Record<string, number> = {
      Restauração: 150,
      Endodontia: 450,
      Coroa: 1200,
      Implante: 2500,
      Extração: 200,
      Carie: 120,
      Restauracao: 150,
      Canal: 450,
      Extracao: 200,
    };

    const existingTreatment = (patient.treatmentPlan || []).find(
      (item: any) => Number(item.tooth_number) === toothNumber && ['APROVADO', 'PENDENTE', 'PLANEJADO'].includes(String(item.status || '').toUpperCase())
    );

    const isCompletionAction =
      mode === 'continuity' &&
      !!existingTreatment &&
      ['root_canal_done', 'extraction_done'].includes(String(status || '').toLowerCase());

    // Block completion via odontogram if prepayment is required but not confirmed
    if (isCompletionAction && existingTreatment?.requires_prepayment && !existingTreatment?.prepayment_confirmed) {
      setSelectedTreatmentAction(existingTreatment);
      return;
    }

    const nextTreatmentPlan = category === 'procedure'
      ? mode === 'continuity' && existingTreatment
        ? (patient.treatmentPlan || []).map((item: any) =>
            item.id === existingTreatment.id
              ? isCompletionAction
                ? { ...item, status: 'REALIZADO', completed_at: nowIso, updated_at: nowIso }
                : { ...item, status: 'APROVADO', updated_at: nowIso }
              : item
          )
        : [
            ...(patient.treatmentPlan || []),
            {
              id: treatmentId,
              tooth_number: toothNumber,
              procedure,
              value: values[procedure] || 0,
              status: 'PLANEJADO',
              requires_prepayment: true,
              created_at: nowIso,
            },
          ]
      : (patient.treatmentPlan || []);

    const nextTreatmentId = category === 'procedure'
      ? (mode === 'continuity' && existingTreatment ? existingTreatment.id : treatmentId)
      : null;

    const optimisticTreatment = category === 'procedure'
      ? mode === 'continuity' && existingTreatment
        ? isCompletionAction
          ? { ...existingTreatment, status: 'REALIZADO', completed_at: nowIso, updated_at: nowIso }
          : { ...existingTreatment, status: 'APROVADO', updated_at: nowIso }
        : {
            id: treatmentId,
            tooth_number: toothNumber,
            procedure,
            value: values[procedure] || 0,
            status: 'PLANEJADO',
            requires_prepayment: true,
            created_at: nowIso,
          }
      : null;

    const shouldAppendEvolution = category === 'procedure';
    const evolutionType = isCompletionAction
      ? 'PROCEDURE_COMPLETION'
      : mode === 'continuity' && existingTreatment
        ? 'PLAN_CHANGE'
        : 'TREATMENT_START';
    const evolutionNotes = isCompletionAction
      ? `Procedimento concluído no dente ${toothNumber}: ${existingTreatment?.procedure || procedure}.`
      : mode === 'continuity' && existingTreatment
        ? `Plano ajustado no dente ${toothNumber}: ${existingTreatment.procedure} convertido para ${procedure}.`
        : `Início de tratamento no dente ${toothNumber}: ${procedure}.`;
    const evolutionProcedure = isCompletionAction
      ? `Conclusão - ${existingTreatment?.procedure || procedure}`
      : mode === 'continuity' && existingTreatment
        ? `Conversão - ${existingTreatment.procedure} -> ${procedure}`
        : `Início - ${procedure}`;
    const evolutionProcedurePerformed = isCompletionAction
      ? `Conclusão - ${existingTreatment?.procedure || procedure}`
      : mode === 'continuity' && existingTreatment
        ? `Conversão de plano`
        : `Início de tratamento`;

    const optimisticEvolution = shouldAppendEvolution
      ? {
          id: evolutionId,
          date: nowIso,
          notes: evolutionNotes,
          procedure_performed: evolutionProcedurePerformed,
          procedure: evolutionProcedure,
          event_type: evolutionType,
        }
      : null;

    if (optimisticTreatment) {
      setOptimisticTreatments((prev) => {
        if (mode === 'continuity' && existingTreatment) {
          const withoutCurrent = prev.filter((item: any) => item.id !== existingTreatment.id);
          return [optimisticTreatment, ...withoutCurrent];
        }
        return [optimisticTreatment, ...prev];
      });
    }
    if (optimisticEvolution) {
      setOptimisticEvolutions((prev) => [optimisticEvolution, ...prev]);
    }

    const updatedPatient = {
      ...patient,
      treatmentPlan: nextTreatmentPlan,
      evolution: shouldAppendEvolution
        ? [
            {
              id: evolutionId,
              date: nowIso,
              notes: evolutionNotes,
              procedure_performed: evolutionProcedurePerformed,
              procedure: evolutionProcedure,
              event_type: evolutionType,
            },
            ...(patient.evolution || []),
          ]
        : (patient.evolution || []),
    };

    try {
      await onUpdatePatient(updatedPatient);

      // Criar transação financeira automaticamente ao concluir via odontograma
      if (isCompletionAction && existingTreatment) {
        const treatmentValue = Number(existingTreatment.value) || 0;
        const alreadyPaidViaPrePayment = existingTreatment.requires_prepayment && existingTreatment.prepayment_confirmed;
        if (treatmentValue > 0 && !alreadyPaidViaPrePayment) {
          const procedureLabel = existingTreatment.procedure || procedure || 'Procedimento';
          apiFetch('/api/finance', {
            method: 'POST',
            body: JSON.stringify({
              type: 'INCOME',
              description: `${procedureLabel} — dente ${toothNumber}`,
              category: 'Procedimentos',
              amount: treatmentValue,
              payment_method: 'Indefinido',
              date: nowIso.split('T')[0],
              status: 'PAID',
              patient_id: patient.id,
              procedure: procedureLabel,
              notes: `Gerado automaticamente ao concluir procedimento.`,
            }),
          }).then(() => {
            if (infoTab === 'financeiro') {
              apiFetch(`/api/patients/${patient.id}/financial`)
                .then((r) => r.json())
                .then((data) => setPatientFinancial(data))
                .catch(() => {});
            }
          }).catch((err) => {
            console.error('Error creating auto transaction from odontogram:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error applying odontogram action:', error);
    }

    if (shouldAppendEvolution) {
      persistEvolution({
        notes: evolutionNotes,
        procedure_performed: evolutionProcedurePerformed,
      }).catch((error) => {
        console.error('Error persisting evolution from odontogram action:', error);
      });
    }

    if (nextTreatmentId) setHighlightedTreatmentId(nextTreatmentId);
    if (shouldAppendEvolution) setHighlightedTimelineId(`evo-${evolutionId}`);
    setHighlightedToothNumber(toothNumber);

    window.setTimeout(() => setHighlightedTreatmentId(null), 2200);
    if (shouldAppendEvolution) window.setTimeout(() => setHighlightedTimelineId(null), 2200);
    window.setTimeout(() => setHighlightedToothNumber(null), 2600);
  };

  const handleCompleteTreatment = async (treatment: any) => {
    const nowIso = new Date().toISOString();
    const evolutionId = `evo-complete-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const nextTreatmentPlan = (patient.treatmentPlan || []).map((item: any) =>
      item.id === treatment.id
        ? { ...item, status: 'REALIZADO', completed_at: nowIso, updated_at: nowIso }
        : item
    );

    const evolutionEntry = {
      id: evolutionId,
      date: nowIso,
      notes: `Procedimento concluído no dente ${treatment.tooth_number || '-'}: ${treatment.procedure}.`,
      procedure_performed: `Conclusão - ${treatment.procedure}`,
      procedure: `Conclusão - ${treatment.procedure}`,
      event_type: 'PROCEDURE_COMPLETION',
    };

    setOptimisticTreatments((prev) => [
      { ...treatment, status: 'REALIZADO', completed_at: nowIso, updated_at: nowIso },
      ...prev.filter((item: any) => item.id !== treatment.id),
    ]);
    setOptimisticEvolutions((prev) => [evolutionEntry, ...prev]);

    const updatedPatient = {
      ...patient,
      treatmentPlan: nextTreatmentPlan,
      evolution: [evolutionEntry, ...(patient.evolution || [])],
    };

    try {
      await onUpdatePatient(updatedPatient);

      // Criar transação financeira automaticamente (pular se pagamento antecipado já confirmado)
      const treatmentValue = Number(treatment.value) || 0;
      const alreadyPaidViaPrePayment = treatment.requires_prepayment && treatment.prepayment_confirmed;
      if (treatmentValue > 0 && !alreadyPaidViaPrePayment) {
        const procedureLabel = treatment.procedure || 'Procedimento';
        const toothLabel = treatment.tooth_number ? ` — dente ${treatment.tooth_number}` : '';
        apiFetch('/api/finance', {
          method: 'POST',
          body: JSON.stringify({
            type: 'INCOME',
            description: `${procedureLabel}${toothLabel}`,
            category: 'Procedimentos',
            amount: treatmentValue,
            payment_method: 'Indefinido',
            date: nowIso.split('T')[0],
            status: 'PAID',
            patient_id: patient.id,
            procedure: procedureLabel,
            notes: `Gerado automaticamente ao concluir procedimento.`,
          }),
        }).then(() => {
          // Atualizar dados financeiros se aba estiver aberta
          if (infoTab === 'financeiro') {
            apiFetch(`/api/patients/${patient.id}/financial`)
              .then((r) => r.json())
              .then((data) => setPatientFinancial(data))
              .catch(() => {});
          }
        }).catch((err) => {
          console.error('Error creating auto transaction:', err);
        });
      }
    } catch (error) {
      console.error('Error completing treatment:', error);
    }

    persistEvolution({
      notes: evolutionEntry.notes,
      procedure_performed: evolutionEntry.procedure_performed,
    }).catch((error) => {
      console.error('Error persisting completion evolution:', error);
    });

    if (Number.isFinite(Number(treatment.tooth_number))) {
      const toothNumber = Number(treatment.tooth_number);
      const procedureText = String(treatment.procedure || '').toLowerCase();
      const completionStatus =
        procedureText.includes('canal')
          ? 'root_canal_done'
          : procedureText.includes('extr')
            ? 'extraction_done'
            : null;

      if (completionStatus) {
        handleOdontogramStatusChange(toothNumber, {
          status: completionStatus,
          notes: 'Procedimento concluído.',
        });
      }

      handleAddToothHistory({
        tooth_number: toothNumber,
        procedure: String(treatment.procedure || 'Procedimento'),
        notes: 'Procedimento concluído.',
        date: nowIso.split('T')[0],
      });
    }

    setSelectedTreatmentAction(null);
    setHighlightedTimelineId(`evo-${evolutionId}`);
    window.setTimeout(() => setHighlightedTimelineId(null), 2200);
  };

  const handleConvertTreatment = async (treatment: any, nextProcedure: string) => {
    const nowIso = new Date().toISOString();
    const evolutionId = `evo-convert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const nextTreatmentPlan = (patient.treatmentPlan || []).map((item: any) =>
      item.id === treatment.id
        ? {
            ...item,
            procedure: nextProcedure,
            status: 'APROVADO',
            value: Number(item.value) || 0,
            updated_at: nowIso,
          }
        : item
    );

    const evolutionEntry = {
      id: evolutionId,
      date: nowIso,
      notes: `Plano ajustado no dente ${treatment.tooth_number || '-'}: ${treatment.procedure} convertido para ${nextProcedure}.`,
      procedure_performed: `Conversão de plano`,
      procedure: `Conversão - ${treatment.procedure} -> ${nextProcedure}`,
      event_type: 'PLAN_CHANGE',
    };

    setOptimisticTreatments((prev) => [
      { ...treatment, procedure: nextProcedure, status: 'APROVADO', updated_at: nowIso },
      ...prev.filter((item: any) => item.id !== treatment.id),
    ]);
    setOptimisticEvolutions((prev) => [evolutionEntry, ...prev]);

    const updatedPatient = {
      ...patient,
      treatmentPlan: nextTreatmentPlan,
      evolution: [evolutionEntry, ...(patient.evolution || [])],
    };

    try {
      await onUpdatePatient(updatedPatient);
    } catch (error) {
      console.error('Error converting treatment:', error);
    }

    persistEvolution({
      notes: evolutionEntry.notes,
      procedure_performed: evolutionEntry.procedure_performed,
    }).catch((error) => {
      console.error('Error persisting conversion evolution:', error);
    });

    setSelectedTreatmentAction(null);
    setHighlightedTreatmentId(treatment.id);
    setHighlightedTimelineId(`evo-${evolutionId}`);
    if (Number.isFinite(Number(treatment.tooth_number))) {
      setHighlightedToothNumber(Number(treatment.tooth_number));
      window.setTimeout(() => setHighlightedToothNumber(null), 2600);
    }
    window.setTimeout(() => setHighlightedTreatmentId(null), 2200);
    window.setTimeout(() => setHighlightedTimelineId(null), 2200);
  };

  const handleAddToothHistory = async (record: { tooth_number: number; procedure: string; notes: string; date: string }) => {
    try {
      const res = await apiFetch(`/api/patients/${patient.id}/tooth-history`, {
        method: 'POST',
        body: JSON.stringify(record),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao salvar histórico dentário');
      }
    } catch (error) {
      console.error('Error adding tooth history:', error);
    }
  };

  const handleResetTooth = async (toothNumber: number) => {
    // Remove tooth from odontogram data
    const currentOdontogram = { ...(patient?.odontogram || {}) };
    delete currentOdontogram[toothNumber];
    setOptimisticOdontogram((prev) => {
      const next = { ...prev };
      delete next[toothNumber];
      return next;
    });

    // Remove active treatment plan items for this tooth
    const nextPlan = (mergedTreatmentPlan || []).filter(
      (item: any) => Number(item.tooth_number) !== toothNumber ||
        String(item.status || '').toUpperCase() === 'REALIZADO'
    );
    setOptimisticTreatments((prev) => {
      const nextIds = new Set(nextPlan.map((i: any) => i.id));
      return prev.filter((i: any) => nextIds.has(i.id) || Number(i.tooth_number) !== toothNumber);
    });

    try {
      // Update odontogram without the tooth
      await apiFetch(`/api/patients/${patient.id}/odontogram`, {
        method: 'POST',
        body: JSON.stringify({ data: currentOdontogram }),
      });

      // Delete tooth history entries
      await apiFetch(`/api/patients/${patient.id}/tooth-history/${toothNumber}`, {
        method: 'DELETE',
      });

      // Persist updated treatment plan (removes active items for this tooth)
      await onUpdatePatient({ ...patient, treatmentPlan: nextPlan });
    } catch (error) {
      console.error('Error resetting tooth:', error);
    }
  };

  const patientFiles = patient?.files || [];
  const financialTotal = mergedTreatmentPlan.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
  const completedTotal = mergedTreatmentPlan
    .filter((item: any) => String(item.status || '').toUpperCase() === 'REALIZADO')
    .reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);

  const openImagesTab = () => {
    setInfoTab('imagens');
    requestAnimationFrame(() => {
      infoPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleProfilePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !patient?.id) return;

    setIsUploadingProfilePhoto(true);
    setUploadFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch(`/api/patients/${patient.id}/photo`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao enviar foto do paciente');
      }

      await onRefreshPatient?.();
      setUploadFeedback('Foto atualizada.');
    } catch (error) {
      console.error('Error uploading patient profile image:', error);
      setUploadFeedback('Não foi possível enviar a foto.');
    } finally {
      setIsUploadingProfilePhoto(false);
      event.target.value = '';
    }
  };

  const handleClinicalImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !patient?.id) return;

    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ]);

    if (!allowedMimeTypes.has(file.type)) {
      setUploadFeedback('Formato inválido. Envie JPG, PNG, WEBP, GIF ou PDF.');
      event.target.value = '';
      return;
    }

    setIsUploadingClinicalImage(true);
    setUploadFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', file.name || 'Imagem/RX clínico');
      formData.append('file_type', file.type === 'application/pdf' ? 'pdf' : 'image');

      const res = await apiFetch(`/api/patients/${patient.id}/files`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao enviar imagem/RX. Verifique o formato e tamanho (máx. 5MB).');
      }

      await onRefreshPatient?.();
      setInfoTab('imagens');
      setUploadFeedback('Imagem anexada.');
    } catch (error) {
      console.error('Error uploading patient clinical image:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível enviar a imagem.';
      setUploadFeedback(message);
    } finally {
      setIsUploadingClinicalImage(false);
      event.target.value = '';
    }
  };

  const focusOdontogram = () => {
    requestAnimationFrame(() => {
      odontogramRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const saveAnamnese = async () => {
    setIsSavingAnamnese(true);
    try {
      const res = await apiFetch(`/api/patients/${patient.id}/anamnesis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anamneseForm),
      });
      if (!res.ok) throw new Error('Falha ao salvar anamnese');
      await onRefreshPatient?.();
      setIsEditingAnamnese(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingAnamnese(false);
    }
  };

  const activeToothNumbers = useMemo(
    () =>
      treatmentInProgress
        .map((item: any) => Number(item.tooth_number))
        .filter((toothNumber: number) => Number.isFinite(toothNumber) && toothNumber > 0),
    [treatmentInProgress]
  );

  const priorityToothNumber = useMemo(() => {
    const first = treatmentInProgress[0];
    const toothNumber = Number(first?.tooth_number);
    return Number.isFinite(toothNumber) && toothNumber > 0 ? toothNumber : null;
  }, [treatmentInProgress]);

  const upcomingAppointment = useMemo(
    () =>
      [...patientAppointments]
        .filter((appointment: any) => new Date(appointment.start_time).getTime() >= Date.now())
        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null,
    [patientAppointments]
  );

  const primaryTreatment = treatmentInProgress[0] || null;
  const primaryActionTitle = primaryTreatment
    ? `${primaryTreatment.procedure}${primaryTreatment.tooth_number ? ` • dente ${primaryTreatment.tooth_number}` : ''}`
    : upcomingAppointment
      ? 'Preparar atendimento agendado'
      : 'Começar pelo odontograma';
  const primaryActionHelper = primaryTreatment
    ? String(primaryTreatment.status || '').toUpperCase() === 'PENDENTE'
      ? 'Valide a prioridade e confirme a conduta antes de seguir.'
      : 'Este é o foco clínico principal para o atendimento atual.'
    : upcomingAppointment
      ? 'A consulta já está marcada. Revise o caso e registre a evolução ao finalizar.'
      : 'Mapeie a condição dentária primeiro para orientar o próximo procedimento.';
  const primaryActionButtonLabel = primaryTreatment ? 'Abrir tratamento atual' : 'Ir para odontograma';

  const greetingText = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const iosCard =
    'bg-white/92 border border-slate-200/70 shadow-[0_8px_24px_rgba(15,23,42,0.05)]';
  const iosSubtleCard =
    'bg-slate-50/70 border border-slate-200/70';

  return (
    <div className="min-h-screen bg-[#F7F7F8] pb-24 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-100/60 ios-glass-heavy">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-3">
          <div className="rounded-[26px] border border-slate-200/60 bg-white/95 px-4 py-3.5 sm:px-5 shadow-[0_6px_24px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]">

            {/* ── Row 1: identidade + ações ── */}
            <div className="flex items-center gap-3">
              {/* Voltar */}
              <button
                onClick={() => { setAppActiveTab('pacientes'); appNavigate('/pacientes'); }}
                className="shrink-0 h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 transition-colors hover:text-slate-900 active:scale-[0.94]"
                aria-label="Voltar para pacientes"
              >
                <ArrowLeft size={16} />
              </button>

              {/* Avatar */}
              <div className="relative shrink-0 group">
                <div className="w-12 h-12 rounded-[16px] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/80 flex items-center justify-center shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-300 group-hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)]">
                  {patient?.photo_url ? (
                    <img src={patient.photo_url} alt={patient?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-slate-700 font-bold text-sm select-none">
                      {String(patient?.name || 'P').split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0].toUpperCase()).join('')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  disabled={isUploadingProfilePhoto}
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 shadow-sm transition-colors hover:text-slate-900 disabled:opacity-60"
                  aria-label="Enviar foto"
                >
                  <Camera size={10} />
                </button>
                <input ref={profilePhotoInputRef} type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="hidden" />
              </div>

              {/* Nome + badge + idade */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-medium tracking-wide mb-0.5">{greetingText}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[19px] sm:text-[22px] font-bold tracking-[-0.025em] text-slate-950 leading-tight truncate">
                    {patient?.name}
                  </h1>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.07em] uppercase transition-all duration-300 ${clinicalBadge.className}`}>
                    {clinicalBadge.label}
                  </span>
                </div>
                <p className="text-[12px] text-slate-400 mt-0.5 font-medium">
                  {age !== null ? `${age} anos` : 'Idade n/i'}
                  {treatmentInProgress.length > 0 && (
                    <span className="ml-1.5 text-slate-200">·</span>
                  )}
                  {treatmentInProgress.length > 0 && (
                    <span className="ml-1.5 tabular-nums">{treatmentInProgress.length} procedimento{treatmentInProgress.length !== 1 ? 's' : ''} ativo{treatmentInProgress.length !== 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>

              {/* Ações compactas */}
              <div className="shrink-0 flex items-center gap-1.5">
                <div className="hidden sm:inline-flex items-center rounded-full border border-slate-200/60 bg-slate-50/80 p-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
                  <button
                    type="button"
                    onClick={() => setIsFocusMode(true)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ease-out ${isFocusMode ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-400 hover:text-slate-600'}`}
                  >Foco</button>
                  <button
                    type="button"
                    onClick={() => setIsFocusMode(false)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ease-out ${!isFocusMode ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-400 hover:text-slate-600'}`}
                  >Geral</button>
                </div>
                <button
                  onClick={() => setIsAddingEvolution(true)}
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 transition-all duration-200 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm ios-press"
                  title="Nova evolução"
                >
                  <Plus size={15} />
                </button>
                <button
                  onClick={openImagesTab}
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 transition-all duration-200 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm ios-press"
                  title="Imagens/RX"
                >
                  <Camera size={15} />
                </button>
              </div>
            </div>

            {/* ── Row 2: tira de contexto — próximo passo ── */}
            <div className="mt-3">
              {primaryTreatment ? (
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] bg-gradient-to-r from-slate-50 to-slate-50/60 border border-slate-200/60 transition-all duration-300 hover:border-slate-300/70">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 animate-breathe ${resolveProcedureCategory(primaryTreatment.procedure).dotCls}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 mb-0.5">Próximo passo</p>
                    <p className="text-[13px] font-semibold text-slate-900 truncate">
                      {primaryTreatment.procedure}{primaryTreatment.tooth_number ? ` · dente ${primaryTreatment.tooth_number}` : ''}
                    </p>
                  </div>
                  {upcomingAppointment && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium shrink-0">
                      <Calendar size={10} className="text-slate-300" />
                      {formatDate(upcomingAppointment.start_time)}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setHighlightedTreatmentId(primaryTreatment.id);
                      window.setTimeout(() => setHighlightedTreatmentId(null), 2200);
                      focusOdontogram();
                    }}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-slate-950 text-white text-[12px] font-semibold hover:bg-slate-800 active:scale-[0.95] transition-all duration-200 shadow-[0_2px_8px_rgba(15,23,42,0.15)]"
                  >
                    Abrir
                  </button>
                </div>
              ) : upcomingAppointment ? (
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] bg-gradient-to-r from-sky-50 to-sky-50/60 border border-sky-200/60 transition-all duration-300 hover:border-sky-300/70">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 animate-breathe" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-sky-500 mb-0.5">Próxima consulta</p>
                    <p className="text-[13px] font-semibold text-slate-900">{formatDate(upcomingAppointment.start_time)} às {formatTime(upcomingAppointment.start_time)}</p>
                  </div>
                  <button
                    onClick={focusOdontogram}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-slate-950 text-white text-[12px] font-semibold hover:bg-slate-800 active:scale-[0.97] transition-all duration-150"
                  >
                    Ver dentes
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] bg-slate-50 border border-slate-200/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                  <p className="text-[13px] text-slate-500 flex-1 font-medium">Nenhum tratamento ativo · comece pelo odontograma</p>
                  <button
                    onClick={focusOdontogram}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-slate-950 text-white text-[12px] font-semibold hover:bg-slate-800 active:scale-[0.97] transition-all duration-150"
                  >
                    Ver dentes
                  </button>
                </div>
              )}
            </div>

            {/* Focus toggle mobile */}
            <div className="mt-2.5 sm:hidden flex gap-1 p-0.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
              <button type="button" onClick={() => setIsFocusMode(true)} className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ease-out ${isFocusMode ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-400'}`}>Foco</button>
              <button type="button" onClick={() => setIsFocusMode(false)} className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ease-out ${!isFocusMode ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-400'}`}>Geral</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6">

        <section ref={odontogramRef} className="rounded-[30px] p-4 sm:p-5 border border-slate-200/60 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] transition-shadow duration-500 hover:shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-slate-950">Odontograma</h2>
              {activeToothNumbers.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-breathe" />
                  {activeToothNumbers.length} dente{activeToothNumbers.length !== 1 ? 's' : ''} em tratamento
                </p>
              )}
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 bg-slate-50/80 px-2.5 py-1.5 rounded-full border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Interativo</span>
          </div>

          <div className="rounded-[26px] p-1.5 sm:p-2 bg-slate-50/70 ring-1 ring-slate-100/80">
            <Odontogram
              data={mergedOdontogram}
              history={patient?.toothHistory || []}
              onChange={handleOdontogramStatusChange}
              onAddHistory={handleAddToothHistory}
              onResetTooth={handleResetTooth}
              onSelectProcedure={handleOdontoProcedureSelect}
              treatments={mergedTreatmentPlan}
              activeToothNumbers={activeToothNumbers}
              priorityToothNumber={priorityToothNumber}
              highlightedToothNumber={highlightedToothNumber}
            />
          </div>
        </section>

        <div className={`grid grid-cols-1 gap-6 ${isFocusMode ? '' : 'xl:grid-cols-[1.7fr_1fr]'}`}>
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200/60 bg-white/95 p-5 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] transition-shadow duration-500 hover:shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.02em] text-slate-950">Tratamento atual</h3>
                  {treatmentInProgress.length > 0 ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {treatmentInProgress.length} procedimento{treatmentInProgress.length !== 1 ? 's' : ''}
                      {' · '}
                      {treatmentInProgress.reduce((s: number, i: any) => s + (Number(i.value) || 0), 0)
                        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">Nenhum procedimento ativo</p>
                  )}
                </div>
                {treatmentInProgress.length > 0 && (() => {
                  const activeUnpaid = treatmentInProgress.filter((item: any) => !item.prepayment_confirmed);
                  const allActive = activeUnpaid.length > 0 && activeUnpaid.every((item: any) => item.requires_prepayment);
                  const allPaid = treatmentInProgress.every((item: any) => item.requires_prepayment && item.prepayment_confirmed);
                  return (
                    <button
                      type="button"
                      onClick={togglePrepaymentAll}
                      disabled={allPaid}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${
                        allPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : allActive
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                            : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-600 hover:border-slate-300'
                      }`}
                      title={allPaid ? 'Orçamento quitado' : allActive ? 'Cobrar antes de executar (ativo)' : 'Exigir pagamento antes de executar'}
                    >
                      {allPaid ? (
                        <><Check size={11} /> Quitado</>
                      ) : allActive ? (
                        <><Lock size={11} /> Cobrar antes</>
                      ) : (
                        <><Shield size={11} /> Cobrar antes</>
                      )}
                    </button>
                  );
                })()}
              </div>

              <div className="space-y-3">
                {treatmentInProgress.length > 0 ? (
                  treatmentInProgress.map((item: any, idx: number) => {
                    const isPriority = idx === 0;
                    const rawStatus = String(item.status || '').toUpperCase();
                    const isPrepaid = item.requires_prepayment && item.prepayment_confirmed;

                    const statusConfig = rawStatus === 'APROVADO'
                      ? { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Em andamento' }
                      : rawStatus === 'PENDENTE'
                        ? { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Aguardando' }
                        : { cls: 'bg-sky-50 text-sky-700 border-sky-200', label: 'Planejado' };

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300 ease-out sm:flex-row sm:items-center sm:justify-between ios-hover-lift ${
                          isPrepaid
                            ? 'border-emerald-200/80 bg-gradient-to-r from-emerald-50/30 to-emerald-50/10 shadow-[0_4px_14px_rgba(16,185,129,0.05)]'
                            : isPriority
                              ? 'border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]'
                              : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                        } ${
                          highlightedTreatmentId === item.id
                            ? 'ring-2 ring-indigo-200/70 shadow-[0_6px_20px_rgba(99,102,241,0.1)] animate-glow-pulse'
                            : ''
                        }`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="min-w-0 flex-1">
                          {/* row 1: procedure name */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {isPriority && (
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-500 mb-1">Próximo passo</p>
                              )}
                              <p className={`font-bold leading-snug truncate ${isPriority ? 'text-[16px] text-slate-950' : 'text-[14px] text-slate-800'}`}>
                                {item.procedure}
                              </p>
                            </div>
                            {item.tooth_number && (
                              <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                dente {item.tooth_number}
                              </span>
                            )}
                          </div>

                          {/* row 2: status + value */}
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${statusConfig.cls}`}>
                              {statusConfig.label}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400 font-medium">R$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={isPrepaid}
                                value={editingValues[item.id] ?? formatCurrencyInputBRL(String((Number(item.value) || 0) * 100))}
                                onChange={(event) => {
                                  const next = formatCurrencyInputBRL(event.target.value);
                                  setEditingValues((prev) => ({ ...prev, [item.id]: next }));
                                }}
                                onBlur={() => {
                                  const nextRaw = editingValues[item.id] ?? formatCurrencyInputBRL(String((Number(item.value) || 0) * 100));
                                  persistTreatmentValue(item.id, nextRaw);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    const nextRaw = editingValues[item.id] ?? formatCurrencyInputBRL(String((Number(item.value) || 0) * 100));
                                    persistTreatmentValue(item.id, nextRaw);
                                    (event.currentTarget as HTMLInputElement).blur();
                                  }
                                }}
                                className={`w-24 rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold outline-none ${
                                  isPrepaid
                                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700 cursor-default'
                                    : 'border-slate-200 bg-white text-slate-700 focus:border-slate-400'
                                }`}
                                aria-label="Valor do procedimento"
                              />
                            </div>

                            {isPrepaid && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check size={9} /> Pago
                              </span>
                            )}
                            {item.requires_prepayment && !item.prepayment_confirmed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                                <Lock size={9} /> Aguardando
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedTreatmentAction(item)}
                          className={`w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ios-press ${
                            isPriority
                              ? 'bg-slate-950 text-white hover:bg-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.15)]'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                          }`}
                        >
                          Continuar
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className={`rounded-2xl py-10 text-center ${iosSubtleCard}`}>
                    <div className="flex flex-col items-center gap-3 px-4">
                      <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 animate-gentle-float shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                        <Clock3 size={18} />
                      </div>
                      <p className="text-slate-800 text-sm font-bold">Nenhum tratamento ativo no momento</p>
                      <p className="text-slate-500 text-xs leading-relaxed max-w-[240px]">Inicie pelo odontograma para planejar o próximo passo clínico.</p>
                      <button
                        onClick={focusOdontogram}
                        className="mt-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 hover:shadow-sm hover:border-slate-300 ios-press transition-all duration-200"
                      >
                        Adicionar tratamento
                      </button>
                    </div>
                  </div>
                )}

                {/* Receber pelo orçamento completo */}
                {(() => {
                  const unpaid = treatmentInProgress.filter(
                    (item: any) => !(item.requires_prepayment && item.prepayment_confirmed)
                  );
                  const allPaid = treatmentInProgress.length > 0 && unpaid.length === 0;
                  const unpaidTotal = unpaid.reduce((s: number, i: any) => s + (Number(i.value) || 0), 0);
                  if (treatmentInProgress.length < 2 && !allPaid) return null;
                  return allPaid ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <p className="text-[13px] font-semibold text-emerald-700">Orçamento quitado</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 flex items-center justify-between gap-3 transition-all duration-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <CreditCard size={14} className="text-slate-600" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-[13px] font-bold text-slate-800">Receber pelo orçamento completo</p>
                          <p className="text-[11px] text-slate-500">{unpaid.length} procedimento{unpaid.length !== 1 ? 's' : ''} pendente{unpaid.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <span className="text-[14px] font-bold text-slate-900 shrink-0">
                        {unpaidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </section>

            {!isFocusMode && (
            <section className="rounded-[24px] border border-slate-200/60 bg-white/95 p-4 sm:p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] transition-shadow duration-500 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
              {/* ── Header ── */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold tracking-[-0.015em] text-slate-900">Evolução clínica</h3>
                  {timelineItems.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium tabular-nums">
                      {timelineItems.length} registro{timelineItems.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsAddingEvolution(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 ios-press transition-all duration-200 shadow-[0_2px_8px_rgba(15,23,42,0.15)]"
                >
                  <Plus size={11} />
                  Registrar
                </button>
              </div>

              {timelineItems.length > 0 ? (
                <div className="relative">
                  {/* vertical guide line */}
                  <div className="absolute left-[14px] top-3 bottom-3 w-[2px] rounded-full bg-slate-100" />

                  <div>
                    {(() => {
                      const visibleItems = showAllEvolutions ? timelineItems : timelineItems.slice(0, 5);
                      const nodes: React.ReactNode[] = [];
                      let lastGroup = '';

                      visibleItems.forEach((item: any, idx: number) => {
                        const group = resolveTimelineMonthGroup(item.date);
                        if (group !== lastGroup) {
                          lastGroup = group;
                          nodes.push(
                            <div key={`grp-${group}`} className="flex items-center gap-2 pl-8 pb-2 pt-3 first:pt-0">
                              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{group}</span>
                              <div className="flex-1 h-px bg-slate-100" />
                            </div>
                          );
                        }

                        const cat = resolveProcedureCategory(item.title);
                        const isNewlyAdded = highlightedTimelineId === item.id;
                        const statusStyle = TIMELINE_STATUS_STYLES[item.status] ?? TIMELINE_STATUS_STYLES.OBSERVACAO;

                        nodes.push(
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut', delay: idx * 0.025 }}
                            className="relative flex items-start gap-3 pb-3"
                          >
                            {/* colored dot on vertical line */}
                            <div className="relative z-10 flex-shrink-0 w-[30px] flex items-center justify-center mt-[15px]">
                              <div className={`w-[11px] h-[11px] rounded-full ring-[3px] ring-white shadow-sm transition-transform duration-300 hover:scale-125 ${cat.dotCls}`} />
                            </div>

                            {/* card */}
                            <div className={`flex-1 min-w-0 rounded-[18px] bg-white border border-slate-200/70 border-l-[3px] ${cat.borderCls} p-3.5 shadow-[0_1px_4px_rgba(15,23,42,0.03)] transition-all duration-300 ease-out hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:translate-y-[-1px] ${isNewlyAdded ? 'ring-2 ring-blue-200/60 shadow-[0_4px_16px_rgba(99,102,241,0.08)] animate-glow-pulse' : ''}`}>
                              {/* row 1: category tag + date */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`inline-flex text-[10px] font-extrabold uppercase tracking-[0.07em] px-2 py-0.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${cat.tagCls}`}>
                                  {cat.label}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium tabular-nums shrink-0">{formatDate(item.date)}</span>
                              </div>

                              {/* row 2: procedure title */}
                              <p className="text-[14px] font-bold text-slate-900 leading-snug">{item.title}</p>

                              {/* row 3: notes */}
                              {item.notes && (
                                <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{item.notes}</p>
                              )}

                              {/* row 4: status */}
                              <div className="mt-2.5 flex items-center gap-1.5">
                                <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${statusStyle.dot}`} />
                                <span className={`text-[11px] font-semibold ${statusStyle.text}`}>{statusStyle.label}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      });

                      return nodes;
                    })()}
                  </div>

                  {timelineItems.length > 5 && (
                    <div className="pl-[42px] pt-1">
                      <button
                        onClick={() => setShowAllEvolutions(prev => !prev)}
                        className="w-full py-2.5 rounded-xl bg-slate-50 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-white hover:shadow-sm active:scale-[0.98] transition-all duration-200"
                      >
                        {showAllEvolutions
                          ? 'Mostrar menos'
                          : `Ver mais ${timelineItems.length - 5} registro${timelineItems.length - 5 !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`rounded-2xl py-10 text-center ${iosSubtleCard}`}>
                  <div className="flex flex-col items-center gap-3 px-4">
                    <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 animate-gentle-float shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                      <FileText size={18} />
                    </div>
                    <p className="text-slate-800 text-sm font-bold">Ainda não há evoluções registradas</p>
                    <p className="text-slate-500 text-xs leading-relaxed max-w-[260px]">Registre a primeira evolução para iniciar o histórico clínico do paciente.</p>
                    <button
                      onClick={() => setIsAddingEvolution(true)}
                      className="mt-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-900 ios-press transition-all duration-200 shadow-[0_2px_8px_rgba(15,23,42,0.15)]"
                    >
                      Nova evolução
                    </button>
                  </div>
                </div>
              )}
            </section>
            )}
          </div>

          {!isFocusMode && (
          <aside ref={infoPanelRef} className={`${iosCard} rounded-[26px] p-4 sm:p-5 h-fit xl:sticky xl:top-[112px] transition-shadow duration-500 hover:shadow-[0_12px_32px_rgba(15,23,42,0.07)]`}>
            {(() => {
              const hasAllergy = (() => {
                const val = patient?.anamnesis?.allergies;
                return val && val.trim() && val.trim().toLowerCase() !== 'não informado' && val.trim().toLowerCase() !== 'nenhuma';
              })();
              const pendingCount = (patientFinancial?.installments || []).filter((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE').length;
              const fileCount = patientFiles.length;

              const tabs = [
                { id: 'anamneses', label: 'Anamnese', dot: hasAllergy ? 'bg-rose-500' : null, count: null },
                { id: 'dados', label: 'Dados', dot: null, count: null },
                { id: 'imagens', label: 'Imagens', dot: null, count: fileCount > 0 ? fileCount : null },
                { id: 'financeiro', label: 'Financeiro', dot: pendingCount > 0 ? 'bg-amber-500' : null, count: pendingCount > 0 ? pendingCount : null },
              ];

              return (
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50/80 rounded-2xl mb-4 border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setInfoTab(tab.id as InfoTab)}
                      className={`relative px-2 py-2 rounded-xl text-[11px] font-semibold transition-all duration-250 ease-out ${
                        infoTab === tab.id
                          ? 'bg-white text-slate-950 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }`}
                    >
                      {tab.label}
                      {tab.dot && infoTab !== tab.id && (
                        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${tab.dot} ring-2 ring-slate-50`} />
                      )}
                      {tab.count && tab.count > 0 && infoTab !== tab.id && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}

            {infoTab === 'anamneses' && (
              <div className="space-y-3 text-sm">
                {/* Header com botão editar/cancelar */}
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Anamnese clínica</p>
                  {!isEditingAnamnese ? (
                    <button
                      onClick={() => {
                        setAnamneseForm({
                          medical_history: patient?.anamnesis?.medical_history || '',
                          allergies: patient?.anamnesis?.allergies || '',
                          medications: patient?.anamnesis?.medications || '',
                        });
                        setIsEditingAnamnese(true);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                    >
                      Editar
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingAnamnese(false)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {isEditingAnamnese ? (
                  <>
                    {/* Histórico médico — editável */}
                    <div className="p-3.5 rounded-[18px] bg-slate-50 border border-slate-200/70">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 mb-2">Histórico médico</p>
                      <textarea
                        value={anamneseForm.medical_history}
                        onChange={(e) => setAnamneseForm((f) => ({ ...f, medical_history: e.target.value }))}
                        rows={3}
                        placeholder="Ex: Hipertensão, diabetes, cirurgias anteriores..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none transition-colors leading-relaxed"
                      />
                    </div>

                    {/* Alergias — editável */}
                    <div className="p-3.5 rounded-[18px] bg-rose-50 border border-rose-200">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-rose-600 mb-2">Alergias</p>
                      <textarea
                        value={anamneseForm.allergies}
                        onChange={(e) => setAnamneseForm((f) => ({ ...f, allergies: e.target.value }))}
                        rows={2}
                        placeholder="Ex: Penicilina, látex, anestésico..."
                        className="w-full resize-none rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none transition-colors leading-relaxed"
                      />
                    </div>

                    {/* Medicações — editável */}
                    <div className="p-3.5 rounded-[18px] bg-amber-50 border border-amber-200">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-600 mb-2">Medicações em uso</p>
                      <textarea
                        value={anamneseForm.medications}
                        onChange={(e) => setAnamneseForm((f) => ({ ...f, medications: e.target.value }))}
                        rows={2}
                        placeholder="Ex: Losartana 50mg, Metformina..."
                        className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none transition-colors leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={saveAnamnese}
                      disabled={isSavingAnamnese}
                      className="w-full py-2.5 rounded-xl bg-slate-950 text-white text-[13px] font-semibold hover:bg-slate-800 ios-press transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(15,23,42,0.15)]"
                    >
                      {isSavingAnamnese ? (
                        <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                      ) : (
                        <><Check size={14} /> Salvar anamnese</>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Histórico médico — leitura */}
                    <div className="p-3.5 rounded-[18px] bg-slate-50 border border-slate-200/70">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 mb-1.5">Histórico médico</p>
                      <p className="text-slate-700 leading-relaxed">{patient?.anamnesis?.medical_history || 'Não informado'}</p>
                    </div>

                    {/* Alergias — risk highlight */}
                    {(() => {
                      const val = patient?.anamnesis?.allergies;
                      const hasContent = val && val.trim() && val.trim().toLowerCase() !== 'não informado' && val.trim().toLowerCase() !== 'nenhuma';
                      return (
                        <div className={`p-3.5 rounded-[18px] border ${hasContent ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200/70'}`}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {hasContent && <div className="w-[7px] h-[7px] rounded-full bg-rose-500 shrink-0" />}
                            <p className={`text-[10px] font-extrabold uppercase tracking-[0.1em] ${hasContent ? 'text-rose-600' : 'text-slate-400'}`}>Alergias</p>
                          </div>
                          <p className={`leading-relaxed ${hasContent ? 'text-rose-900 font-semibold' : 'text-slate-700'}`}>{val || 'Não informado'}</p>
                        </div>
                      );
                    })()}

                    {/* Medicações — amber highlight */}
                    {(() => {
                      const val = patient?.anamnesis?.medications;
                      const hasContent = val && val.trim() && val.trim().toLowerCase() !== 'não informado' && val.trim().toLowerCase() !== 'nenhuma';
                      return (
                        <div className={`p-3.5 rounded-[18px] border ${hasContent ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200/70'}`}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {hasContent && <div className="w-[7px] h-[7px] rounded-full bg-amber-500 shrink-0" />}
                            <p className={`text-[10px] font-extrabold uppercase tracking-[0.1em] ${hasContent ? 'text-amber-600' : 'text-slate-400'}`}>Medicações em uso</p>
                          </div>
                          <p className={`leading-relaxed ${hasContent ? 'text-amber-900 font-semibold' : 'text-slate-700'}`}>{val || 'Não informado'}</p>
                        </div>
                      );
                    })()}

                    {/* Ver mais — campos do pré-atendimento */}
                    {(() => {
                      const extra = patient?.anamnesis;
                      const hasExtra = extra && (extra.chief_complaint || extra.habits || extra.family_history);
                      if (!hasExtra) return null;

                      const extraFields = [
                        { label: 'Queixa principal', value: extra.chief_complaint, color: 'bg-blue-50 border-blue-200/70', labelColor: 'text-blue-600' },
                        { label: 'Hábitos', value: extra.habits, color: 'bg-violet-50 border-violet-200/70', labelColor: 'text-violet-600' },
                        { label: 'Histórico familiar', value: extra.family_history, color: 'bg-teal-50 border-teal-200/70', labelColor: 'text-teal-600' },
                      ].filter(f => f.value && f.value.trim());

                      if (extraFields.length === 0) return null;

                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowAnamneseExtra(v => !v)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showAnamneseExtra ? 'Ver menos' : `Ver mais (${extraFields.length})`}
                            <ChevronDown size={13} className={`transition-transform ${showAnamneseExtra ? 'rotate-180' : ''}`} />
                          </button>
                          {showAnamneseExtra && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                              {extraFields.map(f => (
                                <div key={f.label} className={`p-3.5 rounded-[18px] border ${f.color}`}>
                                  <p className={`text-[10px] font-extrabold uppercase tracking-[0.1em] ${f.labelColor} mb-1.5`}>{f.label}</p>
                                  <p className="text-slate-700 leading-relaxed">{f.value}</p>
                                </div>
                              ))}
                              <p className="text-[10px] text-slate-300 text-center">Informações enviadas pelo paciente via pré-atendimento</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {infoTab === 'dados' && (
              <div className="space-y-2 text-sm">
                {[
                  { label: 'CPF', value: patient?.cpf, icon: <UserRound size={13} /> },
                  { label: 'Telefone', value: patient?.phone, icon: <Phone size={13} /> },
                  { label: 'E-mail', value: patient?.email, icon: <Info size={13} /> },
                  { label: 'Data de nascimento', value: patient?.birth_date ? formatDate(patient.birth_date) : null, icon: <Calendar size={13} /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-center gap-3 px-3.5 py-3 rounded-[16px] bg-slate-50/80 border border-slate-200/60 transition-all duration-300 ease-out hover:bg-white hover:border-slate-300/70 hover:shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-slate-400">{label}</p>
                      <p className="text-[13px] font-medium text-slate-800 truncate mt-0.5">{value || 'Não informado'}</p>
                    </div>
                  </div>
                ))}

                {/* Ver mais — dados do pré-atendimento */}
                {(() => {
                  const hasEmergency = patient?.emergency_contact_name || patient?.emergency_contact_phone;
                  const hasInsurance = patient?.health_insurance;
                  const consents: any[] = patient?.consents || [];
                  const hasConsents = consents.length > 0;
                  const hasExtra = hasEmergency || hasInsurance || hasConsents;
                  if (!hasExtra) return null;

                  const consentLabels: Record<string, string> = {
                    TREATMENT_CONSENT: 'Consentimento de Tratamento',
                    DATA_PRIVACY: 'Privacidade de Dados (LGPD)',
                    GENERAL_TERMS: 'Termos Gerais de Uso',
                  };

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowDadosExtra(v => !v)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showDadosExtra ? 'Ver menos' : 'Ver mais — Pré-atendimento'}
                        <ChevronDown size={13} className={`transition-transform ${showDadosExtra ? 'rotate-180' : ''}`} />
                      </button>
                      {showDadosExtra && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          {/* Contato de emergência */}
                          {hasEmergency && (
                            <div className="p-3.5 rounded-[18px] bg-orange-50 border border-orange-200/70">
                              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-orange-600 mb-2">Contato de emergência</p>
                              {patient.emergency_contact_name && (
                                <p className="text-[13px] font-medium text-slate-800">{patient.emergency_contact_name}</p>
                              )}
                              {patient.emergency_contact_phone && (
                                <p className="text-[12px] text-slate-500 mt-0.5">{patient.emergency_contact_phone}</p>
                              )}
                            </div>
                          )}

                          {/* Convênio */}
                          {hasInsurance && (
                            <div className="p-3.5 rounded-[18px] bg-blue-50 border border-blue-200/70">
                              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blue-600 mb-2">Convênio / Plano de saúde</p>
                              <p className="text-[13px] font-medium text-slate-800">{patient.health_insurance}</p>
                              {patient.health_insurance_number && (
                                <p className="text-[12px] text-slate-500 mt-0.5">Carteirinha: {patient.health_insurance_number}</p>
                              )}
                            </div>
                          )}

                          {/* Termos aceitos e assinatura */}
                          {hasConsents && (
                            <div className="p-3.5 rounded-[18px] bg-emerald-50 border border-emerald-200/70">
                              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-600 mb-2">Termos aceitos digitalmente</p>
                              <div className="space-y-2">
                                {consents.map((c: any) => (
                                  <div key={c.id} className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                      <Check size={11} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[12px] font-semibold text-slate-700">{consentLabels[c.consent_type] || c.consent_type}</p>
                                      <p className="text-[10px] text-slate-400">
                                        Assinado em {new Date(c.signed_at).toLocaleDateString('pt-BR')} às {new Date(c.signed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Assinatura digital */}
                              {consents[0]?.signature_data && consents[0].signature_data.startsWith('data:image') && (
                                <div className="mt-3 pt-3 border-t border-emerald-200/50">
                                  <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-600 mb-2">Assinatura digital</p>
                                  <div className="bg-white rounded-xl border border-emerald-200/50 p-2">
                                    <img src={consents[0].signature_data} alt="Assinatura digital" className="max-h-20 mx-auto" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <p className="text-[10px] text-slate-300 text-center">Informações enviadas pelo paciente via pré-atendimento</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {infoTab === 'imagens' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-[18px] bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Anexos clínicos</p>
                    <button
                      type="button"
                      onClick={() => clinicalImageInputRef.current?.click()}
                      disabled={isUploadingClinicalImage}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Camera size={12} />
                {isUploadingClinicalImage ? 'Enviando...' : 'Adicionar imagem / RX'}
                    </button>
                  </div>
                  <input
                    ref={clinicalImageInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleClinicalImageUpload}
                    className="hidden"
                  />
                </div>

                {patientFiles.length > 0 ? (
                  patientFiles.slice(0, 6).map((file: any) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-[18px] bg-slate-50/80 border border-slate-200/60 transition-all duration-300 ease-out hover:bg-white hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:translate-y-[-1px] ios-press-gentle"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        {(file.file_url || '').toLowerCase().endsWith('.pdf')
                          ? <FileText size={16} />
                          : <Camera size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{file.description || 'Arquivo clínico'}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{file.created_at ? formatDate(file.created_at) : 'Data n/i'}</p>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="p-8 rounded-[20px] text-center text-sm text-slate-500 bg-slate-50 border border-slate-200/70">Sem imagens ou RX ainda</div>
                )}

                {uploadFeedback && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-slate-500 px-1 flex items-center gap-1.5"
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {uploadFeedback}
                  </motion.p>
                )}
              </div>
            )}

            {infoTab === 'financeiro' && (
              <div className="space-y-3">
                {/* Resumo financeiro — 3 métricas em fluxo visual */}
                {(() => {
                  const received = (patientFinancial?.transactions || [])
                    .filter((t: any) => t.type === 'INCOME')
                    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
                  const pct = financialTotal > 0 ? Math.min(100, Math.round((received / financialTotal) * 100)) : 0;
                  const remaining = Math.max(0, financialTotal - received);
                  return (
                    <div className="rounded-[18px] bg-slate-50 border border-slate-200/70 p-4 space-y-3">
                      {/* Orçado → Concluído pipeline */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 mb-1">Orçamento total</p>
                          <p className="text-[16px] font-bold text-slate-900">
                            {financialTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-600 mb-1">Concluído</p>
                          <p className="text-[16px] font-bold text-emerald-700">
                            {completedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>

                      {/* Recebimento com barra de progresso */}
                      <div className="pt-2 border-t border-slate-200/70">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Recebido</p>
                          <span className="text-[11px] font-bold text-slate-500">{pct}%</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-[15px] font-bold text-emerald-700">
                            {received.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          {remaining > 0 && (
                            <p className="text-[11px] text-slate-400">falta {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          )}
                        </div>
                        <div className="mt-2 h-[6px] rounded-full bg-slate-200/60 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Parcelas pendentes */}
                {(() => {
                  const pending = (patientFinancial?.installments || []).filter((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE');
                  if (pending.length === 0) return null;
                  return (
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 px-1 mb-1.5">Parcelas pendentes</p>
                      <div className="space-y-1.5">
                        {pending.slice(0, 5).map((inst: any) => {
                          const isOverdue = inst.status === 'OVERDUE' || new Date(inst.due_date) < new Date();
                          return (
                            <div key={inst.id} className={`flex items-center gap-2.5 p-2.5 rounded-[14px] border ${isOverdue ? 'bg-rose-50 border-rose-200' : 'bg-amber-50/40 border-amber-200/60'}`}>
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                <WalletCards size={13} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-slate-800 truncate">{inst.procedure || `Parcela ${inst.number}`}</p>
                                <p className={`text-[11px] font-medium ${isOverdue ? 'text-rose-600' : 'text-amber-700'}`}>
                                  {isOverdue ? 'Vencida em' : 'Vence em'} {formatDate(inst.due_date)}
                                </p>
                              </div>
                              <span className={`text-[13px] font-bold shrink-0 ${isOverdue ? 'text-rose-700' : 'text-slate-800'}`}>
                                {Number(inst.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          );
                        })}
                        {pending.length > 5 && (
                          <p className="text-[11px] text-slate-400 text-center">+{pending.length - 5} parcelas</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Movimentações do paciente */}
                {isLoadingFinancial ? (
                  <div className="p-6 rounded-[18px] text-center text-sm text-slate-500 bg-slate-50/80 border border-slate-200/60">
                    <div className="w-10 h-10 rounded-full bg-slate-100 mx-auto mb-3 flex items-center justify-center">
                      <Loader2 size={18} className="animate-spin text-slate-400" />
                    </div>
                    <p className="text-[13px] font-medium text-slate-400">Buscando dados...</p>
                  </div>
                ) : (patientFinancial?.transactions || []).length > 0 ? (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 px-1 mb-1.5">Movimentações</p>
                    <div className="space-y-1.5">
                      {patientFinancial!.transactions.slice(0, 8).map((t: any) => {
                        const isIncome = t.type === 'INCOME';
                        return (
                          <div key={t.id} className={`flex items-center gap-2.5 p-2.5 rounded-[14px] border ${isIncome ? 'bg-emerald-50/40 border-emerald-200/50' : 'bg-slate-50 border-slate-200/70'}`}>
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {isIncome ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-slate-800 truncate">{t.procedure || t.description}</p>
                              <p className="text-[11px] text-slate-500 font-medium">{formatDate(t.date)}</p>
                            </div>
                            <span className={`text-[13px] font-bold shrink-0 ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {isIncome ? '+' : '-'}{Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        );
                      })}
                      {patientFinancial!.transactions.length > 8 && (
                        <p className="text-[11px] text-slate-400 text-center">+{patientFinancial!.transactions.length - 8} movimentações</p>
                      )}
                    </div>
                  </div>
                ) : !isLoadingFinancial && patientFinancial ? (
                  <div className="p-6 rounded-[18px] text-center text-sm text-slate-500 bg-slate-50 border border-slate-200/70">Nenhuma movimentação ainda</div>
                ) : null}

                <button
                  onClick={() => {
                    setAppActiveTab('financeiro');
                    appNavigate('/financeiro');
                  }}
                  className="w-full mt-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-semibold hover:bg-slate-900 ios-press transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(15,23,42,0.15)]"
                >
                  <CreditCard size={15} /> Abrir financeiro
                </button>
              </div>
            )}

          </aside>
          )}
        </div>
      </main>

      {isAddingEvolution && (
        <div className="fixed inset-0 bg-white z-[200] overflow-y-auto">
          <NovaEvolucao
            patientId={patient.id}
            onSave={async (evolution) => {
              const updatedPatient = {
                ...patient,
                evolution: [evolution, ...(patient.evolution || [])],
              };
              await onUpdatePatient(updatedPatient);
              await onAddEvolution(evolution);
              setIsAddingEvolution(false);
            }}
            onClose={() => setIsAddingEvolution(false)}
          />
        </div>
      )}

      {selectedTreatmentAction && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-slate-900/30 backdrop-blur-[6px] p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTreatmentAction(null); }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border border-slate-200/60 bg-white p-5 sm:p-6 shadow-[0_-8px_40px_rgba(15,23,42,0.12),0_28px_70px_rgba(15,23,42,0.18)] max-h-[85vh] overflow-y-auto"
          >
            {/* iOS drag handle */}
            <div className="ios-drag-handle sm:hidden" />

            <div className="mb-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 mb-1.5">O que fazer agora?</p>
              <h3 className="text-xl font-bold text-slate-950 tracking-[-0.02em]">{selectedTreatmentAction.procedure}</h3>
              {selectedTreatmentAction.tooth_number && (
                <span className="mt-2 inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  dente {selectedTreatmentAction.tooth_number}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {selectedTreatmentAction.requires_prepayment && !selectedTreatmentAction.prepayment_confirmed ? (
                <>
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Lock size={13} className="text-amber-600" />
                      </div>
                      <p className="text-sm font-bold text-amber-900">Aguardando pagamento</p>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed pl-9">
                      Confirme o recebimento antes de executar.
                      {Number(selectedTreatmentAction.value) > 0 && (
                        <> Valor: <strong>{Number(selectedTreatmentAction.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => confirmPrepayment(selectedTreatmentAction)}
                    className="w-full rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-left transition-all duration-200 hover:bg-emerald-100/80 hover:shadow-sm ios-press-gentle"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check size={13} className="text-emerald-700" />
                      </div>
                      <p className="text-sm font-bold text-emerald-900">Pagamento recebido — pode prosseguir</p>
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleCompleteTreatment(selectedTreatmentAction)}
                  className="w-full rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-left transition-all duration-200 hover:bg-emerald-100/80 hover:shadow-sm ios-press-gentle"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} className="text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Procedimento concluído</p>
                      {selectedTreatmentAction.requires_prepayment && selectedTreatmentAction.prepayment_confirmed && (
                        <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1"><Check size={9} /> Pagamento já confirmado</p>
                      )}
                    </div>
                  </div>
                </button>
              )}

              <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Mudar o procedimento</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Restauracao', 'Canal', 'Extracao', 'Coroa', 'Implante']
                    .filter((proc) => proc !== selectedTreatmentAction.procedure)
                    .map((proc) => (
                      <button
                        key={proc}
                        onClick={() => handleConvertTreatment(selectedTreatmentAction, proc)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-800 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm hover:border-slate-300 ios-press"
                      >
                        {proc}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedTreatmentAction(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 ios-press"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showPaymentModal && (() => {
        const unpaid = treatmentInProgress.filter(
          (item: any) => !(item.requires_prepayment && item.prepayment_confirmed)
        );
        const unpaidTotal = unpaid.reduce((s: number, i: any) => s + (Number(i.value) || 0), 0);
        const methods = [
          { key: 'Dinheiro', label: 'Dinheiro', icon: <WalletCards size={16} />, desc: 'Espécie' },
          { key: 'Pix', label: 'Pix', icon: <Zap size={16} />, desc: 'Transferência instantânea' },
          { key: 'Cartão Crédito', label: 'Cartão Crédito', icon: <CreditCard size={16} />, desc: 'Crédito' },
          { key: 'Cartão Débito', label: 'Cartão Débito', icon: <CreditCard size={16} />, desc: 'Débito' },
          { key: 'Transferência', label: 'Transferência', icon: <ArrowUpRight size={16} />, desc: 'TED/DOC' },
        ];
        return (
          <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-slate-900/30 backdrop-blur-[6px] p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border border-slate-200/60 bg-white p-5 sm:p-6 shadow-[0_-8px_40px_rgba(15,23,42,0.12),0_28px_70px_rgba(15,23,42,0.18)] max-h-[85vh] overflow-y-auto"
            >
              {/* iOS drag handle */}
              <div className="ios-drag-handle sm:hidden" />
              <div className="mb-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 mb-1.5">Pagamento</p>
                <h3 className="text-xl font-bold text-slate-950 tracking-[-0.02em]">Receber pagamento</h3>
                <div className="mt-3 flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] bg-slate-50 border border-slate-200/70">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-500 font-medium">{unpaid.length} procedimento{unpaid.length !== 1 ? 's' : ''} pendente{unpaid.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-[16px] font-bold text-slate-950 shrink-0">
                    {unpaidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 mb-2.5">Forma de pagamento</p>
              <div className="space-y-1.5">
                {methods.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={async () => {
                      setShowPaymentModal(false);
                      await confirmPrepaymentAll(m.key);
                    }}
                    className="w-full rounded-[16px] border border-slate-200/60 bg-white px-4 py-3.5 flex items-center gap-3 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-sm ios-press-gentle"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {m.icon}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800">{m.label}</p>
                      <p className="text-[11px] text-slate-400">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 ios-press"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

    </div>
  );
};
