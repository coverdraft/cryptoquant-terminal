#!/bin/bash
# ============================================================
# 🚀 CryptoQuant Terminal - Arranque (doble clic)
# ============================================================
# Pon este archivo en tu escritorio y haz doble clic.
# Se abre Terminal automáticamente y arranca la app.
# ============================================================

# Ir al directorio del proyecto (donde está este script)
cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════════╗"
echo "║     🚀 CryptoQuant Terminal - Arrancando    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Comprobar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado."
    echo ""
    echo "Instálalo desde: https://nodejs.org"
    echo "Descarga la versión LTS, instala, y vuelve a ejecutar esto."
    echo ""
    read -p "Pulsa Enter para cerrar..."
    exit 1
fi

echo "✅ Node.js $(node -v) encontrado"

# Comprobar si es la primera vez (no hay node_modules)
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Primera vez - Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error instalando dependencias"
        read -p "Pulsa Enter para cerrar..."
        exit 1
    fi
    echo "✅ Dependencias instaladas"
fi

# Comprobar si la base de datos existe
if [ ! -f "db/custom.db" ]; then
    echo ""
    echo "💾 Creando base de datos..."
    mkdir -p db
    npx prisma db push
    if [ $? -ne 0 ]; then
        echo "❌ Error creando base de datos"
        read -p "Pulsa Enter para cerrar..."
        exit 1
    fi
    echo "✅ Base de datos creada"
fi

# Comprobar si hay que construir
if [ ! -d ".next" ]; then
    echo ""
    echo "🔨 Construyendo la aplicación..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Error construyendo"
        read -p "Pulsa Enter para cerrar..."
        exit 1
    fi
    echo "✅ Aplicación construida"
fi

# Arrancar el servidor
echo ""
echo "🚀 Arrancando servidor..."
echo "─────────────────────────────────────"
echo "  URL: http://localhost:3000"
echo "  Para parar: Ctrl+C"
echo "─────────────────────────────────────"
echo ""

# Abrir el navegador después de 3 segundos
(sleep 3 && open http://localhost:3000) &

# Arrancar con límite de memoria
NODE_OPTIONS="--max-old-space-size=512" npx next start -p 3000

echo ""
echo "Servidor detenido. ¡Hasta luego!"
read -p "Pulsa Enter para cerrar..."
