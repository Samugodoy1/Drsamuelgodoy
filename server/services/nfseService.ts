/**
 * Serviço de emissão de NFS-e (Nota Fiscal de Serviço Eletrônica)
 * 
 * Arquitetura:
 * - Camada de abstração de provedores (NfseProvider interface)
 * - Status lifecycle: DRAFT → PROCESSING → AUTHORIZED / REJECTED / ERROR
 * - AUTHORIZED → CANCEL_PROCESSING → CANCELLED
 * - Certificado A1 com criptografia AES-256-GCM em repouso
 * - Cancelamento real de NFS-e via API municipal
 * - Mapeamento automático cidade → provedor
 */

import crypto from 'crypto';
import { XMLBuilder } from 'fast-xml-parser';

// ══════════════════════════════════════════════════════════════════════
// STATUS LIFECYCLE
// ══════════════════════════════════════════════════════════════════════

export const INVOICE_STATUSES = {
  DRAFT: 'DRAFT',
  PROCESSING: 'PROCESSING',
  AUTHORIZED: 'AUTHORIZED',
  REJECTED: 'REJECTED',
  ERROR: 'ERROR',
  CANCEL_PROCESSING: 'CANCEL_PROCESSING',
  CANCELLED: 'CANCELLED',
  INTERNAL: 'INTERNAL',
} as const;

export type InvoiceStatus = typeof INVOICE_STATUSES[keyof typeof INVOICE_STATUSES];

export const RETRYABLE_STATUSES: InvoiceStatus[] = ['REJECTED', 'ERROR'];
export const CANCELLABLE_STATUSES: InvoiceStatus[] = ['AUTHORIZED'];

// ══════════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════════

export interface FiscalConfig {
  id: number;
  dentist_id: number;
  cnpj: string;
  inscricao_municipal: string;
  razao_social: string;
  nome_fantasia: string | null;
  regime_tributario: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string | null;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
  codigo_municipio_ibge: string;
  telefone: string | null;
  email: string | null;
  certificado_base64: string | null;
  certificado_senha: string | null;
  certificado_validade: string | null;
  nfse_provider: string;
  nfse_ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  nfse_url_homologacao: string | null;
  nfse_url_producao: string | null;
  nfse_usuario: string | null;
  nfse_senha: string | null;
  codigo_servico: string;
  codigo_cnae: string;
  aliquota_iss: number;
  iss_retido: boolean;
  ultimo_rps: number;
  serie_rps: string;
  auto_emit_on_payment: boolean;
}

export interface RpsData {
  numero: number;
  serie: string;
  tipo: number;
  dataEmissao: string;
  naturezaOperacao: number;
  optanteSimplesNacional: boolean;
  incentivadorCultural: boolean;
  valorServicos: number;
  issRetido: boolean;
  aliquotaIss: number;
  valorIss: number;
  valorLiquidoNfse: number;
  codigoServico: string;
  codigoCnae: string;
  codigoMunicipioIncidencia: string;
  discriminacao: string;
  prestadorCnpj: string;
  prestadorInscricaoMunicipal: string;
  tomadorCpfCnpj: string | null;
  tomadorRazaoSocial: string | null;
  tomadorEmail: string | null;
  tomadorLogradouro: string | null;
  tomadorNumero: string | null;
  tomadorBairro: string | null;
  tomadorCidade: string | null;
  tomadorUf: string | null;
  tomadorCep: string | null;
}

export interface NfseResponse {
  success: boolean;
  nfseNumero: string | null;
  codigoVerificacao: string | null;
  protocolo: string | null;
  xmlRetorno: string | null;
  linkVisualizacao: string | null;
  errorMessage: string | null;
  rejectCode: string | null;
}

export interface EmissaoInput {
  config: FiscalConfig;
  descricao: string;
  valor: number;
  tomadorCpfCnpj: string | null;
  tomadorNome: string | null;
  tomadorEmail: string | null;
}

export interface CancelamentoInput {
  config: FiscalConfig;
  nfseNumero: string;
  codigoVerificacao: string;
  motivo?: string;
}

