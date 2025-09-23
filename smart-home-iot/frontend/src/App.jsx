import React, { useMemo } from 'react';
import useMqtt from './useMqtt';
import SensorChart from './components/SensorChart';
import './index.css';

export default function App() {
  const messages = useMqtt();

  const latest = useMemo(() => {
    const out = { temperature: null, humidity: null, power: null };
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type && out[m.type] == null) out[m.type] = m;
    }
    return out;
  }, [messages]);

  return (
    <div className="app">
      <header>
        <h1>Smart Home IoT — Dashboard</h1>
        <p style={{opacity:0.8}}>Broker: wss://broker.hivemq.com:8000/mqtt · Topic: home/sensors</p>
      </header>

      <section className="values">
        <div className="card">
          <h3>Temperatura</h3>
          <p className="big">{ latest.temperature ? `${latest.temperature.value} °C` : '—' }</p>
          <small>{ latest.temperature ? new Date(latest.temperature.timestamp).toLocaleTimeString() : '' }</small>
        </div>
        <div className="card">
          <h3>Humedad</h3>
          <p className="big">{ latest.humidity ? `${latest.humidity.value} %` : '—' }</p>
          <small>{ latest.humidity ? new Date(latest.humidity.timestamp).toLocaleTimeString() : '' }</small>
        </div>
        <div className="card">
          <h3>Consumo</h3>
          <p className="big">{ latest.power ? `${latest.power.value} W` : '—' }</p>
          <small>{ latest.power ? new Date(latest.power.timestamp).toLocaleTimeString() : '' }</small>
        </div>
      </section>

      <section className="charts">
        <SensorChart title="Temperatura (°C)" dataKey="value" data={messages.filter(m => m.type === 'temperature')} />
        <SensorChart title="Humedad (%)" dataKey="value" data={messages.filter(m => m.type === 'humidity')} />
        <SensorChart title="Consumo (W)" dataKey="value" data={messages.filter(m => m.type === 'power')} />
      </section>

      <footer>
        <small>Demo con broker público — no usar en producción sin seguridad</small>
      </footer>
    </div>
  );
}
