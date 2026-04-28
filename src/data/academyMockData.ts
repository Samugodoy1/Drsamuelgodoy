export type AcademyCaseStatus = 'Em andamento' | 'Aguardando professor' | 'Retorno' | 'Pendente';

export interface AcademyStudent {
  id: string;
  name: string;
  greetingName: string;
  semester: string;
  role: string;
  college: string;
}

export interface AcademyCase {
  id: string;
  patientName: string;
  procedure: string;
  discipline: string;
  clinic?: string;
  professor: string;
  status: AcademyCaseStatus;
  currentStage?: string;
  nextStep: string;
  nextAppointmentLabel: string;
  nextAppointmentAt?: string;
  lastEvolution: string;
}

export interface AcademyAppointment {
  id: string;
  caseId: string;
  patientName: string;
  procedure: string;
  discipline: string;
  clinic: string;
  professor: string;
  dateLabel: string;
  time: string;
  duration: string;
  status: 'agendado' | 'em atendimento' | 'concluído';
}

export interface ChecklistGroup {
  id: string;
  title: string;
  items: Array<{ id: string; label: string; done: boolean }>;
}

export interface AcademyContent {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
}

export const students: AcademyStudent[] = [
  {
    id: 'student-samuel',
    name: 'Samuel Godoy',
    greetingName: 'Samuel',
    semester: '7º período',
    role: 'Estudante de Odontologia',
    college: 'Faculdade OdontoHub'
  }
];

export const cases: AcademyCase[] = [
  {
    id: 'case-laura-mendes',
    patientName: 'Laura Mendes',
    procedure: 'Restauração Classe II',
    discipline: 'Dentística',
    clinic: 'Clínica Integrada I',
    professor: 'Profa. Mariana Costa',
    status: 'Em andamento',
    currentStage: 'Remoção seletiva de tecido cariado',
    nextStep: 'Acabamento e polimento',
    nextAppointmentLabel: 'Hoje, 14:00',
    nextAppointmentAt: '2026-04-28T14:00:00.000Z',
    lastEvolution: 'Isolamento absoluto instalado e restauração finalizada parcialmente.'
  },
  {
    id: 'case-carlos-silva',
    patientName: 'Carlos Silva',
    procedure: 'Exodontia 38',
    discipline: 'Cirurgia',
    clinic: 'Clínica Integrada II',
    professor: 'Prof. Renato Alves',
    status: 'Aguardando professor',
    currentStage: 'Planejamento cirúrgico',
    nextStep: 'Avaliação e liberação',
    nextAppointmentLabel: '05/05, 10:00',
    nextAppointmentAt: '2026-05-05T10:00:00.000Z',
    lastEvolution: 'Paciente orientado sobre cuidados pré-operatórios e necessidade de assinatura.'
  },
  {
    id: 'case-ana-beatriz',
    patientName: 'Ana Beatriz',
    procedure: 'Endodontia',
    discipline: 'Endodontia',
    professor: 'Profa. Luciana Freitas',
    status: 'Retorno',
    currentStage: 'Acesso coronário',
    nextStep: 'Instrumentação',
    nextAppointmentLabel: '07/05, 09:00',
    nextAppointmentAt: '2026-05-07T09:00:00.000Z',
    lastEvolution: 'Canal localizado e odontometria inicial realizada.'
  },
  {
    id: 'case-marcos-lima',
    patientName: 'Marcos Lima',
    procedure: 'Raspagem periodontal',
    discipline: 'Periodontia',
    professor: 'Prof. Caio Lacerda',
    status: 'Pendente',
    currentStage: 'Diagnóstico periodontal',
    nextStep: 'Reavaliação',
    nextAppointmentLabel: '09/05, 11:00',
    nextAppointmentAt: '2026-05-09T11:00:00.000Z',
    lastEvolution: 'Índice de sangramento coletado e raspagem supragengival concluída.'
  }
];

export const appointments: AcademyAppointment[] = [
  {
    id: 'appointment-laura',
    caseId: 'case-laura-mendes',
    patientName: 'Laura Mendes',
    procedure: 'Restauração Classe II',
    discipline: 'Dentística',
    clinic: 'Clínica Integrada I',
    professor: 'Profa. Mariana Costa',
    dateLabel: 'Hoje',
    time: '14:00',
    duration: '60 min',
    status: 'agendado'
  },
  {
    id: 'appointment-carlos',
    caseId: 'case-carlos-silva',
    patientName: 'Carlos Silva',
    procedure: 'Exodontia 38',
    discipline: 'Cirurgia',
    clinic: 'Clínica Integrada II',
    professor: 'Prof. Renato Alves',
    dateLabel: 'Hoje',
    time: '15:30',
    duration: '45 min',
    status: 'agendado'
  }
];

export const checklistItems: Record<string, ChecklistGroup[]> = {
  'appointment-laura': [
    {
      id: 'materials',
      title: 'Materiais',
      items: [
        { id: 'materials-sterile', label: 'Instrumentais esterilizados', done: true },
        { id: 'materials-restorative', label: 'Materiais restauradores', done: true },
        { id: 'materials-epis', label: 'EPIs', done: true },
        { id: 'materials-isolation', label: 'Isolamento absoluto', done: false }
      ]
    },
    {
      id: 'docs',
      title: 'Documentação',
      items: [
        { id: 'docs-anamnesis', label: 'Anamnese revisada', done: false },
        { id: 'docs-consent', label: 'Termo de consentimento', done: false },
        { id: 'docs-plan', label: 'Plano de tratamento', done: true }
      ]
    },
    {
      id: 'case',
      title: 'Caso',
      items: [
        { id: 'case-radio', label: 'Radiografia revisada', done: false },
        { id: 'case-stage', label: 'Etapa anterior conferida', done: true },
        { id: 'case-next', label: 'Próximo passo definido', done: false }
      ]
    },
    {
      id: 'professor',
      title: 'Professor',
      items: [
        { id: 'prof-plan', label: 'Plano aprovado', done: false },
        { id: 'prof-signature', label: 'Assinatura pendente', done: false },
        { id: 'prof-question', label: 'Dúvida para apresentar', done: true }
      ]
    }
  ]
};

export const contents: AcademyContent[] = [
  {
    id: 'content-checklist-primeira-clinica',
    title: 'Checklist da primeira clínica',
    description: 'Tudo o que você precisa conferir antes de atender.',
    duration: '7 min',
    category: 'Biossegurança'
  },
  {
    id: 'content-anamnese',
    title: 'Passo a passo de anamnese',
    description: '5 min · Leitura rápida',
    duration: '5 min',
    category: 'Clínica Integrada'
  }
];
