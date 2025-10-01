# Changelog

Todos los cambios notables de Vapi serán documentados en este archivo.

## [1.0.0] - 2025-10-01

### Agregado
- 🗺️ **Mapa interactivo** con MapLibre GL y tiles OpenStreetMap
- 📍 **Sistema de reportes** con 3 niveles de disponibilidad (1, 2-5, +5 libres)
- 🎯 **Clustering inteligente** por geohash y lado de calle  
- ✅ **Validaciones comunitarias** para mantener datos actualizados
- 🚗 **Gestión de estacionamiento** para recordar ubicación del auto
- 🔄 **WebSocket real-time** para actualizaciones en vivo
- 📱 **Deep links** a Waze, Google Maps y Apple Maps
- 🌙 **Tema Tesla-style** con modo oscuro/claro automático
- 📲 **Live Activities** (iOS) con información contextual
- 🔲 **Overlay flotante** (Android) para acceso rápido
- ⚡ **Backend serverless** en AWS con auto-scaling
- 🔐 **Autenticación** con AWS Cognito
- ⏰ **TTL automático** para limpiar datos obsoletos (15 min)
- 🚀 **Scripts de despliegue** automatizados
- 🧪 **Tests unitarios** para funciones críticas

### Técnico
- **Stack**: React Native + AWS CDK + DynamoDB + Lambda
- **Mapas**: MapLibre GL con tiles vector gratuitos
- **Clustering**: Geohash precisión 6 + detección de lado
- **Real-time**: API Gateway WebSocket
- **Navegación**: Deep links universales
- **Monorepo**: pnpm workspaces con packages compartidos

### Infraestructura AWS
- API Gateway (REST + WebSocket)
- Lambda (Node.js 20)
- DynamoDB con TTL
- Cognito (autenticación + identity pools)
- CloudWatch (logs y métricas)
- CDK para Infrastructure as Code

### Seguridad
- Rate limiting (1 reporte/15s por usuario)
- Validación de coordenadas en backend
- Variables de entorno para credenciales
- Políticas IAM de menor privilegio
- Snap-to-street para normalización

### Próximas versiones
- [ ] Gamificación con puntos de reputación
- [ ] Moderación automática antispam
- [ ] Integración con garajes privados
- [ ] Geofencing para notificaciones
- [ ] Analytics de patrones de uso