import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  Heart,
  Pill,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
  Syringe,
  Target,
  Tooth,
  UserCircle
} from '../icons';
import { getAppointmentTime, parseAppointmentDateTime } from '../utils/dateUtils';

interface AcademyEstudosProps {
  patients?: any[];
  appointments?: any[];
  setActiveTab?: (tab: any) => void;
  openPatientRecord?: (id: number) => void;
}

type StudyKey =
  | 'exame-clinico'
  | 'radiologia'
  | 'anestesia'
  | 'isolamento'
  | 'periodontia'
  | 'preventiva'
  | 'dentistica'
  | 'endodontia'
  | 'cirurgia'
  | 'protese'
  | 'odontopediatria';

type StudyMaterial = {
  id: StudyKey;
  title: string;
  subtitle: string;
  topics: string;
  duration: string;
  level: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  objective: string;
  modules: Array<{
    title: string;
    description: string;
    steps: string[];
  }>;
  checklist: string[];
  pitfalls: string[];
  patientTalk: string;
};

const ACTIVE_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);

const STUDY_LIBRARY: Record<StudyKey, StudyMaterial> = {
  'exame-clinico': {
    id: 'exame-clinico',
    title: 'Exame clinico',
    subtitle: 'Anamnese, diagnostico e plano',
    topics: 'Queixa principal, anamnese, exame intraoral, hipotese diagnostica.',
    duration: '15 min',
    level: 'Base de toda clinica',
    icon: ClipboardList,
    color: 'bg-stone-100 text-stone-600',
    borderColor: 'border-stone-200',
    objective: 'Organizar o raciocinio clinico antes de qualquer procedimento: ouvir, examinar, registrar achados e transformar sinais em um plano justificavel.',
    modules: [
      {
        title: 'Anamnese dirigida',
        description: 'A historia do paciente orienta risco, urgencia e conduta.',
        steps: [
          'Registrar queixa principal com palavras do paciente, inicio, duracao, intensidade e fatores que aliviam ou pioram.',
          'Investigar doencas sistemicas, alergias, medicamentos, cirurgias, gestacao, ansiedade e experiencias odontologicas previas.',
          'Relacionar sintomas com habitos, dieta, higiene, bruxismo, trauma, sangramento gengival e historico de dor.'
        ]
      },
      {
        title: 'Exame fisico e odontologico',
        description: 'Separe achados objetivos de interpretacoes.',
        steps: [
          'Avaliar face, linfonodos, ATM, abertura bucal, mucosas, lingua, assoalho, palato e orofaringe.',
          'Examinar dentes por quadrante: carie, restauracoes, fraturas, mobilidade, recessao, sangramento e placa.',
          'Usar testes complementares quando fizer sentido: percussao, palpacao, vitalidade pulpar, sondagem periodontal e radiografia.'
        ]
      },
      {
        title: 'Diagnostico e prioridade',
        description: 'O aluno precisa justificar por que tratar agora e como tratar.',
        steps: [
          'Listar diagnostico provavel, diagnosticos diferenciais e dados que sustentam cada hipotese.',
          'Separar urgencias de tratamentos eletivos e estabilizar dor, infeccao ou risco funcional primeiro.',
          'Montar plano por fases: adequacao do meio, controle de doenca, tratamento restaurador/cirurgico/protetico e manutencao.'
        ]
      }
    ],
    checklist: [
      'Queixa principal registrada',
      'Historico medico e medicacoes conferidos',
      'Exame extraoral e intraoral completo',
      'Odontograma ou periodontograma atualizado',
      'Plano por prioridades explicado ao paciente'
    ],
    pitfalls: [
      'Comecar procedimento sem diagnostico claro transforma a consulta em tentativa.',
      'Ignorar medicamento de uso continuo pode mudar anestesia, sangramento ou prescricao.',
      'Confundir achado radiografico com diagnostico final sem correlacao clinica.'
    ],
    patientTalk: 'Explique que a primeira consulta serve para entender a causa do problema e montar uma ordem segura de tratamento, nao apenas olhar um dente isolado.'
  },
  radiologia: {
    id: 'radiologia',
    title: 'Radiologia odontologica',
    subtitle: 'Tecnica, indicacao e interpretacao',
    topics: 'Periapical, bite-wing, panoramica, protecao radiologica, laudo descritivo.',
    duration: '13 min',
    level: 'Diagnostico complementar',
    icon: Search,
    color: 'bg-stone-100 text-stone-600',
    borderColor: 'border-stone-200',
    objective: 'Escolher a tomada radiografica correta, executar com tecnica e interpretar sem pular etapas de anatomia, qualidade e achados patologicos.',
    modules: [
      {
        title: 'Indicacao da imagem',
        description: 'A radiografia deve responder uma pergunta clinica.',
        steps: [
          'Usar periapical para apice, endodontia, lesao periapical, trauma e avaliacao localizada.',
          'Usar bite-wing para carie proximal, excesso restaurador, adaptacao marginal e perda ossea posterior.',
          'Usar panoramica para visao geral, terceiros molares, lesoes extensas, alteracoes osseas e planejamento amplo.'
        ]
      },
      {
        title: 'Qualidade tecnica',
        description: 'Imagem ruim pode gerar diagnostico errado.',
        steps: [
          'Conferir posicionamento, abrangencia da area de interesse, nitidez, contraste e ausencia de corte apical.',
          'Reconhecer erros comuns: alongamento, encurtamento, meia-lua, sobreposicao proximal e movimento.',
          'Repetir tomada apenas quando a imagem nao responde a pergunta clinica, respeitando radioprotecao.'
        ]
      },
      {
        title: 'Leitura sistematica',
        description: 'Interprete em ordem para nao enxergar so o obvio.',
        steps: [
          'Identificar estruturas anatomicas normais antes de procurar alteracoes.',
          'Avaliar coroa, margem restauradora, camara pulpar, raiz, lamina dura, espaco periodontal e osso alveolar.',
          'Descrever achado por localizacao, tamanho, limites, densidade e relacao com dentes/estruturas.'
        ]
      }
    ],
    checklist: [
      'Pergunta clinica definida',
      'EPI e protecao radiologica usados',
      'Imagem com apice/margens visiveis',
      'Achados descritos antes da conclusao',
      'Radiografia anexada ao prontuario'
    ],
    pitfalls: [
      'Pedir panoramica para diagnosticar carie proximal pequena costuma ser insuficiente.',
      'Sobreposicao proximal invalida avaliacao de carie interproximal.',
      'Radiografia nao substitui teste clinico de vitalidade pulpar.'
    ],
    patientTalk: 'Explique que a imagem ajuda a ver areas que o exame visual nao mostra, usando a menor exposicao necessaria para responder a duvida clinica.'
  },
  anestesia: {
    id: 'anestesia',
    title: 'Anestesia local',
    subtitle: 'Tecnicas e seguranca',
    topics: 'Anamnese, escolha do sal, infiltrativa, bloqueios, acidentes e manejo.',
    duration: '17 min',
    level: 'Procedimento diario',
    icon: Pill,
    color: 'bg-academy-attention text-academy-attention-text',
    borderColor: 'border-academy-border',
    objective: 'Revisar fundamentos para anestesiar com previsibilidade: indicacao, anatomia, dose, aspiracao, latencia e conduta diante de falhas.',
    modules: [
      {
        title: 'Escolha e dose segura',
        description: 'Anestesia comeca na anamnese, nao na seringa.',
        steps: [
          'Conferir peso, idade, gestacao, alergias relatadas, cardiopatias, hipertensao, medicacoes e historico de reacao.',
          'Escolher anestesico e vasoconstritor conforme procedimento, duracao esperada, sangramento e condicao sistemica.',
          'Calcular dose maxima quando houver crianca, baixo peso, multiplos tubetes ou condicao de risco.'
        ]
      },
      {
        title: 'Tecnica e anatomia',
        description: 'A tecnica correta depende do nervo alvo e da area tratada.',
        steps: [
          'Usar infiltrativa em maxila e regioes com cortical favoravel; considerar bloqueio quando a area for ampla.',
          'No bloqueio alveolar inferior, localizar referencias: rafe pterigomandibular, plano oclusal e ramo mandibular.',
          'Aspirar, depositar lentamente, aguardar latencia e testar anestesia antes de iniciar.'
        ]
      },
      {
        title: 'Falha anestesica e intercorrencias',
        description: 'Falha deve ser investigada antes de repetir sem criterio.',
        steps: [
          'Reavaliar tecnica, anatomia, inflamacao local, tempo de latencia e ansiedade.',
          'Complementar com infiltrativa, intraligamentar ou intrapulpar quando indicado e supervisionado.',
          'Reconhecer sinais de lipotimia, toxicidade, parestesia, hematoma e reacao alergica verdadeira.'
        ]
      }
    ],
    checklist: [
      'Anamnese de risco revisada',
      'Dose estimada para o paciente',
      'Tecnica escolhida pelo procedimento',
      'Aspiracao e injecao lenta realizadas',
      'Sinais vitais/ansiedade observados'
    ],
    pitfalls: [
      'Repetir tubetes sem calcular dose aumenta risco desnecessario.',
      'Iniciar antes da latencia completa gera dor e perda de confianca.',
      'Confundir ansiedade com alergia pode levar a registros incorretos.'
    ],
    patientTalk: 'Explique que a anestesia sera aplicada devagar para dar conforto e seguranca, e que voce testara a regiao antes de comecar o procedimento.'
  },
  isolamento: {
    id: 'isolamento',
    title: 'Isolamento absoluto',
    subtitle: 'Campo operatorio e controle de umidade',
    topics: 'Grampos, lencol de borracha, amarrilhos, inversao, seguranca.',
    duration: '12 min',
    level: 'Habilidade essencial',
    icon: Shield,
    color: 'bg-emerald-50 text-emerald-600',
    borderColor: 'border-emerald-100',
    objective: 'Entender quando, por que e como isolar para proteger paciente, melhorar visibilidade e aumentar previsibilidade adesiva/endodontica.',
    modules: [
      {
        title: 'Indicacoes e beneficios',
        description: 'O isolamento nao e detalhe estetico; e controle biologico e tecnico.',
        steps: [
          'Indicar em endodontia, restauracoes adesivas, cimentacoes e procedimentos com risco de aspiracao/contaminacao.',
          'Relacionar isolamento com controle de saliva, lingua, bochecha, aerossol, visibilidade e tempo operatorio.',
          'Explicar ao paciente que o lencol melhora conforto e seguranca durante o atendimento.'
        ]
      },
      {
        title: 'Selecao do conjunto',
        description: 'Grampo e perfuracao devem respeitar dente, arco e acesso.',
        steps: [
          'Escolher grampo pela anatomia cervical, erupcao, retencao e distancia gengival.',
          'Planejar perfuracoes por dente, contato proximal e extensao do campo necessario.',
          'Testar estabilidade do grampo, usar fio dental de seguranca e proteger tecidos.'
        ]
      },
      {
        title: 'Instalacao e vedamento',
        description: 'O sucesso aparece na margem cervical.',
        steps: [
          'Passar contatos com fio dental sem rasgar o lencol.',
          'Inverter a borracha no sulco com instrumento rombo, ar e amarrilhos quando necessario.',
          'Controlar vazamentos com barreira gengival, teflon ou ajuste de grampo conforme indicacao.'
        ]
      }
    ],
    checklist: [
      'Grampo correto separado',
      'Fio de seguranca no grampo',
      'Perfuracoes planejadas',
      'Contatos passados sem rasgo',
      'Campo seco antes do procedimento'
    ],
    pitfalls: [
      'Grampo instavel e risco de acidente; deve ser corrigido antes de iniciar.',
      'Campo aparentemente isolado, mas com vazamento cervical, compromete adesao.',
      'Perfuracao mal posicionada dificulta inversao e retrai mal a borracha.'
    ],
    patientTalk: 'Explique que o isolamento cria uma area seca e protegida, evitando saliva no procedimento e diminuindo risco de engolir materiais.'
  },
  periodontia: {
    id: 'periodontia',
    title: 'Periodontia basica',
    subtitle: 'Raspagem, controle de biofilme e manutencao',
    topics: 'Gengivite, periodontite, sondagem, raspagem, instrucao de higiene.',
    duration: '18 min',
    level: 'Muito comum na clinica',
    icon: Activity,
    color: 'bg-green-50 text-green-700',
    borderColor: 'border-green-100',
    objective: 'Revisar diagnostico periodontal inicial e execucao de raspagem/profilaxia com foco em inflamacao, biofilme e manutencao.',
    modules: [
      {
        title: 'Diagnostico periodontal',
        description: 'Sangramento e perda de insercao mudam o plano.',
        steps: [
          'Avaliar placa, calculo, sangramento, profundidade de sondagem, recessao, mobilidade e furca.',
          'Diferenciar gengivite de periodontite observando perda de insercao, perda ossea e historico.',
          'Registrar sitios criticos e fatores locais: restauracao mal adaptada, apinhamento, respiracao bucal e tabagismo.'
        ]
      },
      {
        title: 'Raspagem e alisamento',
        description: 'Instrumentacao deve remover deposito sem traumatizar tecido.',
        steps: [
          'Selecionar curetas/ultrassom conforme area, acesso e quantidade de calculo.',
          'Estabelecer apoio digital, angulacao correta e movimentos controlados por quadrante.',
          'Irrigar, reavaliar lisura radicular e orientar sensibilidade pos-raspagem.'
        ]
      },
      {
        title: 'Controle e manutencao',
        description: 'Sem mudanca de habito, a inflamacao volta.',
        steps: [
          'Demonstrar escovacao, limpeza interdental e controle de areas de maior retencao.',
          'Definir retorno para reavaliar sangramento, placa e profundidade de sondagem.',
          'Encaminhar casos com bolsas profundas, mobilidade importante ou resposta ruim ao tratamento inicial.'
        ]
      }
    ],
    checklist: [
      'Sondagem registrada quando indicada',
      'Indice de placa/sangramento observado',
      'Instrumentais afiados e selecionados',
      'Orientacao de higiene individualizada',
      'Retorno de manutencao agendado'
    ],
    pitfalls: [
      'Fazer apenas polimento em paciente com calculo subgengival nao trata a causa.',
      'Nao registrar sondagem impede acompanhar evolucao.',
      'Prometer cura sem manutencao periodontal cria expectativa errada.'
    ],
    patientTalk: 'Explique que o sangramento gengival geralmente indica inflamacao por biofilme e que o tratamento combina limpeza profissional com higiene diaria bem orientada.'
  },
  preventiva: {
    id: 'preventiva',
    title: 'Preventiva e profilaxia',
    subtitle: 'Fluor, selante e controle de carie',
    topics: 'Risco de carie, dieta, profilaxia, fluor, selantes, educacao em saude.',
    duration: '14 min',
    level: 'Primeiros atendimentos',
    icon: Heart,
    color: 'bg-lime-50 text-lime-700',
    borderColor: 'border-lime-100',
    objective: 'Transformar a consulta preventiva em decisao clinica: avaliar risco, remover biofilme, aplicar medidas protetoras e orientar comportamento.',
    modules: [
      {
        title: 'Risco de carie',
        description: 'Prevencao muda conforme risco individual.',
        steps: [
          'Investigar frequencia de acucar, higiene, fluor, xerostomia, historico de carie e exposicao radicular.',
          'Classificar risco combinando lesoes ativas, placa visivel, dieta e fatores sociais/comportamentais.',
          'Priorizar controle de atividade de doenca antes de procedimentos esteticos.'
        ]
      },
      {
        title: 'Profilaxia e fluor',
        description: 'O procedimento deve ter indicacao, nao ser automatico.',
        steps: [
          'Remover biofilme e manchas extrinsecas com escova/taca, pasta profilatica ou jato quando indicado.',
          'Aplicar fluor conforme idade, risco e protocolo da clinica, evitando excesso desnecessario.',
          'Orientar nao comer/beber pelo periodo recomendado quando o produto exigir.'
        ]
      },
      {
        title: 'Selantes e educacao',
        description: 'Selante protege sulcos vulneraveis quando bem indicado.',
        steps: [
          'Indicar selante em fossulas e fissuras retentivas, especialmente em molares recem-erupcionados.',
          'Garantir isolamento relativo/absoluto, condicionamento e fotoativacao adequados.',
          'Ensinar higiene de forma pratica, escolhendo uma meta simples para o paciente cumprir.'
        ]
      }
    ],
    checklist: [
      'Risco de carie estimado',
      'Dieta e fluor de rotina perguntados',
      'Biofilme evidenciado ou visualizado',
      'Indicacao de fluor/selante definida',
      'Meta de higiene combinada'
    ],
    pitfalls: [
      'Profilaxia sem orientacao dura pouco como estrategia preventiva.',
      'Selante em campo contaminado falha precocemente.',
      'Tratar carie sem abordar frequencia de acucar mantem a doenca ativa.'
    ],
    patientTalk: 'Explique que prevenir nao e so limpar: e reduzir o risco de novas lesoes com habitos, fluor e protecao das areas mais vulneraveis.'
  },
  endodontia: {
    id: 'endodontia',
    title: 'Endodontia',
    subtitle: 'Tratamento de canal previsivel',
    topics: 'Acesso, isolamento absoluto, odontometria, instrumentacao.',
    duration: '18 min',
    level: 'Clinico essencial',
    icon: Activity,
    color: 'bg-academy-attention text-academy-attention-text',
    borderColor: 'border-academy-border',
    objective: 'Chegar ao atendimento com um roteiro claro para diagnostico, acesso, preparo quimico-mecanico e orientacoes finais.',
    modules: [
      {
        title: 'Diagnostico e plano',
        description: 'Confirme sinais clinicos antes de iniciar o procedimento.',
        steps: [
          'Revisar queixa principal, tempo de dor e fatores desencadeantes.',
          'Checar testes pulpares, percussao, palpacao e imagem radiografica.',
          'Definir se o caso pede urgencia, biopulpectomia, necropulpectomia ou encaminhamento.'
        ]
      },
      {
        title: 'Acesso e isolamento',
        description: 'Monte o campo antes de entrar no canal.',
        steps: [
          'Selecionar grampo, lencol de borracha, arco, sugador e irrigacao.',
          'Remover tecido cariado/restauracao fragil e localizar referencia anatomica.',
          'Executar acesso conservador, mas suficiente para instrumentacao sem degraus.'
        ]
      },
      {
        title: 'Odontometria e instrumentacao',
        description: 'Trabalhe com medida segura e irrigacao abundante.',
        steps: [
          'Estabelecer patencia e comprimento de trabalho com localizador e radiografia quando indicado.',
          'Instrumentar respeitando glide path, anatomia e limite apical.',
          'Irrigar entre instrumentos e manter aspiracao eficiente.'
        ]
      }
    ],
    checklist: [
      'Radiografia inicial disponivel',
      'Isolamento absoluto planejado',
      'Anestesico, irrigante e limas separados',
      'Comprimento de trabalho registrado',
      'Orientacoes pos-operatorias combinadas'
    ],
    pitfalls: [
      'Acesso pequeno demais pode criar desvio e fratura de instrumento.',
      'Instrumentar sem irrigacao suficiente reduz previsibilidade.',
      'Dor espontanea persistente pede reavaliacao do diagnostico.'
    ],
    patientTalk: 'Explique que o objetivo e remover a infeccao ou inflamacao interna do dente, aliviar a dor e preservar a estrutura dentaria.'
  },
  dentistica: {
    id: 'dentistica',
    title: 'Dentistica',
    subtitle: 'Restauracoes adesivas e acabamento',
    topics: 'Adesao, escolha de resina, matrizes, acabamento.',
    duration: '14 min',
    level: 'Pratico',
    icon: Tooth,
    color: 'bg-green-50 text-green-700',
    borderColor: 'border-green-100',
    objective: 'Preparar a sequencia para restauracoes diretas com isolamento, adesao controlada e anatomia funcional.',
    modules: [
      {
        title: 'Selecao de caso e cor',
        description: 'Defina o resultado antes do isolamento alterar a cor do dente.',
        steps: [
          'Registrar extensao da lesao, contato proximal e margem cervical.',
          'Selecionar cor com o dente hidratado e boa iluminacao.',
          'Escolher resina, matriz, cunha e sistema adesivo conforme o caso.'
        ]
      },
      {
        title: 'Controle de campo',
        description: 'A adesao depende mais de controle do que de pressa.',
        steps: [
          'Priorizar isolamento absoluto quando houver margem profunda ou campo umido.',
          'Condicionar, lavar e secar conforme o sistema adesivo escolhido.',
          'Aplicar adesivo com friccao ativa e fotopolimerizar no tempo correto.'
        ]
      },
      {
        title: 'Estratificacao e acabamento',
        description: 'Reproduza forma antes de polir.',
        steps: [
          'Inserir incrementos pequenos, respeitando anatomia e ponto de contato.',
          'Checar oclusao com papel articular antes do polimento final.',
          'Finalizar com discos, borrachas e tiras proximais quando necessario.'
        ]
      }
    ],
    checklist: [
      'Cor selecionada antes do isolamento',
      'Matriz/cunha/teste de contato prontos',
      'Campo seco e acesso visual adequado',
      'Tempo de fotoativacao conferido',
      'Oclusao e acabamento revisados'
    ],
    pitfalls: [
      'Contaminacao por saliva compromete a adesao.',
      'Excesso proximal dificulta higiene e causa inflamacao gengival.',
      'Nao conferir oclusao pode gerar dor ao mastigar.'
    ],
    patientTalk: 'Explique que a restauracao devolve forma e funcao ao dente e que acabamento e polimento ajudam conforto, higiene e durabilidade.'
  },
  cirurgia: {
    id: 'cirurgia',
    title: 'Cirurgia',
    subtitle: 'Exodontia e pos-operatorio seguro',
    topics: 'Anestesia, biosseguranca, extracao, pos-operatorio.',
    duration: '16 min',
    level: 'Seguranca clinica',
    icon: Syringe,
    color: 'bg-academy-attention text-academy-attention-text',
    borderColor: 'border-academy-border',
    objective: 'Organizar avaliacao, anestesia, tecnica cirurgica e orientacoes para reduzir intercorrencias.',
    modules: [
      {
        title: 'Avaliacao pre-operatoria',
        description: 'Identifique riscos antes de anestesiar.',
        steps: [
          'Conferir anamnese, alergias, medicamentos, pressao e condicoes sistemicas.',
          'Avaliar radiografia, anatomia radicular e proximidade com estruturas nobres.',
          'Definir necessidade de encaminhamento, profilaxia ou ajuste de conduta.'
        ]
      },
      {
        title: 'Anestesia e tecnica',
        description: 'Trabalhe com visibilidade, apoio e movimentos controlados.',
        steps: [
          'Selecionar tecnica anestesica e aguardar latencia adequada.',
          'Sindesmotomia, luxacao progressiva e apoio correto dos instrumentais.',
          'Evitar forca excessiva; quando necessario, seccionar ou ampliar acesso.'
        ]
      },
      {
        title: 'Hemostasia e alta',
        description: 'A consulta termina quando o paciente sabe o que fazer em casa.',
        steps: [
          'Inspecionar alveolo, remover espiculas e irrigar quando indicado.',
          'Comprimir gaze, conferir hemostasia e suturar se necessario.',
          'Entregar orientacoes claras sobre repouso, alimentacao, higiene e sinais de alerta.'
        ]
      }
    ],
    checklist: [
      'Anamnese e medicacoes revisadas',
      'Imagem radiografica avaliada',
      'Instrumental cirurgico separado',
      'Plano de hemostasia definido',
      'Orientacoes pos-operatorias entregues'
    ],
    pitfalls: [
      'Forca sem planejamento aumenta risco de fratura radicular.',
      'Nao revisar medicamentos pode elevar risco de sangramento.',
      'Orientacao vaga no pos-operatorio gera retorno evitavel.'
    ],
    patientTalk: 'Explique o passo a passo com linguagem simples, incluindo anestesia, remocao controlada e cuidados para cicatrizacao.'
  },
  protese: {
    id: 'protese',
    title: 'Protese e moldagem',
    subtitle: 'Moldagem, provisiorio e oclusao',
    topics: 'Moldagem, preparo, provisiorio, registro oclusal, cimentacao.',
    duration: '19 min',
    level: 'Clinica integrada',
    icon: FileText,
    color: 'bg-stone-100 text-stone-600',
    borderColor: 'border-stone-200',
    objective: 'Revisar etapas proteticas comuns na graduacao: planejamento, preparo conservador, moldagem/escaneamento, provisiorio e ajuste oclusal.',
    modules: [
      {
        title: 'Planejamento protetico',
        description: 'Antes de desgastar, confirme indicacao, estrutura remanescente e funcao.',
        steps: [
          'Avaliar vitalidade, periodonto, espaco protetico, linha do sorriso, habitos parafuncionais e expectativa estetica.',
          'Definir se o caso pede restauracao direta, indireta, pino, nucleo, coroa, provisiorio ou encaminhamento.',
          'Planejar termino cervical, reducao oclusal/incisal e preservacao maxima de estrutura sadia.'
        ]
      },
      {
        title: 'Moldagem ou escaneamento',
        description: 'A qualidade do modelo depende de margem limpa, seca e visivel.',
        steps: [
          'Controlar saliva, sangue e afastamento gengival antes de registrar a margem.',
          'Selecionar moldeira/material ou fluxo de escaneamento conforme caso e protocolo da clinica.',
          'Conferir bolhas, arrasto, rasgo, falta de termino, contato proximal e registro antagonista.'
        ]
      },
      {
        title: 'Provisorio e ajuste',
        description: 'O provisorio protege o dente e testa forma, funcao e gengiva.',
        steps: [
          'Adaptar margem, contato proximal e contorno para evitar inflamacao gengival.',
          'Checar oclusao em maxima intercuspidacao e movimentos excursivos.',
          'Orientar higiene, risco de deslocamento e retorno se houver dor, soltura ou fratura.'
        ]
      }
    ],
    checklist: [
      'Indicacao protetica justificada',
      'Fotografia/cor registrada quando necessario',
      'Termino e reducao conferidos',
      'Moldagem sem falhas na margem',
      'Provisorio ajustado e cimentado'
    ],
    pitfalls: [
      'Preparar sem avaliar periodonto pode esconder inflamacao e margem ruim.',
      'Moldagem com sangue/saliva costuma falhar na copia do termino.',
      'Provisorio alto em oclusao gera dor, mobilidade ou soltura.'
    ],
    patientTalk: 'Explique que a protese reconstrui forma e funcao, mas depende de etapas precisas para encaixar bem, proteger a gengiva e mastigar confortavelmente.'
  },
  odontopediatria: {
    id: 'odontopediatria',
    title: 'Odontopediatria',
    subtitle: 'Conduta, prevencao e procedimentos simples',
    topics: 'Manejo infantil, denticao decidua, fluor, selante, ART, urgencias.',
    duration: '18 min',
    level: 'Atendimento supervisionado',
    icon: Stethoscope,
    color: 'bg-emerald-50 text-emerald-700',
    borderColor: 'border-emerald-100',
    objective: 'Revisar o atendimento infantil com foco em comportamento, prevencao, diagnostico de carie e procedimentos conservadores comuns na clinica escola.',
    modules: [
      {
        title: 'Manejo comportamental',
        description: 'A tecnica depende da confianca da crianca e do responsavel.',
        steps: [
          'Usar dizer-mostrar-fazer, voz calma, comandos curtos e reforco positivo.',
          'Combinar com responsavel informacoes de saude, alimentacao, higiene, trauma e experiencia previa.',
          'Reconhecer limites: dor, medo intenso e pouca colaboracao podem exigir consulta curta ou encaminhamento.'
        ]
      },
      {
        title: 'Denticao decidua e carie',
        description: 'Dente deciduo tem anatomia e ciclo biologico proprios.',
        steps: [
          'Avaliar idade, cronologia de erupcao/esfoliacao, lesoes ativas, fistula, mobilidade e envolvimento pulpar.',
          'Diferenciar lesao inicial, cavitada, profunda e com sinais de infeccao para escolher conduta.',
          'Priorizar controle de doenca: dieta, fluor, higiene supervisionada e retorno.'
        ]
      },
      {
        title: 'Procedimentos comuns',
        description: 'Conservador nao significa improvisado.',
        steps: [
          'Aplicar selante quando sulcos retentivos e risco indicarem, com isolamento adequado.',
          'Considerar ART/ionomero em casos selecionados, removendo dentina infectada e preservando estrutura.',
          'Em urgencias, controlar dor/infeccao e encaminhar se houver comprometimento sistemico.'
        ]
      }
    ],
    checklist: [
      'Responsavel orientado e consentimento registrado',
      'Risco de carie avaliado',
      'Comportamento infantil considerado no plano',
      'Dose de anestesico calculada quando necessario',
      'Orientacao de dieta/higiene entregue'
    ],
    pitfalls: [
      'Tratar a crianca como adulto pequeno piora colaboracao.',
      'Ignorar cronologia de esfoliacao pode levar a tratamento excessivo.',
      'Prescrever sem peso/idade e sem supervisao aumenta risco.'
    ],
    patientTalk: 'Explique ao responsavel que o foco e controlar a doenca e criar uma experiencia segura, para que a crianca aceite melhor os proximos cuidados.'
  }
};

