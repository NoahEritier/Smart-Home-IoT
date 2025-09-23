# Smart Home IoT — MVP

Sistema de monitoreo de hogar inteligente que visualiza datos de sensores (temperatura, humedad y consumo eléctrico) en tiempo real usando MQTT.

## Estructura

- `publisher/`: Simulador de sensores Node.js que publica datos por MQTT
- `smart-home-iot/`: Aplicación principal con frontend React y publisher alternativo
- `web/`: Dashboard web estático simple
- `docs/`: Documentación y diagramas de arquitectura

## Fuente de datos y tópicos

Broker público Mosquitto:
- Frontend (WS): `wss://test.mosquitto.org:8081/mqtt`
- Publisher (TCP): `mqtt://test.mosquitto.org:1883`

Tópicos:
- `home/{location}/sensor/{type}` p.ej. `home/livingroom/sensor/temperature`
- El frontend se suscribe a: `home/+/sensor/+`

Payload JSON por mensaje:

```json
{
  "deviceId": "sensor-01",
  "type": "temperature",
  "value": 22.7,
  "unit": "C",
  "timestamp": "2025-09-23T13:52:00Z",
  "location": "livingroom"
}
```

Tipos simulados: `temperature (C)`, `humidity (%)`, `power (W)`.

## Ejecutar localmente

### Opción 1: Aplicación completa (Recomendado)
```bash
# Publisher
cd smart-home-iot/publisher
npm install
node publisher.js

# Frontend React (en otra terminal)
cd smart-home-iot/frontend
npm install
npm run dev
```

### Opción 2: Dashboard simple
```bash
# Publisher básico
cd publisher
npm install
node src/index.js

# Dashboard web estático
cd web
python -m http.server 8000
# Abre http://localhost:8000
```

## Notas
- Broker público: solo para demo (sin retención/SLAs). Puedes apuntar a otro host cambiando `publisher/src/index.js` y `web/app.js`.
