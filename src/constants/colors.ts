/**
 * Design System Colors
 * Centralized Apple iOS-inspired color palette
 * 
 * @BLOCKER_FIX #2: Color System Consolidation
 * Eliminates hardcoded hex values scattered throughout codebase
 */

export const COLORS = {
  // ─────────────────────────────────────
  // NEUTRALS (Grayscale - Apple iOS style)
  // ─────────────────────────────────────
  neutral: {
    white: '#FFFFFF',
    bg_primary: '#FFFFFF',
    bg_secondary: '#F9F9FB',
    bg_tertiary: '#F2F2F7',
    bg_quaternary: '#E5E5EA',

    text_primary: '#1C1C1E',
    text_secondary: '#3A3A3C',
    text_tertiary: '#8E8E93',
    text_quaternary: '#AEAEB2',
    text_disabled: '#C7C7CC',

    border: '#E5E5EA',
    divider: '#F2F2F7',
    
    gray_100: '#F2F2F7',
    gray_200: '#E5E5EA',
    gray_300: '#D1D1D6',
    gray_400: '#C7C7CC',
    gray_500: '#AEAEB2',
    gray_600: '#8E8E93',
  },

  // ─────────────────────────────────────
  // SEMANTIC COLORS (Status & Meaning)
  // ─────────────────────────────────────
  success: {
    base: '#34C759',
    light: '#34C75910',  // 10% opacity
    lighter: '#34C75920', // 20% opacity
    text: '#34C759',
    border: 'border-[#34C759]/20',
    bg: 'bg-[#34C759]/10',
  },

  warning: {
    base: '#FF9500',
    light: '#FF950010',
    lighter: '#FF950020',
    text: '#FF9500',
    border: 'border-[#FF9500]/20',
    bg: 'bg-[#FF9500]/10',
  },

  error: {
    base: '#FF3B30',
    light: '#FF3B3010',
    lighter: '#FF3B3020',
    text: '#FF3B30',
    border: 'border-[#FF3B30]/20',
    bg: 'bg-[#FF3B30]/10',
  },

  info: {
    base: '#007AFF',
    light: '#007AFF10',
    lighter: '#007AFF20',
    text: '#007AFF',
    border: 'border-[#007AFF]/20',
    bg: 'bg-[#007AFF]/10',
  },

  // ─────────────────────────────────────
  // BRAND COLORS (Custom brand - Teal)
  // ─────────────────────────────────────
  brand: {
    primary: '#0C9B72',
    primary_light: '#0C9B7210',
    primary_lighter: '#0C9B7220',
    primary_text: '#0C9B72',
    primary_border: 'border-[#0C9B72]/20',
    primary_bg: 'bg-[#0C9B72]/10',
  },

  // ─────────────────────────────────────
  // APPOINTMENT STATUS COLORS
  // ─────────────────────────────────────
  status: {
    scheduled: {
      color: 'bg-[#007AFF]/10 text-[#007AFF]',
      border: '#007AFF',
      bg: '#007AFF10',
    },
    confirmed: {
      color: 'bg-[#34C759]/10 text-[#34C759]',
      border: '#34C759',
      bg: '#34C75910',
    },
    inProgress: {
      color: 'bg-[#FF9500]/10 text-[#FF9500]',
      border: '#FF9500',
      bg: '#FF950010',
    },
    finished: {
      color: 'bg-[#E5E5EA] text-[#8E8E93]',
      border: '#E5E5EA',
      bg: '#E5E5EA',
    },
    cancelled: {
      color: 'bg-[#FF3B30]/10 text-[#FF3B30]',
      border: '#FF3B30',
      bg: '#FF3B3010',
    },
    noShow: {
      color: 'bg-[#FF3B30]/10 text-[#FF3B30]',
      border: '#FF3B30',
      bg: '#FF3B3010',
    },
  },
} as const;

// ─────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────

/**
 * Get a hex color value from the color system
 * @example getHex('success.base') → '#34C759'
 * @example getHex('neutral.text_primary') → '#1C1C1E'
 */
export function getColorHex(path: string): string {
  const parts = path.split('.');
  let current: any = COLORS;

  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = current[part];
    } else {
      return '#000000'; // Fallback - should not happen
    }
  }

  return typeof current === 'string' ? current : '#000000';
}

/**
 * Get status colors by appointment status
 * @example getStatusColors('SCHEDULED') → { color: '...', border: '...' }
 */
export function getStatusColors(status: string) {
  const statusMap: Record<string, keyof typeof COLORS.status> = {
    SCHEDULED: 'scheduled',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'inProgress',
    FINISHED: 'finished',
    CANCELLED: 'cancelled',
    NO_SHOW: 'noShow',
  };

  const key = statusMap[status] || 'scheduled';
  return COLORS.status[key];
}

/**
 * Create dynamic color with custom opacity
 * @example withOpacity('#34C759', 0.1) → '#34C75910' (but this is incomplete for dynamic use)
 * Note: For Tailwind, use inline opacity syntax instead
 */
export function withOpacity(hexColor: string, opacity: number): string {
  // This is a reference - actual implementation would need hex to RGB conversion
  // For now, we use Tailwind's built-in opacity syntax
  const opacityPercent = Math.round(opacity * 255);
  return `${hexColor}${opacityPercent.toString(16).padStart(2, '0')}`;
}

/**
 * Is a text color dark enough to need light background?
 */
export function isDarkText(hexColor: string): boolean {
  // Simple hex to RGB conversion
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * Color contrast ratio checker (WCAG compliance)
 * @returns ratio between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string) => {
    const hex2 = hex.replace('#', '');
    const r = parseInt(hex2.substring(0, 2), 16) / 255;
    const g = parseInt(hex2.substring(2, 4), 16) / 255;
    const b = parseInt(hex2.substring(4, 6), 16) / 255;

    const gamma = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * gamma(r) + 0.7152 * gamma(g) + 0.0722 * gamma(b);
    return luminance;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verify WCAG compliance
 * AA: >= 4.5:1 for normal text, >= 3:1 for large text
 * AAA: >= 7:1 for normal text, >= 4.5:1 for large text
 */
export function isWCAGCompliant(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
