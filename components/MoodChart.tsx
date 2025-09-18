import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { MoodLog } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface MoodChartProps {
  moodHistory: MoodLog[];
}

const MoodChart: React.FC<MoodChartProps> = ({ moodHistory }) => {
  const lastSevenEntries = moodHistory.slice(-7);

  const data = {
    labels: lastSevenEntries.map(log => new Date(log.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Mood',
        data: lastSevenEntries.map(log => log.mood),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Your Mood Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 1,
        max: 5,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return <Line options={options} data={data} />;
};

export default MoodChart;
