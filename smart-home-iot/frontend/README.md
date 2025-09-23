# Frontend (Vite + React)

## Requisitos
- Node.js 18+ (recomendado) o 20.18+ (para este template)

## Pasos
```bash
cd frontend
npm install
npm run dev
```

Abrir la URL que muestra Vite (típicamente `http://localhost:5173`).

## Notas
- El hook `useMqtt` se conecta a `wss://broker.hivemq.com:8000/mqtt` y escucha `home/sensors`.
- Asegúrate de tener corriendo el publisher en `smart-home-iot/publisher`:

```bash
node publisher.js
```
