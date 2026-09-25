import React, { useEffect, useMemo, useState } from 'react';
import { X } from '../icons';
import { API_URL } from '../config';
import {
  clinicToday,
  compareIso,
  formatWhenLabel,
  parseReminder,
  suggestReminders,
  type CadenceUnit,
} from '../utils/patientReminders';

export interface PatientReminder {
  id: number;
  patient_id: number;
  patient_name?: string | null;
  photo_url?: string | null;
  note: string;
  due_date: string;
  cadence_unit: CadenceUnit | null;
  cadence_count: number | null;
  status: 'open' | 'done' | 'dismissed';
  timing: 'overdue' | 'today' | 'upcoming';
}

interface RepeatOffer {
  reminderId: number;
  text: string;
  label: string;
}

const snoozeChoices = [
  { days: 1, label: 'Amanhã' },
  { days: 7, label: '1 semana' },
  { days: 30, label: '1 mês' },
];

function timingLabel(reminder: PatientReminder, today: string) {
  if (reminder.timing === 'today') return 'Hoje';
  if (reminder.timing === 'overdue') return formatWhenLabel(reminder.due_date, today);
  if (reminder.due_date === today) return 'Hoje';
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  if (reminder.due_date === tomorrowIso) return 'Amanhã';
  return formatWhenLabel(reminder.due_date, today);
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body?.error || 'Não foi possível salvar o lembrete.';
  } catch {
    return 'Não foi possível salvar o lembrete.';
  }
}

