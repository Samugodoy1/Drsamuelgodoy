# Appointment Filtering & Agenda Views Analysis

## Summary
Comprehensive analysis of how appointments are filtered, displayed, and handled across different agenda views (day/week/month) in the OdontoHub application.

---

## 1. FILTERING LOGIC ARCHITECTURE

### Location: [src/App.tsx](src/App.tsx#L2350-L2384)

**Core Filter Function: `getFilteredAppointments()`**

```typescript
const getFilteredAppointments = () => {
  // For day view, include FINISHED status to show completed appointments
  const effectiveStatusFilter = agendaViewMode === 'day' 
    ? [...statusFilter, 'FINISHED'].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
    : statusFilter;
  
  let filtered = appointments.filter(a => effectiveStatusFilter.length === 0 || effectiveStatusFilter.includes(a.status))
    .filter(a => agendaSearchTerm === '' || (a.patient_name || '').toLowerCase().includes((agendaSearchTerm || '').toLowerCase()));

  if (agendaViewMode === 'day') {
    filtered = filtered.filter(a => {
      const appDate = new Date(a.start_time);
      const isSelectedDate = appDate.toDateString() === selectedDate.toDateString();
      const isFinishedPast = a.status === 'FINISHED' && appDate < new Date() && !isSelectedDate;
      // Include appointments from selected date OR finished appointments from the past (not the selected date)
      return isSelectedDate || isFinishedPast;
    });
  } else if (agendaViewMode === 'week') {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    filtered = filtered.filter(a => {
      const appDate = new Date(a.start_time);
      return appDate >= startOfWeek && appDate <= endOfWeek;
    });
  } else if (agendaViewMode === 'month') {
    filtered = filtered.filter(a => {
      const appDate = new Date(a.start_time);
      return appDate.getMonth() === selectedDate.getMonth() && appDate.getFullYear() === selectedDate.getFullYear();
    });
  }

  return filtered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
};
```

---

## 2. STATUS FILTERS

### Default Status Filter ([Line 517](src/App.tsx#L517))
```typescript
const [statusFilter, setStatusFilter] = useState<string[]>(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);
```

### Status Filter Behavior by View

| View | Status Filter Applied | FINISHED Status | Notes |
|------|----------------------|-----------------|-------|
| **Day** | + FINISHED (auto-added) | ✅ Included | Shows completed appointments that are still visible |
| **Week** | Original statusFilter only | ❌ Excluded | Doesn't include finished appointments |
| **Month** | Original statusFilter only | ❌ Excluded | Doesn't include finished appointments |

### Effective Status Resolution ([Line 2354](src/App.tsx#L2354))
```typescript
const effectiveStatusFilter = agendaViewMode === 'day' 
  ? [...statusFilter, 'FINISHED'].filter((v, i, a) => a.indexOf(v) === i)
  : statusFilter;
```

**Why**: In day view, finished appointments that occurred earlier are still shown to maintain visibility of the day's work history.

---

## 3. SEARCH/NAME FILTERING

### Location: [Line 2356-2357](src/App.tsx#L2356-L2357)

```typescript
let filtered = appointments
  .filter(a => effectiveStatusFilter.length === 0 || effectiveStatusFilter.includes(a.status))
  .filter(a => agendaSearchTerm === '' || (a.patient_name || '').toLowerCase().includes((agendaSearchTerm || '').toLowerCase()));
```

**How it works:**
- Searches against `a.patient_name` field
- Case-insensitive matching (`.toLowerCase()`)
- Applied AFTER status filtering
- Applied BEFORE date range filtering

