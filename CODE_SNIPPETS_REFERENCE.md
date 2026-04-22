# CODE SNIPPETS: QUICK INTEGRATION

---

## 1. UPDATE INTERFACE (types)

### Before
```tsx
clinic: {
  name?: string;
  clinic_name?: string;
  photo_url?: string;
} | null;
```

### After
```tsx
clinic: {
  name?: string;
  clinic_name?: string;
  photo_url?: string;
  phone?: string;        // Add this
  whatsapp?: string;     // Add this
} | null;
```

---

## 2. VERIFY ICON IMPORTS

In [src/icons.tsx](src/icons.tsx), ensure these are exported:

```tsx
export { Phone, MessageCircle, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
```

If not, add them to your icon barrel file or import directly in component:

```tsx
import { Phone, MessageCircle, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
```

---

## 3. PRIMARY ACTION BUTTONS CODE

Copy-paste ready:

```tsx
{/* PRIMARY ACTION: Call Clinic / Message */}
<motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.1 }}
  className="grid grid-cols-2 gap-3"
>
  {/* Call Button */}
  <button
    onClick={() => {
      if (clinic?.phone) {
        window.location.href = `tel:${clinic.phone}`;
      }
    }}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0C9B72] to-[#0A7D5C] p-4 text-white transition-all hover:shadow-lg active:scale-95"
  >
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl" />
    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
      <Phone size={20} className="shrink-0" />
      <span className="text-[13px] font-semibold">Ligar</span>
    </div>
  </button>

  {/* WhatsApp Button */}
  <button
    onClick={() => {
      if (clinic?.whatsapp) {
        const msg = encodeURIComponent(
          `Oi! Tenho uma consulta marcada para ${formatDateBR(
            nextAppointment.start_time
          )} às ${formatTimeBR(nextAppointment.start_time)}`
        );
        window.location.href = `https://wa.me/${clinic.whatsapp}?text=${msg}`;
      }
    }}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] p-4 text-white transition-all hover:shadow-lg active:scale-95"
  >
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl" />
    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
      <MessageCircle size={20} className="shrink-0" />
      <span className="text-[13px] font-semibold">WhatsApp</span>
    </div>
  </button>
</motion.div>
```

---

## 4. APPOINTMENT DETAILS CARD CODE

```tsx
{/* APPOINTMENT DETAILS: Compact, Scannable */}
<motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.15 }}
  className="rounded-2xl bg-[#F9FAFB] border border-[#E5E5EA] p-5 space-y-4"
>
  {/* Status badge + days until */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className="w-3 h-3 rounded-full bg-[#34C759] animate-pulse" />
      <span className="text-[#34C759] text-[12px] font-bold uppercase">
        Confirmado
      </span>
    </div>
    <span
      className={`text-[12px] font-semibold px-3 py-1.5 rounded-full ${getCountdownColor(
        daysUntilAppointment
      )}`}
    >
      {getCountdownLabel(daysUntilAppointment)}
    </span>
  </div>

  {/* Date, Time, Provider */}
  <div className="space-y-2.5">
    <div>
      <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-wide">
        Data e Hora
      </p>
      <p className="text-[#1C1C1E] text-[17px] font-bold mt-1">
        {new Date(nextAppointment.start_time).toLocaleDateString(
          'pt-BR',
          {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          }
        )}
      </p>
    </div>

    <div>
      <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-wide">
        Profissional
      </p>
      <p className="text-[#1C1C1E] text-[15px] font-semibold mt-1">
        Dr(a). {nextAppointment.dentist_name}
      </p>
    </div>
  </div>
</motion.div>
```

---

## 5. PREPARATION CHECKLIST CODE

```tsx
const [expandedChecklist, setExpandedChecklist] = useState(false);

const CHECKLIST_ITEMS = [
  { icon: '📋', label: 'Documentos', desc: 'CPF, identidade ou comprovante' },
  { icon: '🏥', label: 'Cartão de saúde', desc: 'Se tiver convênio' },
  { icon: '🧴', label: 'Higiene bucal', desc: 'Escove os dentes antes de vir' },
  { icon: '⏰', label: 'Chegue cedo', desc: '10 minutos antes do horário' },
  { icon: '📱', label: 'Seu telefone', desc: 'Em caso de dúvidas' },
];

// In JSX:
{/* PREPARATION SECTION */}
<motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.2 }}
  className="space-y-3"
