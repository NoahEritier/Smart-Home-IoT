import React, { useMemo, useState } from 'react';
import useMqtt from './useMqtt';
import SensorChart from './components/SensorChart';
import './index.css';

export default function App() {
  const messages = useMqtt();
  const ROOMS = ['cocina', 'jardin', 'bano', 'habitacion'];
  const [room, setRoom] = useState(ROOMS[0]);
  const [deviceFilter, setDeviceFilter] = useState('activos'); // 'activos' | 'inactivos' | 'todos'
  const [dismissed, setDismissed] = useState(new Set()); // for toast close buttons

  const roomMessages = useMemo(() => messages.filter(m => m.location === room), [messages, room]);

  const latest = useMemo(() => {
    const out = { temperature: null, humidity: null, power: null, co2: null };
    for (let i = roomMessages.length - 1; i >= 0; i--) {
      const m = roomMessages[i];
      if (m.type && out[m.type] == null) out[m.type] = m;
    }
    return out;
  }, [roomMessages]);

  // Latest per-device power map for the selected room
  const devices = useMemo(() => {
    const map = new Map();
    for (let i = roomMessages.length - 1; i >= 0; i--) {
      const m = roomMessages[i];
      if (m.type === 'device_power' && m.device && !map.has(m.device)) {
        map.set(m.device, m);
      }
    }
    return Array.from(map.entries()).map(([device, data]) => ({ device, data }));
  }, [roomMessages]);

  // Filter devices by activos/inactivos/todos
  const filteredDevices = useMemo(() => {
    if (deviceFilter === 'todos') return devices;
    if (deviceFilter === 'activos') return devices.filter(({ data }) => Boolean(data.active));
    return devices.filter(({ data }) => !Boolean(data.active));
  }, [devices, deviceFilter]);

  // Alerts
  const alerts = useMemo(() => {
    const list = [];
    // Thresholds
    const thr = {
      powerTotal: 2000, // W
      deviceOverPct: 0.5, // 50% sobre esperado
      temp: { min: 18, max: 28 },
      humidity: { min: 30, max: 70 },
      co2: { max: 1000 }
    };

    if (latest.power && latest.power.value > thr.powerTotal) {
      list.push({ level: 'warn', msg: `Consumo total alto en ${room}: ${latest.power.value.toFixed(0)} W (> ${thr.powerTotal} W)` });
    }
    if (latest.temperature && (latest.temperature.value < thr.temp.min || latest.temperature.value > thr.temp.max)) {
      const rec = latest.temperature.value > thr.temp.max ? 'bajar el aire' : 'subir calefacción';
      list.push({ level: 'info', msg: `Temperatura fuera de rango (${latest.temperature.value.toFixed(1)}°C). Recomendación: ${rec}.` });
    }
    if (latest.humidity && (latest.humidity.value < thr.humidity.min || latest.humidity.value > thr.humidity.max)) {
      const rec = latest.humidity.value > thr.humidity.max ? 'usar deshumidificador' : 'usar humidificador';
      list.push({ level: 'info', msg: `Humedad fuera de rango (${latest.humidity.value.toFixed(1)}%). Recomendación: ${rec}.` });
    }
    if (latest.co2 && latest.co2.value > thr.co2.max) {
      list.push({ level: 'alert', msg: `Calidad de aire deficiente (CO₂ ${latest.co2.value} ppm). Recomendación: abrir ventanas.` });
    }

    devices.forEach(({ device, data }) => {
      if (typeof data.expected === 'number') {
        if (data.value > data.expected * (1 + thr.deviceOverPct)) {
          list.push({ level: 'warn', msg: `Dispositivo ${device} consume más de lo esperado (${data.value}W vs ${data.expected}W).` });
        }
        if (data.expected > 50 && data.value < 5) {
          list.push({ level: 'error', msg: `Posible anomalía en ${device}: consumo nulo cuando debería estar activo.` });
        }
      }
    });

    return list;
  }, [latest, devices, room]);

  return (
    <>
    <div className="app">
      <header>
        <h1>Smart Home IoT — Dashboard</h1>
        <p style={{opacity:0.8}}>Broker: wss://test.mosquitto.org:8081/mqtt · Topic: home/+ /sensor/+ · Sala: {room}</p>

        <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
          {ROOMS.map(r => (
            <button
              key={r}
              onClick={() => setRoom(r)}
              style={{
                padding:'6px 10px',
                borderRadius:6,
                border:'1px solid #1e2a42',
                background: r === room ? '#1b2742' : '#121a2a',
                color:'#dce2f0',
                cursor:'pointer'
              }}
            >{r}</button>
          ))}
        </div>
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
        <div className="card">
          <h3>CO₂</h3>
          <p className="big">{ latest.co2 ? `${latest.co2.value} ppm` : '—' }</p>
          <small>{ latest.co2 ? new Date(latest.co2.timestamp).toLocaleTimeString() : '' }</small>
        </div>
      </section>

      <section className="charts">
        <div className="chart-card">
          <SensorChart title={`Temperatura (°C) — ${room}`} dataKey="value" data={roomMessages.filter(m => m.type === 'temperature')} />
        </div>
        <div className="chart-card">
          <SensorChart title={`Humedad (%) — ${room}`} dataKey="value" data={roomMessages.filter(m => m.type === 'humidity')} />
        </div>
        <div className="chart-card">
          <SensorChart title={`Consumo (W) — ${room}`} dataKey="value" data={roomMessages.filter(m => m.type === 'power')} />
        </div>
        <div className="chart-card">
          <SensorChart title={`CO₂ (ppm) — ${room}`} dataKey="value" data={roomMessages.filter(m => m.type === 'co2')} />
        </div>
      </section>

      <section className="card" style={{marginTop:16}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
          <h3 style={{margin:0}}>Dispositivos — {room}</h3>
          <div role="group" aria-label="Filtro dispositivos" style={{display:'flex', gap:8}}>
            <button onClick={() => setDeviceFilter('activos')} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #1e2a42', background: deviceFilter==='activos' ? '#1b2742' : '#121a2a', color:'#dce2f0'}}>Activos</button>
            <button onClick={() => setDeviceFilter('inactivos')} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #1e2a42', background: deviceFilter==='inactivos' ? '#1b2742' : '#121a2a', color:'#dce2f0'}}>Inactivos</button>
            <button onClick={() => setDeviceFilter('todos')} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #1e2a42', background: deviceFilter==='todos' ? '#1b2742' : '#121a2a', color:'#dce2f0'}}>Todos</button>
          </div>
        </div>
        {devices.length === 0 ? (
          <p style={{opacity:.8}}>Sin datos de dispositivos todavía.</p>
        ) : filteredDevices.length === 0 ? (
          <p style={{opacity:.8}}>No hay dispositivos en uso con el filtro actual.</p>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:8}}>
            <div style={{opacity:.7}}>Dispositivo</div>
            <div style={{opacity:.7, textAlign:'right'}}>Actual (W)</div>
            <div style={{opacity:.7, textAlign:'right'}}>Esperado (W)</div>
            <div style={{opacity:.7, textAlign:'right'}}>Estado</div>
            {filteredDevices.map(({device, data}) => (
              <>
                <div>{device}</div>
                <div style={{textAlign:'right'}}>{data.value}</div>
                <div style={{textAlign:'right'}}>{typeof data.expected === 'number' ? data.expected : '—'}</div>
                <div style={{textAlign:'right'}}>{data.active ? 'Activo' : 'Inactivo'}</div>
              </>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{marginTop:16}}>
        <h3>Alertas</h3>
        {alerts.length === 0 ? (
          <p style={{opacity:.8}}>Sin alertas por el momento.</p>
        ) : (
          <ul style={{margin:0, paddingLeft:18}}>
            {alerts.map((a, idx) => (
              <li key={idx} style={{color: a.level==='alert' ? '#ff8383' : a.level==='warn' ? '#ffd37a' : '#dce2f0'}}>{a.msg}</li>
            ))}
          </ul>
        )}
      </section>

      <footer>
        <small>Demo con broker público — no usar en producción sin seguridad</small>
      </footer>
    </div>
    {/* Toast overlay for alerts with close buttons */}
    <div className="toasts">
      {alerts
        .filter(a => !dismissed.has(`${a.level}:${a.msg}`))
        .map((a, idx) => (
          <div key={`${a.level}:${a.msg}:${idx}`} className={`toast toast--${a.level}`} style={{display:'flex', alignItems:'start', gap:8, justifyContent:'space-between'}}>
            <div style={{flex:1}}>{a.msg}</div>
            <button
              onClick={() => {
                setDismissed(prev => new Set(prev).add(`${a.level}:${a.msg}`));
              }}
              aria-label="Cerrar"
              title="Cerrar"
              style={{background:'transparent', border:'none', color:'#0b1220', cursor:'pointer', fontWeight:700}}
            >×</button>
          </div>
      ))}
    </div>
    </>
  );
}
