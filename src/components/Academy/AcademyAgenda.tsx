import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatAppointmentTime, parseAppointmentDateTime } from '../../utils/dateUtils';

interface AcademyAgendaProps {
  appointments?: any[];
  onSelectAppointment?: (appointment: any) => void;
}

type ViewMode = 'day' | 'week' | 'month';

const ACTIVE_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const parseDate = (value?: string) => {
  if (!value) return null;
  return parseAppointmentDateTime(value);
};

const formatTime = (value?: string) => {
  return formatAppointmentTime(value);
};

const getStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    SCHEDULED: 'Agendado',
    CONFIRMED: 'Confirmado',
    IN_PROGRESS: 'Em atendimento',
    FINISHED: 'Concluído',
    CANCELLED: 'Cancelado',
    NO_SHOW: 'Faltou'
  };
  return labels[String(status || '').toUpperCase()] || 'Agendado';
};

const getConduct = (appointment: any) => {
  return appointment?.procedure || appointment?.notes || appointment?.reason || appointment?.type || 'Avaliação';
};

const getWeekDates = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const item = new Date(start);
    item.setDate(start.getDate() + index);
    return item;
  });
};

const getMonthDates = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return Array.from({ length: lastDay.getDate() }, (_, index) => (
    new Date(date.getFullYear(), date.getMonth(), index + 1)
  ));
};

