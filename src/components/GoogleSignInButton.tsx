import { useEffect, useRef, useState } from 'react';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: any;
  }
}

let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'));
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

/**
 * Renderiza o botao oficial "Entrar com Google" (Google Identity Services).
 * Requer VITE_GOOGLE_CLIENT_ID configurado no ambiente.
 */
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) {
      setError('Login com Google indisponível (configuração ausente).');
      return;
    }

    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response?.credential) {
              callbackRef.current(response.credential);
            }
          },
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
          width: containerRef.current.offsetWidth || 320,
        });
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o login com Google.');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="w-full">
      <div ref={containerRef} className="flex justify-center [color-scheme:light]" />
      {error && <p className="mt-2 text-center text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
