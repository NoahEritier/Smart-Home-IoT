// Smart Home IoT - Web App
// Configuración para dashboard web estático
const MQTT_WS_URL = 'wss://test.mosquitto.org:8081/mqtt';
const BASE_TOPIC = 'home';

const elTemp = document.getElementById('kpi-temp');
const elHum = document.getElementById('kpi-hum');
const elPow = document.getElementById('kpi-pow');
const elLog = document.getElementById('log');

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
		
		if (data && typeof data.type === 'string' && typeof data.value === 'number') {
			// Procesar datos individuales de sensores
			if (data.type === 'temperature') {
				elTemp.textContent = data.value.toFixed(1);
				appendLog(`🌡️ Temperatura actualizada: ${data.value.toFixed(1)}°C`);
			}
			if (data.type === 'humidity') {
				elHum.textContent = data.value.toFixed(1);
				appendLog(`💧 Humedad actualizada: ${data.value.toFixed(1)}%`);
			}
			if (data.type === 'power') {
				elPow.textContent = data.value.toFixed(1);
				appendLog(`⚡ Consumo actualizado: ${data.value.toFixed(1)}W`);
			}
		}
	} catch (e) {
		appendLog('❌ Error al procesar JSON: ' + e.message);
	}
});
