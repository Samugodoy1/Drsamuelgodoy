import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Camera,
  CheckCircle2,
  Circle,
  Clock3,
  CreditCard,
  FileText,
  Info,
  Phone,
  User,
  UserRound,
  WalletCards,
  Zap,
} from 'lucide-react';
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
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [optimisticOdontogram, setOptimisticOdontogram] = useState<Record<number, any>>({});
  const [optimisticTreatments, setOptimisticTreatments] = useState<any[]>([]);
  const [optimisticEvolutions, setOptimisticEvolutions] = useState<any[]>([]);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isUploadingClinicalImage, setIsUploadingClinicalImage] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
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
        if (treatmentValue > 0) {
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

      // Criar transação financeira automaticamente
      const treatmentValue = Number(treatment.value) || 0;
      if (treatmentValue > 0) {
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

  const patientFiles = patient?.files || [];
  const financialTotal = (patient?.treatmentPlan || []).reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
  const completedTotal = (patient?.treatmentPlan || [])
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
      setUploadFeedback('Foto do paciente atualizada.');
    } catch (error) {
      console.error('Error uploading patient profile image:', error);
      setUploadFeedback('Não foi possível enviar a foto do paciente.');
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
      setUploadFeedback('Imagem/RX anexada com sucesso.');
    } catch (error) {
      console.error('Error uploading patient clinical image:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível anexar imagem/RX.';
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

  const iosCard =
    'bg-white/92 border border-slate-200/70 shadow-[0_8px_24px_rgba(15,23,42,0.05)]';
  const iosSubtleCard =
    'bg-slate-50/70 border border-slate-200/70';

  return (
    <div className="min-h-screen bg-[#F7F7F8] pb-24 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-[#F4F7F6]/90 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="rounded-[30px] border border-slate-200/70 bg-white/88 px-4 py-4 sm:px-5 sm:py-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <button
                onClick={() => {
                  setAppActiveTab('pacientes');
                  appNavigate('/pacientes');
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors duration-200 hover:text-slate-900"
                aria-label="Voltar para pacientes"
              >
                <ArrowLeft size={18} />
              </button>

              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                {clinicalBadge.label}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3 min-w-0">
              <div className="relative w-13 h-13 sm:w-14 sm:h-14 shrink-0">
                <div className="w-full h-full rounded-[20px] overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200/80">
                  {patient?.photo_url ? (
                    <img src={patient.photo_url} alt={patient?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-slate-700 font-bold text-base">
                      {String(patient?.name || 'P')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n: string) => n[0].toUpperCase())
                        .join('')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:text-slate-900 disabled:opacity-60"
                  aria-label="Enviar foto do paciente"
                  disabled={isUploadingProfilePhoto}
                >
                  <Camera size={13} />
                </button>

                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-[27px] sm:text-[32px] leading-[1.04] tracking-[-0.03em] font-semibold text-slate-950 truncate">{patient?.name}</h1>
                <p className="mt-1 text-sm text-slate-500">{age !== null ? `${age} anos` : 'Idade n/i'} • {clinicalBadge.label}</p>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Próximo passo</p>
                <p className="mt-2 text-[22px] sm:text-[26px] leading-[1.12] tracking-[-0.03em] font-semibold text-slate-950">{primaryActionTitle}</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{primaryActionHelper}</p>
                {upcomingAppointment && (
                  <p className="mt-3 text-xs font-medium text-slate-400">
                    Próxima consulta em {formatDate(upcomingAppointment.start_time)} às {formatTime(upcomingAppointment.start_time)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setIsFocusMode(true)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                      isFocusMode ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Foco
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFocusMode(false)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                      !isFocusMode ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Completo
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (primaryTreatment) {
                      setHighlightedTreatmentId(primaryTreatment.id);
                      window.setTimeout(() => setHighlightedTreatmentId(null), 2200);
                    }
                    focusOdontogram();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-slate-900 active:scale-[0.98]"
                >
                  <Activity size={15} />
                  {primaryActionButtonLabel}
                </button>
                <button
                  onClick={() => setIsAddingEvolution(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:text-slate-900"
                >
                  <Activity size={14} />
                  Evolução
                </button>
                <button
                  onClick={openImagesTab}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:text-slate-900"
                >
                  <Camera size={14} />
                  Imagens
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6">

        <section ref={odontogramRef} className="rounded-[30px] p-4 sm:p-5 border border-slate-200/70 bg-white/92 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-slate-950">Odontograma</h2>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Interativo</span>
          </div>

          <div className="rounded-[26px] p-1.5 sm:p-2 bg-slate-50/70 ring-1 ring-slate-100/80">
            <Odontogram
              data={mergedOdontogram}
              history={patient?.toothHistory || []}
              onChange={handleOdontogramStatusChange}
              onAddHistory={handleAddToothHistory}
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
            <section className="rounded-[28px] border border-slate-200/70 bg-white/92 p-5 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.02em] text-slate-950">Tratamento atual</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Próximo passo clínico do paciente</p>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.12em]">Foco</span>
              </div>

              <div className="space-y-3">
                {treatmentInProgress.length > 0 ? (
                  treatmentInProgress.map((item: any, idx: number) => {
                    const isPriority = idx === 0;
                    const rawStatus = String(item.status || '').toUpperCase();
                    const itemBadge =
                      rawStatus === 'APROVADO'
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : rawStatus === 'PENDENTE'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl px-4 py-4 flex flex-col items-stretch gap-3 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between ${
                          isPriority
                            ? 'border border-slate-200 bg-slate-50/60 shadow-[0_6px_18px_rgba(15,23,42,0.04)]'
                            : `${iosSubtleCard} hover:border-slate-300`
                        } ${
                          highlightedTreatmentId === item.id
                            ? 'ring-2 ring-slate-300 bg-slate-50 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                            : ''
                        }`}
                      >
                        <div className="min-w-0 w-full">
                          {isPriority && (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1">Próximo passo</p>
                          )}
                          <p className="font-semibold text-slate-900 text-[15px] sm:text-base leading-6 truncate">
                            {item.procedure} {item.tooth_number ? `dente ${item.tooth_number}` : ''}
                          </p>
                          <div className="flex flex-col items-stretch gap-2 mt-1.5 sm:flex-row sm:items-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${itemBadge}`}>
                              {rawStatus === 'APROVADO' ? 'Em andamento' : rawStatus === 'PENDENTE' ? 'Pendente' : 'Planejado'}
                            </span>
                            <label className="inline-flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto">
                              <span>R$</span>
                              <input
                                type="text"
                                inputMode="decimal"
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
                                className="w-full sm:w-24 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-base font-medium text-slate-700 outline-none focus:border-slate-400 min-h-[40px]"
                                aria-label="Valor do procedimento"
                              />
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedTreatmentAction(item)}
                          className={`w-full sm:w-auto shrink-0 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 active:scale-[0.98] ${
                            isPriority
                              ? 'bg-slate-950 text-white border border-slate-950 hover:bg-slate-900 hover:scale-[1.01]'
                              : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:scale-[1.01]'
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
                      <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                        <Clock3 size={18} />
                      </div>
                      <p className="text-slate-800 text-sm font-bold">Nenhum tratamento ativo no momento</p>
                      <p className="text-slate-600 text-xs">Inicie pelo odontograma para planejar o próximo passo clínico.</p>
                      <button
                        onClick={focusOdontogram}
                        className="mt-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-[1.01] transition-all duration-200 active:scale-[0.98]"
                      >
                        Adicionar tratamento
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {!isFocusMode && (
            <section className="rounded-[24px] border border-slate-200/70 bg-white/92 p-4 sm:p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold tracking-[-0.01em] text-slate-900">Evolução clínica</h3>
                <button
                  onClick={() => setIsAddingEvolution(true)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline transition-all duration-200"
                >
                  Nova evolução
                </button>
              </div>

              <div className="space-y-3 relative">
                {timelineItems.length > 0 && <div className="absolute left-[18px] top-1 bottom-1 w-[1px] rounded-full bg-slate-200" />}
                {timelineItems.length > 0 ? (
                  <>
                    <AnimatePresence initial={false}>
                    {(showAllEvolutions ? timelineItems : timelineItems.slice(0, 3)).map((item: any, idx: number) => {
                    const Icon = resolveTimelineIcon(item.title);
                    const statusPill =
                      item.status === 'EM_ANDAMENTO'
                        ? 'bg-slate-100 text-slate-700'
                        : item.status === 'OBSERVACAO'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-slate-100 text-slate-700';
                    const isLatest = idx === 0;
                    const isNewlyAdded = highlightedTimelineId === item.id;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className={`rounded-xl p-3 ml-8 transition-all duration-300 ${
                            isNewlyAdded
                              ? 'bg-slate-50 border border-slate-300 ring-2 ring-slate-200 shadow-[0_12px_24px_rgba(15,23,42,0.05)]'
                              : isLatest
                                ? 'bg-white border border-slate-200 shadow-[0_8px_20px_rgba(15,23,42,0.04)]'
                                : 'bg-slate-50/55 border border-slate-200/70 opacity-85 hover:opacity-100'
                          }`}
                        >
                          <span className={`absolute left-[12px] mt-3 w-[13px] h-[13px] rounded-full border-2 ${isLatest ? 'bg-slate-900 border-white ring-4 ring-slate-100' : 'bg-white border-slate-300'}`} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isLatest ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                <Icon size={16} />
                              </div>
                              <div className="min-w-0">
                                {isLatest && <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1">Último evento</p>}
                                <p className={`leading-5 truncate ${isLatest ? 'text-[15px] font-bold text-slate-950' : 'text-sm font-semibold text-slate-800'}`}>{item.title}</p>
                                {item.notes && <p className={`text-xs leading-5 mt-0.5 line-clamp-2 ${isLatest ? 'text-slate-700' : 'text-slate-500'}`}>{item.notes}</p>}
                                <p className={`text-[11px] mt-1 ${isLatest ? 'text-slate-600' : 'text-slate-500'}`}>{formatDate(item.date)}</p>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.08em] ${statusPill}`}>
                              {item.status === 'EM_ANDAMENTO' ? 'Em andamento' : item.status === 'OBSERVACAO' ? 'Observação' : 'Concluído'}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                    </AnimatePresence>

                    {timelineItems.length > 3 && (
                      <div className="pt-1">
                        <button
                          onClick={() => setShowAllEvolutions(prev => !prev)}
                          className="w-full py-2.5 rounded-xl bg-white text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 hover:scale-[1.01] transition-all duration-200 active:scale-[0.98]"
                        >
                          {showAllEvolutions ? 'Mostrar menos' : 'Ver mais'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`rounded-2xl py-10 text-center ${iosSubtleCard}`}>
                    <div className="flex flex-col items-center gap-3 px-4">
                      <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                        <FileText size={18} />
                      </div>
                      <p className="text-slate-800 text-sm font-bold">Ainda não há evoluções registradas</p>
                      <p className="text-slate-600 text-xs">Registre a primeira evolução para iniciar o histórico clínico.</p>
                      <button
                        onClick={() => setIsAddingEvolution(true)}
                        className="mt-1 px-3.5 py-2 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-900 hover:scale-[1.01] transition-all duration-200 active:scale-[0.98]"
                      >
                        Nova evolução
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
            )}
          </div>

          {!isFocusMode && (
          <aside ref={infoPanelRef} className={`${iosCard} rounded-[26px] p-4 sm:p-5 h-fit xl:sticky xl:top-[112px]`}>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 rounded-2xl mb-4 border border-slate-200/70">
              {[
                { id: 'anamneses', label: 'Anamnese' },
                { id: 'dados', label: 'Dados pessoais' },
                { id: 'imagens', label: 'Imagens/RX' },
                { id: 'financeiro', label: 'Financeiro' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInfoTab(tab.id as InfoTab)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    infoTab === tab.id
                      ? 'bg-white text-slate-950 shadow-[0_4px_14px_rgba(15,23,42,0.05)]'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/70 hover:scale-[1.01]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {infoTab === 'anamneses' && (
              <div className="space-y-3 text-sm">
                <div className={`p-3.5 rounded-[20px] ${iosSubtleCard}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-1">Histórico médico</p>
                  <p className="text-slate-700">{patient?.anamnesis?.medical_history || 'Não informado'}</p>
                </div>
                <div className={`p-3.5 rounded-[20px] ${iosSubtleCard}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-1">Alergias</p>
                  <p className="text-slate-700">{patient?.anamnesis?.allergies || 'Não informado'}</p>
                </div>
                <div className={`p-3.5 rounded-[20px] ${iosSubtleCard}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-1">Medicações</p>
                  <p className="text-slate-700">{patient?.anamnesis?.medications || 'Não informado'}</p>
                </div>
              </div>
            )}

            {infoTab === 'dados' && (
              <div className="space-y-3 text-sm text-slate-700">
                <div className={`p-3.5 rounded-[20px] flex items-center gap-2 ${iosSubtleCard}`}><UserRound size={14} /> CPF: {patient?.cpf || 'Não informado'}</div>
                <div className={`p-3.5 rounded-[20px] flex items-center gap-2 ${iosSubtleCard}`}><Phone size={14} /> {patient?.phone || 'Não informado'}</div>
                <div className={`p-3.5 rounded-[20px] flex items-center gap-2 ${iosSubtleCard}`}><Info size={14} /> {patient?.email || 'Não informado'}</div>
                <div className={`p-3.5 rounded-[20px] flex items-center gap-2 ${iosSubtleCard}`}><Calendar size={14} /> Nascimento: {patient?.birth_date ? formatDate(patient.birth_date) : 'Não informado'}</div>
              </div>
            )}

            {infoTab === 'imagens' && (
              <div className="space-y-3">
                <div className={`p-3.5 rounded-[20px] ${iosSubtleCard}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-600">Anexos clínicos</p>
                    <button
                      type="button"
                      onClick={() => clinicalImageInputRef.current?.click()}
                      disabled={isUploadingClinicalImage}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Camera size={13} />
                      {isUploadingClinicalImage ? 'Enviando...' : 'Upload RX/Imagem'}
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
                      className={`block p-3.5 rounded-[20px] transition-all duration-200 hover:bg-slate-100 hover:scale-[1.01] ${iosSubtleCard}`}
                    >
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Camera size={14} /> {file.description || 'Arquivo clínico'}</p>
                      <p className="text-xs text-slate-500 mt-1">{file.created_at ? formatDate(file.created_at) : 'Data n/i'}</p>
                    </a>
                  ))
                ) : (
                  <div className={`p-8 rounded-[20px] text-center text-sm text-slate-600 ${iosSubtleCard}`}>Nenhuma imagem/RX anexada</div>
                )}

                {uploadFeedback && (
                  <p className="text-xs text-slate-500 px-1">{uploadFeedback}</p>
                )}
              </div>
            )}

            {infoTab === 'financeiro' && (
              <div className="space-y-3">
                {/* Resumo do plano de tratamento */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-3 rounded-[18px] ${iosSubtleCard}`}>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Orçado</p>
                    <p className="text-[15px] font-semibold text-slate-950 mt-0.5">
                      {financialTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className={`p-3 rounded-[18px] ${iosSubtleCard}`}>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Concluído</p>
                    <p className="text-[15px] font-semibold text-slate-950 mt-0.5">
                      {completedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                {/* Recebido vs Orçado */}
                {(() => {
                  const received = (patientFinancial?.transactions || [])
                    .filter((t: any) => t.type === 'INCOME')
                    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
                  const pct = financialTotal > 0 ? Math.min(100, Math.round((received / financialTotal) * 100)) : 0;
                  return (
                    <div className={`p-3 rounded-[18px] ${iosSubtleCard}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Recebido</p>
                        <span className="text-[11px] font-semibold text-slate-500">{pct}%</span>
                      </div>
                      <p className="text-[15px] font-semibold text-emerald-700">
                        {received.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
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
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold px-1 mb-1.5">Parcelas pendentes</p>
                      <div className="space-y-1.5">
                        {pending.slice(0, 5).map((inst: any) => {
                          const isOverdue = inst.status === 'OVERDUE' || new Date(inst.due_date) < new Date();
                          return (
                            <div key={inst.id} className={`flex items-center gap-2.5 p-2.5 rounded-[16px] ${iosSubtleCard}`}>
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                <WalletCards size={13} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-slate-800 truncate">{inst.procedure || `Parcela ${inst.number}`}</p>
                                <p className={`text-[11px] ${isOverdue ? 'text-rose-500 font-semibold' : 'text-slate-500'}`}>
                                  {isOverdue ? 'Vencida' : 'Vence'} {formatDate(inst.due_date)}
                                </p>
                              </div>
                              <span className="text-[13px] font-semibold text-slate-800 shrink-0">
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
                  <div className={`p-6 rounded-[18px] text-center text-sm text-slate-500 ${iosSubtleCard}`}>Carregando...</div>
                ) : (patientFinancial?.transactions || []).length > 0 ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold px-1 mb-1.5">Movimentações</p>
                    <div className="space-y-1.5">
                      {patientFinancial!.transactions.slice(0, 8).map((t: any) => {
                        const isIncome = t.type === 'INCOME';
                        return (
                          <div key={t.id} className={`flex items-center gap-2.5 p-2.5 rounded-[16px] ${iosSubtleCard}`}>
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {isIncome ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-slate-800 truncate">{t.procedure || t.description}</p>
                              <p className="text-[11px] text-slate-500">{formatDate(t.date)}</p>
                            </div>
                            <span className={`text-[13px] font-semibold shrink-0 ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
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
                  <div className={`p-6 rounded-[18px] text-center text-sm text-slate-500 ${iosSubtleCard}`}>Nenhuma movimentação registrada</div>
                ) : null}

                <button
                  onClick={() => {
                    setAppActiveTab('financeiro');
                    appNavigate('/financeiro');
                  }}
                  className="w-full mt-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-semibold hover:bg-slate-900 hover:scale-[1.01] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.20)]">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">Continuar tratamento</h3>
              <p className="text-sm text-slate-600">
                {selectedTreatmentAction.procedure} {selectedTreatmentAction.tooth_number ? `- dente ${selectedTreatmentAction.tooth_number}` : ''}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleCompleteTreatment(selectedTreatmentAction)}
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition-colors hover:bg-emerald-100"
              >
                <p className="text-sm font-bold text-emerald-900">Concluir procedimento atual</p>
                <p className="text-xs text-emerald-700">Move para execução concluída e registra na evolução clínica.</p>
              </button>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Converter para outro procedimento</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Restauracao', 'Canal', 'Extracao', 'Coroa']
                    .filter((proc) => proc !== selectedTreatmentAction.procedure)
                    .map((proc) => (
                      <button
                        key={proc}
                        onClick={() => handleConvertTreatment(selectedTreatmentAction, proc)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-white"
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
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
