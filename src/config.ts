/**
 * Configuracao central da API.
 *
 * Em producao, VITE_API_URL deve apontar para a API central:
 *   VITE_API_URL=https://api.odontohub.app.br
 *
 * Em desenvolvimento local, pode apontar para o servidor local:
 *   VITE_API_URL=http://localhost:3001
 *
 * Se nao definido, usa string vazia (mesmo dominio — fallback para backend local).
 */
export const API_URL = import.meta.env.VITE_API_URL
  ? (import.meta.env.VITE_API_URL as string).replace(/\/+$/, '')
  : '';
