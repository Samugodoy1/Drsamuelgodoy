import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from '../icons';
import { Link } from 'react-router-dom';

export const TermsPage = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-[32px] shadow-sm border border-black/5">
        <Link to="/" className="inline-flex items-center text-[#22C55E] font-bold mb-8 hover:gap-2 transition-all">
          <ChevronRight className="rotate-180" size={20} />
          Voltar para o Início
        </Link>
        
        <h1 className="text-3xl font-bold text-[#0F172A] mb-8">Termos de Uso — OdontoHub</h1>
        
        <div className="prose prose-slate max-w-none space-y-6 text-[#64748B] leading-relaxed">
          <p>Bem-vindo ao OdontoHub. Ao utilizar nossa plataforma, você concorda com os seguintes termos:</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">1. Aceitação dos Termos</h2>
            <p>Ao se cadastrar e utilizar o OdontoHub, você declara ter lido, compreendido e aceitado estes Termos de Uso e nossa Política de Privacidade.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">2. Uso da Plataforma</h2>
            <p>O OdontoHub é uma ferramenta de gestão para clínicas odontológicas. O usuário é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorram em sua conta.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">3. Responsabilidade Profissional</h2>
            <p>O cirurgião-dentista usuário da plataforma é o único responsável técnico e legal pelos dados clínicos, diagnósticos e tratamentos registrados no sistema, devendo observar as normas do Conselho Federal de Odontologia (CFO).</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">4. Propriedade Intelectual</h2>
            <p>Todo o conteúdo, design e código do OdontoHub são de propriedade exclusiva da plataforma e protegidos por leis de propriedade intelectual.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">5. Limitação de Responsabilidade</h2>
            <p>O OdontoHub não se responsabiliza por falhas de conexão, perda de dados decorrente de mau uso ou decisões clínicas tomadas com base nas informações do sistema.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">6. Alterações nos Termos</h2>
            <p>Reservamo-nos o direito de alterar estes termos a qualquer momento. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.</p>
          </section>

          <p className="pt-8 text-sm text-[#94A3B8] italic">Última atualização: 14 de Março de 2026</p>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-[32px] shadow-sm border border-black/5">
        <Link to="/" className="inline-flex items-center text-[#22C55E] font-bold mb-8 hover:gap-2 transition-all">
          <ChevronRight className="rotate-180" size={20} />
          Voltar para o Início
        </Link>
        
        <h1 className="text-3xl font-bold text-[#0F172A] mb-8">Política de Privacidade — OdontoHub</h1>
        
        <div className="prose prose-slate max-w-none space-y-6 text-[#64748B] leading-relaxed">
          <p>A sua privacidade é importante para nós. Esta política explica como coletamos, usamos e protegemos seus dados e os dados de seus pacientes.</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">1. Coleta de Dados</h2>
            <p>Coletamos dados de cadastro (nome, e-mail, CRO) e dados inseridos por você sobre seus pacientes (histórico clínico, anamnese, odontograma).</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">2. Uso das Informações</h2>
            <p>Os dados são utilizados exclusivamente para a prestação dos serviços da plataforma, gestão da clínica e suporte ao usuário. Não vendemos dados a terceiros.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">3. Segurança dos Dados</h2>
            <p>Utilizamos criptografia e protocolos de segurança modernos para proteger as informações. Os dados dos pacientes são tratados com o sigilo exigido pela LGPD e normas éticas da odontologia.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">4. Compartilhamento de Dados</h2>
            <p>Não compartilhamos informações pessoais ou clínicas com terceiros, exceto quando exigido por lei ou necessário para a operação técnica do sistema (ex: provedores de nuvem).</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">5. Seus Direitos</h2>
            <p>Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações da plataforma.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">6. Cookies</h2>
            <p>Utilizamos cookies apenas para manter sua sessão ativa e melhorar a experiência de uso.</p>
          </section>

          <p className="pt-8 text-sm text-[#94A3B8] italic">Última atualização: 14 de Março de 2026</p>
        </div>
      </div>
    </div>
  );
};
