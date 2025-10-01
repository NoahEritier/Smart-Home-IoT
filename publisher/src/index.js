// Smart Home IoT - Publisher Principal
// Simulador de sensores que publica datos por MQTT para el sistema Smart Home IoT
import mqtt from 'mqtt';

const MQTT_URL = process.env.MQTT_URL || 'mqtt://test.mosquitto.org:1883';
const BASE_TOPIC = process.env.BASE_TOPIC || 'home';
const LOCATION = process.env.LOCATION || 'livingroom';
const DEVICE_ID = process.env.DEVICE_ID || 'sensor-01';
const PUBLISH_INTERVAL_MS = Number(process.env.PUBLISH_INTERVAL_MS || 30000);

function randomInRange(min, max, digits = 1) {
	const n = min + Math.random() * (max - min);
	const f = Math.pow(10, digits);
	return Math.round(n * f) / f;
}

function buildMessage(type) {
	const nowIso = new Date().toISOString();
	if (type === 'temperature') {
		return { deviceId: DEVICE_ID, type, value: randomInRange(18, 28, 1), unit: 'C', timestamp: nowIso, location: LOCATION };
	}
	if (type === 'humidity') {
		return { deviceId: DEVICE_ID, type, value: randomInRange(30, 70, 1), unit: '%', timestamp: nowIso, location: LOCATION };
	}
	if (type === 'power') {
		return { deviceId: DEVICE_ID, type, value: randomInRange(50, 150, 1), unit: 'W', timestamp: nowIso, location: LOCATION };
	}
	throw new Error('Unknown type');
}

function topicFor(type) {
	return `${BASE_TOPIC}/${LOCATION}/sensor/${type}`;
}

console.log(`[publisher] Connecting to ${MQTT_URL} ...`);
const client = mqtt.connect(MQTT_URL, {
	protocolVersion: 5,
	clean: true,
	properties: { sessionExpiryInterval: 0 }
});

client.on('connect', () => {
	console.log('[publisher] Connected. Publishing to', `${BASE_TOPIC}/${LOCATION}/sensor/{temperature|humidity|power}`);
	setInterval(() => {
		['temperature', 'humidity', 'power'].forEach((type) => {
			const payload = JSON.stringify(buildMessage(type));
			client.publish(topicFor(type), payload, { qos: 0 }, (err) => {
				if (err) console.error('[publisher] Publish error', err);
			});
		});
	}, PUBLISH_INTERVAL_MS);
});

client.on('error', (err) => {
	console.error('[publisher] Client error', err);
});

process.on('SIGINT', () => {
	console.log('\n[publisher] Closing...');
	client.end(true, () => process.exit(0));
});
