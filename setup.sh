#!/bin/bash
# CryptoQuant Terminal - Instalación Automática
# Ejecutar: bash setup.sh

set -e

echo "🚀 CryptoQuant Terminal - Instalación Automática"
echo "================================================"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ No estás en el directorio del proyecto"
    echo "Ejecuta: cd ~/CryptoQuant-Terminal"
    exit 1
fi

# 1. Configurar remote con token
echo "📡 Configurando GitHub..."
git remote set-url origin https://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@github.com/coverdraft/cryptoquant-terminal.git 2>/dev/null || true

# 2. Descargar última versión
echo "⬇️  Descargando última versión..."
git fetch origin
git reset --hard origin/main

# 3. Limpiar DB vieja
echo "🧹 Limpiando base de datos vieja..."
rm -f prisma/dev.db prisma/dev.db-journal db/*.db

# 4. Crear .env
echo "📝 Configurando entorno..."
echo 'DATABASE_URL="file:./dev.db"' > .env

# 5. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# 6. Generar Prisma Client
echo "⚙️  Generando Prisma Client..."
npx prisma generate

# 7. Aplicar migración
echo "🗄️  Creando base de datos..."
npx prisma migrate dev

# 8. Seed masivo - 5100+ tokens, 550 traders, 5000 DNA, velas, señales, etc.
echo "🌱 Poblando base de datos con datos MASIVOS..."
DATABASE_URL="file:./dev.db" npx tsx scripts/massive-local-seed.ts

echo ""
echo "✅ ¡Instalación completada!"
echo ""
echo "Para arrancar el terminal ejecuta:"
echo "  npm run dev"
echo ""
echo "Luego abre: http://localhost:3000"
