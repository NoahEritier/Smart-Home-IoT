// smart-home-iot-publisher.js
// Simulador de sensores para Smart Home IoT que publica datos en tiempo real por MQTT.
// Ejecutar: node publisher.js

const mqtt = require('mqtt');

// Broker público (por defecto WebSocket para evitar bloqueos TCP 1883)
// Cambiá con BROKER_URL si querés otro host/puerto.
// Ejemplos:
//  - wss://test.mosquitto.org:8081/mqtt
//  - wss://broker.hivemq.com:8000/mqtt
//  - mqtt://test.mosquitto.org:1883 (TCP)
const BROKER_URL = process.env.BROKER_URL || 'wss://test.mosquitto.org:8081/mqtt';

// Rooms to simulate
const ROOMS = ['cocina', 'jardin', 'bano', 'habitacion'];

// Devices per room with simple expected power profiles (W)
const ROOM_DEVICES = {
  cocina: [
    { id: 'heladera', base: 120, peak: 180, duty: 0.6 },
    { id: 'microondas', base: 0, peak: 1100, duty: 0.05 },
    { id: 'cafetera', base: 0, peak: 800, duty: 0.03 }
  ],
  jardin: [
    { id: 'bomba_agua', base: 0, peak: 400, duty: 0.1 },
    { id: 'luces_exterior', base: 20, peak: 60, duty: 0.7 },
    { id: 'cortadora', base: 0, peak: 1200, duty: 0.01 }
  ],
  bano: [
    { id: 'calentador_agua', base: 0, peak: 1500, duty: 0.15 },
    { id: 'extractor', base: 0, peak: 60, duty: 0.3 },
    { id: 'luces', base: 5, peak: 25, duty: 0.5 }
  ],
  habitacion: [
    { id: 'aire_acondicionado', base: 0, peak: 1200, duty: 0.2 },
    { id: 'pc', base: 40, peak: 250, duty: 0.5 },
    { id: 'lampara', base: 5, peak: 20, duty: 0.6 }
  ]
};

// Conexión
const client = mqtt.connect(BROKER_URL, {
  reconnectPeriod: 5000,
  protocolVersion: 5,
  clean: true
});

client.on('connect', () => {
  console.log('✅ Conectado al broker MQTT:', BROKER_URL);
});

client.on('reconnect', () => {
  console.log('🔄 Reintentando conexión al broker...');
});

client.on('close', () => {
  console.log('❌ Conexión cerrada con el broker.');
});

client.on('offline', () => {
  console.log('⚠️ Cliente MQTT está offline.');
});

client.on('error', (err) => {
  console.error('🚨 Error de conexión MQTT:', err.message);
});

// Generadores de señal realista
function gaussianRandom(mean = 0, stdev = 1) {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return mean + stdev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// CO2 (ppm): niveles típicos interior 400-2000, con picos por ocupación
function simulateCo2() {
  const hour = new Date().getHours();
  let base = 500;
  if ((hour >= 8 && hour <= 10) || (hour >= 19 && hour <= 22)) base = 900;
  const noise = gaussianRandom(0, 80);
  const val = Math.max(380, base + noise);
  return +val.toFixed(0);
}

function simulateDevicePower(profile) {
  // Simple ON/OFF by duty cycle with noise
  const on = Math.random() < profile.duty;
  const expected = on ? profile.peak : profile.base;
  const noise = gaussianRandom(0, Math.max(5, expected * 0.05));
  const value = Math.max(0, expected + noise);
  return { on, expected: +expected.toFixed(0), value: +value.toFixed(0) };
}

// Temperatura: base diaria (seno) + ruido gaussiano
function simulateTemperature() {
  const hour = new Date().getHours() + new Date().getMinutes()/60;
  const base = 21 + 3 * Math.sin((2 * Math.PI / 24) * (hour - 3));
  const noise = gaussianRandom(0, 0.4);
  return +(base + noise).toFixed(2);
}

// Humedad: inversa a temperatura con ruido
function simulateHumidity() {
  const hour = new Date().getHours() + new Date().getMinutes()/60;
  const base = 55 - 6 * Math.sin((2 * Math.PI / 24) * (hour - 3));
  const noise = gaussianRandom(0, 1.2);
  let val = base + noise;
  if (val < 20) val = 20;
  if (val > 90) val = 90;
  return +val.toFixed(2);
}

// Consumo eléctrico (W): patrón con picos en "horas activas"
let lastPowerBase = 120;
function simulatePower() {
  const hour = new Date().getHours();
  let base = 80;
  if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 22)) base = 300;
  if (hour >= 12 && hour <= 14) base = 150;
  lastPowerBase = lastPowerBase * 0.9 + base * 0.1;
  const noise = gaussianRandom(0, Math.max(10, lastPowerBase * 0.08));
  const val = Math.max(10, lastPowerBase + noise);
  return +val.toFixed(2);
}

// Empaqueta y publica
function publishSensor(topic, type, value, unit, location = 'livingroom') {
  const payload = {
    deviceId: `sim-${location}-${type}`,
    type,
    value,
    unit,
    timestamp: new Date().toISOString(),
    location
  };
  client.publish(topic, JSON.stringify(payload), { qos: 0 }, (err) => {
    if (err) {
      console.error(`❌ Error al publicar en ${topic}:`, err.message);
    } else {
      console.log(`➡️  Publicado en ${topic}:`, payload);
    }
  });
}

// Publica periódicamente (cada 30s) para todas las habitaciones
setInterval(() => {
  ROOMS.forEach((room) => {
    const temp = simulateTemperature();
    const hum = simulateHumidity();
    const co2 = simulateCo2();

    // Per-device power and total aggregation
    const devices = ROOM_DEVICES[room] || [];
    let totalPower = 0;
    devices.forEach((d) => {
      const sim = simulateDevicePower(d);
      totalPower += sim.value;
      const payload = {
        deviceId: `sim-${room}-${d.id}`,
        type: 'device_power',
        value: sim.value,
        expected: sim.expected,
        active: sim.on,
        unit: 'W',
        timestamp: new Date().toISOString(),
        location: room,
        device: d.id
      };
      client.publish(`home/${room}/device/${d.id}/power`, JSON.stringify(payload), { qos: 0 }, (err) => {
        if (err) console.error(`❌ Error device ${room}/${d.id}`, err.message);
      });
    });

    publishSensor(`home/${room}/sensor/temperature`, 'temperature', temp, 'C', room);
    publishSensor(`home/${room}/sensor/humidity`, 'humidity', hum, '%', room);
    publishSensor(`home/${room}/sensor/co2`, 'co2', co2, 'ppm', room);
    publishSensor(`home/${room}/sensor/power`, 'power', totalPower, 'W', room);

    // Publicación consolidada por habitación (opcional)
    const consolidated = {
      temperature: temp,
      humidity: hum,
      co2,
      power: totalPower,
      timestamp: new Date().toISOString(),
      location: room
    };
    client.publish(`home/${room}/sensors`, JSON.stringify(consolidated), { qos: 0 }, (err) => {
      if (err) {
        console.error(`❌ Error al publicar en home/${room}/sensors:`, err.message);
      } else {
        console.log(`➡️  Publicado en home/${room}/sensors:`, consolidated);
      }
    });
  });
}, 30000);

// Manejo de cierre
process.on('SIGINT', () => {
  console.log('\nCerrando conexión MQTT...');
  client.end(false, () => process.exit(0));
});
