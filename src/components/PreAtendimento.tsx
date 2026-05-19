import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Heart,
  Pill,
  Stethoscope,
  Upload,
  Phone,
  Shield,
  Pen
} from '../icons';

interface ClinicInfo {
  dentist_name: string;
  clinic_name: string;
  clinic_address: string;
  dentist_photo: string;
}

interface PatientInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date: string;
}

export function PreAtendimento() {
  const { token } = useParams<{ token: string }>();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [form, setForm] = useState({
    medical_history: '',
    allergies: '',
    medications: '',
    chief_complaint: '',
    habits: '',
    family_history: '',
    cpf: '',
    birth_date: '',
    personal_documents: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    health_insurance: '',
    health_insurance_number: ''
  });

  // Consent
  const [consentsAccepted, setConsentsAccepted] = useState({
    TREATMENT_CONSENT: false,
    DATA_PRIVACY: false,
    GENERAL_TERMS: false
  });

  // Signature pad
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // File upload
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    authenticateToken();
  }, [token]);

  const authenticateToken = async () => {
    try {
      const res = await fetch(`${API_URL}/api/portal/auth/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Link inválido ou expirado');
        return;
      }
      setSessionToken(data.session_token);
      setPatient(data.patient);
      setClinic(data.clinic);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const portalFetch = async (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        ...options.headers
      }
    });
  };

  const handleSubmitForm = async () => {
    setSubmitting(true);
    try {
      // 1. Submit intake form
      const formRes = await portalFetch(`${API_URL}/api/portal/intake`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      if (!formRes.ok) throw new Error('Erro ao enviar ficha');

      // 2. Sign consents
      const signatureData = canvasRef.current?.toDataURL('image/png') || 'accepted-digitally';

      for (const [type, accepted] of Object.entries(consentsAccepted)) {
        if (accepted) {
          await portalFetch(`${API_URL}/api/portal/consent`, {
            method: 'POST',
            body: JSON.stringify({ consent_type: type, signature_data: signatureData })
          });
        }
      }

      // 3. Upload files
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', `Documento: ${file.name}`);
        formData.append('file_type', file.type.includes('image') ? 'image' : 'document');

        await fetch(`${API_URL}/api/portal/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionToken}` },
          body: formData
        });
        setUploadProgress(prev => ({ ...prev, [file.name]: true }));
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar dados');
    } finally {
      setSubmitting(false);
    }
  };

  // Signature canvas
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const pos = 'touches' in e
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: e.clientX - rect.left, y: e.clientY - rect.top };

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const pos = 'touches' in e
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: e.clientX - rect.left, y: e.clientY - rect.top };

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const steps = [
    { title: 'Dados de Saúde', icon: Heart, desc: 'Histórico médico e condições' },
    { title: 'Queixa & Hábitos', icon: Stethoscope, desc: 'Motivo da consulta' },
    { title: 'Informações Pessoais', icon: Phone, desc: 'Dados do paciente e contato' },
    { title: 'Documentos', icon: Upload, desc: 'Envie exames e documentos' },
    { title: 'Termos & Assinatura', icon: Shield, desc: 'Consentimentos legais' }
  ];

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Carregando...</p>
      </div>
    </div>
  );

  if (error && !sessionToken) return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Link Inválido</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
      >
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Tudo Pronto!</h2>
        <p className="text-slate-500 mb-2">Sua ficha de pré-atendimento foi enviada com sucesso.</p>
        <p className="text-slate-400 text-sm">
          {clinic?.clinic_name || 'A clínica'} já recebeu seus dados. Seu atendimento será muito mais rápido!
        </p>
        <div className="mt-6 p-4 bg-emerald-50 rounded-xl">
          <p className="text-emerald-700 text-sm font-medium">💡 Zero papel, zero espera</p>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          {clinic?.dentist_photo ? (
            <img src={clinic.dentist_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Stethoscope size={20} className="text-emerald-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800 text-sm truncate">{clinic?.clinic_name || clinic?.dentist_name}</h1>
            <p className="text-xs text-slate-400">Pré-atendimento digital</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">{patient?.name}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-1 mb-2">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-1">
              <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-emerald-500' : 'bg-slate-200'
              }`} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step < steps.length ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500 text-white'
          }`}>
            {React.createElement(steps[Math.min(step, steps.length - 1)].icon, { size: 16 })}
          </div>
          <div>
            <h2 className="font-bold text-slate-800">
              {step < steps.length ? steps[step].title : 'Revisão'}
            </h2>
            <p className="text-xs text-slate-400">
              Passo {step + 1} de {steps.length}
            </p>
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className="max-w-2xl mx-auto px-4 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-4">
                <FormField
                  label="Histórico Médico"
                  placeholder="Descreva doenças, cirurgias, internações anteriores..."
                  value={form.medical_history}
                  onChange={(v) => setForm({ ...form, medical_history: v })}
                  multiline
                />
                <FormField
                  label="Alergias"
                  placeholder="Liste alergias a medicamentos, materiais, alimentos..."
                  value={form.allergies}
                  onChange={(v) => setForm({ ...form, allergies: v })}
                  multiline
                />
                <FormField
                  label="Medicamentos em Uso"
                  placeholder="Medicamentos que toma atualmente..."
                  value={form.medications}
                  onChange={(v) => setForm({ ...form, medications: v })}
                  multiline
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <FormField
                  label="Queixa Principal"
                  placeholder="Qual o motivo da consulta?"
                  value={form.chief_complaint}
                  onChange={(v) => setForm({ ...form, chief_complaint: v })}
                  multiline
                />
                <FormField
                  label="Hábitos"
                  placeholder="Tabagismo, bruxismo, ranger dentes, morder objetos..."
                  value={form.habits}
                  onChange={(v) => setForm({ ...form, habits: v })}
                  multiline
                />
                <FormField
                  label="Histórico Familiar"
                  placeholder="Doenças na família: diabetes, hipertensão, cardiopatias..."
                  value={form.family_history}
                  onChange={(v) => setForm({ ...form, family_history: v })}
                  multiline
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados do Paciente</p>
                    <p className="text-sm text-slate-500 mt-1">Complete as informações pessoais do paciente.</p>
                  </div>
                  <FormField
                    label="CPF"
                    placeholder="000.000.000-00"
                    type="text"
                    inputMode="numeric"
                    value={form.cpf}
                    onChange={(v) => setForm({ ...form, cpf: v })}
                  />
                  <FormField
                    label="Data de Nascimento"
                    placeholder="Informe sua data de nascimento"
                    type="date"
                    value={form.birth_date}
                    onChange={(v) => setForm({ ...form, birth_date: v })}
                  />
                  <FormField
                    label="Documentos Pessoais"
                    placeholder="RG, Cartão SUS, etc."
                    value={form.personal_documents}
                    onChange={(v) => setForm({ ...form, personal_documents: v })}
                  />
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contato de Emergência</p>
                    <p className="text-sm text-slate-500 mt-1">Pessoa a ser contatada em caso de urgência.</p>
                  </div>
                  <FormField
                    label="Nome do Contato"
                    placeholder="Nome completo"
                    value={form.emergency_contact_name}
                    onChange={(v) => setForm({ ...form, emergency_contact_name: v })}
                  />
                  <FormField
                    label="Telefone de Emergência"
                    placeholder="(11) 99999-9999"
                    type="tel"
                    inputMode="tel"
                    value={form.emergency_contact_phone}
                    onChange={(v) => setForm({ ...form, emergency_contact_phone: v })}
                  />
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Convênio</p>
                    <p className="text-sm text-slate-500 mt-1">Informações do plano de saúde, se houver.</p>
                  </div>
                  <FormField
                    label="Convênio / Plano de Saúde"
                    placeholder="Nome do convênio (ou 'Particular')"
                    value={form.health_insurance}
                    onChange={(v) => setForm({ ...form, health_insurance: v })}
                  />
                  <FormField
                    label="Número da Carteirinha"
                    placeholder="Número do plano/carteirinha"
                    value={form.health_insurance_number}
                    onChange={(v) => setForm({ ...form, health_insurance_number: v })}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 mb-4">
                  Envie exames, radiografias ou outros documentos relevantes para a consulta.
                </p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                  <Upload size={32} className="text-slate-400 mb-2" />
                  <span className="text-sm text-slate-500 font-medium">Clique para selecionar arquivos</span>
                  <span className="text-xs text-slate-400 mt-1">PDF, imagens, até 50MB cada</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />
                </label>

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-200">
                        <FileText size={18} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                        {uploadProgress[file.name] && (
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        )}
                        <button
                          type="button"
                          onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                {/* Consent checkboxes */}
                <ConsentCheckbox
                  checked={consentsAccepted.TREATMENT_CONSENT}
                  onChange={(v) => setConsentsAccepted({ ...consentsAccepted, TREATMENT_CONSENT: v })}
                  title="Consentimento de Tratamento"
                  description="Autorizo a realização de procedimentos odontológicos conforme indicação profissional, após explicação dos riscos e benefícios."
                />
                <ConsentCheckbox
                  checked={consentsAccepted.DATA_PRIVACY}
                  onChange={(v) => setConsentsAccepted({ ...consentsAccepted, DATA_PRIVACY: v })}
                  title="Política de Privacidade (LGPD)"
                  description="Concordo com o uso dos meus dados pessoais e de saúde para fins de atendimento, registro clínico e comunicação pela clínica."
                />
                <ConsentCheckbox
                  checked={consentsAccepted.GENERAL_TERMS}
                  onChange={(v) => setConsentsAccepted({ ...consentsAccepted, GENERAL_TERMS: v })}
                  title="Termos Gerais de Uso"
                  description="Li e aceito os termos gerais de uso do sistema de prontuário eletrônico e portal do paciente."
                />

                {/* Signature pad */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pen size={16} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">Assinatura Digital</span>
                    </div>
                    {hasSignature && (
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      className="w-full touch-none cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Desenhe sua assinatura acima com o dedo ou mouse
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-4 z-50">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={16} /> Voltar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                handleSubmitForm();
              }
            }}
            disabled={submitting || (step === 4 && !Object.values(consentsAccepted).some(Boolean))}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              submitting
                ? 'bg-slate-100 text-slate-400 cursor-wait'
                : step === steps.length - 1
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : step === steps.length - 1 ? (
              <>Enviar Ficha <CheckCircle2 size={16} /></>
            ) : (
              <>Próximo <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ───

function FormField({ label, placeholder, value, onChange, multiline = false, type = 'text', inputMode }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  inputMode?: string;
}) {
  const baseClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClass} h-[48px]`}
        />
      )}
    </div>
  );
}

function ConsentCheckbox({ checked, onChange, title, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className={`flex gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
      checked ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'
    }`}>
      <div className="pt-0.5">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
          checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
        }`}>
          {checked && <CheckCircle2 size={14} className="text-white" />}
        </div>
      </div>
      <div className="flex-1">
        <span className="text-sm font-semibold text-slate-800 block">{title}</span>
        <span className="text-xs text-slate-500 leading-relaxed">{description}</span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="hidden"
      />
    </label>
  );
}
