# Captei - Prospecção Inteligente via WhatsApp 🚀

Uma solução completa para captação de leads via Google Maps, gestão de pipeline (CRM) e disparos automáticos de WhatsApp utilizando a Evolution API. Desenvolvido com React, Node.js e PostgreSQL.

## 📦 Tecnologias Utilizadas
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + shadcn/ui + Zustand
- **Backend**: Node.js + Express + TypeScript
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **Filas / Jobs**: BullMQ + Redis
- **Integrações**: Google Places API (New) + Evolution API v2

## 🚀 Como rodar o projeto localmente

### 1. Requisitos
- [Docker](https://www.docker.com/) e Docker Compose instalados
- [Node.js](https://nodejs.org/) v18+

### 2. Configurando as Variáveis de Ambiente
Na pasta `backend`, crie um arquivo `.env` baseado no `.env.example`:
```bash
cp backend/.env.example backend/.env
```
Preencha a variável `GOOGLE_PLACES_API_KEY` com sua chave do Google Cloud, e defina a URL/Token da sua instância Evolution API.

### 3. Subindo o Banco de Dados e Redis
Na raiz do projeto (onde está o `docker-compose.yml`), rode:
```bash
docker-compose up -d
```
Isso vai criar o banco PostgreSQL (`captador_db`) e o Redis rodando em background.

### 4. Instalando e Iniciando
Na raiz do projeto (monorepo), instale as dependências e rode o projeto inteiro:

```bash
# Sincronize o schema com o banco de dados e rode a seed
cd backend
npm install
npm run db:push
npm run db:seed

# Volte para a raiz e inicie ambos Frontend e Backend simultaneamente
cd ..
npm install
npm run dev
```

O Frontend estará disponível em `http://localhost:5173`
O Backend estará rodando em `http://localhost:3000`

### 🔑 Acesso Padrão (Seed)
A seed já insere um usuário de testes e alguns leads fictícios:
- **E-mail**: admin@agencia.com
- **Senha**: admin123

## 🧩 Módulos Implementados
1. **Buscar Leads (Google Maps)**: Prospecção inteligente de negócios e extração de contatos.
2. **Leads (CRM)**: Gestão em funil/tabela (Novo, Contatado, Respondeu, Fechado, Perdido).
3. **Templates**: Criação de scripts com variáveis ({{nome}}, {{cidade}}).
4. **Campanhas**: Motor de disparos com BullMQ respeitando janelas de horário e atrasos randômicos para evitar bloqueios.
5. **Configurações**: Integração com instâncias do WhatsApp via QR Code na Evolution API.

## 📌 Avisos Importantes
- **Webhook**: Para pausar mensagens automáticas se o lead responder, a Evolution API deve conseguir acessar seu backend. Se estiver rodando localmente, use o Ngrok para expor a porta 3000 e configure-a na Evolution API.
