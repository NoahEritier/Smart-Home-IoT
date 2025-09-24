# Smart Home IoT — Sistema de Monitoreo en Tiempo Real

Sistema de hogar inteligente que visualiza datos de sensores (temperatura, humedad y consumo eléctrico) en tiempo real usando MQTT.

![Node.js](https://img.shields.io/badge/Node.js-v18-green)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📂 Estructura del proyecto

- 📦 `publisher/` — Simulador de sensores Node.js que publica datos por MQTT
- 📦 `smart-home-iot/` — Aplicación principal con frontend React y publisher alternativo
- 📦 `web/` — Dashboard web estático simple
- 📦 `docs/` — Documentación y diagramas de arquitectura

---

## 🔌 Fuente de datos y tópicos

Broker público Mosquitto:  
- Frontend (WebSocket): `wss://test.mosquitto.org:8081/mqtt`  
- Publisher (TCP): `mqtt://test.mosquitto.org:1883`
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

---

## ✨ Features

- Monitorización en tiempo real de sensores de temperatura, humedad y consumo eléctrico.  
- Dashboard web interactivo con React.  
- Simulador de sensores independiente en Node.js.  
- Tópicos MQTT dinámicos con suscripción `home/+/sensor/+`.  
- Opcional: dashboard web estático simple para demo rápida.  

---

## ⚙️ How it works

1. **Publisher**: Envía datos simulados de sensores vía MQTT al broker público.  
2. **Broker Mosquitto**: Recibe y distribuye los mensajes a los suscriptores.  
3. **Frontend React**: Se suscribe a los tópicos y actualiza la interfaz en tiempo real.  
4. **Dashboard web**: Muestra los valores de cada sensor con actualizaciones automáticas.  

El flujo de datos es:  
`Publisher → MQTT Broker → Frontend / Dashboard`  


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