// ══════════════════════════════════════════════════════════════════════
// PROVIDER ABSTRACTION LAYER
// ══════════════════════════════════════════════════════════════════════

export interface NfseProvider {
  id: string;
  name: string;
  description: string;
  montarEnvelopeEmissao(xmlAssinado: string, config: FiscalConfig): string;
  montarEnvelopeCancelamento(input: CancelamentoInput): string;
  parseRespostaEmissao(xmlResponse: string, config: FiscalConfig): NfseResponse;
  parseRespostaCancelamento(xmlResponse: string): { success: boolean; errorMessage: string | null };
  getLinkVisualizacao(nfseNumero: string, codigoVerificacao: string, cnpj: string, codigoMunicipio: string): string | null;
  soapActionEmissao: string;
  soapActionCancelamento: string;
}

// ── Generic ABRASF 2.04 Provider (base) ────────────────────────────

class AbrasfProvider implements NfseProvider {
  id = 'ABRASF';
  name = 'ABRASF Genérico';
  description = 'Padrão ABRASF 2.04';
  soapActionEmissao = 'RecepcionarLoteRps';
  soapActionCancelamento = 'CancelarNfse';

  montarEnvelopeEmissao(xmlAssinado: string, _config: FiscalConfig): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:nfse="http://www.abrasf.org.br/nfse.xsd">
  <soap:Body>
    <nfse:RecepcionarLoteRpsEnvio>
      <nfseCabecMsg>
        <![CDATA[<?xml version="1.0" encoding="UTF-8"?><cabecalho versao="2.04" xmlns="http://www.abrasf.org.br/nfse.xsd"><versaoDados>2.04</versaoDados></cabecalho>]]>
      </nfseCabecMsg>
      <nfseDadosMsg>
        <![CDATA[${xmlAssinado}]]>
      </nfseDadosMsg>
    </nfse:RecepcionarLoteRpsEnvio>
  </soap:Body>
</soap:Envelope>`;
  }

  montarEnvelopeCancelamento(input: CancelamentoInput): string {
    const cnpj = input.config.cnpj.replace(/\D/g, '');
    const im = input.config.inscricao_municipal;
    const codigoMunicipio = input.config.codigo_municipio_ibge;
    const cancelXml = `<?xml version="1.0" encoding="UTF-8"?>
<CancelarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Pedido>
    <InfPedidoCancelamento Id="cancel_${input.nfseNumero}">
      <IdentificacaoNfse>
        <Numero>${input.nfseNumero}</Numero>
        <CpfCnpj><Cnpj>${cnpj}</Cnpj></CpfCnpj>
        <InscricaoMunicipal>${im}</InscricaoMunicipal>
        <CodigoMunicipio>${codigoMunicipio}</CodigoMunicipio>
      </IdentificacaoNfse>
      <CodigoCancelamento>1</CodigoCancelamento>
    </InfPedidoCancelamento>
  </Pedido>
</CancelarNfseEnvio>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:nfse="http://www.abrasf.org.br/nfse.xsd">
  <soap:Body>
    <nfse:CancelarNfseEnvio>
      <nfseCabecMsg>
        <![CDATA[<?xml version="1.0" encoding="UTF-8"?><cabecalho versao="2.04" xmlns="http://www.abrasf.org.br/nfse.xsd"><versaoDados>2.04</versaoDados></cabecalho>]]>
      </nfseCabecMsg>
      <nfseDadosMsg>
        <![CDATA[${cancelXml}]]>
      </nfseDadosMsg>
    </nfse:CancelarNfseEnvio>
  </soap:Body>
</soap:Envelope>`;
  }

  parseRespostaEmissao(xmlResponse: string, config: FiscalConfig): NfseResponse {
    const nfseNumero = extractTag(xmlResponse, 'Numero') || extractTag(xmlResponse, 'NumeroNfse');
    const codigoVerificacao = extractTag(xmlResponse, 'CodigoVerificacao');
    const protocolo = extractTag(xmlResponse, 'Protocolo') || extractTag(xmlResponse, 'NumeroLote');
    const codigoErro = extractTag(xmlResponse, 'Codigo');
    const mensagemErro = extractTag(xmlResponse, 'Mensagem') || extractTag(xmlResponse, 'MensagemRetorno');
    const temErro = xmlResponse.includes('<ListaMensagemRetorno>') ||
                    xmlResponse.includes('<MensagemRetorno>') ||
                    xmlResponse.includes('<Fault>');

    if (temErro && !nfseNumero) {
      return {
        success: false, nfseNumero: null, codigoVerificacao: null, protocolo,
        xmlRetorno: xmlResponse, linkVisualizacao: null,
        errorMessage: mensagemErro || `Erro ${codigoErro || 'desconhecido'} na emissão`,
        rejectCode: codigoErro,
      };
    }

    const linkVisualizacao = nfseNumero && codigoVerificacao
      ? this.getLinkVisualizacao(nfseNumero, codigoVerificacao, config.cnpj, config.codigo_municipio_ibge)
      : null;

    return {
      success: !!nfseNumero, nfseNumero, codigoVerificacao, protocolo,
      xmlRetorno: xmlResponse, linkVisualizacao, errorMessage: null, rejectCode: null,
    };
  }

  parseRespostaCancelamento(xmlResponse: string): { success: boolean; errorMessage: string | null } {
    const temSucesso = xmlResponse.includes('<Cancelamento>') || xmlResponse.includes('<RetCancelamento>');
    const mensagemErro = extractTag(xmlResponse, 'Mensagem') || extractTag(xmlResponse, 'MensagemRetorno');
    const temErro = xmlResponse.includes('<ListaMensagemRetorno>') || xmlResponse.includes('<Fault>');
    if (temErro && !temSucesso) {
      return { success: false, errorMessage: mensagemErro || 'Erro ao cancelar NFS-e' };
    }
    return { success: true, errorMessage: null };
  }

  getLinkVisualizacao(_nfseNumero: string, _codigoVerificacao: string, _cnpj: string, _codigoMunicipio: string): string | null {
    return null;
  }
}

// ── Concrete Providers ─────────────────────────────────────────────

class GinfesProvider extends AbrasfProvider {
  id = 'GINFES';
  name = 'Ginfes';
  description = 'Usado por centenas de municípios (padrão ABRASF)';

  getLinkVisualizacao(nfseNumero: string, codigoVerificacao: string, cnpj: string, _codigoMunicipio: string): string | null {
    return `https://visualizar.ginfes.com.br/report/consultarNota?__report=nfs_ver4&cdVerificacao=${encodeURIComponent(codigoVerificacao)}&numNota=${encodeURIComponent(nfseNumero)}&cnpjPrestador=${cnpj.replace(/\D/g, '')}`;
  }
}

