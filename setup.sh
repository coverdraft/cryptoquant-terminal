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
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# 5. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# 6. Generar Prisma Client
echo "⚙️  Generando Prisma Client..."
npx prisma generate

# 7. Aplicar migración
echo "🗄️  Creando base de datos..."
npx prisma db push

# 8. Bootstrap seed - templates, behavior models, capital state
echo "🌱 Poblando base de datos (bootstrap)..."
DATABASE_URL="file:./dev.db" npx tsx prisma/seed.ts

echo ""
echo "✅ ¡Instalación completada!"
echo ""
echo "Para arrancar el terminal ejecuta:"
echo "  npm run dev"
echo ""
echo "Luego abre: http://localhost:3000"
echo ""
echo "📊 Para cargar datos REALES de CoinGecko + DexScreener + DexPaprika:"
echo "  curl -X POST http://localhost:3000/api/data-loader -H 'Content-Type: application/json' -d '{\"action\":\"quick\"}'"
echo ""
echo "  Para carga completa (10,000+ tokens):"
echo "  curl -X POST http://localhost:3000/api/data-loader -H 'Content-Type: application/json' -d '{\"action\":\"full\"}'"
echo ""
echo "  Para ver estado de carga:"
echo "  curl http://localhost:3000/api/data-loader"
