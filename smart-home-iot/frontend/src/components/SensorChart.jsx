import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, TimeScale, Tooltip, Legend);

export default function SensorChart({ title, dataKey, data }) {
  const points = useMemo(() => {
    return data
      .filter(m => typeof m[dataKey] === 'number' && m.timestamp)
      .map((m, index) => ({ 
        x: index, 
        y: Number(m[dataKey]),
        timestamp: m.timestamp
      }));
  }, [data, dataKey]);

  const chartData = {
    datasets: [
      {
        label: title,
        data: points,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.2)',
        fill: false,
        tension: 0.25,
        pointRadius: 2
      }
    ]
  };

  const options = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { 
        type: 'linear',
        title: { display: true, text: 'Tiempo' }
      },
      y: { 
        beginAtZero: false,
        title: { display: true, text: 'Valor' }
      }
    },
    plugins: { 
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: function(context) {
            const dataPoint = context[0].raw;
            return new Date(dataPoint.timestamp).toLocaleTimeString();
          }
        }
      }
    }
  };

  return (
    <div className="chart-card">
      <h4>{title}</h4>
      <div style={{ height: 220 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
