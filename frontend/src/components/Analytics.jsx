import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement, Filler);

function Analytics({ sessions }) {
  const [timeRange, setTimeRange] = useState('week');

  // durations are in minutes throughout the app
  const formatTime = (totalMinutes) => {
    const hours = Math.floor((totalMinutes || 0) / 60);
    const minutes = (totalMinutes || 0) % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getFilteredSessions = () => {
    const now = new Date();
    const startDate = new Date();

    // Consider only completed sessions for analytics
    const completed = (sessions || []).filter(s => s.completed);

    switch (timeRange) {
      case 'week': {
        // last 7 days including today
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        return completed.filter(s => {
          const d = new Date(s.startTime);
          return d >= startDate && d <= now;
        });
      }
      case 'month': {
        // last 30 days including today
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        return completed.filter(s => {
          const d = new Date(s.startTime);
          return d >= startDate && d <= now;
        });
      }
      case 'year': {
        // last 365 days including today
        startDate.setDate(now.getDate() - 364);
        startDate.setHours(0, 0, 0, 0);
        return completed.filter(s => {
          const d = new Date(s.startTime);
          return d >= startDate && d <= now;
        });
      }
      case 'all':
      default:
        return completed;
    }
  };

  const getDailyData = () => {
    const filteredSessions = getFilteredSessions();

    // Helper to format y-m-d for stable keying
    const fmt = (d) => {
      const dd = new Date(d);
      dd.setHours(0,0,0,0);
      return dd.toISOString().split('T')[0];
    };
    // Helper to format y-m for month key
    const fmtMonth = (d) => {
      const dd = new Date(d);
      dd.setDate(1); dd.setHours(0,0,0,0);
      const y = dd.getFullYear();
      const m = String(dd.getMonth()+1).padStart(2,'0');
      return `${y}-${m}`;
    };

    // Determine date range based on selected timeRange
    let start = new Date();
    let end = new Date();
    end.setHours(0,0,0,0);
    if (timeRange === 'week') {
      start.setDate(end.getDate() - 6);
    } else if (timeRange === 'month') {
      start.setDate(end.getDate() - 29);
    } else if (timeRange === 'year') {
      start.setDate(end.getDate() - 364);
    } else {
      // all time -> use min/max from sessions
      if (filteredSessions.length > 0) {
        const dates = filteredSessions.map(s => new Date(s.startTime));
        const minD = new Date(Math.min(...dates));
        const maxD = new Date(Math.max(...dates));
        start = new Date(minD);
        start.setHours(0,0,0,0);
        end = new Date(maxD);
        end.setHours(0,0,0,0);
      }
    }

    // Decide granularity: monthly for 'year' and 'all'; daily otherwise
    const useMonthly = timeRange === 'year' || timeRange === 'all';

    let labels = [];
    let data = [];

    if (useMonthly) {
      // Build continuous month range
      const labelsMonth = [];
      const durationsByMonth = {};
      const curM = new Date(start.getFullYear(), start.getMonth(), 1);
      const endM = new Date(end.getFullYear(), end.getMonth(), 1);
      while (curM <= endM) {
        const key = fmtMonth(curM);
        labelsMonth.push(key);
        durationsByMonth[key] = 0;
        curM.setMonth(curM.getMonth() + 1);
      }
      // Aggregate sessions into months
      filteredSessions.forEach(session => {
        const key = fmtMonth(session.startTime);
        if (durationsByMonth[key] !== undefined) {
          durationsByMonth[key] += session.duration || 0;
        }
      });
      labels = labelsMonth.map(key => {
        const [y,m] = key.split('-');
        return `${new Date(Number(y), Number(m)-1, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' })}`;
      });
      data = labelsMonth.map(key => durationsByMonth[key]);
    } else {
      // Build continuous day range
      const labelsIso = [];
      const durationsByDay = {};
      const cur = new Date(start);
      cur.setHours(0,0,0,0);
      while (cur <= end) {
        const key = fmt(cur);
        labelsIso.push(key);
        durationsByDay[key] = 0;
        cur.setDate(cur.getDate() + 1);
      }
      // Aggregate sessions into days
      filteredSessions.forEach(session => {
        const key = fmt(session.startTime);
        if (durationsByDay[key] !== undefined) {
          durationsByDay[key] += session.duration || 0;
        }
      });
      labels = labelsIso.map(key => {
        const [y,m,d] = key.split('-');
        return `${d}/${m}`;
      });
      data = labelsIso.map(key => durationsByDay[key]);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Focus Time (minutes)',
          data,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          pointBackgroundColor: 'rgba(54, 162, 235, 1)',
          pointBorderColor: '#ffffff',
          pointRadius: useMonthly ? 3 : 2,
          pointHoverRadius: useMonthly ? 6 : 4,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  };

  const getSessionTypeData = () => {
    const filteredSessions = getFilteredSessions();
    const typeData = {};

    filteredSessions.forEach(session => {
      const type = session.task || 'Unnamed';
      if (!typeData[type]) {
        typeData[type] = 0;
      }
      typeData[type] += session.duration || 0;
    });

    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    return {
      labels: Object.keys(typeData),
      datasets: [
        {
          data: Object.values(typeData), // already minutes
          backgroundColor: colors.slice(0, Object.keys(typeData).length),
          borderWidth: 2,
        },
      ],
    };
  };

  const getStats = () => {
    const filteredSessions = getFilteredSessions();
    const totalDuration = filteredSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const avgDuration = filteredSessions.length > 0 ? totalDuration / filteredSessions.length : 0;
    const longestSession = Math.max(...filteredSessions.map(s => s.duration || 0), 0);

    return {
      totalSessions: filteredSessions.length,
      totalTime: totalDuration,
      avgTime: Number(avgDuration.toFixed(2)), // minutes with 2 decimals
      longestSession,
    };
  };

  const stats = getStats();
  const dailyChartData = getDailyData();
  const typeChartData = getSessionTypeData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // prevent shrinking when tooltips/hover trigger re-layout
    animation: { duration: 200 },
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: timeRange === 'year' || timeRange === 'all' ? 'Monthly Focus Time (Line)' : 'Daily Focus Time (Line)' },
      tooltip: { intersect: false, mode: 'index' },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Minutes' },
      },
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: (timeRange === 'year' || timeRange === 'all') ? 0 : 45,
          minRotation: (timeRange === 'year' || timeRange === 'all') ? 0 : 45,
        }
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Focus Time by Activity' },
    },
  };

  return (
    <div>
      {/* Time Range Selector */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn ${timeRange === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setTimeRange('week')}
            >
              Last Week
            </button>
            <button
              type="button"
              className={`btn ${timeRange === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setTimeRange('month')}
            >
              Last Month
            </button>
            <button
              type="button"
              className={`btn ${timeRange === 'year' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setTimeRange('year')}
            >
              Last Year
            </button>
            <button
              type="button"
              className={`btn ${timeRange === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setTimeRange('all')}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Total Sessions</h5>
              <h3 className="text-primary">{stats.totalSessions}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Total Focus Time</h5>
              <h3 className="text-success">{formatTime(stats.totalTime)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Average Session</h5>
              <h3 className="text-info">{stats.avgTime.toFixed(2)} min</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Longest Session</h5>
              <h3 className="text-warning">{formatTime(stats.longestSession)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body" style={{ height: 360 }}>
              {dailyChartData.labels.length > 0 ? (
                <Line data={dailyChartData} options={chartOptions} />
              ) : (
                <div className="d-flex flex-column align-items-center justify-content-center h-100">
                  <i className="bi bi-bar-chart fs-1 text-muted"></i>
                  <p className="text-muted mt-3">No data available for the selected time range</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card">
            <div className="card-body" style={{ height: 360 }}>
              {typeChartData.labels.length > 0 ? (
                <Doughnut data={typeChartData} options={doughnutOptions} />
              ) : (
                <div className="d-flex flex-column align-items-center justify-content-center h-100">
                  <i className="bi bi-pie-chart fs-1 text-muted"></i>
                  <p className="text-muted mt-3">No activity data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;