export const PatientReminders: React.FC<{
  patientId: number;
  contextText: string;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}> = ({ patientId, contextText, apiFetch }) => {
  const [reminders, setReminders] = useState<PatientReminder[]>([]);
  const [today, setToday] = useState(clinicToday());
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [snoozeId, setSnoozeId] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<RepeatOffer | null>(null);

  const preview = useMemo(() => (text.trim() ? parseReminder(text, today) : null), [text, today]);
  const suggestions = useMemo(() => suggestReminders(contextText), [contextText]);

  const load = async () => {
    const response = await apiFetch(`/api/patients/${patientId}/reminders`);
    if (!response.ok) return;
    const data = await response.json();
    setToday(data.today || clinicToday());
    setReminders(Array.isArray(data.reminders) ? data.reminders : []);
  };

  useEffect(() => {
    void load();
  }, [patientId]);

  const createFrom = async (phrase: string) => {
    const cleaned = phrase.trim();
    if (!cleaned || saving) return;
    const parsed = parseReminder(cleaned, today);
    if (parsed.ok === false) {
      setError(parsed.reason);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await apiFetch(`/api/patients/${patientId}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleaned }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setText('');
      setRepeat(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: number, body: Record<string, unknown>) => {
    const response = await apiFetch(`/api/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = await response.json();
    setSnoozeId(null);
    if (data.repeat_offer) {
      setRepeat({ reminderId: id, text: data.repeat_offer.text, label: data.repeat_offer.label });
    }
    await load();
  };

  return (
    <section className="rounded-[28px] border border-slate-200/60 bg-white p-5 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">Lembrar</h3>
        <p className="text-[13px] text-[#86868b]">No dia, aparece no início</p>
      </div>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void createFrom(text);
        }}
      >
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
          placeholder="Daqui a 6 meses, ver como está a prótese"
          className="w-full bg-[#f5f5f7] rounded-[16px] px-4 py-3.5 text-[16px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.16)]"
        />
        {preview?.ok && (
          <p className="mt-3 px-1 text-[15px] text-[#1d1d1f]">
            <span className="text-[#0071e3]">{formatWhenLabel(preview.dueDate, today)}</span>
            <span className="text-[#86868b]"> · {preview.note}</span>
          </p>
        )}
        {error && <p className="mt-3 px-1 text-[13px] text-[#ff3b30]">{error}</p>}
        {preview?.ok && (
          <button
            type="submit"
            disabled={saving}
            className="mt-3 px-4 py-2 rounded-full bg-[#0071e3] text-white text-[14px] disabled:opacity-50"
          >
            {saving ? 'Salvando' : 'Lembrar'}
          </button>
        )}
      </form>

      {!text.trim() && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map(suggestion => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => void createFrom(suggestion.text)}
              className="px-3 py-1.5 rounded-full bg-[#f5f5f7] text-[13px] text-[#1d1d1f] hover:bg-[#e8e8ed]"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}

      {repeat && (
        <button
          type="button"
          onClick={() => void createFrom(repeat.text)}
          className="mt-4 text-[14px] text-[#0071e3]"
        >
          {repeat.label}
        </button>
      )}

      {reminders.length > 0 && (
        <ul className="mt-5 divide-y divide-[#f5f5f7]">
          {reminders.map(reminder => (
            <li key={reminder.id} className="py-3 flex items-start gap-3">
              <button
                type="button"
                aria-label="Marcar como feito"
                onClick={() => void act(reminder.id, { action: 'done' })}
                className="mt-0.5 h-[22px] w-[22px] rounded-full border border-[#d2d2d7] shrink-0 hover:border-[#0071e3]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] text-[#1d1d1f] leading-snug">{reminder.note}</p>
                <p className={`text-[13px] mt-0.5 ${compareIso(reminder.due_date, today) < 0 ? 'text-[#ff3b30]' : 'text-[#86868b]'}`}>
                  {timingLabel(reminder, today)}
                </p>
                {snoozeId === reminder.id && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {snoozeChoices.map(choice => (
                      <button
                        key={choice.days}
                        type="button"
                        onClick={() => void act(reminder.id, { action: 'snooze', days: choice.days })}
                        className="px-3 py-1 rounded-full bg-[#f5f5f7] text-[12px] text-[#1d1d1f]"
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSnoozeId(current => current === reminder.id ? null : reminder.id)}
                className="text-[13px] text-[#86868b]"
              >
                Adiar
              </button>
              <button
                type="button"
                aria-label="Apagar lembrete"
                onClick={async () => {
                  const response = await apiFetch(`/api/reminders/${reminder.id}`, { method: 'DELETE' });
                  if (response.ok) await load();
                }}
                className="text-[#86868b] hover:text-[#1d1d1f]"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const ReminderInbox: React.FC<{
  product: string;
  openPatientRecord: (id: number) => void;
  refreshKey?: number;
}> = ({ product, openPatientRecord, refreshKey = 0 }) => {
  const [reminders, setReminders] = useState<PatientReminder[]>([]);
  const [today, setToday] = useState(clinicToday());
  const [repeat, setRepeat] = useState<RepeatOffer | null>(null);

  const load = async () => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { Accept: 'application/json', 'x-product': product };
    if (token && token !== 'null') {
      headers.Authorization = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    const response = await fetch(`${API_URL}/api/reminders?within=14`, {
      headers,
      credentials: API_URL ? 'include' : 'same-origin',
    });
    if (!response.ok) return;
    const data = await response.json();
    setToday(data.today || clinicToday());
    setReminders(Array.isArray(data.reminders) ? data.reminders : []);
  };

  useEffect(() => {
    void load();
  }, [product, refreshKey]);

  if (reminders.length === 0 && !repeat) return null;

  const act = async (reminder: PatientReminder, body: Record<string, unknown>) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-product': product,
    };
    if (token && token !== 'null') {
      headers.Authorization = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    const response = await fetch(`${API_URL}/api/reminders/${reminder.id}`, {
      method: 'PATCH',
      headers,
      credentials: API_URL ? 'include' : 'same-origin',
      body: JSON.stringify(body),
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data.repeat_offer) {
      setRepeat({
        reminderId: reminder.patient_id,
        text: data.repeat_offer.text,
        label: data.repeat_offer.label,
      });
    }
    await load();
  };

  const acceptRepeat = async () => {
    if (!repeat) return;
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-product': product,
    };
    if (token && token !== 'null') {
      headers.Authorization = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    await fetch(`${API_URL}/api/patients/${repeat.reminderId}/reminders`, {
      method: 'POST',
      headers,
      credentials: API_URL ? 'include' : 'same-origin',
      body: JSON.stringify({ text: repeat.text }),
    });
    setRepeat(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">Lembretes</h3>
        <span className="text-[13px] text-[#86868b]">{reminders.length}</span>
      </div>
      <div className="rounded-[20px] overflow-hidden bg-white">
        {reminders.map(reminder => (
          <div key={reminder.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#f5f5f7] last:border-b-0">
            <button
              type="button"
              aria-label="Marcar como feito"
              onClick={() => void act(reminder, { action: 'done' })}
              className="h-[22px] w-[22px] rounded-full border border-[#d2d2d7] shrink-0 hover:border-[#0071e3]"
            />
            <button
              type="button"
              onClick={() => openPatientRecord(reminder.patient_id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-[15px] font-semibold text-[#1d1d1f] truncate">{reminder.patient_name}</p>
              <p className="text-[13px] text-[#86868b] truncate">
                <span className={compareIso(reminder.due_date, today) < 0 ? 'text-[#ff3b30]' : ''}>
                  {timingLabel(reminder, today)}
                </span>
                {' · '}
                {reminder.note}
              </p>
            </button>
          </div>
        ))}
      </div>
      {repeat && (
        <button type="button" onClick={() => void acceptRepeat()} className="px-1 text-[14px] text-[#0071e3]">
          {repeat.label}
        </button>
      )}
    </section>
  );
};
