import React, { useState } from 'react';
import { API_URL } from '../config';
import {
  FileText,
  User,
  Printer,
  Download,
  ChevronLeft,
  Plus,
  Trash2,
  Stethoscope,
  FileCheck,
  ClipboardList,
  Send,
  Calculator,
  Info,
} from '../icons';

import { Odontogram } from './Odontogram';
import { formatAllergieLabel, formatMedicationLabel, hasRecordedAllergie } from '../utils/anamnesisUtils';

interface Patient {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birth_date?: string;
  address?: string;
  anamnesis?: {
    medical_history: string;
    allergies: string;
    medications: string;
  };
  evolution?: Array<{
    id: number;
    date: string;
    notes: string;
    procedure_performed: string;
  }>;
  odontogram?: Record<number, { status: any; notes: string }>;
  toothHistory?: Array<{
    id: number;
    tooth_number: number;
    procedure: string;
    notes: string;
    date: string;
    dentist_name?: string;
  }>;
}

interface Dentist {
  name: string;
  cro?: string;
  phone?: string;
  clinic_name?: string;
  clinic_address?: string;
}

interface DocumentsProps {
  patients: Patient[];
  profile: Dentist | null;
  apiFetch: (url: string, options?: any) => Promise<Response>;
  imprimirDocumento: (tipo: string, id: string | number | null) => void;
}

type DocType = 'receituario' | 'declaracao' | 'atestado' | 'encaminhamento' | 'ficha' | 'orcamento';

const fieldLabel = 'block text-[13px] text-[#86868b] mb-2 tracking-[-0.011em]';
const fieldInput = 'ios-input w-full text-[17px]';

