# OdontoHub — Frontend

Frontend React do sistema OdontoHub para gestao de clinicas odontologicas.  
O backend roda na API central: [odontohub-api](https://github.com/Samugodoy1/odontohub-api) (`https://api.odontohub.app.br`).

## Tecnologias

- **React 19** + **TypeScript**
- **Vite** — build e dev server
- **Tailwind CSS 4**
- **Lucide React** — icones
- **Motion / Framer Motion** — animacoes

## Requisitos

- Node.js >= 18
- npm >= 9

## Como executar localmente

1. Instale as dependencias:
   ```bash
   npm install
   ```

2. Configure `.env` (copie de `.env.example`):
   ```env
   VITE_API_URL=https://api.odontohub.app.br
   ```

3. Inicie o dev server:
   ```bash
   npm run dev
   ```

## Scripts

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Inicia o Vite dev server |
| `npm run build` | Build de producao |
| `npm run preview` | Preview do build local |
| `npm run lint` | Verifica tipos com TypeScript |
