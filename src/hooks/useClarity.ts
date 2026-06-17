type ClarityFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFunction;
  }
}

function clarity(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.clarity === "function") {
    window.clarity(...args);
  }
}

/**
 * Hook para interagir com o Microsoft Clarity.
 * Docs: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
 */
export function useClarity() {
  /** Identifica o usuário atual no Clarity */
  function identify(userId: string, sessionId?: string, pageId?: string, friendlyName?: string) {
    clarity("identify", userId, sessionId, pageId, friendlyName);
  }

  /** Define uma tag personalizada (chave/valor) */
  function setTag(key: string, value: string | string[]) {
    clarity("set", key, value);
  }

  /** Marca a sessão atual com um rótulo customizado */
  function upgrade(reason: string) {
    clarity("upgrade", reason);
  }

  /** Envia um evento customizado */
  function event(name: string) {
    clarity("event", name);
  }

  return { identify, setTag, upgrade, event };
}
