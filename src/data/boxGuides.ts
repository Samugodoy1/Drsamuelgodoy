export type BoxGuideProcedure =
  | 'Consulta'
  | 'Endodontia'
  | 'Cirurgia'
  | 'Dentistica'
  | 'Periodontia'
  | 'Protese'
  | 'Urgencia';

export type BoxGuideBlock = {
  title: string;
  items: string[];
  ordered?: boolean;
  emphasis?: 'default' | 'warning' | 'record';
};

export type BoxGuide = {
  label: string;
  shortLabel: string;
  doubtChips: string[];
  chipContent: Record<string, string[]>;
  blocks: BoxGuideBlock[];
};

export const boxGuides: Record<BoxGuideProcedure, BoxGuide> = {
  Consulta: {
    label: 'Consulta / Avaliacao',
    shortLabel: 'Consulta',
    doubtChips: ['Anamnese', 'Exame', 'Radiografia', 'Plano', 'Orientacoes', 'Evolucao'],
    chipContent: {
      Anamnese: [
        'Perguntar queixa principal com suas palavras',
        'Checar alergias, medicacoes e condicoes sistemicas',
        'Verificar pressao arterial se indicado',
        'Registrar historico medico relevante',
      ],
      Exame: [
        'Inspecao visual intra e extra-oral',
        'Palpacao de linfonodos e tecidos moles',
        'Sondagem periodontal quando indicado',
        'Avaliar mucosa, gengiva e dentes',
      ],
      Radiografia: [
        'Solicitar radiografia conforme necessidade',
        'Correlacionar achados clinicos com imagem',
        'Registrar achados radiograficos relevantes',
      ],
      Plano: [
        'Listar achados principais',
        'Priorizar necessidades clinicas',
        'Definir proximos passos com o professor',
        'Orientar paciente sobre o plano proposto',
      ],
      Orientacoes: [
        'Explicar achados ao paciente',
        'Orientar higiene e cuidados',
        'Esclarecer duvidas do paciente',
        'Definir retorno ou proxima etapa',
      ],
      Evolucao: [
        'Registrar queixa e achados do exame',
        'Registrar hipotese diagnostica',
        'Registrar plano proposto e proxima etapa',
        'Registrar orientacoes dadas ao paciente',
      ],
    },
    blocks: [
      {
        title: 'Materiais para consulta',
        items: [
          'Espelho, sonda e pinca clinica',
          'Sonda periodontal',
          'Gaze e sugador',
          'Ficha clinica e prontuario',
          'Esfigmomanometro se indicado',
        ],
      },
      {
        title: 'Sequencia da consulta',
        ordered: true,
        items: [
          'Acolher paciente e confirmar dados',
          'Ouvir queixa principal',
          'Revisar anamnese, alergias e medicacoes',
          'Verificar PA se indicado',
          'Exame clinico intra e extra-oral',
          'Solicitar exames complementares se necessario',
          'Definir hipotese e plano com professor',
          'Orientar paciente e definir retorno',
        ],
      },
      {
        title: 'Nao esquecer',
        emphasis: 'warning',
        items: [
          'Confirmar anamnese antes de qualquer procedimento',
          'Registrar queixa nas palavras do paciente',
          'Checar alergias e medicacoes em uso',
          'Validar plano com o professor antes de comunicar ao paciente',
        ],
      },
      {
        title: 'Registro/evolucao sugerida',
        emphasis: 'record',
        items: [
          'Queixa principal e historico',
          'Achados do exame clinico',
          'Hipotese diagnostica',
          'Plano de tratamento proposto',
          'Orientacoes e retorno',
        ],
      },
    ],
  },
  Endodontia: {
    label: 'Endodontia',
    shortLabel: 'Endo',
    doubtChips: ['Anestesia', 'Isolamento', 'Acesso', 'Odontometria', 'Irrigacao', 'Evolucao'],
    chipContent: {
      Anestesia: ['Conferir anamnese antes de anestesiar', 'Separar carpule, anestesico topico e agulha', 'Aplicar tecnica indicada e testar efeito'],
      Isolamento: ['Separar lencol, arco, grampo e fio dental', 'Confirmar estabilidade do grampo', 'Manter campo seco antes do acesso'],
      Acesso: ['Conferir dente e radiografia', 'Usar brocas esfericas e Endo Z', 'Localizar canais sem remover estrutura alem do necessario'],
      Odontometria: ['Usar RX/localizador conforme protocolo', 'Confirmar comprimento de trabalho', 'Registrar medida usada'],
      Irrigacao: ['Nunca instrumentar canal seco', 'Irrigar a cada troca de lima', 'Deixar refluxo e aspirar com cuidado'],
      Evolucao: ['Registrar dente e diagnostico', 'Registrar comprimento de trabalho, lima final e irrigante', 'Definir medicacao/obturacao e proximo passo'],
    },
    blocks: [
      {
        title: 'Bandeja',
        items: [
          'Anestesia: carpule, anestesico topico, agulha',
          'Isolamento: lencol, arco, grampo, fio dental, perfurador',
          'Acesso: alta rotacao, brocas esfericas, Endo Z',
          'Irrigacao: seringa, agulha, hipoclorito, sugador',
          'Instrumentacao: limas, tamborel, regua endodontica',
          'Obturacao/provisorio: cones, cimento, espacador, calcador, provisorio',
        ],
      },
      {
        title: 'Sequencia rapida',
        ordered: true,
        items: [
          'Conferir dente, queixa e radiografia',
          'Anestesia',
          'Isolamento absoluto',
          'Acesso e localizacao dos canais',
          'Odontometria',
          'Preparo quimico-mecanico com irrigacao',
          'Medicacao intracanal ou obturacao',
          'Selamento provisorio e registro',
        ],
      },
      {
        title: 'Nao esquecer',
        emphasis: 'warning',
        items: [
          'Nunca instrumentar canal seco',
          'Irrigar a cada troca de lima',
          'Confirmar comprimento de trabalho',
          'Deixar refluxo na irrigacao',
          'Registrar o que foi feito e o proximo passo',
        ],
      },
      {
        title: 'Diagnostico rapido',
        items: [
          'Dor provocada e curta: pulpite reversivel',
          'Dor espontanea/intensa: pulpite irreversivel sintomatica',
          'Teste frio negativo: necrose pulpar',
          'Percussao positiva: atencao para envolvimento periapical',
          'Fistula: pensar em abscesso cronico',
        ],
      },
      {
        title: 'Registro/evolucao sugerida',
        emphasis: 'record',
        items: [
          'Dente, diagnostico e conduta realizada',
          'Comprimento de trabalho, lima final e irrigante',
          'Medicacao/obturacao e material provisorio',
          'Intercorrencias e proximo passo',
        ],
      },
    ],
  },
  Cirurgia: {
    label: 'Cirurgia',
    shortLabel: 'Cirurgia',
    doubtChips: ['Anestesia', 'Instrumentais', 'Sequencia', 'Hemostasia/Sutura', 'Pos-operatorio', 'Evolucao'],
    chipContent: {
      Anestesia: [
        'Conferir anamnese, PA, alergias e medicacoes',
        'Definir tecnica conforme dente/regiao',
        'Aplicar e aguardar efeito',
        'Testar anestesia antes de iniciar',
        'Se houver dor, parar e reforcar',
        'Em condicao sistemica, confirmar com professor',
      ],
      Instrumentais: [
        'Espelho, sonda e pinca',
        'Carpule e agulha',
        'Sindesmotomo',
        'Extratores/alavancas',
        'Forceps adequado',
        'Cureta, gaze e sugador',
        'Porta-agulha, fio e tesoura se sutura',
      ],
      Sequencia: [
        'Confirmar dente e radiografia',
        'Antissepsia/anestesia',
        'Sindesmotomia',
        'Luxacao controlada',
        'Remocao com forceps/extrator',
        'Curetagem/irrigacao se indicado',
        'Compressao/hemostasia',
        'Sutura se necessario',
      ],
      'Hemostasia/Sutura': [
        'Compressao com gaze',
        'Conferir sangramento ativo',
        'Irrigar e limpar alveolo se indicado',
        'Sutura quando necessario',
        'Orientar nao cuspir, nao bochechar e nao manipular',
      ],
      'Pos-operatorio': [
        'Repouso relativo',
        'Compressa fria nas primeiras horas, se indicado',
        'Evitar bochecho/cuspir',
        'Alimentacao fria/pastosa inicialmente',
        'Tomar medicacao conforme prescricao',
        'Retornar se dor intensa, sangramento persistente ou febre',
      ],
      Evolucao: [
        'Dente removido',
        'Tecnica/anestesia usada',
        'Intercorrencias ou ausencia delas',
        'Hemostasia/sutura',
        'Orientacoes dadas',
        'Retorno definido',
      ],
    },
    blocks: [
      {
        title: 'Bandeja / materiais essenciais',
        items: ['Seringa carpule e agulhas', 'Sonda, espelho, pinca', 'Descolador, sindesmotomo', 'Forceps/extratores', 'Gaze, sugador, porta-agulha, fio'],
      },
      {
        title: 'Sequencia rapida',
        ordered: true,
        items: ['Conferir dente e radiografia', 'Anestesia e teste', 'Sindesmotomia', 'Luxacao controlada', 'Remocao', 'Curetagem/irrigacao se indicado', 'Hemostasia, sutura e orientacoes'],
      },
      {
        title: 'Nao esquecer',
        emphasis: 'warning',
        items: ['Apoio firme e visao direta', 'Nao forcar sem luxacao', 'Checar raiz/fratura em RX', 'Compressao com gaze', 'Orientar repouso e retorno'],
      },
      {
        title: 'Pontos criticos',
        items: ['Dor fora do esperado', 'Sangramento persistente', 'Comunicar professor cedo', 'Registrar intercorrencias'],
      },
      {
        title: 'Registro/evolucao sugerida',
        emphasis: 'record',
        items: ['Dente/regiao e anestesia', 'Tecnica usada', 'Sutura/hemostasia', 'Orientacoes e medicacao prescrita se houver'],
      },
    ],
  },
  Dentistica: {
    label: 'Dentistica',
    shortLabel: 'Dentistica',
    doubtChips: ['Cor', 'Isolamento', 'Adesao', 'Incrementos', 'Acabamento', 'Evolucao'],
    chipContent: {
      Cor: ['Selecionar cor antes de isolar', 'Manter dente hidratado', 'Confirmar escala e registrar cor'],
      Isolamento: ['Controlar saliva e sangramento', 'Usar matriz/cunha quando indicado', 'Nao iniciar adesao com campo contaminado'],
      Adesao: ['Condicionar conforme sistema usado', 'Aplicar adesivo sem excesso', 'Fotopolimerizar pelo tempo correto'],
      Incrementos: ['Inserir camadas pequenas', 'Adaptar margem e parede', 'Fotopolimerizar cada incremento'],
      Acabamento: ['Checar contato e oclusao', 'Usar discos/borrachas', 'Polir e revisar margem'],
      Evolucao: ['Registrar dente e faces', 'Registrar cor/material e sistema adesivo', 'Registrar ajuste oclusal e orientacoes'],
    },
    blocks: [
      {
        title: 'Bandeja / materiais essenciais',
        items: ['Resina e escala de cor', 'Acido, adesivo, microbrush', 'Matriz/cunha se indicado', 'Fotopolimerizador', 'Discos, borrachas e carbono'],
      },
      {
        title: 'Sequencia rapida',
        ordered: true,
        items: ['Selecionar cor antes de isolar', 'Isolar e controlar umidade', 'Remover tecido cariado/preparo', 'Condicionamento e adesao', 'Inserir incrementos', 'Fotoativar cada camada', 'Ajuste, acabamento e polimento'],
      },
      {
        title: 'Nao esquecer',
        emphasis: 'warning',
        items: ['Dente hidratado para cor', 'Campo seco na adesao', 'Incrementos pequenos', 'Checar contato proximal', 'Ajustar oclusao'],
      },
      {
        title: 'Pontos criticos',
        items: ['Sangramento/umidade prejudica adesao', 'Sensibilidade: revisar isolamento e profundidade', 'Margem aberta: corrigir antes de finalizar'],
      },
      {
        title: 'Registro/evolucao sugerida',
        emphasis: 'record',
        items: ['Dente e faces restauradas', 'Cor/material usado', 'Isolamento e sistema adesivo', 'Ajuste oclusal e orientacoes'],
      },
    ],
  },
  Periodontia: {
    label: 'Periodontia',
    shortLabel: 'Perio',
    doubtChips: ['Sondagem', 'Raspagem', 'Curetas', 'Higiene', 'Retorno', 'Evolucao'],
    chipContent: {
      Sondagem: ['Registrar profundidade e sangramento', 'Conferir mobilidade e recessao', 'Priorizar areas com sangramento/supuracao'],
      Raspagem: ['Adaptar instrumento corretamente', 'Manter apoio firme', 'Revisar superficie antes de finalizar'],
      Curetas: ['Escolher cureta pela area', 'Conferir angulacao', 'Usar movimentos curtos e controlados'],
      Higiene: ['Mostrar ponto critico ao paciente', 'Orientar escova e fio/interdental', 'Definir uma meta simples ate o retorno'],
      Retorno: ['Definir prazo de reavaliacao', 'Rever sangramento e placa', 'Ajustar manutencao conforme risco'],
      Evolucao: ['Registrar regioes tratadas', 'Registrar achados periodontais', 'Registrar orientacao e retorno'],
    },
    blocks: [
      {
        title: 'Bandeja / materiais essenciais',
        items: ['Sonda periodontal', 'Curetas/foices', 'Ultrassom se indicado', 'Gaze e sugador', 'Evidenciador/orientacao de higiene'],
      },
      {
        title: 'Sequencia rapida',
        ordered: true,
        items: ['Atualizar anamnese', 'Sondagem e sangramento', 'Identificar areas prioritarias', 'Raspagem supra/sub se indicada', 'Irrigar e revisar superficie', 'Orientar higiene', 'Definir retorno/manutencao'],
      },
      {
        title: 'Nao esquecer',
        emphasis: 'warning',
        items: ['Registrar PS e sangramento', 'Adaptar cureta corretamente', 'Nao perder ponto de apoio', 'Motivar higiene de forma objetiva'],
      },
      {
        title: 'Pontos criticos',
        items: ['Mobilidade', 'Supuracao', 'Perda ossea/radiografia', 'Dor ou sangramento fora do esperado'],
      },
      {
        title: 'Registro/evolucao sugerida',
        emphasis: 'record',
        items: ['Regioes tratadas', 'Instrumentos usados', 'Achados periodontais', 'Orientacao e prazo de retorno'],
      },
    ],
  },
  Protese: {
    label: 'Protese',
    shortLabel: 'Protese',
    doubtChips: ['Moldagem', 'Cor', 'Prova/Ajuste', 'Cimentacao', 'Orientacoes', 'Evolucao'],
    chipContent: {
      Moldagem: ['Escolher moldeira adequada', 'Controlar umidade', 'Checar bolhas e distorcao antes de liberar'],
      Cor: ['Escolher com luz adequada', 'Manter dente hidratado', 'Registrar cor e comunicar laboratorio'],
      'Prova/Ajuste': ['Checar adaptacao', 'Checar contato e oclusao', 'Ajustar pontos de pressao'],
      Cimentacao: ['Isolar campo', 'Limpar peca/preparo', 'Remover excesso e checar oclusao'],
      Orientacoes: ['Explicar cuidado inicial', 'Orientar higiene', 'Definir retorno para ajuste'],
      Evolucao: ['Registrar etapa realizada', 'Registrar material/cor', 'Registrar ajustes e proxima etapa'],
    },
    blocks: [
      {
        title: 'Bandeja / materiais essenciais',
        items: ['Moldeira adequada', 'Material de moldagem', 'Registro de mordida', 'Escala de cor', 'Cimento se for etapa de cimentacao'],
      },
      {
        title: 'Sequencia rapida',
        ordered: true,
        items: ['Conferir etapa do plano', 'Provar/adaptar ou moldar', 'Checar contatos e oclusao', 'Selecionar cor se indicado', 'Registrar ajustes', 'Orientar uso e retorno'],
      },
      {
        title: 'Nao esquecer',
        emphasis: 'warning',
        items: ['Checar bolhas/distorcao no molde', 'Registrar cor escolhida', 'Remover excesso de cimento', 'Confirmar conforto do paciente'],
      },
      {
        title: 'Pontos criticos',
        items: ['Adaptacao marginal', 'Pontos de pressao', 'Oclusao alta', 'Retencao/estabilidade'],
      },
      {
        title: 'Registro/evolucao sugerida',
        emphasis: 'record',
        items: ['Etapa realizada', 'Material/cor', 'Ajustes feitos', 'Orientacoes e proxima etapa'],
      },
    ],
  },
  Urgencia: {
    label: 'Diagnostico/Urgencia',
    shortLabel: 'Urgencia',
    doubtChips: ['Dor', 'Testes', 'Anamnese', 'Alertas', 'Conduta', 'Professor'],
    chipContent: {
      Dor: ['Perguntar inicio, duracao e intensidade', 'Identificar gatilho: frio, calor, mastigacao ou espontanea', 'Registrar alivio e piora'],
      Testes: ['Percussao', 'Palpacao', 'Teste frio/calor se disponivel', 'Radiografia quando indicada'],
      Anamnese: ['Checar alergias', 'Checar medicacoes', 'Checar condicoes sistemicas relevantes'],
      Alertas: ['Febre', 'Trismo', 'Edema difuso', 'Sangramento ou dor fora do esperado'],
      Conduta: ['Aliviar dor quando possivel', 'Controlar infeccao conforme orientacao', 'Registrar hipotese e proximo passo'],
      Professor: ['Chamar cedo se houver alerta', 'Mostrar exame e testes', 'Confirmar conduta antes de procedimento invasivo'],
    },
    blocks: [
      {
        title: 'Bandeja / materiais essenciais',
        items: ['Espelho, sonda e pinca', 'Teste frio/calor se disponivel', 'Percussao e palpacao', 'Radiografia', 'Anestesico e isolamento se conduta imediata'],
      },
      {
        title: 'Sequencia rapida',
        ordered: true,
        items: ['Ouvir queixa principal', 'Checar alergias e medicacoes', 'Localizar dente/regiao', 'Testes clinicos', 'Radiografia quando indicada', 'Definir alivio inicial', 'Validar conduta com professor'],
      },
      {
        title: 'Nao esquecer',
        emphasis: 'warning',
        items: ['Febre, trismo ou edema difuso sao alerta', 'Nao medicar sem confirmar anamnese', 'Registrar intensidade e gatilho da dor', 'Encaminhar quando fugir do escopo'],
      },
      {
        title: 'Diagnostico rapido',
        items: ['Dor ao frio curta: reversivel', 'Dor espontanea forte: irreversivel', 'Sem resposta ao frio: necrose', 'Percussao positiva: periapical', 'Edema/fistula: infeccao/abscesso'],
      },
      {
        title: 'Registro/evolucao sugerida',
        emphasis: 'record',
        items: ['Queixa, duracao e intensidade', 'Testes realizados e respostas', 'Hipotese diagnostica', 'Conduta inicial e orientacoes'],
      },
    ],
  },
};

export const boxGuideProcedures: Array<{ key: BoxGuideProcedure; shortLabel: string }> = (
  Object.keys(boxGuides) as BoxGuideProcedure[]
).map((key) => ({
  key,
  shortLabel: boxGuides[key].shortLabel,
}));
