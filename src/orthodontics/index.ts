/**
 * Orthodontics — domínio isolado (frontend).
 * Toda a lógica e UI ortodôntica vive sob src/orthodontics. Ponto de entrada
 * público para o restante do app: a seção do prontuário e os cartões do dashboard.
 */
export { OrthodonticSection } from './components/OrthodonticSection';
export { OrthodonticDashboardCards } from './components/OrthodonticDashboardCards';
export { useOrthodontics } from './hooks/useOrthodontics';
export type { OrthodonticsResponse, OrthoTreatment, OrthoVisit } from './types';
