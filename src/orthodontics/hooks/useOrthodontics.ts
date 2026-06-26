import { useCallback, useEffect, useState } from 'react';
import type { OrthodonticsResponse } from '../types';

type ApiFetch = (input: string, init?: any) => Promise<Response>;

interface UseOrthodonticsResult {
  data: OrthodonticsResponse | null;
  loading: boolean;
  error: string | null;
  /** Há um tratamento que ativa a experiência ortodôntica. */
  isOrthoPatient: boolean;
  refresh: () => Promise<void>;
}

/**
 * Carrega o contexto ortodôntico do paciente (resumo já calculado no backend).
 * Quando o paciente não possui tratamento, `isOrthoPatient` é false e a UI
 * ortodôntica não deve renderizar nada.
 */
export function useOrthodontics(apiFetch: ApiFetch, patientId: number | string | null): UseOrthodonticsResult {
  const [data, setData] = useState<OrthodonticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/patients/${patientId}/orthodontics`);
      if (!res.ok) {
        // 403/404 → simplesmente sem ortodontia; não é erro visível
        setData({ enabled: false, treatments: [] });
        return;
      }
      const json = (await res.json()) as OrthodonticsResponse;
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar dados ortodônticos');
      setData({ enabled: false, treatments: [] });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isOrthoPatient = Boolean(data && data.treatments && data.treatments.length > 0);

  return { data, loading, error, isOrthoPatient, refresh };
}
