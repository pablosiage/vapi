# Vapi - Smart Parking Discovery

Vapi es una aplicación móvil para encontrar espacios libres de estacionamiento en la vía pública, con backend serverless en AWS y app nativa en React Native.

## 🚀 Características principales

- **Mapa en tiempo real** con espacios disponibles por cuadra y lado de calle
- **Reportes rápidos** con 3 niveles: "1 libre", "2-5 libres", "+5 libres"
- **Validaciones comunitarias** para mantener información actualizada
- **Navegación integrada** con deep links a Waze, Google Maps y Apple Maps
- **Gestión de estacionamiento** para recordar dónde dejaste tu auto
- **Actualizaciones en vivo** vía WebSocket
- **Live Activities** (iOS) y **overlay flotante** (Android) opcionales
- **Diseño Tesla-style** con modo oscuro/claro

## 📁 Estructura del proyecto

```
vapi/
├── packages/shared/     # Tipos y utilidades compartidas
├── infra/              # Infraestructura AWS CDK
├── backend/            # Funciones Lambda
├── app/                # App React Native
└── scripts/            # Scripts de despliegue
```

## 🛠 Stack tecnológico

### Backend (AWS Serverless)
- **API Gateway** (REST + WebSocket)
- **Lambda** (Node.js 20)
- **DynamoDB** (con TTL)
- **Cognito** (autenticación)
- **CloudWatch** (logs)

### Frontend (React Native)
- **Expo** framework
- **MapLibre GL** (mapas vectoriales OSM)
- **TypeScript**
- **React Navigation**
- **Reanimated** (animaciones)

### Datos
- **Geohash** precisión 6 para clustering
- **TTL automático** (15 min sin confirmaciones)
- **Detección de lado de calle** por heurística

## 🚀 Instalación y despliegue

### Prerrequisitos

```bash
# Instalar herramientas globales
npm install -g pnpm aws-cdk

# Configurar AWS CLI
aws configure
```

### Despliegue automático

```bash
# Despliegue completo con un comando
./scripts/deploy.sh
```

El script automáticamente:
1. Instala dependencias
2. Construye paquetes
3. Despliega infraestructura AWS
4. Configura variables de entorno
5. Genera archivo `.env` para la app

### Despliegue manual

```bash
# 1. Instalar dependencias
pnpm install

# 2. Construir paquetes compartidos
cd packages/shared && pnpm run build

# 3. Construir backend
cd ../../backend && pnpm run build

# 4. Desplegar infraestructura
cd ../infra && cdk deploy --all

# 5. Configurar app (usar outputs de CloudFormation)
cd ../app && cp .env.example .env
# Editar .env con los valores reales
```

### Desarrollo local

```bash
# Backend local (opcional)
cd backend && pnpm run dev

# App React Native
cd app && pnpm run start
```

## 🗺 Configuración de mapas

### MapLibre GL (Gratuito)
Por defecto usa tiles de demostración de MapLibre. Para producción:

```bash
# En app/.env
EXPO_PUBLIC_MAPBOX_STYLE_URL=https://tu-estilo-maplibre.json
```

### Estilos personalizados
Crear estilo personalizado en [MapTiler](https://www.maptiler.com/) o [Protomaps](https://protomaps.com/):

```json
{
  "version": 8,
  "sources": {
    "openmaptiles": {
      "type": "vector",
      "url": "https://api.maptiler.com/tiles/v3/tiles.json?key=TU_API_KEY"
    }
  },
  "layers": [...]
}
```

## 📱 Permisos móviles

### iOS
Agregar a `app.json` o `Info.plist`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Vapi necesita tu ubicación para mostrar espacios de estacionamiento cercanos",
        "NSSupportsLiveActivities": true
      }
    }
  }
}
```

### Android
Agregar a `app.json`:
```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "SYSTEM_ALERT_WINDOW"
      ]
    }
  }
}
```

## 🧪 Testing

### Datos de prueba
```bash
# Generar reportes de ejemplo
./scripts/seed-dev.sh
```

### Tests unitarios
```bash
# Backend
cd backend && pnpm test

# Shared
cd packages/shared && pnpm test
```

### API manual
```bash
# Obtener reportes cercanos
curl "https://tu-api.amazonaws.com/prod/nearby?lat=-34.6037&lng=-58.3816&radius=1000"

# Crear reporte
curl -X POST "https://tu-api.amazonaws.com/prod/report" \
  -H "Content-Type: application/json" \
  -d '{"lat":-34.6037,"lng":-58.3816,"count_bucket":"2_5"}'
```

## 🔧 Configuración de Live Activities (iOS)

### Implementación nativa requerida
Las Live Activities requieren código Swift nativo. Crear:

1. **Widget Extension** en Xcode
2. **ActivityKit** implementation
3. **Native module** bridge

Ejemplo básico en `ios/VapiLiveActivity.swift`:
```swift
import ActivityKit
import WidgetKit

@available(iOS 16.1, *)
struct VapiLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: VapiActivityAttributes.self) { context in
            // Live Activity UI
            VStack {
                Text("\(context.state.nearbyCount) · \(context.state.distance)")
                Button("Elegir") { /* Action */ }
            }
        }
    }
}
```

## 🤖 Configuración de Overlay (Android)

### Implementación nativa requerida
El overlay flotante requiere código Java/Kotlin nativo:

```kotlin
// android/app/src/main/java/VapiOverlayModule.kt
class VapiOverlayModule : ReactContextBaseJavaModule() {
    override fun getName() = "VapiOverlay"
    
    @ReactMethod
    fun showOverlay(data: ReadableMap, promise: Promise) {
        // Implementar overlay con TYPE_APPLICATION_OVERLAY
    }
}
```

## 🔐 Seguridad

### Variables de entorno
Nunca commitear credenciales. Usar:
```bash
# app/.env (git-ignored)
EXPO_PUBLIC_API_URL=https://...
EXPO_PUBLIC_USER_POOL_ID=...
```

### Rate limiting
El backend incluye rate limiting por usuario (1 reporte/15s).

### Validación de datos
- Coordenadas validadas en backend
- Snap-to-street opcional
- TTL automático para datos obsoletos

## 📊 Monitoreo

### CloudWatch
- Logs estructurados en Lambdas
- Métricas de latencia (p50/p95)
- Conteo de eventos WebSocket

### Ejemplo de query:
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

## 🛣 Roadmap

### Implementado
- ✅ Mapa con clustering
- ✅ Reportes y confirmaciones
- ✅ WebSocket real-time
- ✅ Deep links navegación
- ✅ Gestión de estacionamiento
- ✅ Tema Tesla-style

### Futuro (no implementado)
- 🔄 Gamificación y puntos
- 🔄 Moderación antispam
- 🔄 Integración garajes privados
- 🔄 Geopromos comerciales
- 🔄 Notificaciones push

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/nueva-feature`)
3. Commit cambios (`git commit -m 'Add nueva feature'`)
4. Push al branch (`git push origin feature/nueva-feature`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para detalles.

## 🆘 Soporte

### Problemas comunes

**Error: "Location permission denied"**
- Verificar permisos en configuración del dispositivo
- Reinstalar app si es necesario

**Error: "WebSocket connection failed"**
- Verificar variable `EXPO_PUBLIC_WS_URL`
- Comprobar conectividad de red

**Error: "CDK deploy failed"**
- Ejecutar `cdk bootstrap` primero
- Verificar credenciales AWS

### Logs útiles
```bash
# Ver logs de Lambda
aws logs tail /aws/lambda/VapiApiLambda --follow

# Ver stack de CDK
cdk diff
```

---

Hecho con ❤️ para la comunidad de conductores