class BethaProvider extends AbrasfProvider {
  id = 'BETHA';
  name = 'Betha Sistemas';
  description = 'Provedor usado em SC, RS e outros estados';
  soapActionEmissao = 'http://www.betha.com.br/e-nota-contribuinte-ws/RecepcionarLoteRps';
  soapActionCancelamento = 'http://www.betha.com.br/e-nota-contribuinte-ws/CancelarNfse';

  montarEnvelopeEmissao(xmlAssinado: string, _config: FiscalConfig): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:e="http://www.betha.com.br/e-nota-contribuinte-ws">
  <soap:Body>
    <e:RecepcionarLoteRpsRequest>
      <nfseCabecMsg>
        <![CDATA[<?xml version="1.0" encoding="UTF-8"?><cabecalho versao="2.04" xmlns="http://www.abrasf.org.br/nfse.xsd"><versaoDados>2.04</versaoDados></cabecalho>]]>
      </nfseCabecMsg>
      <nfseDadosMsg>
        <![CDATA[${xmlAssinado}]]>
      </nfseDadosMsg>
    </e:RecepcionarLoteRpsRequest>
  </soap:Body>
</soap:Envelope>`;
  }
}

class ISSNetProvider extends AbrasfProvider {
  id = 'ISSNET';
  name = 'ISS.NET';
  description = 'Provedor usado em diversos municípios';
}

class SimplISSProvider extends AbrasfProvider {
  id = 'SIMPLISS';
  name = 'SimplISS';
  description = 'Sistema simplificado de NFS-e';
}

class IPMProvider extends AbrasfProvider {
  id = 'IPM';
  name = 'IPM Sistemas';
  description = 'Usado em municípios do sul do Brasil';
}

class NfseNacionalProvider extends AbrasfProvider {
  id = 'NFSE_NACIONAL';
  name = 'NFS-e Nacional (SEFIN)';
  description = 'Ambiente nacional unificado (em implantação)';
}

// ── Provider Registry ──────────────────────────────────────────────

const providerInstances: Record<string, NfseProvider> = {
  GINFES: new GinfesProvider(),
  BETHA: new BethaProvider(),
  ISSNET: new ISSNetProvider(),
  SIMPLISS: new SimplISSProvider(),
  IPM: new IPMProvider(),
  NFSE_NACIONAL: new NfseNacionalProvider(),
};

export function getProvider(providerId: string): NfseProvider | null {
  return providerInstances[providerId] || null;
}

export const NFSE_PROVIDERS = [
  { id: 'NENHUM', name: 'Nenhum (somente controle interno)', description: 'Notas fiscais são registradas internamente sem envio à prefeitura' },
  ...Object.values(providerInstances).map(p => ({ id: p.id, name: p.name, description: p.description })),
];

export const REGIMES_TRIBUTARIOS = [
  { id: 'SIMPLES_NACIONAL', name: 'Simples Nacional' },
  { id: 'LUCRO_PRESUMIDO', name: 'Lucro Presumido' },
  { id: 'LUCRO_REAL', name: 'Lucro Real' },
  { id: 'MEI', name: 'MEI (Microempreendedor Individual)' },
];

// ══════════════════════════════════════════════════════════════════════
// MAPEAMENTO CIDADE → PROVEDOR
// ══════════════════════════════════════════════════════════════════════

const CITY_PROVIDER_MAP: Record<string, string> = {
  '3550308': 'GINFES', '3509502': 'GINFES', '3547809': 'GINFES',
  '3548708': 'GINFES', '3548807': 'GINFES', '3518800': 'GINFES',
  '3534401': 'GINFES', '3304557': 'GINFES', '3301702': 'GINFES',
  '3303302': 'GINFES', '3106200': 'GINFES', '4106902': 'GINFES',
  '4113700': 'GINFES', '4115200': 'GINFES', '4314902': 'GINFES',
  '5300108': 'GINFES', '5208707': 'GINFES', '2927408': 'GINFES',
  '2611606': 'GINFES', '2304400': 'GINFES',
  '4205407': 'BETHA', '4209102': 'BETHA', '4202404': 'BETHA',
  '4303905': 'BETHA',
};

export function getProviderForCity(codigoIBGE: string): string | null {
  return CITY_PROVIDER_MAP[codigoIBGE] || null;
}

export function getCityProviderMap(): Record<string, string> {
  return { ...CITY_PROVIDER_MAP };
}

// ══════════════════════════════════════════════════════════════════════
// CRIPTOGRAFIA DO CERTIFICADO (AES-256-GCM)
// ══════════════════════════════════════════════════════════════════════

const CERT_ALGO = 'aes-256-gcm';
const CERT_IV_LEN = 16;

function getCertKey(): Buffer {
  const secret = process.env.CERT_ENCRYPTION_KEY || process.env.JWT_SECRET || 'odontohub-cert-key-dev';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptCertificateData(plaintext: string): string {
  const key = getCertKey();
  const iv = crypto.randomBytes(CERT_IV_LEN);
  const cipher = crypto.createCipheriv(CERT_ALGO, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
}

export function decryptCertificateData(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext; // Legacy unencrypted
  const key = getCertKey();
  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const decipher = crypto.createDecipheriv(CERT_ALGO, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(parts[2], 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ══════════════════════════════════════════════════════════════════════
// GERAÇÃO DE XML - PADRÃO ABRASF 2.04
// ══════════════════════════════════════════════════════════════════════

export function gerarXmlRps(rps: RpsData): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    suppressEmptyNode: true,
  });

  const rpsXml: any = {
    InfDeclaracaoPrestacaoServico: {
      '@_Id': `rps_${rps.numero}`,
      Rps: {
        IdentificacaoRps: { Numero: rps.numero, Serie: rps.serie, Tipo: rps.tipo },
        DataEmissao: rps.dataEmissao,
        Status: 1,
      },
      Competencia: rps.dataEmissao,
      Servico: {
        Valores: {
          ValorServicos: rps.valorServicos.toFixed(2),
          IssRetido: rps.issRetido ? 1 : 2,
          ValorIss: rps.valorIss.toFixed(2),
          Aliquota: (rps.aliquotaIss / 100).toFixed(4),
          ValorLiquidoNfse: rps.valorLiquidoNfse.toFixed(2),
        },
        ItemListaServico: rps.codigoServico,
        CodigoCnae: rps.codigoCnae,
        CodigoTributacaoMunicipio: rps.codigoServico,
        Discriminacao: rps.discriminacao,
        CodigoMunicipio: rps.codigoMunicipioIncidencia,
      },
      Prestador: {
        CpfCnpj: { Cnpj: rps.prestadorCnpj.replace(/\D/g, '') },
        InscricaoMunicipal: rps.prestadorInscricaoMunicipal,
      },
      ...(rps.tomadorCpfCnpj ? {
        Tomador: {
          IdentificacaoTomador: {
            CpfCnpj: rps.tomadorCpfCnpj.replace(/\D/g, '').length === 11
              ? { Cpf: rps.tomadorCpfCnpj.replace(/\D/g, '') }
              : { Cnpj: rps.tomadorCpfCnpj.replace(/\D/g, '') },
          },
          RazaoSocial: rps.tomadorRazaoSocial || '',
          ...(rps.tomadorLogradouro ? {
            Endereco: {
              Endereco: rps.tomadorLogradouro,
              Numero: rps.tomadorNumero || 'S/N',
              Bairro: rps.tomadorBairro || '',
              CodigoMunicipio: rps.codigoMunicipioIncidencia,
              Uf: rps.tomadorUf || '',
              Cep: rps.tomadorCep?.replace(/\D/g, '') || '',
            },
          } : {}),
          ...(rps.tomadorEmail ? { Contato: { Email: rps.tomadorEmail } } : {}),
        },
      } : {}),
      OptanteSimplesNacional: rps.optanteSimplesNacional ? 1 : 2,
      IncentivoFiscal: rps.incentivadorCultural ? 1 : 2,
    },
  };

  return builder.build(rpsXml);
}

export function gerarXmlLoteRps(
  rpsXmlContent: string, cnpj: string, inscricaoMunicipal: string, numeroLote: number
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <LoteRps Id="lote_${numeroLote}" versao="2.04">
    <NumeroLote>${numeroLote}</NumeroLote>
    <CpfCnpj><Cnpj>${cnpj.replace(/\D/g, '')}</Cnpj></CpfCnpj>
    <InscricaoMunicipal>${inscricaoMunicipal}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps><Rps>${rpsXmlContent}</Rps></ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}

// ══════════════════════════════════════════════════════════════════════
// ASSINATURA DIGITAL (ICP-Brasil / A1)
// ══════════════════════════════════════════════════════════════════════

export function validarCertificado(pfxBase64: string, senha: string): { valid: boolean; subject?: string; validUntil?: Date; error?: string } {
  try {
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');
    const secureContext = require('tls').createSecureContext({ pfx: pfxBuffer, passphrase: senha });
    if (!secureContext) return { valid: false, error: 'Certificado inválido ou senha incorreta' };
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Certificado inválido ou senha incorreta' };
  }
}

export function assinarXml(xml: string, pfxBase64: string, senha: string): string {
  try {
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');
    const privateKey = crypto.createPrivateKey({ key: pfxBuffer, format: 'der', type: 'pkcs8', passphrase: senha } as any);
    const canonicalXml = xml.trim();
    const digestHash = crypto.createHash('sha256').update(canonicalXml).digest('base64');
    const signer = crypto.createSign('SHA256');
    signer.update(canonicalXml);
    const signature = signer.sign(privateKey, 'base64');
    const signatureBlock = `
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${digestHash}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>${signature}</SignatureValue>
  </Signature>`;
    const lastClosingTag = xml.lastIndexOf('</');
    if (lastClosingTag === -1) return xml;
    return xml.slice(0, lastClosingTag) + signatureBlock + '\n' + xml.slice(lastClosingTag);
  } catch (error: any) {
    console.error('Erro ao assinar XML:', error);
    throw new Error(`Falha na assinatura digital: ${error.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════
// COMUNICAÇÃO COM PREFEITURA
// ══════════════════════════════════════════════════════════════════════

async function enviarParaPrefeitura(envelope: string, soapAction: string, config: FiscalConfig): Promise<string> {
  const url = config.nfse_ambiente === 'PRODUCAO' ? config.nfse_url_producao : config.nfse_url_homologacao;
  if (!url) {
    throw new Error(`URL do ambiente de ${config.nfse_ambiente === 'PRODUCAO' ? 'produção' : 'homologação'} não configurada`);
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': soapAction,
      ...(config.nfse_usuario && config.nfse_senha ? {
        'Authorization': 'Basic ' + Buffer.from(`${config.nfse_usuario}:${config.nfse_senha}`).toString('base64'),
      } : {}),
    },
    body: envelope,
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}\n${responseText.substring(0, 500)}`);
  }
  return responseText;
}

// ══════════════════════════════════════════════════════════════════════
// EMISSÃO (ORQUESTRADOR)
// ══════════════════════════════════════════════════════════════════════

export async function emitirNfse(input: EmissaoInput): Promise<{
  rpsNumero: number;
  rpsSerie: string;
  xmlEnvio: string;
  resultado: NfseResponse;
}> {
  const { config, descricao, valor, tomadorCpfCnpj, tomadorNome, tomadorEmail } = input;

  if (!config.cnpj) throw new Error('CNPJ do prestador não configurado');
  if (!config.inscricao_municipal) throw new Error('Inscrição municipal não configurada');
  if (config.nfse_provider === 'NENHUM') throw new Error('Nenhum provedor de NFS-e configurado.');

  const provider = getProvider(config.nfse_provider);
  if (!provider) throw new Error(`Provedor ${config.nfse_provider} não suportado`);

  let certBase64 = config.certificado_base64;
  let certSenha = config.certificado_senha;
  if (certBase64 && certBase64.includes(':')) certBase64 = decryptCertificateData(certBase64);
  if (certSenha && certSenha.includes(':')) certSenha = decryptCertificateData(certSenha);
  if (!certBase64 || !certSenha) throw new Error('Certificado digital A1 não configurado.');

  const aliquota = config.aliquota_iss || 5;
  const valorIss = config.iss_retido ? 0 : parseFloat((valor * aliquota / 100).toFixed(2));
  const valorLiquido = valor - (config.iss_retido ? parseFloat((valor * aliquota / 100).toFixed(2)) : 0);
  const rpsNumero = config.ultimo_rps;
  const rpsSerie = config.serie_rps || 'OHB';

  const rpsData: RpsData = {
    numero: rpsNumero, serie: rpsSerie, tipo: 1,
    dataEmissao: new Date().toISOString().split('T')[0],
    naturezaOperacao: 1,
    optanteSimplesNacional: config.regime_tributario === 'SIMPLES_NACIONAL',
    incentivadorCultural: false,
    valorServicos: valor, issRetido: config.iss_retido, aliquotaIss: aliquota,
    valorIss, valorLiquidoNfse: valorLiquido,
    codigoServico: config.codigo_servico || '8630-5/04',
    codigoCnae: config.codigo_cnae || '8630504',
    codigoMunicipioIncidencia: config.codigo_municipio_ibge || '',
    discriminacao: descricao,
    prestadorCnpj: config.cnpj, prestadorInscricaoMunicipal: config.inscricao_municipal,
    tomadorCpfCnpj, tomadorRazaoSocial: tomadorNome, tomadorEmail,
    tomadorLogradouro: null, tomadorNumero: null, tomadorBairro: null,
    tomadorCidade: null, tomadorUf: null, tomadorCep: null,
  };

  const rpsXml = gerarXmlRps(rpsData);
  const loteXml = gerarXmlLoteRps(rpsXml, config.cnpj, config.inscricao_municipal, rpsNumero);
  const xmlAssinado = assinarXml(loteXml, certBase64, certSenha);

  try {
    const envelope = provider.montarEnvelopeEmissao(xmlAssinado, config);
    const responseText = await enviarParaPrefeitura(envelope, provider.soapActionEmissao, config);
    const resultado = provider.parseRespostaEmissao(responseText, config);
    return { rpsNumero, rpsSerie, xmlEnvio: xmlAssinado, resultado };
  } catch (error: any) {
    return {
      rpsNumero, rpsSerie, xmlEnvio: xmlAssinado,
      resultado: {
        success: false, nfseNumero: null, codigoVerificacao: null, protocolo: null,
        xmlRetorno: null, linkVisualizacao: null,
        errorMessage: `Erro de comunicação: ${error.message}`, rejectCode: null,
      },
    };
  }
}

// ══════════════════════════════════════════════════════════════════════
// CANCELAMENTO DE NFS-e
// ══════════════════════════════════════════════════════════════════════

export async function cancelarNfse(input: CancelamentoInput): Promise<{
  success: boolean;
  xmlEnvio: string;
  xmlRetorno: string | null;
  errorMessage: string | null;
}> {
  const provider = getProvider(input.config.nfse_provider);
  if (!provider) throw new Error(`Provedor ${input.config.nfse_provider} não suportado`);

  let certBase64 = input.config.certificado_base64;
  let certSenha = input.config.certificado_senha;
  if (certBase64 && certBase64.includes(':')) certBase64 = decryptCertificateData(certBase64);
  if (certSenha && certSenha.includes(':')) certSenha = decryptCertificateData(certSenha);
  if (!certBase64 || !certSenha) throw new Error('Certificado digital A1 não configurado.');

  const cancelEnvelope = provider.montarEnvelopeCancelamento(input);
  const signedEnvelope = assinarXml(cancelEnvelope, certBase64, certSenha);

  try {
    const responseText = await enviarParaPrefeitura(signedEnvelope, provider.soapActionCancelamento, input.config);
    const resultado = provider.parseRespostaCancelamento(responseText);
    return { success: resultado.success, xmlEnvio: signedEnvelope, xmlRetorno: responseText, errorMessage: resultado.errorMessage };
  } catch (error: any) {
    return { success: false, xmlEnvio: signedEnvelope, xmlRetorno: null, errorMessage: `Erro de comunicação: ${error.message}` };
  }
}

// ══════════════════════════════════════════════════════════════════════
// EMISSÃO INTERNA (sem provedor)
// ══════════════════════════════════════════════════════════════════════

export function emitirInterna(
  config: Partial<FiscalConfig>, descricao: string, valor: number, rpsNumero: number
): { rpsNumero: number; rpsSerie: string; invoiceNumber: string; aliquotaIss: number; valorIss: number; valorLiquido: number } {
  const aliquota = config.aliquota_iss || 5;
  const valorIss = parseFloat((valor * aliquota / 100).toFixed(2));
  const valorLiquido = valor - (config.iss_retido ? valorIss : 0);
  return {
    rpsNumero, rpsSerie: config.serie_rps || 'OHB',
    invoiceNumber: `RPS-${String(rpsNumero).padStart(6, '0')}`,
    aliquotaIss: aliquota, valorIss, valorLiquido,
  };
}

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}