### "Gustavo" Issue Analysis
If "Gustavo" appointments are missing, check:
1. ✅ Status is one of: `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, or `FINISHED` (day view only)
2. ✅ `agendaSearchTerm` is empty or contains "gustavo" (case-insensitive)
3. ✅ Date is within the view's date range (see section 4 below)

---

## 4. DATE RANGE FILTERS BY VIEW

### 4.1 DAY VIEW
**Location:** [Lines 2361-2366](src/App.tsx#L2361-L2366)

```typescript
if (agendaViewMode === 'day') {
  filtered = filtered.filter(a => {
    const appDate = new Date(a.start_time);
    const isSelectedDate = appDate.toDateString() === selectedDate.toDateString();
    const isFinishedPast = a.status === 'FINISHED' && appDate < new Date() && !isSelectedDate;
    // Include appointments from selected date OR finished appointments from the past (not the selected date)
    return isSelectedDate || isFinishedPast;
  });
}
```

**Range Logic:**
- Primary: All appointments matching `selectedDate` (exact date match)
- Secondary: Past FINISHED appointments (not on the selected date)
- Sorted: Ascending by `start_time`

**State Variables:**
- `selectedDate` - Currently selected date for day view
- `now` - Current date/time (updated every minute via `useEffect`)

---

### 4.2 WEEK VIEW
**Location:** [Lines 2368-2375](src/App.tsx#L2368-L2375)

```typescript
else if (agendaViewMode === 'week') {
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay()); // Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

  filtered = filtered.filter(a => {
    const appDate = new Date(a.start_time);
    return appDate >= startOfWeek && appDate <= endOfWeek;
  });
}
```

**Range Calculation:**
- **Start:** Sunday of the selected week (`Sunday 00:00`)
- **End:** Saturday of the selected week (same week, `Saturday 23:59:59`)
- Range: 7 days inclusive

**⚠️ CRITICAL ISSUE - Business Hours NOT Included:**
- The week view uses `selectedDate.getDay()` to calculate Sunday
- There's NO automatic inclusion of business hours (08:00-18:00) like in the user memory suggests
- If appointments are outside 00:00-23:59 on those dates, they WILL appear
- However, the UI rendering might not display them if outside visible time slots

---

### 4.3 MONTH VIEW
**Location:** [Lines 2376-2381](src/App.tsx#L2376-L2381)

```typescript
else if (agendaViewMode === 'month') {
  filtered = filtered.filter(a => {
    const appDate = new Date(a.start_time);
    return appDate.getMonth() === selectedDate.getMonth() && appDate.getFullYear() === selectedDate.getFullYear();
  });
}
```

**Range Logic:**
- **Month match:** Same month and year as `selectedDate`
- **Range:** 1st-31st (or 28-30) of the selected month
- No year filtering issues since year is checked

---

## 5. AGENDA VIEW MODES

### State Management
**Location:** [Line 505](src/App.tsx#L505)
```typescript
const [agendaViewMode, setAgendaViewMode] = useState<'day' | 'week' | 'month'>('day');
```

### Focus Mode
**Location:** [Line 518](src/App.tsx#L518)
```typescript
const [agendaFocusMode, setAgendaFocusMode] = useState(true);
```

### View Mode Toggle UI
**Location:** [Lines 2321-2341](src/App.tsx#L2321-L2341)

```typescript
{!agendaFocusMode && (
  <div className="flex bg-slate-100 p-1 rounded-full">
    <button 
      onClick={() => setAgendaViewMode('day')}
      className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all ${agendaViewMode === 'day' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
    >
      Dia
    </button>
    <button 
      onClick={() => setAgendaViewMode('week')}
      className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all ${agendaViewMode === 'week' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
    >
      Semana
    </button>
    <button 
      onClick={() => setAgendaViewMode('month')}
      className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all ${agendaViewMode === 'month' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
    >
      Mês
    </button>
  </div>
)}
```

**⚠️ KEY ISSUE - Focus Mode vs. View Mode Controls:**
- View mode buttons are ONLY visible when `!agendaFocusMode` (line 2321)
- When `agendaFocusMode === true`, the week/month buttons are completely hidden
- However, the filtering still respects `agendaViewMode` internally
- **Problem:** Users can't see which view they're in when focus mode is active

---

## 6. APPOINTMENT RENDERING & ACTION HANDLERS

### Render Function
**Location:** [Lines 2404-2488](src/App.tsx#L2404-L2488)

```typescript
const renderAppointment = (app: Appointment, isFocusMode: boolean = false) => {
  const isNext = isNextAppointment(app, filtered);
  
  return (
    <div key={app.id} className={...}>
      {/* Time column - hidden on week/month view mobile */}
      <div className={`${agendaViewMode === 'day' ? '' : 'hidden sm:flex'} w-12 sm:w-16 pt-1 flex flex-col items-center shrink-0`}>
        {/* Time display... */}
      </div>
      
      <div className="flex-1 bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm group-hover:shadow-md transition-all flex flex-col gap-4">
        {/* Patient info and status */}
        <div className="flex items-start gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => openPatientRecord(app.patient_id)}>
            {/* Patient photo and name... */}
          </div>

          {!isFocusMode && (
            <select
              value={app.status}
              onChange={(e) => updateStatus(app.id, e.target.value as Appointment['status'])}
              className="px-2 sm:px-3 py-1 sm:py-2 bg-white border border-slate-200 rounded text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none whitespace-nowrap shrink-0"
            >
              <option value="SCHEDULED">Agendado</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="FINISHED">Finalizado</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="NO_SHOW">Faltou</option>
            </select>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => openEditAppointmentModal(app)}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm rounded-full hover:bg-slate-50 transition-all"
          >
            Editar
          </button>
          <button 
            onClick={() => { /* Start appointment handler */ }}
            className="flex-1 sm:flex-none bg-primary text-white px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
          >
            <Activity size={16} />
            <span>{app.status === 'FINISHED' ? 'Ver Prontuário' : 'Iniciar Atendimento'}</span>
          </button>
          
          <button 
            onClick={() => sendReminder(app)}
            className="p-2.5 text-primary bg-primary/5 hover:bg-primary/10 rounded-full transition-all shrink-0"
            title="WhatsApp"
          >
            <MessageCircle size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 7. ACTION HANDLER BEHAVIOR

### 7.1 Status Update Dropdown
**Location:** [Lines 2437-2450](src/App.tsx#L2437-L2450)

```typescript
{!isFocusMode && (
  <select
    value={app.status}
    onChange={(e) => updateStatus(app.id, e.target.value as Appointment['status'])}
    className="..."
  >
    <option value="SCHEDULED">Agendado</option>
    <option value="CONFIRMED">Confirmado</option>
    <option value="IN_PROGRESS">Em Andamento</option>
    <option value="FINISHED">Finalizado</option>
    <option value="CANCELLED">Cancelado</option>
    <option value="NO_SHOW">Faltou</option>
  </select>
)}
```

**⚠️ STATUS DROPDOWN DISABLED/HIDDEN IN FOCUS MODE:**
- Status dropdown is **hidden** when `isFocusMode === true` (via `{!isFocusMode && ...}`)
- **Why:** Focus mode is designed for quick reference only, not for updates
- **Impact:** Users in focus mode cannot change appointment status
- **Recommendation:** According to user memory, restrict focus mode to day view only, or enable status updates in focus mode

---

### 7.2 Edit Button
**Location:** [Lines 2454-2460](src/App.tsx#L2454-L2460)

```typescript
<button 
  onClick={() => openEditAppointmentModal(app)}
  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm rounded-full hover:bg-slate-50 transition-all"
>
  Editar
</button>
```

**Status:** ✅ ALWAYS ENABLED & VISIBLE
- Works in both focus mode and full agenda mode
- Opens modal to edit appointment details and reschedule
- Connected to `openEditAppointmentModal()` handler

---

### 7.3 Start Appointment / View Record Button
**Location:** [Lines 2461-2473](src/App.tsx#L2461-L2473)

```typescript
<button 
  onClick={() => {
    const patient = patients.find(p => p.id === app.patient_id);
    if (patient) openPatientRecord(patient.id);
    setActiveTab('prontuario');
    navigate(`/pacientes/${app.patient_id}/clinico`);
  }}
  className="flex-1 sm:flex-none bg-primary text-white px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
>
  <Activity size={16} />
  <span className="hidden sm:inline">{app.status === 'FINISHED' ? 'Ver Prontuário' : 'Iniciar Atendimento'}</span>
  <span className="sm:hidden">{app.status === 'FINISHED' ? 'Ver' : 'Atender'}</span>
</button>
```

**Status:** ✅ ALWAYS ENABLED & VISIBLE
- Button text changes based on appointment status
- Navigates to patient record / clinical notes tab
- Works in both focus mode and full agenda mode

---

### 7.4 Send Reminder Button
**Location:** [Lines 2475-2482](src/App.tsx#L2475-L2482)

```typescript
<button 
  onClick={() => sendReminder(app)}
  className="p-2.5 text-primary bg-primary/5 hover:bg-primary/10 rounded-full transition-all shrink-0"
  title="WhatsApp"
>
  <MessageCircle size={18} />
</button>
```

**Status:** ✅ ALWAYS ENABLED & VISIBLE
- Opens WhatsApp with pre-filled message
- Works in both focus mode and full agenda mode
- Handler: [Lines 1750-1798](src/App.tsx#L1750-L1798)

---

## 8. FOCUS MODE BEHAVIOR

### When Focus Mode is ACTIVE (`agendaFocusMode === true`)

**Location:** [Lines 2488-2516](src/App.tsx#L2488-L2516)

```typescript
if (agendaFocusMode) {
  const todayStr = new Date().toDateString();
  const isToday = selectedDate.toDateString() === todayStr;
  const todayApps = filtered.filter(a => new Date(a.start_time).toDateString() === todayStr);
  const nextApps = todayApps
    .filter(a => new Date(a.start_time) > now && a.status !== 'CANCELLED' && a.status !== 'FINISHED')
    .slice(0, 3);

  return (
    <div className="divide-y divide-slate-100">
      {/* Current Time Indicator */}
      {isToday && (
        <div className="py-4 px-6 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Agora</span>
          </div>
          <div className="h-[1px] flex-1 bg-rose-200/50" />
        </div>
      )}
      
      {/* Next Appointments */}
      {nextApps.length > 0 ? nextApps.map(app => renderAppointment(app, true)) : (
        <div className="px-6 py-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-slate-200" size={32} />
          </div>
          <p className="text-slate-500 font-medium">Nenhum paciente próximo para hoje.</p>
        </div>
      )}
    </div>
  );
}
```

**Focus Mode Logic:**
1. **Gets today's appointments** from the filtered list
2. **Filters for future appointments only** (`start_time > now`)
3. **Excludes cancelled/finished** appointments
4. **Shows max 3 next appointments**
5. **Displays "Now" indicator** if viewing today
6. **Passes `isFocusMode=true`** to renderAppointment, which hides status dropdown

**⚠️ ISSUE - Focus Mode Not Gated to Day View:**
- Focus mode can be active with ANY view mode (day/week/month)
- When focus mode is active, view mode buttons are hidden (line 2321)
- However, the focus mode logic still filters by which appointments are in `todayApps`
- **Result:** In week/month focus mode, only today's appointments show (not very useful)

---

## 9. COMPLETE FILTERING SEQUENCE

```
1. INITIAL APPOINTMENTS
   ↓
2. STATUS FILTER
   ├─ Day view: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED']
   └─ Week/Month: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
   ↓
3. SEARCH/NAME FILTER
   └─ match: agendaSearchTerm in patient_name (case-insensitive)
   ↓
4. DATE RANGE FILTER
   ├─ Day: matches selectedDate (+ past FINISHED appointments)
   ├─ Week: between Sunday-Saturday of selectedDate
   └─ Month: same month/year as selectedDate
   ↓
5. RENDER LOGIC
   ├─ if (agendaFocusMode):
   │  └─ Filter to today's date only
   │     └─ Show only next 3 future (non-cancelled/finished) appointments
   └─ else:
      ├─ if (agendaViewMode === 'day'): Timeline list view
      ├─ if (agendaViewMode === 'week'): Week grid with hourly slots
      └─ if (agendaViewMode === 'month'): Month calendar with overlay details
```

---

## 10. KNOWN ISSUES & RECOMMENDATIONS

### ✅ Issue #1: Focus Mode Hiding Status Dropdown
- **Problem:** Status dropdown hidden in focus mode (line 2437: `{!isFocusMode && ...}`)
- **Impact:** Cannot update appointment status in focus mode
- **Current Design:** Focus mode is read-only by design
- **Recommendation:** Either:
  - A) Keep as-is (intentional read-only design)
  - B) Restrict focus mode to day view only (as per user memory)
  - C) Enable status updates in focus mode with explicit confirmation

### ✅ Issue #2: Focus Mode Controls Not Gated to Day View
- **Problem:** Focus mode can be active with week/month views, showing only today's appointments
- **Impact:** Limited utility when using week/month focus mode (confusing UX)
- **According to User Memory:** Should gate focus mode to day view only
- **Fix Location:** Add check before rendering view mode controls
  ```typescript
  // Only show focus mode toggle in day view
  const canUseFocusMode = agendaViewMode === 'day';
  ```

### ✅ Issue #3: Week Grid Business Hours Not Gated
- **Problem:** Week grid can show appointments outside 08:00-18:00 without explicit filtering
- **Impact:** According to user memory, should maintain business window visibility
- **Current Behavior:** Dynamically calculates earliest/latest hours from appointments
- **Recommendation:** Ensure earliest hour is at least 8 and latest is at least 18
  ```typescript
  earliestHour = Math.max(8, earliestHour - 1);  // Include business start
  latestHour = Math.min(23, Math.max(18, latestHour + 1));  // Include business end
  ```

### ✅ Issue #4: "Gustavo" Appointments Missing
- **Diagnosis Chain:**
  1. Check if status is in active filter (default: SCHEDULED, CONFIRMED, IN_PROGRESS)
  2. Check if patient name matches search term or search is empty
  3. Check if appointment date falls within view range
  4. Check if in focus mode and appointment is not in top 3 future appointments for today
  5. Check Database - appointment may be deleted or reassigned to different dentist

### 📋 Suggested Improvements
1. **Add debug view** showing which filter stage removes each appointment
2. **Gate focus mode to day view** (per user memory recommendations)
3. **Ensure week view includes business hours** (08:00-18:00)
4. **Add appointment count badges** to week/month view buttons
5. **Show view mode indicator** when in focus mode (currently hidden)
6. **Add filter summary** showing active filters (e.g., "3 statuses, 1 week, 5 results")

