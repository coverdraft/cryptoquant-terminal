#!/bin/bash
# ============================================================
# 🛑 CryptoQuant Terminal - Detener servidor
# ============================================================
# Detiene el servidor si se quedó corriendo.
# ============================================================

echo "🛑 Deteniendo CryptoQuant Terminal..."

# Buscar y matar el proceso de Next.js
pkill -f "next start" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Servidor detenido"
else
    echo "ℹ️  No se encontró servidor corriendo"
fi

echo ""
read -p "Pulsa Enter para cerrar..."
