# Projeto OdontoHub

Este é um projeto Full-Stack (React + Node.js/TypeScript) para gestão de clínicas odontológicas.

## Tecnologias Utilizadas

### Backend
- **Express**: Framework web para Node.js.
- **PostgreSQL (Neon)**: Banco de dados relacional.
- **Vercel Serverless Functions**: Para execução do backend em produção.
- **tsx**: Para execução em desenvolvimento.

### Frontend
- **React**: Biblioteca para construção de interfaces.
- **Vite**: Ferramenta de build e desenvolvimento.
- **Tailwind CSS**: Framework CSS utilitário.
- **Lucide React**: Ícones SVG.
- **Motion**: Biblioteca de animações.

## Requisitos
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

## Como executar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente no arquivo `.env`:
   ```env
   DATABASE_URL=seu_url_do_postgres
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
