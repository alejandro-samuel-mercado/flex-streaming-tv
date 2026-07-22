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
echo "  🚀 Nuba TV Release Builder (LOCAL)"
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
echo "🔨 Iniciando compilación LOCAL..."
echo "Comando: npx eas-cli build -p android --profile tv-production --local"
echo ""

cd "$SCRIPT_DIR"

# Se ejecuta en local y se guarda en la carpeta actual con el nombre final
npx eas-cli build \
    -p android \
    --profile tv-production \
    --local \
    --output "$LOCAL_OUT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ APK GENERADO LOCALMENTE:"
echo "  👉 $LOCAL_OUT"
echo ""
echo "  PRÓXIMOS PASOS:"
echo "  1. Entrá al Panel de Control alojado en tu VPS."
echo "  2. Ve a 'Aplicación Móvil & TV' -> Nueva Versión."
echo "  3. Subí este archivo APK que se acaba de generar."
echo "  4. Escribí las novedades (Changelog) desde el mismo panel web."
echo "  (El panel se encargará de guardar el APK y el .txt en el VPS)."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
