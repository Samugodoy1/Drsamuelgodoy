/**
 * Appointment Status Configuration
 * Centralized status definitions for consistency across the portal
 * 
 * @BLOCKER_FIX #1: Fix Status Badge Ambiguity
 * Previously scattered as `statusLabel()` in multiple places
 */

export const APPOINTMENT_STATUS_CONFIG = {
  SCHEDULED: {
    label: 'Agendado',
    description: 'Requer confirmação',
    color: 'bg-[#007AFF]/10 text-[#007AFF]',
    borderColor: 'border-[#007AFF]/20',
    bgLight: 'bg-[#007AFF]/5',
    icon: 'Clock',
    showAction: true,
    actionPrimary: 'Confirmar',
    actionSecondary: 'Reagendar',
    confirmation: 'Você vem {date} às {time}?',
  },
  CONFIRMED: {
    label: 'Confirmado',
    description: 'Presença confirmada',
    color: 'bg-[#34C759]/10 text-[#34C759]',
    borderColor: 'border-[#34C759]/20',
    bgLight: 'bg-[#34C759]/5',
    icon: 'CheckCircle2',
    showAction: false,
    successMessage: 'Presença confirmada ✓',
  },
  IN_PROGRESS: {
    label: 'Em Atendimento',
    description: 'Consultando agora',
    color: 'bg-[#FF9500]/10 text-[#FF9500]',
    borderColor: 'border-[#FF9500]/20',
    bgLight: 'bg-[#FF9500]/5',
    icon: 'Activity',
    showAction: false,
  },
  FINISHED: {
    label: 'Finalizado',
    description: 'Consulta realizada',
    color: 'bg-[#E5E5EA] text-[#8E8E93]',
    borderColor: 'border-[#E5E5EA]',
    bgLight: 'bg-[#F2F2F7]',
    icon: 'CheckCircle',
    showAction: false,
    opacity: 'opacity-40',
  },
  CANCELLED: {
    label: 'Cancelado',
    description: 'Cancelado pelo paciente',
    color: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    borderColor: 'border-[#FF3B30]/20',
    bgLight: 'bg-[#FF3B30]/5',
    icon: 'X',
    showAction: false,
    opacity: 'opacity-40',
  },
  NO_SHOW: {
    label: 'Faltou',
    description: 'Paciente não compareceu',
    color: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    borderColor: 'border-[#FF3B30]/20',
    bgLight: 'bg-[#FF3B30]/5',
    icon: 'AlertCircle',
    showAction: false,
    opacity: 'opacity-40',
  },
} as const;

export type AppointmentStatusType = keyof typeof APPOINTMENT_STATUS_CONFIG;

/**
 * Get status configuration by status key
 * @param status - The appointment status
 * @returns Status configuration or default
 */
export function getStatusConfig(status: string) {
  const config = APPOINTMENT_STATUS_CONFIG[status as AppointmentStatusType];
  if (!config) {
    return {
      label: status,
      color: 'bg-[#E5E5EA] text-[#8E8E93]',
      borderColor: 'border-[#E5E5EA]',
      bgLight: 'bg-[#F2F2F7]',
      showAction: false,
    };
  }
  return config;
}

/**
 * Determine if appointment requires user action
 */
export function statusRequiresAction(status: string): boolean {
  const config = getStatusConfig(status);
  return config.showAction === true;
}

/**
 * Get status countdown label (visual indicator for urgency)
 */
export function getCountdownLabel(daysUntil: number, hoursUntil: number): string {
  if (daysUntil <= 0) return 'Hoje!';
  if (daysUntil === 1) return hoursUntil <= 24 ? `Em ${hoursUntil}h` : 'Amanhã';
  return `Em ${daysUntil} dias`;
}

/**
 * Get visual color for countdown badge
 */
export function getCountdownColor(daysUntil: number): string {
  if (daysUntil <= 1) return 'bg-[#FF9500]/10 text-[#FF9500]';
  if (daysUntil <= 3) return 'bg-[#FF9500]/10 text-[#FF9500]';
  return 'bg-[#007AFF]/10 text-[#007AFF]';
}
