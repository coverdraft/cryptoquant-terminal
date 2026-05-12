#!/bin/bash
# ============================================================
# 🔄 CryptoQuant Terminal - Actualizar (doble clic)
# ============================================================
# Descarga los últimos cambios de GitHub y reconstruye.
# No borra la base de datos ni tus datos.
# ============================================================

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════════╗"
echo "║     🔄 CryptoQuant Terminal - Actualizar     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Comprobar si git está configurado
if ! command -v git &> /dev/null; then
    echo "❌ Git no está instalado."
    echo "Instala Xcode Command Line Tools:"
    echo "  xcode-select --install"
    read -p "Pulsa Enter para cerrar..."
    exit 1
fi

# Comprobar si hay origen remoto
if ! git remote | grep -q "origin"; then
    echo "⚠️  No hay repositorio remoto configurado."
    echo ""
    echo "Para conectar con GitHub:"
    echo "  1. Crea un repo en https://github.com/new"
    echo "  2. Ejecuta:"
    echo "     git remote add origin https://github.com/TU-USUARIO/cryptoquant-terminal.git"
    echo ""
    read -p "Pulsa Enter para cerrar..."
    exit 1
fi

echo "📥 Descargando cambios..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Error descargando cambios"
    echo "¿Tienes cambios locales sin guardar?"
    echo "Ejecuta: git stash && git pull && git stash pop"
    read -p "Pulsa Enter para cerrar..."
    exit 1
fi

echo ""
echo "📦 Actualizando dependencias si hay cambios..."
npm install

echo ""
echo "🔨 Reconstruyendo aplicación..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error construyendo"
    read -p "Pulsa Enter para cerrar..."
    exit 1
fi

echo ""
echo "💾 Actualizando base de datos si hay cambios en el schema..."
npx prisma db push

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          ✅ ¡Actualización completada!        ║"
echo "║                                              ║"
echo "║   Ahora arranca la app con:                  ║"
echo "║   🚀 Arrancar CryptoQuant.command            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
read -p "Pulsa Enter para cerrar..."