const parseDate = (value?: string) => {
  if (!value) return null;
  return parseAppointmentDateTime(value);
};

const getPatient = (patients: any[], id: number) => patients.find(p => p.id === id);

const getProcedureHint = (appointment?: any, patient?: any) => {
  const treatment = patient?.treatmentPlan?.find((item: any) =>
    item?.status === 'PLANEJADO' || item?.status === 'APROVADO'
  );
  return appointment?.notes || appointment?.procedure || treatment?.procedure || null;
};

const mapProcedureToTopic = (procedure: string | null): StudyKey | null => {
  if (!procedure) return null;
  const lower = procedure.toLowerCase();
  if (lower.includes('anamn') || lower.includes('exame') || lower.includes('avaliacao') || lower.includes('diagnost') || lower.includes('plano de tratamento')) return 'exame-clinico';
  if (lower.includes('radio') || lower.includes('rx') || lower.includes('periapical') || lower.includes('bite') || lower.includes('panoram')) return 'radiologia';
  if (lower.includes('anestes') || lower.includes('bloqueio') || lower.includes('infiltrativa')) return 'anestesia';
  if (lower.includes('isolamento') || lower.includes('dique') || lower.includes('lencol') || lower.includes('grampo')) return 'isolamento';
  if (lower.includes('rasp') || lower.includes('period') || lower.includes('gengiv') || lower.includes('calculo') || lower.includes('tartaro') || lower.includes('profilaxia periodontal')) return 'periodontia';
  if (lower.includes('profilax') || lower.includes('fluor') || lower.includes('selante') || lower.includes('prevent') || lower.includes('biofilme')) return 'preventiva';
  if (lower.includes('endo') || lower.includes('canal') || lower.includes('pulpar') || lower.includes('tratamento endodontico')) return 'endodontia';
  if (lower.includes('restaura') || lower.includes('resin') || lower.includes('clareamento') || lower.includes('facet') || lower.includes('lente') || lower.includes('dentistic')) return 'dentistica';
  if (lower.includes('extra') || lower.includes('siso') || lower.includes('cirurg') || lower.includes('implant') || lower.includes('exodontia')) return 'cirurgia';
  if (lower.includes('protese') || lower.includes('provisor') || lower.includes('moldagem') || lower.includes('coroa') || lower.includes('ciment')) return 'protese';
  if (lower.includes('pediatr') || lower.includes('crianca') || lower.includes('deciduo') || lower.includes('infantil') || lower.includes('art')) return 'odontopediatria';
  return null;
};

