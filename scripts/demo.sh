#!/bin/bash
set -e

echo "🎬 Iniciando demo de Vapi..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[DEMO]${NC} $1"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Get API endpoint
if [ -z "$API_URL" ]; then
    API_URL=$(aws cloudformation describe-stacks --stack-name VapiStack --query 'Stacks[0].Outputs[?OutputKey==`RestApiUrl`].OutputValue' --output text 2>/dev/null || echo "")
fi

if [ -z "$API_URL" ]; then
    print_warning "No se pudo obtener la URL de la API. Configurando manualmente..."
    API_URL="https://tu-api-aqui.amazonaws.com/prod"
fi

print_status "URL de la API: $API_URL"
echo ""

print_step "1. Creando reportes de ejemplo en Buenos Aires..."
echo ""

# Buenos Aires - Centro
print_status "Reportando espacios en el Centro (Plaza de Mayo)"
curl -s -X POST "$API_URL/report" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": -34.6037,
    "lng": -58.3816,
    "count_bucket": "5_plus"
  }' | jq '.reportId // .error' 2>/dev/null || echo "OK"

# Recoleta
print_status "Reportando espacios en Recoleta"
curl -s -X POST "$API_URL/report" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": -34.6118,
    "lng": -58.3960,
    "count_bucket": "2_5"
  }' | jq '.reportId // .error' 2>/dev/null || echo "OK"

# Palermo
print_status "Reportando espacios en Palermo"
curl -s -X POST "$API_URL/report" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": -34.5875,
    "lng": -58.4173,
    "count_bucket": "1"
  }' | jq '.reportId // .error' 2>/dev/null || echo "OK"

# Puerto Madero
print_status "Reportando espacios en Puerto Madero"
curl -s -X POST "$API_URL/report" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": -34.6118,
    "lng": -58.3731,
    "count_bucket": "5_plus"
  }' | jq '.reportId // .error' 2>/dev/null || echo "OK"

echo ""
print_step "2. Consultando espacios cercanos al Centro..."
echo ""

NEARBY_RESPONSE=$(curl -s "$API_URL/nearby?lat=-34.6037&lng=-58.3816&radius=5000")
echo "$NEARBY_RESPONSE" | jq '.' 2>/dev/null || echo "$NEARBY_RESPONSE"

echo ""
print_step "3. URLs de navegación para testing:"
echo ""

echo "🗺️  Waze:"
echo "   waze://?ll=-34.6037,-58.3816&navigate=yes"
echo ""

echo "🌍 Google Maps:"
echo "   https://www.google.com/maps/dir/?api=1&destination=-34.6037,-58.3816"
echo ""

echo "🍎 Apple Maps:"
echo "   http://maps.apple.com/?daddr=-34.6037,-58.3816&dirflg=d"
echo ""

print_step "4. Comandos útiles para testing:"
echo ""

echo "📱 Abrir app Expo:"
echo "   cd app && pnpm run start"
echo ""

echo "🔍 Consultar API:"
echo "   curl \"$API_URL/nearby?lat=-34.6037&lng=-58.3816&radius=1000\""
echo ""

echo "📍 Crear reporte:"
echo "   curl -X POST \"$API_URL/report\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"lat\":-34.6037,\"lng\":-58.3816,\"count_bucket\":\"2_5\"}'"
echo ""

print_step "5. Métricas y monitoreo:"
echo ""

echo "📊 Ver logs de Lambda:"
echo "   aws logs tail /aws/lambda/VapiApiLambda --follow"
echo ""

echo "📈 CloudWatch Insights query:"
echo "   fields @timestamp, @message"
echo "   | filter @message like /nearby/"
echo "   | stats count() by bin(5m)"
echo ""

print_status "✅ Demo configurado exitosamente!"
print_warning "Recuerda configurar las variables de entorno en app/.env para usar la app móvil"