#!/bin/bash
set -e

echo "🚀 Iniciando despliegue de Vapi..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI no está instalado. Instálalo desde: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK no está instalado. Ejecuta: npm install -g aws-cdk"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm no está instalado. Ejecuta: npm install -g pnpm"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "Credenciales de AWS no configuradas. Ejecuta: aws configure"
    exit 1
fi

print_status "Instalando dependencias..."
pnpm install

print_status "Construyendo paquetes compartidos..."
cd packages/shared
pnpm run build
cd ../..

print_status "Construyendo backend..."
cd backend
pnpm run build
cd ..

print_status "Bootstrapping CDK (si es necesario)..."
cd infra
cdk bootstrap

print_status "Desplegando infraestructura..."
cdk deploy --all --require-approval never

print_status "Obteniendo outputs de CloudFormation..."
OUTPUTS=$(aws cloudformation describe-stacks --stack-name VapiStack --query 'Stacks[0].Outputs' --output json)

# Extract important outputs
API_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="RestApiUrl") | .OutputValue')
WS_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="WebSocketUrl") | .OutputValue')
USER_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
IDENTITY_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="IdentityPoolId") | .OutputValue')
REGION=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="Region") | .OutputValue')

# Create environment file for the app
print_status "Creando archivo de configuración para la app..."
cat > app/.env << EOF
EXPO_PUBLIC_API_URL=${API_URL}
EXPO_PUBLIC_WS_URL=${WS_URL}
EXPO_PUBLIC_USER_POOL_ID=${USER_POOL_ID}
EXPO_PUBLIC_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
EXPO_PUBLIC_IDENTITY_POOL_ID=${IDENTITY_POOL_ID}
EXPO_PUBLIC_REGION=${REGION}
EXPO_PUBLIC_MAPBOX_STYLE_URL=https://demotiles.maplibre.org/style.json
EOF

cd ..

print_status "✅ Despliegue completado exitosamente!"
echo ""
echo "📋 Información del despliegue:"
echo "  - API URL: $API_URL"
echo "  - WebSocket URL: $WS_URL" 
echo "  - Región: $REGION"
echo ""
echo "🔧 Próximos pasos:"
echo "  1. Configura las variables de entorno en app/.env (ya creado)"
echo "  2. Para desarrollo local: cd app && pnpm run start"
echo "  3. Para construir la app: cd app && expo build"
echo ""
print_warning "Recuerda configurar tu estilo de mapa personalizado en EXPO_PUBLIC_MAPBOX_STYLE_URL si es necesario"