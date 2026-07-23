#!/bin/bash
# =============================================================================
#  release.sh — Script de compilación de APK para Nuba TV
# =============================================================================

set -e

NO_BUMP="${1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_FILE="$SCRIPT_DIR/version.json"

CURRENT_CODE=$(node -e "console.log(require('$VERSION_FILE').versionCode)")
CURRENT_NAME=$(node -e "console.log(require('$VERSION_FILE').versionName)")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Nuba TV Release Builder (CLOUD)"
echo "  Versión actual: $CURRENT_NAME (code $CURRENT_CODE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$NO_BUMP" != "--no-bump" ]]; then
    NEW_CODE=$((CURRENT_CODE + 1))
    MAJOR=$(echo "$CURRENT_NAME" | cut -d. -f1)
    MINOR=$(echo "$CURRENT_NAME" | cut -d. -f2)
    NEW_MINOR=$((MINOR + 1))
    if [[ $NEW_MINOR -ge 10 ]]; then
        NEW_MAJOR=$((MAJOR + 1))
        NEW_NAME="${NEW_MAJOR}.0"
    else
        NEW_NAME="${MAJOR}.${NEW_MINOR}"
    fi

    node -e "
        const fs = require('fs');
        fs.writeFileSync('$VERSION_FILE', JSON.stringify({
            versionCode: $NEW_CODE,
            versionName: '$NEW_NAME'
        }, null, 2) + '\n');
    "

    echo "  ✅ Nueva versión: $NEW_NAME (code $NEW_CODE)"
    FINAL_NAME=$NEW_NAME
else
    echo "  ⏸  Sin incremento de versión (--no-bump)"
    FINAL_NAME=$CURRENT_NAME
fi

APK_NAME="NUBA-TV-V${FINAL_NAME}.apk"
LOCAL_OUT="$SCRIPT_DIR/$APK_NAME"

echo ""
echo "🔨 Iniciando compilación en la NUBE..."
echo "Comando: npx eas-cli build -p android --profile tv-production"
echo ""

cd "$SCRIPT_DIR"

# Se ejecuta en la nube de Expo
npx eas-cli build \
    -p android \
    --profile tv-production

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ COMPILACIÓN ENVIADA A LA NUBE"
echo "  👉 Usa el link que te da Expo arriba para descargar tu APK (.apk) cuando termine."
echo ""
echo "  PRÓXIMOS PASOS:"
echo "  1. Entrá al link de Expo de arriba, esperá a que termine y descargá el APK."
echo "  2. Entrá al Panel de Control alojado en tu VPS."
echo "  3. Ve a 'Aplicación Móvil & TV' -> Nueva Versión."
echo "  4. Subí el archivo APK que descargaste."
echo "  5. Escribí las novedades (Changelog) desde el mismo panel web."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
