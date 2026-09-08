import { useState } from 'react';
import { Calendar, DollarSign, Home, Settings, Users } from '../icons';
import { AppToast, type AppToastNotification } from './AppToast';
import { PortalLinkSheet } from './PortalLinkSheet';

const PREVIEW_PORTAL = {
  url: 'https://odontohub.app/portal/mariana',
  preUrl: 'https://odontohub.app/pre-atendimento/mariana',
  patientName: 'Mariana Alves',
  phone: '11988880001',
};

/**
 * Visual QA for the three surfaces remodeled in this pass.
 * Dev-only: /dev/ui
 */
export function UiPolishPreview() {
  const [toast, setToast] = useState<AppToastNotification | null>({
    message: 'Agendamento realizado com sucesso!',
    type: 'success',
  });
  const [sheetOpen, setSheetOpen] = useState(true);
  const [showIsland, setShowIsland] = useState(true);

  return (
    <div className="relative min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      {showIsland && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center px-3 pt-[max(10px,env(safe-area-inset-top))]">
          <div
            className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-full border border-white/70 px-3.5 py-2 shadow-[0_10px_32px_rgba(0,0,0,0.08)]"
            style={{
              background: 'rgba(255, 255, 255, 0.82)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              backdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#30d158]" />
            <p className="min-w-0 flex-1 truncate text-[13px] text-[#1d1d1f]">Demonstração</p>
            <span className="shrink-0 text-[13px] text-[#0071e3]">Começar de verdade</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[430px] px-5 pt-20 pb-36">
        <p className="text-[13px] text-[#86868b]">Bom dia</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.025em]">
          Tem um retorno vencido que você marcou e esqueceu.
        </h1>
        <div className="mt-8 rounded-[20px] bg-white p-5">
          <p className="text-[15px] font-semibold">Mariana Alves</p>
          <p className="mt-0.5 text-[12px] text-[#86868b]">Retorno venceu há 3 dias · Canal no 16</p>
        </div>
        <div className="mt-8 flex flex-col gap-2">
          <button type="button" className="apple-btn" onClick={() => setToast({ message: 'Agendamento realizado com sucesso!', type: 'success' })}>
            Mostrar toast de sucesso
          </button>
          <button type="button" className="apple-btn-light" onClick={() => setToast({ message: 'Status alterado para Confirmado', type: 'success', onUndo: () => setToast(null) })}>
            Toast com desfazer
          </button>
          <button type="button" className="apple-btn-light" onClick={() => setSheetOpen(true)}>
            Abrir links do paciente
          </button>
          <button type="button" className="apple-btn-light" onClick={() => setShowIsland((v) => !v)}>
            Alternar ilha da demonstração
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
        <div className="px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
          <nav className="liquid-glass-tabbar pointer-events-auto mx-auto flex max-w-[430px] items-stretch px-1.5 py-1">
            {[
              { label: 'Início', Icon: Home },
              { label: 'Agenda', Icon: Calendar },
              { label: 'Pacientes', Icon: Users },
              { label: 'Financeiro', Icon: DollarSign },
              { label: 'Perfil', Icon: Settings },
            ].map(({ label, Icon }) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-[#86868b]">
                <Icon size={22} className={label === 'Início' ? 'text-[#0071e3]' : ''} />
                {label}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <AppToast notification={toast} offsetTop={showIsland} onDismiss={() => setToast(null)} />
      <PortalLinkSheet
        data={sheetOpen ? PREVIEW_PORTAL : null}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}

export default UiPolishPreview;
