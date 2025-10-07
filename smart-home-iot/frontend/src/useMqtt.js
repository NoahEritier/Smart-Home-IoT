import { useEffect, useRef, useState, useCallback } from 'react';
import mqtt from 'mqtt';

export default function useMqtt() {
  const [messages, setMessages] = useState([]);
  const [states, setStates] = useState({ away: false });
  const clientRef = useRef(null);

  useEffect(() => {
    const brokerUrl = 'wss://test.mosquitto.org:8081/mqtt';
    const topics = [
      'home/+/sensor/+',
      'home/+/device/+/power',
      'home/system/away/state'
    ];

    const client = mqtt.connect(brokerUrl, { reconnectPeriod: 3000 });
    clientRef.current = client;

    client.on('connect', () => {
      topics.forEach((t) => {
        client.subscribe(t, { qos: 0 }, (err) => {
          if (err) console.error('subscribe error', t, err);
        });
      });
    });

    client.on('message', (topic, payload) => {
      const text = payload.toString();
      try {
        const parsed = JSON.parse(text);
        // Track simple system states
        if (topic === 'home/system/away/state') {
          setStates((s) => ({ ...s, away: Boolean(parsed?.value ?? parsed) }));
        }
        setMessages(prev => {
          const next = [...prev, { ...parsed, topic }];
          return next.slice(-300);
        });
      } catch (e) {
        // allow plain strings
        setMessages(prev => {
          const next = [...prev, { topic, raw: text }];
          return next.slice(-300);
        });
      }
    });

    client.on('error', (err) => console.error('MQTT error', err));

    return () => {
      if (clientRef.current) clientRef.current.end();
    };
  }, []);

  const publish = useCallback((topic, payload) => {
    const client = clientRef.current;
    if (!client) return;
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
    client.publish(topic, msg, { qos: 0 }, (err) => {
      if (err) console.error('publish error', topic, err);
    });
  }, []);

  return { messages, states, publish };
}
