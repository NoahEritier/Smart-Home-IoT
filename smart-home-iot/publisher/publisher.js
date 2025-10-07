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

// Rooms to simulate (nota: usar 'bano' sin tilde para consistencia con claves)
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

// Estados de sistema
let awayMode = false;

function publishStateTopics() {
  const awayPayload = { type: 'away_state', value: awayMode, timestamp: new Date().toISOString() };
  client.publish('home/system/away/state', JSON.stringify(awayPayload), { qos: 0 });
}

// Suscripción a comandos de control
client.on('connect', () => {
  client.subscribe(['home/system/away/set', 'home/+/device/+/set'], { qos: 0 }, (err) => {
    if (err) console.error('❌ Error al suscribirse a comandos:', err.message);
  });
  // Publicar estados al conectar
  publishStateTopics();
});

client.on('message', (topic, payload) => {
  try {
    const data = JSON.parse(payload.toString());
    if (topic === 'home/system/away/set') {
      awayMode = Boolean(data?.value ?? data);
      console.log(`🏠 Away set -> ${awayMode}`);
      publishStateTopics();
    }
    // Device control: home/<room>/device/<device>/set
    const match = topic.match(/^home\/(.+)\/device\/(.+)\/set$/);
    if (match) {
      const [, room, device] = match;
      const desired = (typeof data?.value === 'string' ? data.value : data);
      if (desired === 'on' || desired === true) setDeviceOverride(room, device, true);
      if (desired === 'off' || desired === false) setDeviceOverride(room, device, false);
    }
  } catch (e) {
    // comandos simples pueden venir como string llano
    const txt = payload.toString();
    if (topic === 'home/system/away/set') {
      awayMode = txt === 'true' || txt === '1' || txt === 'on';
      publishStateTopics();
    }
    const match = topic.match(/^home\/(.+)\/device\/(.+)\/set$/);
    if (match) {
      const [, room, device] = match;
      const on = txt === 'on' || txt === '1' || txt === 'true';
      setDeviceOverride(room, device, on);
    }
  }
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

// Overrides de dispositivos por habitación
const DEVICE_OVERRIDE = {}; // { [room]: { [device]: boolean|null } }
function setDeviceOverride(room, device, on) {
  if (!DEVICE_OVERRIDE[room]) DEVICE_OVERRIDE[room] = {};
  DEVICE_OVERRIDE[room][device] = on;
  // Publicar estado inmediato
  const payload = { device, room, active: on, timestamp: new Date().toISOString() };
  client.publish(`home/${room}/device/${device}/state`, JSON.stringify(payload), { qos: 0 });
  console.log(`🔌 Override ${room}/${device} -> ${on ? 'ON' : 'OFF'}`);
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

// Simulación de fugas por habitación
const leakState = Object.fromEntries(ROOMS.map(r => [r, false]));
function maybeToggleLeak(room) {
  // Si está en fuga, chance de resolverse; si no, chance muy baja de ocurrir
  const rnd = Math.random();
  if (leakState[room]) {
    if (rnd < 0.25) leakState[room] = false; // 25% de resolverse por ciclo
  } else {
    // Menor probabilidad si válvula está cerrada o modo away
    const baseProb = 0.02; // 2% por ciclo
    const damp = (awayMode ? 0.7 : 1);
    if (rnd < baseProb * damp) leakState[room] = true;
  }
  // Publicar estado del sensor de fuga
  const value = leakState[room] ? 1 : 0;
  publishSensor(`home/${room}/sensor/leak`, 'leak', value, 'bool', room);
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
      let sim = simulateDevicePower(d);
      const override = DEVICE_OVERRIDE[room]?.[d.id];
      if (override === true) {
        sim = { on: true, expected: d.peak, value: Math.max(d.peak - 20, d.peak * 0.95) };
      } else if (override === false) {
        sim = { on: false, expected: d.base, value: d.base };
      }
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
      // Publish explicit device state topic too
      const statePayload = { device: d.id, room, active: sim.on, timestamp: new Date().toISOString() };
      client.publish(`home/${room}/device/${d.id}/state`, JSON.stringify(statePayload), { qos: 0 });
    });

    publishSensor(`home/${room}/sensor/temperature`, 'temperature', temp, 'C', room);
    publishSensor(`home/${room}/sensor/humidity`, 'humidity', hum, '%', room);
    publishSensor(`home/${room}/sensor/co2`, 'co2', co2, 'ppm', room);
    publishSensor(`home/${room}/sensor/power`, 'power', totalPower, 'W', room);

    // Fugas
    maybeToggleLeak(room);

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
