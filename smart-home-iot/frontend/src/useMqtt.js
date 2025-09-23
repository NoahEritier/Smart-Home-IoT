import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';

export default function useMqtt() {
  const [messages, setMessages] = useState([]);
  const clientRef = useRef(null);

  useEffect(() => {
    const brokerUrl = 'wss://test.mosquitto.org:8081/mqtt';
  const topic = 'home/+/sensor/+';

    const client = mqtt.connect(brokerUrl, { reconnectPeriod: 3000 });
    clientRef.current = client;

    client.on('connect', () => {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) console.error('subscribe error', err);
      });
    });

    client.on('message', (_, payload) => {
      try {
        const parsed = JSON.parse(payload.toString());
        setMessages(prev => {
          const next = [...prev, parsed];
          return next.slice(-300);
        });
      } catch (e) {
        console.error('Invalid JSON payload', e);
      }
    });

    client.on('error', (err) => console.error('MQTT error', err));

    return () => {
      if (clientRef.current) clientRef.current.end();
    };
  }, []);

  return messages;
}
