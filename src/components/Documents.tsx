import React, { useState } from 'react';
import { 
  FileText, 
  User, 
  Calendar as CalendarIcon, 
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
  Info
} from 'lucide-react';

import { Odontogram } from './Odontogram';

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

export function Documents({ patients, profile, apiFetch, imprimirDocumento }: DocumentsProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [fullPatientData, setFullPatientData] = useState<Patient | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPreview, setIsPreview] = useState(false);

  // Specific fields
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

  const docTypes = [
    { id: 'receituario', label: 'Receituário', icon: Stethoscope, description: 'Prescrição de medicamentos' },
    { id: 'declaracao', label: 'Declaração', icon: FileCheck, description: 'Declaração de comparecimento' },
    { id: 'atestado', label: 'Atestado', icon: ClipboardList, description: 'Atestado de afastamento' },
    { id: 'encaminhamento', label: 'Encaminhamento', icon: Send, description: 'Encaminhamento para especialista' },
    { id: 'ficha', label: 'Ficha Clínica', icon: User, description: 'Resumo clínico do paciente' },
    { id: 'orcamento', label: 'Orçamento', icon: Calculator, description: 'Orçamento de tratamento' },
  ];

  if (isPreview) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center no-print">
          <button 
            onClick={() => setIsPreview(false)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold"
          >
            <ChevronLeft size={20} />
            Voltar para Edição
          </button>
          <div className="flex gap-3">
            <button 
              onClick={saveAndPrint}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              <Printer size={18} />
              Imprimir / PDF
            </button>
          </div>
        </div>
        
        <div className="no-print bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-3 text-amber-800 text-xs">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            <strong>Dica:</strong> Se a janela de impressão não abrir, clique no ícone de "Abrir em nova aba" no canto superior direito do aplicativo e tente novamente. Alguns navegadores bloqueiam a impressão dentro de quadros (iframes).
          </p>
        </div>

        {/* Paper Layout */}
        <div className="bg-white shadow-2xl mx-auto max-w-[21cm] min-h-[29.7cm] p-[2cm] font-serif text-slate-900 print:shadow-none print:p-0">
          {/* Header */}
          <div className="text-center border-b-2 border-emerald-600 pb-6 mb-10">
            <h1 className="text-3xl font-bold text-emerald-800 uppercase tracking-widest">
              {profile?.clinic_name || 'Clínica Odontológica'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {profile?.clinic_address || 'Endereço não informado'}
            </p>
            <p className="text-sm text-slate-500">
              Tel: {profile?.phone || 'Telefone não informado'}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 min-h-[15cm]">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold uppercase underline decoration-emerald-600 underline-offset-8">
                {docTypes.find(d => d.id === selectedDoc)?.label}
              </h2>
            </div>

            <div className="space-y-6 text-lg leading-relaxed">
              <p><strong>Paciente:</strong> {selectedPatient?.name}</p>
              <p><strong>Data:</strong> {new Date(docDate).toLocaleDateString('pt-BR')}</p>

              {selectedDoc === 'receituario' && (
                <div className="mt-10 space-y-8">
                  <p className="font-bold text-xl mb-4 text-emerald-800">Uso Interno:</p>
                  {prescription.items.map((item, i) => (
                    <div key={i} className="border-l-4 border-emerald-600 pl-4 mb-6">
                      <p className="font-bold text-lg">{item.medication}</p>
                      <p className="text-slate-700 italic">{item.dosage}</p>
                    </div>
                  ))}
                  {prescription.instructions && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <p className="font-bold mb-2">Instruções:</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{prescription.instructions}</p>
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
                  <p><strong>Ao Especialista:</strong> {referral.specialist}</p>
                  <p className="text-justify">
                    Encaminho o(a) paciente <strong>{selectedPatient?.name}</strong> para avaliação e conduta especializada.
                  </p>
                  <p><strong>Motivo/Histórico:</strong> {referral.reason}</p>
                </div>
              )}

              {selectedDoc === 'ficha' && (
                <div className="mt-10 space-y-8">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><strong>CPF:</strong> {selectedPatient?.cpf}</p>
                    <p><strong>Data de Nasc.:</strong> {selectedPatient?.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    <p><strong>E-mail:</strong> {selectedPatient?.email}</p>
                    <p><strong>Telefone:</strong> {selectedPatient?.phone}</p>
                    <p className="col-span-2"><strong>Endereço:</strong> {selectedPatient?.address || 'Não informado'}</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-bold border-b-2 border-emerald-600 pb-1 text-emerald-800 uppercase tracking-wider">Histórico Clínico (Anamnese)</h4>
                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div>
                          <p className="font-bold text-slate-500 text-[10px] uppercase">Histórico Médico:</p>
                          <p>{selectedPatient?.anamnesis?.medical_history || 'Nenhum histórico registrado.'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 text-[10px] uppercase">Alergias:</p>
                          <p className="text-rose-600 font-bold">{selectedPatient?.anamnesis?.allergies || 'Nenhuma alergia informada.'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 text-[10px] uppercase">Medicações em Uso:</p>
                          <p>{selectedPatient?.anamnesis?.medications || 'Nenhuma medicação informada.'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold border-b-2 border-emerald-600 pb-1 text-emerald-800 uppercase tracking-wider">Odontograma Atual</h4>
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
                      <h4 className="font-bold border-b-2 border-emerald-600 pb-1 text-emerald-800 uppercase tracking-wider">Histórico de Atendimentos (Evolução)</h4>
                      {selectedPatient?.evolution && selectedPatient.evolution.length > 0 ? (
                        <div className="space-y-4">
                          {selectedPatient.evolution.map((evo, i) => (
                            <div key={i} className="border-b border-slate-100 pb-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-emerald-700">{new Date(evo.date).toLocaleDateString('pt-BR')}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase">{evo.procedure_performed}</span>
                              </div>
                              <p className="text-sm text-slate-600 italic">{evo.notes}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">Nenhum atendimento registrado até o momento.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedDoc === 'orcamento' && (
                <div className="mt-10 space-y-6">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-emerald-50 text-emerald-800">
                        <th className="border border-emerald-100 p-3 text-left">Procedimento</th>
                        <th className="border border-emerald-100 p-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budget.items.map((item, i) => (
                        <tr key={i}>
                          <td className="border border-slate-100 p-3">{item.procedure}</td>
                          <td className="border border-slate-100 p-3 text-right">
                            {Number(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-slate-50">
                        <td className="border border-slate-100 p-3 text-right">Total</td>
                        <td className="border border-slate-100 p-3 text-right text-emerald-700">
                          {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer / Signature */}
          <div className="mt-20 flex flex-col items-center">
            <div className="w-64 border-t border-slate-400 mb-2"></div>
            <p className="font-bold text-lg">{profile?.name}</p>
            <p className="text-slate-600">Cirurgião-Dentista • CRO: {profile?.cro}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {!selectedDoc ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {docTypes.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id as DocType)}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left group"
            >
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <doc.icon size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{doc.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{doc.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <button 
              onClick={() => setSelectedDoc(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
            >
              <ChevronLeft size={20} />
              Voltar
            </button>
            <h3 className="font-bold text-lg text-slate-800">
              Gerar {docTypes.find(d => d.id === selectedDoc)?.label}
            </h3>
            <div className="w-20"></div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Common Fields */}
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informações Básicas</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Selecionar Paciente</label>
                    <div className="relative">
                      <select 
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none"
                      >
                        <option value="">Selecione um paciente...</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {isLoadingPatient && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Data do Documento</label>
                    <input 
                      type="date" 
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Specific Fields */}
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conteúdo do Documento</h4>
                
                {selectedDoc === 'receituario' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {prescription.items.map((item, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group">
                          {prescription.items.length > 1 && (
                            <button 
                              onClick={() => removePrescriptionItem(i)}
                              className="absolute top-2 right-2 p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Medicamento {i + 1}</label>
                            <input 
                              type="text" 
                              value={item.medication}
                              onChange={(e) => updatePrescriptionItem(i, 'medication', e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
                              placeholder="Ex: Amoxicilina 500mg"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Dosagem / Posologia</label>
                            <input 
                              type="text" 
                              value={item.dosage}
                              onChange={(e) => updatePrescriptionItem(i, 'dosage', e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
                              placeholder="Ex: Tomar 1 comprimido a cada 8 horas"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={addPrescriptionItem}
                      className="flex items-center gap-2 text-emerald-600 text-xs font-bold hover:underline"
                    >
                      <Plus size={14} />
                      Adicionar Medicamento
                    </button>

                    <div className="pt-4 border-t border-slate-100">
                      <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Instruções Adicionais</label>
                      <textarea 
                        rows={3}
                        value={prescription.instructions}
                        onChange={(e) => setPrescription({...prescription, instructions: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none text-sm"
                        placeholder="Orientações sobre alimentação, repouso, etc."
                      />
                    </div>
                  </div>
                )}

                {selectedDoc === 'atestado' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-2 block">Período de Afastamento</label>
                      <input 
                        type="text" 
                        value={certificate.period}
                        onChange={(e) => setCertificate({...certificate, period: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        placeholder="Ex: 03 (três) dias"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-2 block">Motivo (Opcional)</label>
                      <textarea 
                        rows={3}
                        value={certificate.reason}
                        onChange={(e) => setCertificate({...certificate, reason: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                        placeholder="Ex: Extração de siso"
                      />
                    </div>
                  </div>
                )}

                {selectedDoc === 'encaminhamento' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-2 block">Especialista / Área</label>
                      <input 
                        type="text" 
                        value={referral.specialist}
                        onChange={(e) => setReferral({...referral, specialist: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        placeholder="Ex: Dr. João (Endodontista)"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-2 block">Motivo do Encaminhamento</label>
                      <textarea 
                        rows={4}
                        value={referral.reason}
                        onChange={(e) => setReferral({...referral, reason: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                        placeholder="Descreva o caso clínico..."
                      />
                    </div>
                  </div>
                )}

                {selectedDoc === 'orcamento' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {budget.items.map((item, i) => (
                        <div key={i} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Procedimento</label>
                            <input 
                              type="text" 
                              value={item.procedure}
                              onChange={(e) => updateBudgetItem(i, 'procedure', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                            />
                          </div>
                          <div className="w-32">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Valor (R$)</label>
                            <input 
                              type="number" 
                              value={item.value}
                              onChange={(e) => updateBudgetItem(i, 'value', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                            />
                          </div>
                          <button 
                            onClick={() => removeBudgetItem(i)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={addBudgetItem}
                      className="flex items-center gap-2 text-emerald-600 text-xs font-bold hover:underline"
                    >
                      <Plus size={14} />
                      Adicionar Item
                    </button>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="font-bold text-slate-800">Total:</span>
                      <span className="text-lg font-black text-emerald-600">
                        {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                )}

                {(selectedDoc === 'declaracao' || selectedDoc === 'ficha') && (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <p className="text-sm text-slate-500">
                      Este documento será gerado automaticamente com os dados do paciente selecionado.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-end">
              <button
                disabled={!selectedPatientId}
                onClick={() => setIsPreview(true)}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all ${
                  selectedPatientId 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <FileText size={20} />
                Visualizar Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
