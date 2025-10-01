// Smart Home IoT - Web App
// Configuración para dashboard web estático
const MQTT_WS_URL = 'wss://test.mosquitto.org:8081/mqtt';
const BASE_TOPIC = 'home';

const elLog = document.getElementById('log');

// Rooms and element references
const ROOMS = ['cocina', 'jardin', 'bano', 'habitacion'];
const KPI = {};
ROOMS.forEach(r => {
  KPI[r] = {
    temperature: document.getElementById(`kpi-temp-${r}`),
    humidity: document.getElementById(`kpi-hum-${r}`),
    power: document.getElementById(`kpi-pow-${r}`),
    co2: document.getElementById(`kpi-co2-${r}`)
  };
});

function appendLog(line) {
	const t = new Date().toLocaleTimeString();
	elLog.textContent += `[${t}] ${line}\n`;
	elLog.scrollTop = elLog.scrollHeight;
}

appendLog('Conectando al broker...');

const client = mqtt.connect(MQTT_WS_URL, {
	clean: true,
	protocolVersion: 5,
	keepalive: 30,
	reconnectPeriod: 2000
});

const wildcard = `${BASE_TOPIC}/+/sensor/+`;

client.on('connect', () => {
	appendLog('✅ Conectado al broker MQTT');
	client.subscribe(wildcard, { qos: 0 }, (err) => {
		if (err) {
			appendLog('❌ Error al suscribirse: ' + err.message);
		} else {
			appendLog('✅ Suscrito a: ' + wildcard);
		}
	});
});

client.on('reconnect', () => appendLog('🔄 Reconectando...'));
client.on('error', (err) => appendLog('❌ Error: ' + err.message));
client.on('offline', () => appendLog('📴 Desconectado'));
client.on('message', (topic, payload) => {
	try {
		const data = JSON.parse(payload.toString());
		appendLog(`📨 Mensaje recibido de ${topic}`);
		appendLog(`📊 Datos: ${JSON.stringify(data)}`);
		
		if (
			data && typeof data.type === 'string' && typeof data.value === 'number' && typeof data.location === 'string'
		) {
			const room = data.location;
			if (ROOMS.includes(room)) {
				const el = KPI[room][data.type];
				if (el) {
					el.textContent = data.value.toFixed(1);
					const unit = data.type === 'temperature' ? '°C' : (data.type === 'humidity' ? '%' : 'W');
					const icon = data.type === 'temperature' ? '🌡️' : (data.type === 'humidity' ? '💧' : '⚡');
					appendLog(`${icon} ${room} ${data.type} -> ${data.value.toFixed(1)}${unit}`);
				}
			} else {
				appendLog(`ℹ️ Mensaje con ubicación no gestionada: ${room}`);
			}
		}
	} catch (e) {
		appendLog('❌ Error al procesar JSON: ' + e.message);
	}
});
