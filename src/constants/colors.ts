/**
 * Design System Colors
 * Apple product identity — aligned with the OdontoHub landing.
 */

export const COLORS = {
  // ─────────────────────────────────────
  // NEUTRALS
  // ─────────────────────────────────────
  neutral: {
    white: '#FFFFFF',
    bg_primary: '#FFFFFF',
    bg_secondary: '#f5f5f7',
    bg_tertiary: '#f5f5f7',
    bg_quaternary: '#e8e8ed',

    text_primary: '#1d1d1f',
    text_secondary: '#1d1d1f',
    text_tertiary: '#86868b',
    text_quaternary: '#6e6e73',
    text_disabled: '#d2d2d7',

    border: '#d2d2d7',
    divider: '#d2d2d7',

    gray_100: '#f5f5f7',
    gray_200: '#e8e8ed',
    gray_300: '#d2d2d7',
    gray_400: '#d2d2d7',
    gray_500: '#86868b',
    gray_600: '#6e6e73',
  },

  // ─────────────────────────────────────
  // SEMANTIC COLORS
  // ─────────────────────────────────────
  success: {
    base: '#30d158',
    light: '#30d15810',
    lighter: '#30d15820',
    text: '#30d158',
    border: 'border-[#30d158]/20',
    bg: 'bg-[#30d158]/10',
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
    base: '#ff3b30',
    light: '#ff3b3010',
    lighter: '#ff3b3020',
    text: '#ff3b30',
    border: 'border-[#ff3b30]/20',
    bg: 'bg-[#ff3b30]/10',
  },

  info: {
    base: '#0071e3',
    light: '#0071e310',
    lighter: '#0071e320',
    text: '#0071e3',
    border: 'border-[#0071e3]/20',
    bg: 'bg-[#0071e3]/10',
  },

  // ─────────────────────────────────────
  // BRAND — Apple blue CTA (never green)
  // ─────────────────────────────────────
  brand: {
    primary: '#0071e3',
    primary_light: '#0071e310',
    primary_lighter: '#0071e320',
    primary_text: '#0071e3',
    primary_border: 'border-[#0071e3]/20',
    primary_bg: 'bg-[#0071e3]/10',
  },

  // ─────────────────────────────────────
  // APPOINTMENT STATUS COLORS
  // ─────────────────────────────────────
  status: {
    scheduled: {
      color: 'bg-[#0071e3]/10 text-[#0071e3]',
      border: '#0071e3',
      bg: '#0071e310',
    },
    confirmed: {
      color: 'bg-[#30d158]/10 text-[#30d158]',
      border: '#30d158',
      bg: '#30d15810',
    },
    inProgress: {
      color: 'bg-[#FF9500]/10 text-[#FF9500]',
      border: '#FF9500',
      bg: '#FF950010',
    },
    finished: {
      color: 'bg-[#f5f5f7] text-[#86868b]',
      border: '#d2d2d7',
      bg: '#f5f5f7',
    },
    cancelled: {
      color: 'bg-[#ff3b30]/10 text-[#ff3b30]',
      border: '#ff3b30',
      bg: '#ff3b3010',
    },
    noShow: {
      color: 'bg-[#ff3b30]/10 text-[#ff3b30]',
      border: '#ff3b30',
      bg: '#ff3b3010',
    },
  },
} as const;

export function getColorHex(path: string): string {
  const parts = path.split('.');
  let current: any = COLORS;

  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = current[part];
    } else {
      return '#000000';
    }
  }

  return typeof current === 'string' ? current : '#000000';
}

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

export function withOpacity(hexColor: string, opacity: number): string {
  const opacityPercent = Math.round(opacity * 255);
  return `${hexColor}${opacityPercent.toString(16).padStart(2, '0')}`;
}

export function isDarkText(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

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
