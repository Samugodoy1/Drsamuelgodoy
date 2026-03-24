/**
 * Utilitário simples para transformar termos curtos em texto clínico formal.
 * Focado em velocidade e regras simples de mapeamento.
 */

const clinicalDictionary: Record<string, string> = {
  'resina': 'Restauração em resina composta',
  'endo': 'Tratamento endodôntico',
  'extração': 'Exodontia',
  'extracao': 'Exodontia',
  'limpeza': 'Profilaxia e raspagem',
  'provisório': 'Coroa provisória',
  'provisorio': 'Coroa provisória',
  'anestesia': 'sob anestesia',
  'infiltração': 'infiltrativa',
  'infiltracao': 'infiltrativa',
  'infiltrativa': 'infiltrativa',
  'bloco': 'Restauração indireta',
  'coroa': 'Prótese fixa unitária',
  'canal': 'Tratamento de canal',
  'raspagem': 'Raspagem supra-gengival',
  'pino': 'Instalação de pino intrarradicular',
  'nucleo': 'Confecção de núcleo de preenchimento',
};

// Regex para identificar elementos dentários (11-48)
const elementRegex = /\b([1-4][1-8])\b/g;

// Regex para identificar cores de resina (A1, A2, etc)
const colorRegex = /\b([A-D][1-4](?:\.5)?)\b/gi;

export const improveClinicalText = (input: string): string => {
  if (!input.trim()) return '';

  let text = input;

  // 1. Mapear termos do dicionário
  Object.entries(clinicalDictionary).forEach(([key, value]) => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    text = text.replace(regex, value);
  });

  // 2. Formatar elementos dentários
  text = text.replace(elementRegex, 'no elemento $1');

  // 3. Formatar cores
  text = text.replace(colorRegex, (match) => {
    // Evita duplicar "cor" se o usuário já escreveu
    if (text.toLowerCase().includes(`cor ${match.toLowerCase()}`)) return match;
    return `cor ${match.toUpperCase()}`;
  });

  // 4. Limpeza de pontuação e espaços
  text = text
    .replace(/\s+/g, ' ') // Remove espaços duplos
    .replace(/,\s*,/g, ',') // Remove vírgulas duplas
    .trim();

  // 5. Capitalização e ponto final
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!text.endsWith('.')) text += '.';

  // Ajuste fino para conectivos (ex: "resina composta no elemento 11 cor A2" -> adicionar vírgulas)
  // Uma lógica simples: se tiver "elemento X" seguido de "cor Y", coloca uma vírgula
  text = text.replace(/(no elemento \d+) (cor [A-D]\d)/gi, '$1, $2');
  text = text.replace(/(cor [A-D]\d) (sob anestesia)/gi, '$1, $2');

  return text;
};
