import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MarginalHistogram = ({ samples, dimension, color, version }) => {
  // Compute histogram bins
  const data = useMemo(() => {
    const bins = 30;
    const min = -4;
    const max = 4;
    const binWidth = (max - min) / bins;
    
    const counts = new Array(bins).fill(0);
    
    // Use last 1000 samples for histogram to show recent distribution
    const recentSamples = samples.slice(-1000);
    
    recentSamples.forEach(s => {
      const val = dimension === 'x' ? s.x : s.y;
      if (val >= min && val <= max) {
        const binIndex = Math.min(bins - 1, Math.floor((val - min) / binWidth));
        counts[binIndex]++;
      }
    });

    const labels = counts.map((_, i) => (min + (i + 0.5) * binWidth).toFixed(1));

    return {
      labels,
      datasets: [
        {
          label: `Density of ${dimension.toUpperCase()}`,
          data: counts,
          backgroundColor: color,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
        }
      ]
    };
  }, [samples, dimension, color, version]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', maxTicksLimit: 5 }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { display: false }, // Hide y-axis numbers to keep it clean
        beginAtZero: true
      }
    }
  };

  return (
    <div className="chart-container" style={{ height: '120px' }}>
      <Bar options={options} data={data} />
    </div>
  );
};

export default MarginalHistogram;
