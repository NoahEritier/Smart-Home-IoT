# Smart Home IoT Dashboard

Simulación de un sistema de monitoreo de hogar inteligente que muestra datos de sensores (temperatura, humedad y consumo eléctrico) en tiempo real usando MQTT y React.

## Estructura del proyecto

- `publisher/` → contiene `publisher.js` que publica datos al broker HiveMQ por WebSockets. Publica:
  - Tópicos granulares: `home/livingroom/temperature`, `home/livingroom/humidity`, `home/main/power`
  - Tópico consolidado: `home/sensors` con un objeto JSON agregado por ciclo
- `frontend/` → aplicación React + Vite que consume los datos y muestra KPIs y gráficos en tiempo real (usa `mqtt`, `chart.js`, `react-chartjs-2`, `date-fns`).
- `docs/` → diagramas y material de apoyo (ver `docs/architecture.drawio` y `docs/architecture.mmd`).

## Instrucciones de ejecución

### 1) Publisher
```powershell
cd publisher
npm install
node publisher.js
```

### 2) Frontend
```powershell
cd frontend
npm install
npm run dev
```

Abre en el navegador la URL que muestra Vite (típicamente `http://localhost:5173`).

## Notas de debug rápido
- Error `Cannot find module 'publisher.js'` → ejecuta `node publisher.js` dentro de la carpeta `publisher`.
- Si no llegan datos al frontend → confirma que el publisher está corriendo y que el broker WS `wss://broker.hivemq.com:8000/mqtt` es accesible desde tu red.
- Reconexiones del broker público → es normal; reintenta. El broker público es solo para demos (sin garantías de disponibilidad/retención).

## Flujo del sistema
Publisher → Broker HiveMQ (WebSocket) → Frontend (Dashboard en tiempo real)

```mermaid
flowchart LR
  A[Publisher (Node.js)] -- MQTT WS --> B[(Broker HiveMQ)]
  B -- MQTT WS --> C[Frontend (React + Vite)]

  subgraph Topics
    D[home/livingroom/temperature]
    E[home/livingroom/humidity]
    F[home/main/power]
    G[home/sensors (consolidado)]
  end

  A --> D
  A --> E
  A --> F
  A --> G
  D & E & F & G -. suscripción .-> C
```

> También puedes abrir/editar el diagrama en draw.io: `docs/architecture.drawio`.

## Casos de uso reales
- Monitoreo de eficiencia energética.
- Alertas de temperatura o humedad críticas.
- Optimización del consumo eléctrico en el hogar.

## Extras recomendados (opcionales)
- Agregar sensores adicionales (CO₂, luz, movimiento).
- Colores y thresholds en los gráficos (zonas de alerta/seguridad).
- Diagrama simple de arquitectura para la presentación.
