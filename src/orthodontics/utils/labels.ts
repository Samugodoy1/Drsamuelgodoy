import type { CollaborationLevel, OrthoStatus } from '../types';

/** Rótulos de exibição. Apenas apresentação — toda a lógica vive no backend. */

export const STATUS_LABEL: Record<OrthoStatus, string> = {
  planejamento: 'Planejamento',
  ativo: 'Ativo',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
  contencao: 'Contenção',
};

export const STATUS_TONE: Record<OrthoStatus, string> = {
  planejamento: 'bg-sky-50 text-sky-700 ring-sky-200',
  ativo: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pausado: 'bg-amber-50 text-amber-700 ring-amber-200',
  finalizado: 'bg-slate-100 text-slate-600 ring-slate-200',
  contencao: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export const COLLABORATION_LABEL: Record<CollaborationLevel, string> = {
  excelente: 'Excelente',
  boa: 'Boa',
  regular: 'Regular',
  baixa: 'Baixa',
  muito_baixa: 'Muito baixa',
};

export const COLLABORATION_ORDER: CollaborationLevel[] = [
  'excelente',
  'boa',
  'regular',
  'baixa',
  'muito_baixa',
];

/** Itens rápidos de registro da manutenção. */
export const VISIT_PROCEDURES: { code: string; label: string }[] = [
  { code: 'troca_arco', label: 'Troca de arco' },
  { code: 'troca_ligaduras', label: 'Troca de ligaduras' },
  { code: 'elasticos', label: 'Elásticos' },
  { code: 'corrente', label: 'Corrente' },
  { code: 'stop', label: 'Stop' },
  { code: 'mola_aberta', label: 'Mola aberta' },
  { code: 'mola_fechada', label: 'Mola fechada' },
  { code: 'reposicionamento', label: 'Reposicionamento' },
  { code: 'recolagem', label: 'Recolagem' },
  { code: 'remocao', label: 'Remoção' },
  { code: 'fotografia', label: 'Fotografia' },
  { code: 'orientacoes', label: 'Orientações' },
];

export const PROCEDURE_LABEL: Record<string, string> = VISIT_PROCEDURES.reduce(
  (acc, p) => ({ ...acc, [p.code]: p.label }),
  {} as Record<string, string>
);

/** Acessórios ortodônticos suportados na camada do dente. */
export const TOOTH_ACCESSORIES: string[] = [
  'Bráquete',
  'Tubo',
  'Banda',
  'Botão',
  'Attachment',
  'Gancho',
  'Corrente',
  'Stop',
  'Mola aberta',
  'Mola fechada',
];