export function Documents({ patients, profile, apiFetch, imprimirDocumento }: DocumentsProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [fullPatientData, setFullPatientData] = useState<Patient | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPreview, setIsPreview] = useState(false);

  const [prescription, setPrescription] = useState({
    items: [{ medication: '', dosage: '' }],
    instructions: ''
  });
  const [certificate, setCertificate] = useState({ period: '', reason: '' });
  const [referral, setReferral] = useState({ specialist: '', reason: '' });
  const [budget, setBudget] = useState<{ items: { procedure: string; value: number }[] }>({ items: [{ procedure: '', value: 0 }] });

  const selectedPatient = fullPatientData || patients.find(p => p.id.toString() === selectedPatientId);

  React.useEffect(() => {
    const fetchFullPatient = async () => {
      if (!selectedPatientId) {
        setFullPatientData(null);
        return;
      }

      setIsLoadingPatient(true);
      try {
        const res = await apiFetch(`/api/patients/${selectedPatientId}`);
        if (res.ok) {
          const data = await res.json();
          setFullPatientData(data);
        }
      } catch (error) {
        console.error('Error fetching full patient data:', error);
      } finally {
        setIsLoadingPatient(false);
      }
    };

    fetchFullPatient();
  }, [selectedPatientId, apiFetch]);

  const saveAndPrint = async () => {
    if (!selectedPatientId || !selectedDoc) return;

    let content = {};
    if (selectedDoc === 'receituario') content = prescription;
    else if (selectedDoc === 'atestado') content = certificate;
    else if (selectedDoc === 'encaminhamento') content = referral;
    else if (selectedDoc === 'orcamento') content = budget;

    try {
      const res = await apiFetch('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: parseInt(selectedPatientId),
          type: selectedDoc,
          content: content
        })
      });

      if (res.ok) {
        const data = await res.json();
        imprimirDocumento(selectedDoc, data.id);
      } else {
        alert('Erro ao salvar documento para impressão.');
      }
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Erro ao salvar documento para impressão.');
    }
  };

  const saveAndDownloadPDF = async () => {
    if (!selectedPatientId || !selectedDoc) return;

    let content = {};
    if (selectedDoc === 'receituario') content = prescription;
    else if (selectedDoc === 'atestado') content = certificate;
    else if (selectedDoc === 'encaminhamento') content = referral;
    else if (selectedDoc === 'orcamento') content = budget;

    try {
      const res = await apiFetch('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: parseInt(selectedPatientId),
          type: selectedDoc,
          content: content
        })
      });

      if (res.ok) {
        const data = await res.json();
        const token = localStorage.getItem('token');
        window.location.href = `${API_URL}/api/documents/${data.id}/pdf?token=${token}`;
      } else {
        alert('Erro ao salvar documento para gerar PDF.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF.');
    }
  };

  const addPrescriptionItem = () => {
    setPrescription({ ...prescription, items: [...prescription.items, { medication: '', dosage: '' }] });
  };

  const removePrescriptionItem = (index: number) => {
    const newItems = prescription.items.filter((_, i) => i !== index);
    setPrescription({ ...prescription, items: newItems });
  };

  const updatePrescriptionItem = (index: number, field: 'medication' | 'dosage', value: string) => {
    const newItems = [...prescription.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setPrescription({ ...prescription, items: newItems });
  };

  const addBudgetItem = () => {
    setBudget({ ...budget, items: [...budget.items, { procedure: '', value: 0 }] });
  };

  const removeBudgetItem = (index: number) => {
    const newItems = budget.items.filter((_, i) => i !== index);
    setBudget({ ...budget, items: newItems });
  };

  const updateBudgetItem = (index: number, field: 'procedure' | 'value', value: string | number) => {
    const newItems = [...budget.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setBudget({ ...budget, items: newItems });
  };

  const totalBudget = budget.items.reduce((acc, item) => acc + Number(item.value), 0);

  const docTypes: { id: DocType; label: string; hint: string; icon: typeof Stethoscope; featured?: boolean }[] = [
    { id: 'receituario', label: 'Receituário', hint: 'Prescrição com a sua assinatura', icon: Stethoscope, featured: true },
    { id: 'atestado', label: 'Atestado', hint: 'Afastamento', icon: ClipboardList },
    { id: 'declaracao', label: 'Declaração', hint: 'Comparecimento', icon: FileCheck },
    { id: 'encaminhamento', label: 'Encaminhamento', hint: 'Especialista', icon: Send },
    { id: 'ficha', label: 'Ficha clínica', hint: 'Resumo do prontuário', icon: User },
    { id: 'orcamento', label: 'Orçamento', hint: 'Plano de tratamento', icon: Calculator },
  ];

  const clinicName = profile?.clinic_name || 'Sua clínica';
  const selectedMeta = docTypes.find(d => d.id === selectedDoc);

  if (isPreview) {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex flex-wrap justify-between items-center gap-3 no-print">
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className="apple-link flex items-center gap-1"
          >
            <ChevronLeft size={18} />
            Editar
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveAndDownloadPDF}
              className="apple-btn-light gap-2"
            >
              <Download size={16} />
              PDF
            </button>
            <button
              type="button"
              onClick={saveAndPrint}
              className="apple-btn gap-2"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>

        <div className="no-print bg-[#f5f5f7] p-4 rounded-[18px] flex items-start gap-3 text-[#6e6e73] text-[13px]">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>Se a impressão não abrir, use o PDF. Alguns navegadores bloqueiam impressão em quadro.</p>
        </div>

        <div className="bg-white mx-auto max-w-[21cm] min-h-[29.7cm] p-[2cm] font-serif text-[#1d1d1f] print:shadow-none print:p-0">
          <div className="text-center border-b border-[#d2d2d7] pb-6 mb-10">
            <h1 className="text-3xl font-semibold tracking-[-0.025em] text-[#1d1d1f]">
              {profile?.clinic_name || 'Clínica Odontológica'}
            </h1>
            <p className="text-sm text-[#6e6e73] mt-1">
              {profile?.clinic_address || 'Endereço não informado'}
            </p>
            <p className="text-sm text-[#6e6e73]">
              Tel: {profile?.phone || 'Telefone não informado'}
            </p>
          </div>

          <div className="space-y-8 min-h-[15cm]">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-semibold tracking-[-0.025em] inline-block pb-1 border-b border-[#1d1d1f]">
                {selectedMeta?.label}
              </h2>
            </div>

            <div className="space-y-6 text-lg leading-relaxed">
              <p><strong>Paciente:</strong> {selectedPatient?.name}</p>
              <p><strong>Data:</strong> {new Date(docDate).toLocaleDateString('pt-BR')}</p>

              {selectedDoc === 'receituario' && (
                <div className="mt-10 space-y-8">
                  <p className="font-semibold text-xl mb-4 text-[#1d1d1f]">Uso interno</p>
                  {prescription.items.map((item, i) => (
                    <div key={i} className="border-l-2 border-[#1d1d1f] pl-4 mb-6">
                      <p className="font-semibold text-lg">{item.medication}</p>
                      <p className="text-[#6e6e73] italic">{item.dosage}</p>
                    </div>
                  ))}
                  {prescription.instructions && (
                    <div className="mt-8 pt-6 border-t border-[#d2d2d7]">
                      <p className="font-semibold mb-2">Instruções</p>
                      <p className="text-[#6e6e73] whitespace-pre-wrap">{prescription.instructions}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedDoc === 'declaracao' && (
                <div className="mt-10">
                  <p className="text-justify">
                    Declaro para os devidos fins que o(a) paciente <strong>{selectedPatient?.name}</strong> compareceu a esta clínica odontológica na data de <strong>{new Date(docDate).toLocaleDateString('pt-BR')}</strong> para atendimento odontológico.
                  </p>
                </div>
              )}

              {selectedDoc === 'atestado' && (
                <div className="mt-10 space-y-6">
                  <p className="text-justify">
                    Atesto, para os devidos fins, que o(a) Sr(a). <strong>{selectedPatient?.name}</strong> necessita de <strong>{certificate.period}</strong> de afastamento de suas atividades, a partir desta data, por motivo de tratamento odontológico.
                  </p>
                  {certificate.reason && (
                    <p><strong>Observação:</strong> {certificate.reason}</p>
                  )}
                </div>
              )}

              {selectedDoc === 'encaminhamento' && (
                <div className="mt-10 space-y-6">
                  <p><strong>Ao especialista:</strong> {referral.specialist}</p>
                  <p className="text-justify">
                    Encaminho o(a) paciente <strong>{selectedPatient?.name}</strong> para avaliação e conduta especializada.
                  </p>
                  <p><strong>Motivo:</strong> {referral.reason}</p>
                </div>
              )}

              {selectedDoc === 'ficha' && (
                <div className="mt-10 space-y-8">
                  <div className="grid grid-cols-2 gap-4 text-sm font-sans">
                    <p><strong>CPF:</strong> {selectedPatient?.cpf}</p>
                    <p><strong>Nascimento:</strong> {selectedPatient?.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    <p><strong>E-mail:</strong> {selectedPatient?.email}</p>
                    <p><strong>Telefone:</strong> {selectedPatient?.phone}</p>
                    <p className="col-span-2"><strong>Endereço:</strong> {selectedPatient?.address || 'Não informado'}</p>
                  </div>

                  <div className="space-y-6 font-sans">
                    <div className="space-y-4">
                      <h4 className="font-semibold border-b border-[#1d1d1f] pb-1 text-[#1d1d1f]">Histórico clínico</h4>
                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div>
                          <p className="text-[#86868b] text-[13px] mb-1">Histórico médico</p>
                          <p>{selectedPatient?.anamnesis?.medical_history || 'Nenhum histórico registrado.'}</p>
                        </div>
                        <div>
                          <p className="text-[#86868b] text-[13px] mb-1">Alergias</p>
                          <p className={hasRecordedAllergie(selectedPatient?.anamnesis?.allergies) ? 'text-[#ff3b30] font-semibold' : ''}>
                            {formatAllergieLabel(selectedPatient?.anamnesis?.allergies)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#86868b] text-[13px] mb-1">Medicações em uso</p>
                          <p>{formatMedicationLabel(selectedPatient?.anamnesis?.medications)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold border-b border-[#1d1d1f] pb-1 text-[#1d1d1f]">Odontograma</h4>
                      <div className="scale-90 origin-top">
                        <Odontogram
                          data={selectedPatient?.odontogram || {}}
                          history={selectedPatient?.toothHistory || []}
                          onChange={() => {}}
                          readOnly={true}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold border-b border-[#1d1d1f] pb-1 text-[#1d1d1f]">Atendimentos</h4>
                      {selectedPatient?.evolution && selectedPatient.evolution.length > 0 ? (
                    <div className="space-y-4">
                      {selectedPatient.evolution.map((evo, i) => (
                        <div key={`${evo.id}-${i}`} className="border-b border-[#d2d2d7] pb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-[#1d1d1f]">{new Date(evo.date).toLocaleDateString('pt-BR')}</span>
                            <span className="text-xs text-[#6e6e73]">{evo.procedure_performed}</span>
                          </div>
                          <p className="text-sm text-[#6e6e73] italic">{evo.notes}</p>
                        </div>
                      ))}
                    </div>
                      ) : (
                        <p className="text-sm text-[#86868b]">Nenhum atendimento registrado.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedDoc === 'orcamento' && (
                <div className="mt-10 space-y-6 font-sans">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#f5f5f7] text-[#1d1d1f]">
                        <th className="border border-[#d2d2d7] p-3 text-left font-semibold">Procedimento</th>
                        <th className="border border-[#d2d2d7] p-3 text-right font-semibold">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budget.items.map((item, i) => (
                        <tr key={i}>
                          <td className="border border-[#d2d2d7] p-3">{item.procedure}</td>
                          <td className="border border-[#d2d2d7] p-3 text-right">
                            {Number(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold bg-[#f5f5f7]">
                        <td className="border border-[#d2d2d7] p-3 text-right">Total</td>
                        <td className="border border-[#d2d2d7] p-3 text-right text-[#1d1d1f]">
                          {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-20 flex flex-col items-center">
            <div className="w-64 border-t border-[#d2d2d7] mb-2"></div>
            <p className="font-semibold text-lg">{profile?.name}</p>
            <p className="text-[#6e6e73]">Cirurgião-Dentista · CRO {profile?.cro}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto font-sans pb-8">
      {!selectedDoc ? (
        <div className="space-y-8">
          <header className="px-1 pt-2">
            <p className="text-[13px] text-[#86868b] tracking-[-0.011em]">{clinicName}</p>
            <h1 className="apple-display-ink text-[34px] sm:text-[40px] mt-1">Papéis da clínica.</h1>
            <p className="text-[17px] text-[#86868b] mt-2 tracking-[-0.011em]">Receita, atestado e o que o paciente leva embora.</p>
          </header>

          <div className="grid grid-cols-2 gap-3">
            {docTypes.map((doc) => {
              const Icon = doc.icon;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoc(doc.id)}
                  className={`bg-white text-left transition-transform active:scale-[0.98] ${
                    doc.featured
                      ? 'col-span-2 rounded-[28px] p-7 min-h-[168px] flex flex-col justify-between'
                      : 'rounded-[24px] p-5 min-h-[132px] flex flex-col justify-between'
                  }`}
                >
                  <div className={`flex items-center justify-center bg-[#f5f5f7] text-[#1d1d1f] ${
                    doc.featured ? 'w-12 h-12 rounded-[16px]' : 'w-10 h-10 rounded-[14px]'
                  }`}>
                    <Icon size={doc.featured ? 24 : 20} />
                  </div>
                  <div className={doc.featured ? 'mt-8' : 'mt-5'}>
                    <h2 className={`font-semibold tracking-[-0.025em] text-[#1d1d1f] ${doc.featured ? 'text-[28px]' : 'text-[17px]'}`}>
                      {doc.label}
                    </h2>
                    <p className="text-[13px] text-[#86868b] mt-1">{doc.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setSelectedDoc(null)}
              className="apple-link flex items-center gap-1"
            >
              <ChevronLeft size={18} />
              Papéis
            </button>
          </div>

          <header className="px-1">
            <h1 className="apple-display-ink text-[34px]">{selectedMeta?.label}.</h1>
            <p className="text-[17px] text-[#86868b] mt-1">{selectedMeta?.hint}</p>
          </header>

          <div className="bg-white rounded-[28px] p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={fieldLabel}>Paciente</label>
                <div className="relative">
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className={`${fieldInput} appearance-none`}
                  >
                    <option value="">Escolher paciente</option>
                    {patients.map((p, idx) => (
                      <option key={`${p.id}-${idx}`} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {isLoadingPatient && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={fieldLabel}>Data</label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className={fieldInput}
                />
              </div>
            </div>

            {selectedDoc === 'receituario' && (
              <div className="space-y-5">
                {prescription.items.map((item, i) => (
                  <div key={i} className="p-5 bg-[#f5f5f7] rounded-[20px] space-y-4 relative">
                    {prescription.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePrescriptionItem(i)}
                        className="absolute top-3 right-3 p-1.5 text-[#ff3b30]"
                        aria-label="Remover medicamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div>
                      <label className={fieldLabel}>Medicamento {i + 1}</label>
                      <input
                        type="text"
                        value={item.medication}
                        onChange={(e) => updatePrescriptionItem(i, 'medication', e.target.value)}
                        className="ios-input w-full bg-white text-[17px]"
                        placeholder="Amoxicilina 500 mg"
                      />
                    </div>
                    <div>
                      <label className={fieldLabel}>Posologia</label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => updatePrescriptionItem(i, 'dosage', e.target.value)}
                        className="ios-input w-full bg-white text-[17px]"
                        placeholder="1 comprimido a cada 8 horas"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addPrescriptionItem}
                  className="apple-link flex items-center gap-1 text-[15px]"
                >
                  <Plus size={16} />
                  Outro medicamento
                </button>

                <div>
                  <label className={fieldLabel}>Instruções</label>
                  <textarea
                    rows={3}
                    value={prescription.instructions || ''}
                    onChange={(e) => setPrescription({...prescription, instructions: e.target.value})}
                    className={`${fieldInput} resize-none`}
                    placeholder="Alimentação, repouso, demais orientações"
                  />
                </div>
              </div>
            )}

            {selectedDoc === 'atestado' && (
              <div className="space-y-5">
                <div>
                  <label className={fieldLabel}>Período de afastamento</label>
                  <input
                    type="text"
                    value={certificate.period}
                    onChange={(e) => setCertificate({...certificate, period: e.target.value})}
                    className={fieldInput}
                    placeholder="3 (três) dias"
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Motivo</label>
                  <textarea
                    rows={4}
                    value={certificate.reason || ''}
                    onChange={(e) => setCertificate({...certificate, reason: e.target.value})}
                    className={`${fieldInput} resize-none`}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            )}

            {selectedDoc === 'encaminhamento' && (
              <div className="space-y-5">
                <div>
                  <label className={fieldLabel}>Especialista</label>
                  <input
                    type="text"
                    value={referral.specialist}
                    onChange={(e) => setReferral({...referral, specialist: e.target.value})}
                    className={fieldInput}
                    placeholder="Endodontia"
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Motivo</label>
                  <textarea
                    rows={5}
                    value={referral.reason || ''}
                    onChange={(e) => setReferral({...referral, reason: e.target.value})}
                    className={`${fieldInput} resize-none`}
                    placeholder="Resumo do caso"
                  />
                </div>
              </div>
            )}

            {selectedDoc === 'orcamento' && (
              <div className="space-y-4">
                {budget.items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-end bg-[#f5f5f7] p-4 rounded-[20px]">
                    <div className="flex-1">
                      <label className={fieldLabel}>Procedimento</label>
                      <input
                        type="text"
                        value={item.procedure}
                        onChange={(e) => updateBudgetItem(i, 'procedure', e.target.value)}
                        className="ios-input w-full bg-white text-[17px]"
                      />
                    </div>
                    <div className="w-28">
                      <label className={fieldLabel}>Valor</label>
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => updateBudgetItem(i, 'value', e.target.value)}
                        className="ios-input w-full bg-white text-[17px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBudgetItem(i)}
                      className="p-2.5 text-[#ff3b30]"
                      aria-label="Remover item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addBudgetItem}
                  className="apple-link flex items-center gap-1 text-[15px]"
                >
                  <Plus size={16} />
                  Outro item
                </button>
                <div className="pt-4 flex justify-between items-baseline">
                  <span className="text-[15px] text-[#86868b]">Total</span>
                  <span className="text-[28px] font-semibold tracking-[-0.025em] text-[#1d1d1f]">
                    {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            )}

            {(selectedDoc === 'declaracao' || selectedDoc === 'ficha') && (
              <p className="text-[15px] text-[#86868b] leading-relaxed">
                Montamos com os dados do paciente escolhido.
              </p>
            )}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={!selectedPatientId}
                onClick={() => setIsPreview(true)}
                className={`apple-btn gap-2 ${!selectedPatientId ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <FileText size={18} />
                Visualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
