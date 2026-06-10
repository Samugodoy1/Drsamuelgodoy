// ── Anamnese — normalização e detecção de valores negativos ─────────────────

export interface AnamnesisRecord {
  medical_history?: string;
  allergies?: string;
  medications?: string;
  chief_complaint?: string;
  habits?: string;
  family_history?: string;
  vital_signs?: string;
  systemic_diseases?: string;
  clinical_notes?: string;
}

export interface AnamnesisFormState {
  medical_history: string;
  allergies: string;
  medications: string;
  chief_complaint: string;
  habits: string;
  family_history: string;
  vital_signs: string;
}

export const ANAMNESIS_FORM_FIELDS: (keyof AnamnesisFormState)[] = [
  'chief_complaint',
  'allergies',
  'medications',
  'medical_history',
  'habits',
  'family_history',
  'vital_signs',
];

const NEGATIVE_ANAMNESIS_PATTERNS = [
  /^nada\.?$/,
  /^nenhum[ao]?\b/,
  /^nao\.?$/,
  /^negativ[ao]\.?$/,
  /^sem\s+(alerg|medic|uso)/,
  /^nega(\s|$)/,
  /^nao\s+(possui|tem|usa|faz\s+uso|relata|apresenta|informa)/,
  /^nao\s+informad/,
  /^n\/a\.?$/,
  /^-+$/,
  /^\.+$/,
  /^x+$/i,
];

const CLINICAL_RISK_REGEX =
  /hipertens|diabet|anticoagul|cardiopat|cardiac|asma|gest|grav|medica|press[aã]o|sangr|epilep|hepat|renal|l[aá]tex|penicil|anestes/i;

export const normalizeAnamnesisText = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const isNegativeAnamnesisValue = (value?: string | null): boolean => {
  const norm = normalizeAnamnesisText(value);
  if (!norm) return true;
  return NEGATIVE_ANAMNESIS_PATTERNS.some((pattern) => pattern.test(norm));
};

export const hasMeaningfulAnamnesisValue = (value?: string | null): boolean =>
  !isNegativeAnamnesisValue(value);

export const hasRecordedAllergie = (value?: string | null): boolean =>
  hasMeaningfulAnamnesisValue(value);

export const hasRecordedMedication = (value?: string | null): boolean =>
  hasMeaningfulAnamnesisValue(value);

export const formatAllergieLabel = (value?: string | null): string => {
  if (!value?.trim()) return 'Não informado';
  if (isNegativeAnamnesisValue(value)) return 'Nenhuma alergia referida';
  return value.trim();
};

export const formatMedicationLabel = (value?: string | null): string => {
  if (!value?.trim()) return 'Não informado';
  if (isNegativeAnamnesisValue(value)) return 'Nenhuma medicação em uso';
  return value.trim();
};

export const emptyAnamnesisForm = (): AnamnesisFormState => ({
  medical_history: '',
  allergies: '',
  medications: '',
  chief_complaint: '',
  habits: '',
  family_history: '',
  vital_signs: '',
});

export const anamnesisToForm = (anamnesis?: AnamnesisRecord | null): AnamnesisFormState => ({
  medical_history: anamnesis?.medical_history || '',
  allergies: anamnesis?.allergies || '',
  medications: anamnesis?.medications || '',
  chief_complaint: anamnesis?.chief_complaint || '',
  habits: anamnesis?.habits || '',
  family_history: anamnesis?.family_history || '',
  vital_signs: anamnesis?.vital_signs || '',
});

export const countFilledAnamnesisFields = (anamnesis?: AnamnesisRecord | null): number =>
  ANAMNESIS_FORM_FIELDS.filter((field) => hasMeaningfulAnamnesisValue(anamnesis?.[field])).length;

export const buildAnamnesisRiskFlags = (anamnesis?: AnamnesisRecord | null): string[] => {
  if (!anamnesis) return [];

  const flags: string[] = [];

  if (hasRecordedAllergie(anamnesis.allergies)) {
    flags.push(`Alergia: ${anamnesis.allergies!.trim()}`);
  }

  if (hasRecordedMedication(anamnesis.medications) && CLINICAL_RISK_REGEX.test(anamnesis.medications!)) {
    flags.push(`Medicação: ${anamnesis.medications!.trim()}`);
  }

  if (hasMeaningfulAnamnesisValue(anamnesis.medical_history) && CLINICAL_RISK_REGEX.test(anamnesis.medical_history!)) {
    flags.push(anamnesis.medical_history!.trim());
  }

  if (hasMeaningfulAnamnesisValue(anamnesis.chief_complaint)) {
    flags.push(`Queixa: ${anamnesis.chief_complaint!.trim()}`);
  }

  return flags;
};

export const buildAnamnesisAlert = (anamnesis?: AnamnesisRecord | null): string => {
  if (!anamnesis) return '';

  const flags = buildAnamnesisRiskFlags(anamnesis);
  if (flags.length > 0) {
    const clinical = flags.find((item) => CLINICAL_RISK_REGEX.test(item) && !item.startsWith('Queixa:'));
    return clinical || flags[0];
  }

  if (hasRecordedAllergie(anamnesis.allergies)) {
    return `Alergia: ${anamnesis.allergies!.trim()}`;
  }

  if (hasRecordedMedication(anamnesis.medications)) {
    return `Medicação: ${anamnesis.medications!.trim()}`;
  }

  if (hasMeaningfulAnamnesisValue(anamnesis.chief_complaint)) {
    return `Queixa: ${anamnesis.chief_complaint!.trim()}`;
  }

  if (hasMeaningfulAnamnesisValue(anamnesis.medical_history)) {
    return anamnesis.medical_history!.trim();
  }

  return '';
};