const getPeriodTitle = (date: Date, viewMode: ViewMode) => {
  if (viewMode === 'day') {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  if (viewMode === 'month') {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  const week = getWeekDates(date);
  const start = week[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const end = week[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${start} - ${end}`;
};

export const AcademyAgenda: React.FC<AcademyAgendaProps> = ({
  appointments = [],
  onSelectAppointment
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const now = new Date();

  const visibleDates = useMemo(() => {
    if (viewMode === 'day') return [selectedDate];
    if (viewMode === 'month') return getMonthDates(selectedDate);
    return getWeekDates(selectedDate);
  }, [selectedDate, viewMode]);

  const visibleAppointments = useMemo(() => {
    return appointments
      .filter(app => ACTIVE_STATUSES.has(String(app.status || 'SCHEDULED').toUpperCase()))
      .filter(app => {
        const start = parseDate(app.start_time || app.date);
        return start ? visibleDates.some(date => sameDay(start, date)) : false;
      })
      .sort((a, b) => {
        const aDate = parseDate(a.start_time || a.date)?.getTime() || 0;
        const bDate = parseDate(b.start_time || b.date)?.getTime() || 0;
        return aDate - bDate;
      });
  }, [appointments, visibleDates]);

  const appointmentsByDay = useMemo(() => {
    return visibleDates.map(date => ({
      date,
      items: visibleAppointments.filter(app => {
        const start = parseDate(app.start_time || app.date);
        return start ? sameDay(start, date) : false;
      })
    }));
  }, [visibleAppointments, visibleDates]);

  const getAppointmentRole = (appointment: any) => {
    const patientWeekAppointments = visibleAppointments
      .filter(app => app.patient_id === appointment.patient_id || app.patient_name === appointment.patient_name)
      .sort((a, b) => {
        const aDate = parseDate(a.start_time || a.date)?.getTime() || 0;
        const bDate = parseDate(b.start_time || b.date)?.getTime() || 0;
        return aDate - bDate;
      });
    const appointmentIndex = patientWeekAppointments.findIndex(app => app.id === appointment.id);
    const appDate = parseDate(appointment.start_time || appointment.date);
    const hasPreviousCare = appointments.some(other => {
      const otherDate = parseDate(other.start_time || other.date);
      return (other.patient_id === appointment.patient_id || other.patient_name === appointment.patient_name) &&
        other.id !== appointment.id &&
        otherDate &&
        appDate &&
        otherDate < appDate &&
        !['CANCELLED', 'NO_SHOW'].includes(String(other.status || '').toUpperCase());
    });

    if (appointmentIndex > 0) return hasPreviousCare ? 'Retorno' : 'Continuação';
    return hasPreviousCare ? 'Retorno' : 'Primeira consulta';
  };

  const agendaSmartCopy = useMemo(() => {
    const weekDates = getWeekDates(selectedDate);
    const start = weekDates[0];
    const end = new Date(weekDates[6]);
    end.setHours(23, 59, 59, 999);

    const weekAppointments = appointments
      .filter(app => ACTIVE_STATUSES.has(String(app.status || 'SCHEDULED').toUpperCase()))
      .filter(app => {
        const appDate = parseDate(app.start_time || app.date);
        return appDate ? appDate >= start && appDate <= end : false;
      })
      .sort((a, b) => {
        const aDate = parseDate(a.start_time || a.date)?.getTime() || 0;
        const bDate = parseDate(b.start_time || b.date)?.getTime() || 0;
        return aDate - bDate;
      });

    if (weekAppointments.length === 0) return 'Semana tranquila por enquanto.';

    const getAppointmentRole = (appointment: any) => {
      const patientWeekAppointments = weekAppointments
        .filter(app => app.patient_id === appointment.patient_id || app.patient_name === appointment.patient_name)
        .sort((a, b) => {
          const aDate = parseDate(a.start_time || a.date)?.getTime() || 0;
          const bDate = parseDate(b.start_time || b.date)?.getTime() || 0;
          return aDate - bDate;
        });
      const appointmentIndex = patientWeekAppointments.findIndex(app => app.id === appointment.id);
      const appDate = parseDate(appointment.start_time || appointment.date);
      const hasPreviousCare = appointments.some(other => {
        const otherDate = parseDate(other.start_time || other.date);
        return (other.patient_id === appointment.patient_id || other.patient_name === appointment.patient_name) &&
          other.id !== appointment.id &&
          otherDate &&
          appDate &&
          otherDate < appDate &&
          !['CANCELLED', 'NO_SHOW'].includes(String(other.status || '').toUpperCase());
      });

      if (appointmentIndex > 0) return hasPreviousCare ? 'Retorno' : 'Continuação';
      return hasPreviousCare ? 'Retorno' : 'Primeira consulta';
    };

    const repeatedPatient = (Array.from(
      weekAppointments.reduce((map, app) => {
        const key = app.patient_id || app.patient_name || app.patient?.name;
        const current = map.get(key) || [];
        current.push(app);
        map.set(key, current);
        return map;
      }, new Map<any, any[]>()).values()
    ) as any[][])
      .filter(items => items.length > 1)
      .sort((a, b) => b.length - a.length)[0];

    if (repeatedPatient) {
      const ordered = [...repeatedPatient].sort((a, b) => {
        const aDate = parseDate(a.start_time || a.date)?.getTime() || 0;
        const bDate = parseDate(b.start_time || b.date)?.getTime() || 0;
        return aDate - bDate;
      });
      const firstAppointment = ordered[0];
      const patientName = firstAppointment.patient_name || firstAppointment.patient?.name || 'Paciente';
      const firstName = patientName.split(' ')[0];
      const days = ordered
        .map(app => parseDate(app.start_time || app.date)?.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', ''))
        .filter(Boolean)
        .filter((day, index, list) => list.indexOf(day) === index)
        .join(' e ');
      const time = formatTime(firstAppointment.start_time || firstAppointment.date);
      const firstAction = getAppointmentRole(firstAppointment) === 'Primeira consulta'
        ? 'Anamnese primeiro.'
        : 'Revise a evolução.';
      return `${firstName}: ${ordered.length} atendimentos. ${days}, ${time}. ${firstAction}`;
    }

    const hasPreviousCare = (appointment: any) => {
      const appDate = parseDate(appointment.start_time || appointment.date);
      if (!appDate) return false;
      return appointments.some(other => {
        const otherDate = parseDate(other.start_time || other.date);
        return other.patient_id === appointment.patient_id &&
          other.id !== appointment.id &&
          otherDate &&
          otherDate < appDate &&
          !['CANCELLED', 'NO_SHOW'].includes(String(other.status || '').toUpperCase());
      });
    };

    const firstConsultation = weekAppointments.find(app => !hasPreviousCare(app));
    if (firstConsultation) {
      const patientName = firstConsultation.patient_name || firstConsultation.patient?.name || 'Paciente';
      return `${patientName.split(' ')[0]} faz primeira consulta. Anamnese antes do box.`;
    }
    if (weekAppointments.some(app => hasPreviousCare(app))) return 'Retorno marcado. Revise a última evolução.';
    if (weekAppointments.some(app => {
      const appDate = parseDate(app.start_time || app.date);
      return appDate ? sameDay(appDate, now) : false;
    })) return 'Hoje tem clínica.';

    const nextAppointment = weekAppointments.find(app => {
      const appDate = parseDate(app.start_time || app.date);
      return appDate ? appDate >= now : false;
    }) || weekAppointments[0];
    const nextDate = parseDate(nextAppointment.start_time || nextAppointment.date);
    const day = nextDate?.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '') || 'em breve';
    return `Seu próximo atendimento é ${day} com ${nextAppointment.patient_name || nextAppointment.patient?.name || 'paciente'}.`;
  }, [appointments, now, selectedDate]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const nextDate = new Date(selectedDate);
    const amount = direction === 'next' ? 1 : -1;

    if (viewMode === 'day') nextDate.setDate(nextDate.getDate() + amount);
    if (viewMode === 'week') nextDate.setDate(nextDate.getDate() + amount * 7);
    if (viewMode === 'month') nextDate.setMonth(nextDate.getMonth() + amount);

    setSelectedDate(nextDate);
  };

  const isEmpty = visibleAppointments.length === 0;

  return (
    <div className="flex-1 bg-academy-bg overflow-y-auto pb-20">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 bg-academy-bg/85 backdrop-blur-xl px-4 py-4"
        >
          <div className="mb-5">
            <h1 className="ios-title text-2xl mb-1">{viewMode === 'week' ? 'Semana clínica' : 'Agenda'}</h1>
            <p className="ios-text-secondary">{agendaSmartCopy}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[18px] bg-white p-1 border border-academy-border/70 mb-4">
            {[
              { id: 'day', label: 'Dia' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mês' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`py-2.5 rounded-[14px] font-semibold text-sm transition-all ${
                  viewMode === mode.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-academy-muted hover:text-academy-text'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-white rounded-full transition-all">
              <ChevronLeft size={20} className="text-academy-text" />
            </button>

            <div className="text-center">
              <p className="text-[15px] font-bold text-academy-text capitalize">
                {getPeriodTitle(selectedDate, viewMode)}
              </p>
              <p className="text-xs text-academy-muted">
                {viewMode === 'week' ? 'Semana clínica' : viewMode === 'day' ? 'Dia de clínica' : 'Mês'}
              </p>
            </div>

            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-white rounded-full transition-all">
              <ChevronRight size={20} className="text-academy-text" />
            </button>
          </div>
        </motion.div>

        <div className="px-4 py-5">
          {isEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[28px] bg-white border border-academy-border/70 px-6 py-10 text-center shadow-[0_2px_14px_rgba(0,0,0,0.03)]"
            >
              <div className="w-12 h-12 rounded-[18px] bg-academy-study flex items-center justify-center mx-auto mb-4">
                <Calendar size={22} className="text-academy-primary" />
              </div>
              <h2 className="text-[18px] font-bold text-academy-text">Nenhum atendimento nesta semana.</h2>
              <p className="text-[14px] text-academy-muted mt-2">Quando você marcar um paciente, ele aparece aqui.</p>
            </motion.div>
          ) : (
            <div className="space-y-5">
              {appointmentsByDay.map(({ date, items }) => (
                <section key={date.toISOString()} className="space-y-3">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className="text-[15px] font-bold text-academy-text capitalize">
                      {date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                    </h2>
                    <span className="text-[12px] font-semibold text-academy-muted">
                      {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div className="rounded-[20px] bg-white/70 border border-academy-border/60 px-5 py-4 text-[13px] font-medium text-academy-muted">
                      Sem atendimento marcado.
                    </div>
                  ) : (
                    <div className="rounded-[24px] bg-white border border-academy-border/70 overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.03)]">
                      {items.map((appointment, index) => (
                        <motion.button
                          key={appointment.id || `${appointment.patient_name}-${appointment.start_time}-${index}`}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => onSelectAppointment?.(appointment)}
                          className={`w-full text-left px-5 py-4 flex gap-4 transition-colors hover:bg-academy-soft/60 ${
                            index !== items.length - 1 ? 'border-b border-academy-border/60' : ''
                          }`}
                        >
                          <div className="w-14 shrink-0">
                            <div className="flex items-center gap-1.5 text-primary font-bold text-[14px]">
                              <Clock size={13} />
                              {formatTime(appointment.start_time || appointment.date)}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-[15px] font-bold text-academy-text truncate">
                                {appointment.patient_name || appointment.patient?.name || 'Paciente'}
                              </p>
                              <span className="shrink-0 rounded-full bg-academy-success px-2.5 py-1 text-[11px] font-bold text-academy-success-text">
                                {getStatusLabel(appointment.status)}
                              </span>
                            </div>
                            <p className="text-[13px] text-academy-muted mt-1 truncate">
                              {getAppointmentRole(appointment)} · {getConduct(appointment)}
                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
