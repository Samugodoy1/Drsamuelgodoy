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

function dateOnly(value: unknown): string {
  const match = String(value ?? '').match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || '';
}

function timingLabel(reminder: PatientReminder, today: string) {
  const due = dateOnly(reminder.due_date);
  if (!due) return 'Em breve';
  if (due === today || reminder.timing === 'today') return 'Hoje';
  const label = formatWhenLabel(due, today);
  return label.charAt(0).toUpperCase() + label.slice(1);
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
    <section className="rounded-[22px] bg-white px-5 py-5 sm:px-6">
      <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">Lembretes</h3>
      <p className="mt-0.5 text-[13px] text-[#86868b]">No dia, aparece no início.</p>

      <form
        className="mt-5"
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
          className="w-full bg-transparent text-[17px] tracking-[-0.02em] text-[#1d1d1f] placeholder:text-[#aeaeb2] outline-none"
        />
        {preview?.ok && (
          <p className="mt-2 text-[13px] text-[#86868b]">
            {formatWhenLabel(preview.dueDate, today)} · {preview.note}
          </p>
        )}
        {error && <p className="mt-2 text-[13px] text-[#ff3b30]">{error}</p>}
        {preview?.ok && (
          <button
            type="submit"
            disabled={saving}
            className="mt-3 text-[15px] text-[#0071e3] disabled:opacity-40"
          >
            {saving ? 'Salvando' : 'Adicionar'}
          </button>
        )}
      </form>

      {!text.trim() && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {suggestions.map(suggestion => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => void createFrom(suggestion.text)}
              className="text-[14px] text-[#0071e3]"
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
          className="mt-4 block text-[15px] text-[#0071e3]"
        >
          {repeat.label}
        </button>
      )}

      {reminders.length > 0 && (
        <ul className="mt-5 border-t border-[#f2f2f7]">
          {reminders.map(reminder => {
            const due = dateOnly(reminder.due_date);
            const late = Boolean(due) && compareIso(due, today) < 0;
            return (
              <li key={reminder.id} className="flex items-start gap-3 py-3.5 border-b border-[#f2f2f7] last:border-b-0">
                <button
                  type="button"
                  aria-label="Marcar como feito"
                  onClick={() => void act(reminder.id, { action: 'done' })}
                  className="mt-0.5 h-5 w-5 rounded-full border border-[#c7c7cc] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] tracking-[-0.02em] text-[#1d1d1f] leading-snug">{reminder.note}</p>
                  <p className={`text-[13px] mt-0.5 ${late ? 'text-[#ff3b30]' : 'text-[#86868b]'}`}>
                    {timingLabel(reminder, today)}
                  </p>
                  {snoozeId === reminder.id && (
                    <div className="mt-2 flex flex-wrap gap-x-4">
                      {snoozeChoices.map(choice => (
                        <button
                          key={choice.days}
                          type="button"
                          onClick={() => void act(reminder.id, { action: 'snooze', days: choice.days })}
                          className="text-[13px] text-[#0071e3]"
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
                  className="mt-0.5 text-[#c7c7cc] hover:text-[#86868b]"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
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
    <section className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">Lembretes</h3>
        <span className="text-[13px] text-[#86868b]">{reminders.length}</span>
      </div>
      <div className="rounded-[22px] bg-white">
        {reminders.map(reminder => {
          const due = dateOnly(reminder.due_date);
          const late = Boolean(due) && compareIso(due, today) < 0;
          return (
            <div key={reminder.id} className="flex items-center gap-3.5 px-5 py-3.5 border-b border-[#f2f2f7] last:border-b-0">
              <button
                type="button"
                aria-label="Marcar como feito"
                onClick={() => void act(reminder, { action: 'done' })}
                className="h-5 w-5 rounded-full border border-[#c7c7cc] shrink-0"
              />
              <button
                type="button"
                onClick={() => openPatientRecord(reminder.patient_id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-[17px] tracking-[-0.02em] text-[#1d1d1f] truncate">{reminder.patient_name}</p>
                <p className="text-[13px] text-[#86868b] truncate">
                  <span className={late ? 'text-[#ff3b30]' : ''}>{timingLabel(reminder, today)}</span>
                  {' · '}
                  {reminder.note}
                </p>
              </button>
            </div>
          );
        })}
      </div>
      {repeat && (
        <button type="button" onClick={() => void acceptRepeat()} className="px-1 text-[15px] text-[#0071e3]">
          {repeat.label}
        </button>
      )}
    </section>
  );
};
