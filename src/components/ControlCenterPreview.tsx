import { useMemo, useState } from 'react';
import { ClinicRail, type RailTab } from './ClinicRail';
import type { ControlAppointment } from '../utils/controlCenter';

const names = {
  morning: { name: 'Dra. Mariana Souza', clinic: 'Clínica Aurora', specialty: 'Endodontia' },
  clinic: { name: 'Dr. Samuel Godoy', clinic: 'OdontoHub', specialty: 'Clínico geral' },
  closing: { name: 'Dr. Samuel Godoy', clinic: 'OdontoHub', specialty: 'Clínico geral' },
};

function dayStamp(hours: number, minutes = 0) {
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
}

function slot(id: number, name: string, hours: number, minutes: number, status: ControlAppointment['status'], notes?: string, daysFromToday = 0): ControlAppointment {
  const start = dayStamp(hours, minutes);
  start.setDate(start.getDate() + daysFromToday);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 40);
  return {
    id,
    patient_id: id,
    patient_name: name,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status,
    notes,
  };
}

const SCENES = [
  {
    id: 'opening',
    label: 'Abertura',
    hours: 8,
    minutes: 12,
    profile: names.morning,
    snapshot: {
      appointments: [
        slot(1, 'Ana Clara Mendes', 9, 0, 'CONFIRMED', 'Restauração'),
        slot(2, 'João Lima', 10, 20, 'CONFIRMED', 'Avaliação'),
        slot(3, 'Pedro Alves', 14, 0, 'SCHEDULED', 'Canal'),
        slot(4, 'Lia Costa', 9, 0, 'SCHEDULED', 'Retorno', 1),
        slot(5, 'Rui Martins', 11, 0, 'SCHEDULED', 'Limpeza', 1),
      ],
      portalPendingCount: 1,
      noShowRescheduleCount: 2,
      patientCount: 48,
      freeSlotCount: 3,
    },
  },
  {
    id: 'clinic',
    label: 'Em atendimento',
    hours: 14,
    minutes: 8,
    profile: names.clinic,
    snapshot: {
      appointments: [
        slot(1, 'Ana Clara Mendes', 9, 0, 'FINISHED', 'Restauração'),
        slot(2, 'João Lima', 14, 0, 'IN_PROGRESS', 'Avaliação'),
        slot(3, 'Pedro Alves', 15, 10, 'CONFIRMED', 'Canal'),
        slot(4, 'Lia Costa', 16, 0, 'CONFIRMED', 'Retorno'),
      ],
      todayRevenue: 1860,
      portalPendingCount: 2,
      patientCount: 48,
      freeSlotCount: 1,
    },
  },
  {
    id: 'closing',
    label: 'Fechamento',
    hours: 18,
    minutes: 25,
    profile: names.closing,
    snapshot: {
      appointments: [
        slot(1, 'Ana Clara Mendes', 9, 0, 'FINISHED'),
        slot(2, 'João Lima', 14, 0, 'FINISHED'),
        slot(3, 'Pedro Alves', 15, 10, 'FINISHED'),
        slot(4, 'Lia Costa', 8, 30, 'CONFIRMED', 'Retorno', 1),
        slot(5, 'Rui Martins', 10, 0, 'SCHEDULED', 'Limpeza', 1),
        slot(6, 'Beatriz Nunes', 11, 30, 'SCHEDULED', 'Avaliação', 1),
      ],
      todayRevenue: 2480,
      weekRevenue: 11200,
      pendingReceivables: 640,
      noShowRescheduleCount: 1,
      patientCount: 48,
    },
  },
] as const;

export function ControlCenterPreview() {
  const [sceneId, setSceneId] = useState<(typeof SCENES)[number]['id']>('opening');
  const [activeTab, setActiveTab] = useState<RailTab>('dashboard');
  const scene = SCENES.find(item => item.id === sceneId) || SCENES[0];

  const frozenNow = useMemo(() => dayStamp(scene.hours, scene.minutes), [scene.hours, scene.minutes, scene.id]);

  const snapshot = useMemo(() => ({
    now: frozenNow,
    ...scene.snapshot,
  }), [scene, frozenNow]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex">
      <div className="relative h-screen">
        <ClinicRail
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setIsSidebarOpen={() => undefined}
          navigate={() => undefined}
          isSidebarOpen
          user={{ id: 'preview', name: scene.profile.name }}
          profile={{
            name: scene.profile.name,
            clinic_name: scene.profile.clinic,
            specialty: scene.profile.specialty,
          }}
          isAdmin={false}
          onLogout={() => undefined}
          snapshot={snapshot}
        />
      </div>
      <main className="flex-1 p-8 pl-[21rem] space-y-6">
        <p className="text-[13px] text-[#86868b]">Prévia da central de controle</p>
        <h1 className="apple-display-ink text-[40px]">Como ela fala com a clínica</h1>
        <p className="text-[17px] text-[#6e6e73] max-w-xl">
          Três momentos da mesma rotina. Os widgets mudam sozinhos — confirmações de manhã, o paciente na cadeira à tarde, caixa e amanhã no fechamento.
        </p>
        <div className="flex flex-wrap gap-2">
          {SCENES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSceneId(item.id)}
              className={`px-4 py-2 rounded-full text-[14px] ${sceneId === item.id ? 'bg-[#1d1d1f] text-white' : 'bg-white text-[#1d1d1f]'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-[#86868b]">
          Relógio da cena: {String(scene.hours).padStart(2, '0')}:{String(scene.minutes).padStart(2, '0')} · aba ativa: {activeTab}
        </p>
      </main>
    </div>
  );
}
