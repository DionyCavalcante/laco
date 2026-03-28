#!/bin/bash
# setup.sh — Inicializa o repositório e sobe pro GitHub
# Uso: bash setup.sh

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        Laço — Setup inicial          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ---- Verifica dependências ----
if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git não encontrado.${NC}"
  echo "   Instale em: https://git-scm.com/downloads"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js não encontrado.${NC}"
  echo "   Instale em: https://nodejs.org"
  exit 1
fi

echo -e "${GREEN}✅ Git e Node.js encontrados${NC}"
echo ""

# ---- Coleta informações ----
echo -e "${YELLOW}Passo 1 — Repositório GitHub${NC}"
echo "Crie um repositório VAZIO em: https://github.com/new"
echo "(deixe sem README, sem .gitignore, sem licença)"
echo ""
read -p "Cole aqui a URL do repositório (ex: https://github.com/seu-usuario/laco): " REPO_URL

if [ -z "$REPO_URL" ]; then
  echo -e "${RED}❌ URL não informada. Encerrando.${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Passo 2 — Configurações da clínica${NC}"
read -p "Nome da clínica (ex: Clínica Bella Estética): " CLINIC_NAME
read -p "Slug da clínica — só letras e hífens (ex: bella-estetica): " CLINIC_SLUG

if [ -z "$CLINIC_NAME" ] || [ -z "$CLINIC_SLUG" ]; then
  echo -e "${RED}❌ Nome e slug são obrigatórios.${NC}"
  exit 1
fi

# ---- Gera API_SECRET ----
echo ""
echo -e "${YELLOW}Passo 3 — Gerando chave de acesso...${NC}"
if command -v openssl &> /dev/null; then
  API_SECRET=$(openssl rand -hex 32)
else
  API_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
fi
echo -e "${GREEN}✅ API_SECRET gerada${NC}"

# ---- Cria .env ----
echo ""
echo -e "${YELLOW}Passo 4 — Criando arquivo .env...${NC}"
cat > backend/.env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/laco
PORT=3000
NODE_ENV=development
API_SECRET=${API_SECRET}
FRONTEND_URL=http://localhost:3000
CLINIC_SLUG=${CLINIC_SLUG}
CLINIC_NAME=${CLINIC_NAME}
BACKUP_DIR=./backups
BACKUP_KEEP=7
EOF
echo -e "${GREEN}✅ backend/.env criado${NC}"

# ---- Git ----
echo ""
echo -e "${YELLOW}Passo 5 — Inicializando repositório Git...${NC}"

if [ -d ".git" ]; then
  echo "   Repositório Git já existe, pulando git init"
else
  git init
  echo -e "${GREEN}✅ git init${NC}"
fi

# Garante que uploads e backups não vão pro repo
grep -qxF 'backend/uploads/' .gitignore 2>/dev/null || echo 'backend/uploads/' >> .gitignore
grep -qxF 'backups/' .gitignore 2>/dev/null || echo 'backups/' >> .gitignore
grep -qxF 'backend/.env' .gitignore 2>/dev/null || echo 'backend/.env' >> .gitignore

git add .
git commit -m "feat: laço mvp inicial"
echo -e "${GREEN}✅ commit criado${NC}"

# ---- Push ----
echo ""
echo -e "${YELLOW}Passo 6 — Subindo para o GitHub...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
git branch -M main
git push -u origin main

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Código no GitHub!                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Próximos passos — Railway:${NC}"
echo ""
echo "  1. Acesse: https://railway.app"
echo "  2. New Project → Deploy from GitHub → selecione o repo"
echo "  3. New → Database → Add PostgreSQL"
echo "  4. Vá em Variables e adicione:"
echo ""
echo -e "     ${YELLOW}NODE_ENV${NC}        = production"
echo -e "     ${YELLOW}API_SECRET${NC}      = ${API_SECRET}"
echo -e "     ${YELLOW}CLINIC_SLUG${NC}     = ${CLINIC_SLUG}"
echo -e "     ${YELLOW}CLINIC_NAME${NC}     = ${CLINIC_NAME}"
echo -e "     ${YELLOW}FRONTEND_URL${NC}    = https://SUA-URL.railway.app"
echo ""
echo "  5. O Railway faz o deploy automaticamente."
echo ""
echo -e "${CYAN}Após o deploy, acesse:${NC}"
echo "  Dashboard:  https://SUA-URL.railway.app"
echo "  Portal:     https://SUA-URL.railway.app/${CLINIC_SLUG}/agendar"
echo ""
echo -e "${YELLOW}Guarde sua API_SECRET — é a senha do dashboard:${NC}"
echo -e "  ${GREEN}${API_SECRET}${NC}"
echo ""
