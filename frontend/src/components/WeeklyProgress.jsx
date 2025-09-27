import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement, Filler);

function WeeklyProgress({ sessions }) {
  // Build continuous last-7-days range and aggregate minutes
  const data = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    const fmt = (d) => {
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      return dd.toISOString().split('T')[0];
    };

    const labelsIso = [];
    const durationsByDay = {};
    const countsByDay = {};
    const cur = new Date(start);
    while (cur <= end) {
      const key = fmt(cur);
      labelsIso.push(key);
      durationsByDay[key] = 0;
      countsByDay[key] = 0;
      cur.setDate(cur.getDate() + 1);
    }

    (sessions || []).forEach((s) => {
      if (!s.completed) return; // consider only completed
      const key = fmt(s.startTime);
      if (durationsByDay[key] !== undefined) {
        durationsByDay[key] += s.duration || 0; // minutes
        countsByDay[key] += 1; // session count
      }
    });

    const labels = labelsIso.map((key) => {
      const [y, m, d] = key.split('-');
      return `${d}/${m}`;
    });

    const minutesSeries = labelsIso.map((key) => durationsByDay[key]);
    const sessionsSeries = labelsIso.map((key) => countsByDay[key]);

    return {
      labels,
      datasets: [
        {
          label: 'Minutes',
          data: minutesSeries,
          yAxisID: 'y',
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          pointBackgroundColor: 'rgba(54, 162, 235, 1)',
          pointBorderColor: '#ffffff',
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Sessions',
          data: sessionsSeries,
          yAxisID: 'y1',
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
          pointBorderColor: '#ffffff',
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [sessions]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Weekly Progress' },
      tooltip: { intersect: false, mode: 'index' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Minutes' } },
      y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Sessions' } },
      x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
    },
  };

  return (
    <div className="card">
      <div className="card-body" style={{ height: 360 }}>
        {data.labels.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center h-100">
            <i className="bi bi-graph-up fs-1 text-muted"></i>
            <p className="text-muted mt-3">No data for this week</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeeklyProgress;
