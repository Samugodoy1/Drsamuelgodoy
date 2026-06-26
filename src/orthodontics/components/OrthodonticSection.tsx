import React, { useState } from 'react';
import { Plus } from '../../icons';
import { useOrthodontics } from '../hooks/useOrthodontics';
import { OrthodonticHeader } from './OrthodonticHeader';
import { SmartSummary } from './SmartSummary';
import { AttentionList } from './AttentionList';
import { VisitTimeline } from './VisitTimeline';
import { VisitForm } from './VisitForm';
import { ArchHistory } from './ArchHistory';
import { CollaborationControl } from './CollaborationControl';
import { PhotoEvolution } from './PhotoEvolution';
import { ToothAccessoryMap } from './ToothAccessoryMap';
import { CreateTreatmentModal } from './CreateTreatmentModal';

interface Props {
  apiFetch: (input: string, init?: any) => Promise<Response>;
  patientId: number;
  /** odontograma restaurador (somente leitura) para o painel lateral do dente */
  odontogram?: Record<string, any>;
  /** histórico do dente (somente leitura) */
  toothHistory?: any[];
  /**
   * Permite ativar a experiência ortodôntica. Quando false e o paciente não
   * possui tratamento, nada é renderizado (paciente fica idêntico ao atual).
   */
  allowActivation?: boolean;
}

/**
 * Seção ortodôntica do prontuário. Só aparece quando há tratamento ortodôntico.
 * Pacientes sem tratamento continuam exatamente como hoje — nenhum elemento
 * visual extra, exceto um acionador discreto de ativação (opt-out via prop).
 */
export const OrthodonticSection: React.FC<Props> = ({
  apiFetch,
  patientId,
  odontogram,
  toothHistory,
  allowActivation = true,
}) => {
  const { data, loading, isOrthoPatient, refresh } = useOrthodontics(apiFetch, patientId);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Carregando pela primeira vez: não ocupa espaço.
  if (loading && !data) return null;

  // Paciente sem ortodontia → acionador discreto (ou nada).
  if (!isOrthoPatient) {
    if (!allowActivation) return null;
    return (
      <>
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition"
          >
            <Plus size={13} /> Iniciar acompanhamento ortodôntico
          </button>
        </div>
        {showCreate && (
          <CreateTreatmentModal
            apiFetch={apiFetch}
            patientId={patientId}
            onClose={() => setShowCreate(false)}
            onCreated={refresh}
          />
        )}
      </>
    );
  }

  const active = data?.activeTreatment;
  const header = data?.header;

  return (
    <section className="rounded-[30px] p-4 sm:p-5 border border-slate-200/60 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-slate-950">Ortodontia</h2>
      </div>

      {header && <OrthodonticHeader header={header} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data?.summaryText && <SmartSummary lines={data.summaryText} />}
        {data?.attention && <AttentionList items={data.attention} />}
      </div>

      {active && (
        <VisitTimeline visits={data?.visits || []} onRegister={() => setShowVisitForm(true)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data?.arches && data.arches.length > 0 && <ArchHistory arches={data.arches} />}
        {active && (
          <CollaborationControl
            apiFetch={apiFetch}
            patientId={patientId}
            treatmentId={active.id}
            history={data?.collaborations || []}
            onSaved={refresh}
          />
        )}
      </div>

      {data?.photos && data.photos.length > 0 && <PhotoEvolution photos={data.photos} />}

      {active && (
        <ToothAccessoryMap
          apiFetch={apiFetch}
          patientId={patientId}
          treatmentId={active.id}
          teeth={data?.teeth || []}
          odontogram={odontogram}
          toothHistory={toothHistory}
          onSaved={refresh}
        />
      )}

      {showVisitForm && active && (
        <VisitForm
          apiFetch={apiFetch}
          patientId={patientId}
          treatmentId={active.id}
          onClose={() => setShowVisitForm(false)}
          onSaved={refresh}
        />
      )}
    </section>
  );
};
