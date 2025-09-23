// smart-home-iot-publisher.js
// Simulador de sensores para Smart Home IoT que publica datos en tiempo real por MQTT.
// Ejecutar: node publisher.js

const mqtt = require('mqtt');

// Broker público HiveMQ (WebSocket). Usalo solo para pruebas/demos.
const BROKER_URL = process.env.BROKER_URL || 'mqtt://test.mosquitto.org:1883';

// Topics
const TOPICS = {
  temperature: 'home/livingroom/sensor/temperature',
  humidity: 'home/livingroom/sensor/humidity',
  power: 'home/main/sensor/power'
};

// Conexión
const client = mqtt.connect(BROKER_URL);

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
function publishSensor(topic, type, value, unit, location='livingroom') {
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

// Publica periódicamente (cada 3s)
setInterval(() => {
  const temp = simulateTemperature();
  const hum = simulateHumidity();
  const power = simulatePower();

  publishSensor(TOPICS.temperature, 'temperature', temp, 'C', 'livingroom');
  publishSensor(TOPICS.humidity, 'humidity', hum, '%', 'livingroom');
  publishSensor(TOPICS.power, 'power', power, 'W', 'main');

  // Publicación consolidada en home/sensors
  const consolidated = {
    temperature: temp,
    humidity: hum,
    power: power,
    timestamp: new Date().toISOString()
  };
  client.publish('home/sensors', JSON.stringify(consolidated), { qos: 0 }, (err) => {
    if (err) {
      console.error('❌ Error al publicar en home/sensors:', err.message);
    } else {
      console.log('➡️  Publicado en home/sensors:', consolidated);
    }
  });
}, 30000);

// Manejo de cierre
process.on('SIGINT', () => {
  console.log('\nCerrando conexión MQTT...');
  client.end(false, () => process.exit(0));
});
