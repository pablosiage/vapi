#!/bin/bash
set -e

echo "🌱 Generando datos de prueba para Vapi..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    print_warning "No se pudo obtener la URL de la API automáticamente."
    echo "Por favor, configura la variable API_URL manualmente:"
    echo "export API_URL=https://tu-api-gateway-url.amazonaws.com/prod"
    exit 1
fi

print_status "Usando API URL: $API_URL"

# Sample locations around Buenos Aires
LOCATIONS=(
    "-34.6118,-58.3960" # Recoleta
    "-34.6092,-58.3974" # Retiro
    "-34.6037,-58.3816" # Plaza de Mayo
    "-34.6118,-58.3731" # Puerto Madero
    "-34.6158,-58.3731" # San Telmo
    "-34.6118,-58.4173" # Palermo
    "-34.5875,-58.3974" # Belgrano
    "-34.6342,-58.3685" # La Boca
)

COUNT_BUCKETS=("1" "2_5" "5_plus")

print_status "Generando reportes de prueba..."

for location in "${LOCATIONS[@]}"; do
    IFS=',' read -r lat lng <<< "$location"
    
    # Random count bucket
    count_bucket=${COUNT_BUCKETS[$RANDOM % ${#COUNT_BUCKETS[@]}]}
    
    # Create report
    curl -s -X POST "$API_URL/report" \
        -H "Content-Type: application/json" \
        -d "{
            \"lat\": $lat,
            \"lng\": $lng,
            \"count_bucket\": \"$count_bucket\"
        }" > /dev/null
    
    echo -n "."
done

echo ""
print_status "✅ Datos de prueba generados exitosamente!"
echo ""
echo "📍 Se crearon reportes en las siguientes zonas:"
echo "  - Recoleta, Retiro, Centro"
echo "  - Puerto Madero, San Telmo"
echo "  - Palermo, Belgrano, La Boca"
echo ""
echo "🔧 Para verificar:"
echo "  curl \"$API_URL/nearby?lat=-34.6037&lng=-58.3816&radius=5000\""