const getDayPhrase = (date: Date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Hoje voce atende';
  if (date.toDateString() === tomorrow.toDateString()) return 'Amanha voce atende';
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
  const prefix = ['sabado', 'domingo'].includes(weekday.toLowerCase()) ? 'No' : 'Na';
  return `${prefix} ${weekday} voce atende`;
};

const firstName = (name?: string) => (name || 'paciente').trim().split(' ')[0] || 'paciente';

export const AcademyEstudos: React.FC<AcademyEstudosProps> = ({
  patients = [],
  appointments = [],
  setActiveTab,
  openPatientRecord
}) => {
  const [selectedStudy, setSelectedStudy] = useState<StudyKey | null>(null);
  const now = new Date();

  const upcomingCases = useMemo(() => {
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 15);

    const usable = appointments
      .filter(app => ACTIVE_STATUSES.has(String(app.status).toUpperCase()))
      .filter(app => {
        const d = parseDate(app.start_time);
        return d && d > now && d <= limit;
      })
      .sort((a, b) => getAppointmentTime(a.start_time) - getAppointmentTime(b.start_time));

    return usable.map(app => {
      const patient = getPatient(patients, app.patient_id);
      const proc = getProcedureHint(app, patient);
      const topicKey = mapProcedureToTopic(proc);
      return {
        app,
        patient,
        topicKey,
        proc,
        date: parseDate(app.start_time)!
      };
    }).filter(c => c.topicKey && c.patient);
  }, [appointments, patients]);

  const nextCase = upcomingCases[0];
  const nextCaseTopic = nextCase?.topicKey ? STUDY_LIBRARY[nextCase.topicKey] : null;

  const weekReviews = useMemo(() => {
    const otherCases = upcomingCases.slice(1);
    const keys = otherCases.map(c => c.topicKey).filter(Boolean) as StudyKey[];
    const uniqueKeys = Array.from(new Set(keys));

    return uniqueKeys.map(k => {
      const caseInfo = otherCases.find(c => c.topicKey === k);
      const category = STUDY_LIBRARY[k];

      let contextPhrase = category.title;
      if (caseInfo && caseInfo.date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const caseDate = new Date(caseInfo.date);
        caseDate.setHours(0, 0, 0, 0);
        const diffTime = caseDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          contextPhrase = `${category.title} amanha`;
        } else if (diffDays <= 7) {
          contextPhrase = `${category.title} nesta semana`;
        } else {
          contextPhrase = `${category.title} em breve`;
        }
      }

      return {
        ...category,
        contextPhrase
      };
    }).slice(0, 3);
  }, [upcomingCases]);

  const allLibraryItems = Object.values(STUDY_LIBRARY);
  const activeMaterial = selectedStudy ? STUDY_LIBRARY[selectedStudy] : null;

  if (activeMaterial) {
    const Icon = activeMaterial.icon;

    return (
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-6 pb-32">
        <motion.button
          type="button"
          onClick={() => setSelectedStudy(null)}
          whileTap={{ scale: 0.97 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-academy-muted shadow-sm border border-academy-border hover:text-academy-text transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar
        </motion.button>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[32px] border ${activeMaterial.borderColor} bg-white p-6 sm:p-7 shadow-xl shadow-slate-200/50 overflow-hidden relative`}
        >
          <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center ${activeMaterial.color} mb-5`}>
            <Icon size={28} />
          </div>
          <p className="text-[13px] font-bold uppercase tracking-widest text-academy-study-text mb-2">
            Material de estudo
          </p>
          <h2 className="text-[32px] sm:text-[38px] font-bold text-academy-text leading-[1.05] tracking-tight">
            {activeMaterial.title}
          </h2>
          <p className="text-[15px] text-academy-muted font-medium mt-3 leading-relaxed">
            {activeMaterial.objective}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-[18px] bg-academy-neutral px-4 py-3">
              <div className="flex items-center gap-2 text-academy-study-text font-bold text-[13px]">
                <Clock size={15} />
                {activeMaterial.duration}
              </div>
              <p className="text-[11px] text-academy-muted font-semibold mt-1">Tempo sugerido</p>
            </div>
            <div className="rounded-[18px] bg-academy-neutral px-4 py-3">
              <div className="flex items-center gap-2 text-academy-muted font-bold text-[13px]">
                <Target size={15} />
                {activeMaterial.level}
              </div>
              <p className="text-[11px] text-academy-muted font-semibold mt-1">Nivel</p>
            </div>
          </div>
        </motion.section>

        <section className="space-y-4 mt-8">
          <h3 className="text-[16px] font-bold text-academy-text px-1">Roteiro de revisao</h3>
          {activeMaterial.modules.map((module, moduleIndex) => (
            <motion.article
              key={module.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: moduleIndex * 0.05 }}
              className="bg-white rounded-[24px] border border-academy-border/70 p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-academy-neutral text-academy-muted flex items-center justify-center text-[13px] font-bold shrink-0">
                  {moduleIndex + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[16px] font-bold text-academy-text">{module.title}</h4>
                  <p className="text-[13px] text-academy-muted font-medium mt-1">{module.description}</p>
                  <div className="space-y-2.5 mt-4">
                    {module.steps.map(step => (
                      <div key={step} className="flex gap-2.5 text-[13px] text-academy-muted leading-relaxed">
                        <CheckCircle2 size={16} className="text-academy-muted shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </section>

        <section className="grid gap-4 mt-8">
          <div className="bg-white rounded-[24px] border border-academy-border/70 p-5">
            <h3 className="text-[15px] font-bold text-academy-text mb-4">Checklist antes do atendimento</h3>
            <div className="grid gap-2.5">
              {activeMaterial.checklist.map(item => (
                <div key={item} className="flex items-center gap-2.5 text-[13px] font-medium text-academy-muted">
                  <CheckCircle2 size={16} className="text-academy-success-text shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-academy-border/70 p-5">
            <h3 className="text-[15px] font-bold text-academy-text mb-4">Pontos de atencao</h3>
            <div className="grid gap-3">
              {activeMaterial.pitfalls.map(item => (
                <p key={item} className="text-[13px] leading-relaxed text-academy-attention-text bg-academy-attention rounded-[16px] px-4 py-3">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="bg-white border border-academy-border rounded-[24px] p-5 text-academy-text">
            <div className="flex items-center gap-2 mb-3">
              <UserCircle size={18} className="text-academy-muted" />
              <h3 className="text-[15px] font-bold">Como explicar ao paciente</h3>
            </div>
            <p className="text-[14px] leading-relaxed text-academy-muted">{activeMaterial.patientTalk}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-6 space-y-12 pt-8 pb-32">
      <section className="space-y-8">
        <div className="pt-6">
          <p className="text-[16px] font-medium text-academy-muted mb-2">
            Estudos
          </p>
          <h2 className="text-[34px] sm:text-[38px] font-bold text-academy-text leading-[1.1] tracking-tight mt-1">
            O que revisar agora
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="flex items-start gap-3 rounded-2xl px-5 py-4 bg-academy-neutral/80 border border-academy-border/80"
        >
          <Sparkles size={20} className="mt-0.5 shrink-0 text-academy-primary" />
          <p className="text-[14px] font-medium text-[#3A3A3C] leading-snug">
            Separei revisoes com base nos seus proximos atendimentos.
          </p>
        </motion.div>
      </section>

      {nextCase && nextCaseTopic ? (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <h3 className="text-[15px] font-bold text-academy-text tracking-tight px-1">Seu proximo passo</h3>
          <div className="bg-white rounded-[32px] p-7 shadow-[0_16px_54px_rgba(15,23,42,0.08)] border border-academy-border/80 relative overflow-hidden flex flex-col min-h-[280px]">
            <div className="absolute -right-8 -bottom-8 opacity-[0.06] text-academy-primary pointer-events-none">
              <nextCaseTopic.icon size={200} />
            </div>

            <div className="flex-1 relative z-10 flex flex-col">
              <span className="text-academy-primary text-[12px] font-bold uppercase tracking-widest mb-1">
                Foco do atendimento
              </span>
              <h2 className="text-[28px] sm:text-[32px] font-bold text-academy-text leading-[1.15] mt-2 mb-6">
                {getDayPhrase(nextCase.date)} <span>{firstName(nextCase.app.patient_name)}</span>.
              </h2>

              <div className="mt-auto space-y-4">
                <div className="bg-academy-neutral border border-academy-border/80 rounded-[20px] p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-academy-primary shadow-sm">
                      <nextCaseTopic.icon size={16} />
                    </div>
                    <span className="text-[14px] font-bold text-academy-text leading-snug">Revise: {nextCaseTopic.topics}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStudy(nextCaseTopic.id)}
                    className="w-full bg-academy-primary text-white font-bold text-[15px] py-[16px] rounded-[20px] shadow-lg hover:scale-[0.98] transition-transform active:scale-95"
                  >
                    Estudar roteiro
                  </button>
                  <button
                    type="button"
                    onClick={() => openPatientRecord?.(nextCase.patient.id)}
                    className="w-full bg-white text-academy-muted border border-academy-border font-bold text-[15px] py-[16px] rounded-[20px] hover:bg-academy-neutral transition-colors active:scale-95"
                  >
                    Abrir caso
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-[32px] border border-academy-border shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[220px]"
        >
          <div className="w-16 h-16 bg-academy-bg rounded-full flex items-center justify-center mb-4">
            <Calendar size={28} className="text-academy-muted" />
          </div>
          <h3 className="text-[18px] font-bold text-academy-text mb-2">Nenhum atendimento mapeado</h3>
          <p className="text-[14px] text-academy-muted max-w-xs mx-auto mb-6">
            Nao encontrei procedimentos especificos na sua agenda proxima.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab?.('agenda')}
            className="px-6 py-3 bg-academy-primary text-white text-[14px] font-bold rounded-full hover:opacity-90 transition-opacity shadow-md"
          >
            Ver agenda completa
          </button>
        </motion.section>
      )}

      {weekReviews.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <h3 className="text-[15px] font-bold text-academy-text tracking-tight px-1">Revisoes da semana</h3>
          <div className="grid gap-3">
            {weekReviews.map((cat, i) => (
              <motion.button
                type="button"
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStudy(cat.id)}
                className="bg-white rounded-[20px] p-4 border border-academy-border/70 shadow-sm cursor-pointer flex items-center gap-4 hover:border-stone-300 transition-all text-left"
              >
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ${cat.color}`}>
                  <cat.icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-bold text-academy-text">{cat.title}</h4>
                  <p className="text-[12px] font-semibold text-academy-muted mt-0.5">
                    {cat.contextPhrase}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[#C6C6C8] shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4 pt-4 border-t border-academy-border/50"
      >
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={16} className="text-academy-muted" />
          <h3 className="text-[15px] font-bold text-academy-text tracking-tight">Biblioteca Geral</h3>
        </div>

        <div className="grid gap-4">
          {allLibraryItems.map(cat => (
            <motion.button
              type="button"
              key={`lib-${cat.id}`}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedStudy(cat.id)}
              className="bg-white rounded-[24px] p-5 border border-academy-border/70 shadow-sm cursor-pointer group transition-all hover:shadow-lg text-left"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 ${cat.color} bg-opacity-50`}>
                  <cat.icon size={22} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h4 className="text-[16px] font-bold text-academy-text">{cat.title}</h4>
                  <p className="text-[12px] font-semibold text-academy-muted mt-0.5">
                    {cat.duration} - {cat.level}
                  </p>
                  <p className="text-[13px] text-academy-muted mt-1 leading-relaxed">
                    {cat.topics}
                  </p>
                </div>
                <div className="pt-2">
                  <div className="w-8 h-8 rounded-full bg-academy-neutral flex items-center justify-center text-academy-muted group-hover:bg-academy-study transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </div>
  );
};