>
  <button
    onClick={() => setExpandedChecklist(!expandedChecklist)}
    className="w-full rounded-2xl bg-white border border-[#E5E5EA] p-5 flex items-center justify-between hover:border-[#0C9B72]/50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#0C9B72]/10 flex items-center justify-center">
        <CheckCircle2 size={20} className="text-[#0C9B72]" />
      </div>
      <div className="text-left">
        <p className="text-[#1C1C1E] text-[15px] font-semibold">
          Prepare-se para a visita
        </p>
        <p className="text-[#8E8E93] text-[12px] mt-0.5">
          {expandedChecklist
            ? 'Mostrar menos'
            : `${CHECKLIST_ITEMS.length} coisas a fazer`}
        </p>
      </div>
    </div>
    <ChevronDown
      size={20}
      className={`text-[#8E8E93] transition-transform ${
        expandedChecklist ? 'rotate-180' : ''
      }`}
    />
  </button>

  {/* Expandable checklist */}
  <AnimatePresence>
    {expandedChecklist && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="space-y-2 overflow-hidden"
      >
        {CHECKLIST_ITEMS.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex gap-3 rounded-xl bg-white border border-[#E5E5EA] p-4 hover:border-[#0C9B72]/50 transition-colors"
          >
            <span className="text-[18px] shrink-0">{item.icon}</span>
            <div>
              <p className="text-[#1C1C1E] text-[14px] font-semibold">
                {item.label}
              </p>
              <p className="text-[#8E8E93] text-[12px] mt-0.5">
                {item.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

---

## 6. SECONDARY ACTIONS GRID CODE

```tsx
{/* SECONDARY ACTIONS */}
<motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.25 }}
  className="grid grid-cols-3 gap-2"
>
  <button
    onClick={() => onRescheduleAppointment(nextAppointment)}
    className="rounded-xl bg-white border border-[#E5E5EA] p-3 text-center hover:border-[#0C9B72]/50 transition-colors active:scale-95"
  >
    <Calendar size={18} className="text-[#0C9B72] mx-auto mb-1.5" />
    <p className="text-[#1C1C1E] text-[12px] font-semibold">Reagendar</p>
  </button>

  <button
    onClick={onOpenDepth}
    className="rounded-xl bg-white border border-[#E5E5EA] p-3 text-center hover:border-[#0C9B72]/50 transition-colors active:scale-95"
  >
    <Stethoscope size={18} className="text-[#0C9B72] mx-auto mb-1.5" />
    <p className="text-[#1C1C1E] text-[12px] font-semibold">Traço</p>
  </button>

  <button
    onClick={() => {
      const startDate = new Date(nextAppointment.start_time);
      const endDate = new Date(nextAppointment.end_time || startDate.getTime() + 30 * 60000);
      const title = `Consulta Dentária - Dr(a). ${nextAppointment.dentist_name}`;
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title
      )}&dates=${startDate.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z/${endDate
        .toISOString()
        .replace(/[-:]/g, '')
        .slice(0, 15)}Z`;
      window.open(url, '_blank');
    }}
    className="rounded-xl bg-white border border-[#E5E5EA] p-3 text-center hover:border-[#0C9B72]/50 transition-colors active:scale-95"
  >
    <MapPin size={18} className="text-[#0C9B72] mx-auto mb-1.5" />
    <p className="text-[#1C1C1E] text-[12px] font-semibold">Localização</p>
  </button>
</motion.div>
```

---

## 7. TREATMENT PROGRESS CODE

```tsx
{/* TREATMENT PROGRESS (if applicable) */}
{recentProcedures.length > 0 && (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.3 }}
    className="rounded-2xl bg-[#F9FAFB] border border-[#E5E5EA] p-5"
  >
    <p className="text-[#0C9B72] text-[11px] font-bold uppercase tracking-wide mb-3">
      Acompanhamento
    </p>
    <div className="space-y-2">
      {recentProcedures.slice(0, 2).map((proc, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#34C759] flex items-center justify-center shrink-0">
            <CheckCircle2 size={14} className="text-white" />
          </div>
          <div>
            <p className="text-[#1C1C1E] text-[13px] font-semibold">
              {proc.procedure}
            </p>
            <p className="text-[#8E8E93] text-[11px] mt-0.5">
              {formatDateBR(proc.date)}
            </p>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
)}
```

---

## 8. CONDITIONAL WRAPPER

To show only when appointment is confirmed:

```tsx
const isConfirmed = nextAppointment?.status === 'CONFIRMED';

{isConfirmed && nextAppointment && (
  <>
    {/* All sections from above */}
  </>
)}
```

---

## 9. DATA REQUIREMENTS FOR PARENT

Ensure the parent component (PatientPortal.tsx) passes:

```tsx
<PatientPortalHome
  patient={patient}
  clinic={{
    ...clinicData,
    phone: clinicData?.phone || '5511999999999',
    whatsapp: clinicData?.whatsapp || '5511999999999',
  }}
  futureAppointments={appointments}
  recentProcedures={procedures}
  onOpenDepth={handleOpenDepth}
  onConfirmAppointment={handleConfirm}
  onRescheduleAppointment={handleReschedule}
  appointmentSubmittingId={submittingId}
  confirmedAppointmentId={confirmedId}
  rescheduleRequestedAppointmentId={rescheduleId}
  sessionToken={token}
/>
```

---

## 10. TESTING SNIPPETS

### Test: Call button on mobile
```tsx
// In browser DevTools
window.location.href = 'tel:+5511999999999'; // Should dial
```

### Test: WhatsApp link
```tsx
// Should open WhatsApp with message
const msg = 'Oi! Tenho uma consulta marcada para 20 abr às 14:30';
const waLink = `https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`;
window.open(waLink, '_blank');
```

### Test: Google Calendar integration
```tsx
const startDate = new Date('2024-04-20T14:30:00');
const endDate = new Date('2024-04-20T15:00:00');
const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Consulta%20Dentária&dates=${startDate.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z/${endDate.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
window.open(url, '_blank');
```

---

## 11. MIGRATION PLAN

### Option 1: Full Replacement (Recommended)
```bash
# Delete old
rm src/components/PatientPortalHome.tsx

# Rename new
mv src/components/PatientPortalHome_New.tsx src/components/PatientPortalHome.tsx

# Rebuild
npm run build
```

### Option 2: Side-by-side with feature flag
```tsx
// In PatientPortal.tsx
const PatientPortalComponent = useNewDesign 
  ? PatientPortalHome_New 
  : PatientPortalHome;

return <PatientPortalComponent {...props} />;
```

### Option 3: Route-based
```tsx
// Route: /portal/home?design=new
const useNewDesign = new URLSearchParams(location.search).get('design') === 'new';
```

