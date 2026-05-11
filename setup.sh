#!/bin/bash
# CryptoQuant Terminal - Instalación Automática
# Ejecutar: bash setup.sh

set -e

echo "🚀 CryptoQuant Terminal - Instalación Automática"
echo "================================================"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "${RED}❌ No estás en el directorio del proyecto${NC}"
    echo "Ejecuta: cd ~/CryptoQuant-Terminal"
    exit 1
fi

# 1. Configurar remote con token
echo "${YELLOW}📡 Configurando GitHub...${NC}"
git remote set-url origin https://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@github.com/coverdraft/cryptoquant-terminal.git 2>/dev/null || true

# 2. Descargar última versión
echo "${YELLOW}⬇️  Descargando última versión...${NC}"
git fetch origin
git reset --hard origin/main

# 3. Limpiar DB vieja
echo "${YELLOW}🧹 Limpiando base de datos vieja...${NC}"
rm -f prisma/dev.db prisma/dev.db-journal db/*.db

# 4. Crear .env
echo "${YELLOW}📝 Configurando entorno...${NC}"
echo 'DATABASE_URL="file:./dev.db"' > .env

# 5. Instalar dependencias
echo "${YELLOW}📦 Instalando dependencias...${NC}"
npm install

# 6. Generar Prisma Client
echo "${YELLOW}⚙️  Generando Prisma Client...${NC}"
npx prisma generate

# 7. Aplicar migración
echo "${YELLOW}🗄️  Creando base de datos...${NC}"
npx prisma migrate dev

# 8. Seed
echo "${YELLOW}🌱 Poblando base de datos...${NC}"
npx prisma db seed

echo ""
echo "${GREEN}✅ ¡Instalación completada!${NC}"
echo ""
echo "Para arrancar el terminal ejecuta:"
echo "  ${YELLOW}npm run dev${NC}"
echo ""
echo "Luego abre: ${GREEN}http://localhost:3000${NC}"
