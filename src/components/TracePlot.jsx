import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TracePlot = ({ samples, version }) => {
  // To keep performance high, we'll only show the last N samples if the array gets too large,
  // or we can downsample. For this demo, let's show the last 500 samples.
  const displaySamples = samples.slice(-500);
  
  const labels = displaySamples.map((_, i) => i + Math.max(0, samples.length - 500));
  const dataX = displaySamples.map(s => s.x);
  const dataY = displaySamples.map(s => s.y);

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'X value',
        data: dataX,
        borderColor: 'rgba(59, 130, 246, 0.8)', // blue
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'Y value',
        data: dataY,
        borderColor: 'rgba(139, 92, 246, 0.8)', // purple
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1
      }
    ],
  }), [samples, version]); // Recompute when version changes

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Turn off animation for high-frequency updates
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', boxWidth: 12, usePointStyle: true }
      },
      tooltip: { enabled: false }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 5 }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8' },
        min: -4,
        max: 4
      }
    }
  };

  return (
    <div className="chart-container">
      <Line options={options} data={data} />
    </div>
  );
};

export default TracePlot;
