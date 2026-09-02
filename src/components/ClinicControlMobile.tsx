import { useEffect, useMemo, useState } from 'react';
import {
  pickMobileGlance,
  type ControlCenterInput,
  type ControlTab,
  type MobileGlanceChip,
  type WidgetTone,
} from '../utils/controlCenter';

export type MobileControlSnapshot = Omit<ControlCenterInput, 'now'> & { now?: Date };

interface ClinicControlMobileProps {
  snapshot?: MobileControlSnapshot;
  activeTab: string;
  setActiveTab: (tab: ControlTab) => void;
  navigate: (path: string) => void;
  onOpenPortalInbox?: () => void;
  onOpenPatient?: (id: number) => void;
}

function toneDot(tone: WidgetTone) {
  if (tone === 'urgent') return 'bg-[#ff3b30]';
  if (tone === 'warn') return 'bg-[#ff9f0a]';
  if (tone === 'live') return 'bg-[#30d158]';
  return 'bg-[#86868b]';
}

export function ClinicControlMobile({
  snapshot,
  activeTab,
  setActiveTab,
  navigate,
  onOpenPortalInbox,
  onOpenPatient,
}: ClinicControlMobileProps) {
  const [now, setNow] = useState(() => snapshot?.now ?? new Date());

  useEffect(() => {
    if (snapshot?.now) {
      setNow(snapshot.now);
      return;
    }
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [snapshot?.now]);

  const chips = useMemo(
    () => pickMobileGlance({
      now: snapshot?.now ?? now,
      appointments: snapshot?.appointments || [],
      todayRevenue: snapshot?.todayRevenue || 0,
      weekRevenue: snapshot?.weekRevenue || 0,
      pendingReceivables: snapshot?.pendingReceivables || 0,
      portalPendingCount: snapshot?.portalPendingCount || 0,
      noShowRescheduleCount: snapshot?.noShowRescheduleCount || 0,
      patientCount: snapshot?.patientCount || 0,
      freeSlotCount: snapshot?.freeSlotCount || 0,
    }, activeTab),
    [activeTab, now, snapshot],
  );

  if (chips.length === 0) return null;

  const open = (chip: MobileGlanceChip) => {
    if (chip.id === 'portal' && onOpenPortalInbox) {
      onOpenPortalInbox();
      return;
    }
    if (chip.patientId && onOpenPatient) {
      onOpenPatient(chip.patientId);
      return;
    }
    setActiveTab(chip.tab);
    navigate('/');
  };

  return (
    <div className="pointer-events-auto mx-auto mb-2 flex max-w-[430px] items-center justify-center gap-1.5 px-1">
      {chips.map(chip => {
        const showDot = chip.tone === 'live' || chip.tone === 'warn' || chip.tone === 'urgent';
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => open(chip)}
            className="clinic-cc-mobile-chip ios-press"
          >
            {showDot && (
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(chip.tone)} ${chip.tone === 'live' ? 'clinic-cc-live-dot' : ''}`}
              />
            )}
            <span className="truncate font-semibold">{chip.label}</span>
            {chip.detail && (
              <span className="truncate font-medium text-[#6e6e73]">{chip.detail}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
