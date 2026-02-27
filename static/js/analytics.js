/**
 * Fleet Optimizer - Analytics Page JavaScript
 */

let statusChart = null;
let fuelChart = null;
let performanceChart = null;

document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  loadData();
  setInterval(loadData, 60000);
});

function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };
  
  // Status Chart (Doughnut)
  const statusCtx = document.getElementById('statusChart').getContext('2d');
  statusChart = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          '#10b981',
          '#6b7280',
          '#f59e0b',
          '#ef4444'
        ]
      }]
    },
    options: chartOptions
  });
  
  // Fuel Chart (Bar)
  const fuelCtx = document.getElementById('fuelChart').getContext('2d');
  fuelChart = new Chart(fuelCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Vehicles',
        data: [],
        backgroundColor: '#6366f1'
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // Performance Chart (Line)
  const perfCtx = document.getElementById('performanceChart').getContext('2d');
  performanceChart = new Chart(perfCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Active Vehicles',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: 'Alerts',
          data: [],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          borderWidth: 2,
          tension: 0.4
        }
      ]
    },
    options: {
      ...chartOptions,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

async function loadData() {
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    
    // Update metrics
    document.getElementById('avgFuel').textContent = `${stats.avg_fuel.toFixed(1)}%`;
    document.getElementById('vehiclesActive').textContent = stats.active_vehicles;
    document.getElementById('totalAlerts').textContent = stats.unresolved_alerts;
    document.getElementById('fleetHealth').textContent = calculateHealthScore(stats) + '%';
    
    // Update charts
    updateCharts(stats);
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

function updateCharts(stats) {
  // Status Distribution
  const statusLabels = Object.keys(stats.status_breakdown);
  const statusData = Object.values(stats.status_breakdown);
  
  statusChart.data.labels = statusLabels.map(s => 
    s.charAt(0).toUpperCase() + s.slice(1)
  );
  statusChart.data.datasets[0].data = statusData;
  statusChart.update();
  
  // Fuel Distribution (simplified)
  const fuelRanges = ['0-30%', '30-60%', '60-90%', '90-100%'];
  const fuelCounts = [0, 0, 0, 0];
  
  // In a real app, this would come from actual vehicle data
  // For now, we'll generate approximate data based on stats
  const avgFuel = stats.avg_fuel;
  if (avgFuel < 30) {
    fuelCounts[0] = stats.low_fuel_count;
    fuelCounts[1] = Math.floor(stats.total_vehicles / 3);
    fuelCounts[2] = Math.floor(stats.total_vehicles / 3);
    fuelCounts[3] = Math.ceil(stats.total_vehicles / 3);
  } else if (avgFuel < 60) {
    fuelCounts[0] = 1;
    fuelCounts[1] = Math.floor(stats.total_vehicles / 2);
    fuelCounts[2] = Math.ceil(stats.total_vehicles / 2);
    fuelCounts[3] = 0;
  } else {
    fuelCounts[0] = 0;
    fuelCounts[1] = Math.floor(stats.total_vehicles / 3);
    fuelCounts[2] = Math.floor(stats.total_vehicles / 3);
    fuelCounts[3] = Math.ceil(stats.total_vehicles / 3);
  }
  
  fuelChart.data.labels = fuelRanges;
  fuelChart.data.datasets[0].data = fuelCounts;
  fuelChart.update();
  
  // Performance Chart
  const hours = Array.from({length: 24}, (_, i) => i);
  const performanceLabels = hours.map(h => String(h).padStart(2, '0') + ':00');
  
  // Simulated data (in real app, fetch actual metrics)
  const activeData = hours.map(() => 
    stats.active_vehicles + Math.sin(Math.random() * Math.PI) * 2
  );
  const alertData = hours.map(() =>
    stats.unresolved_alerts + Math.sin(Math.random() * Math.PI)
  );
  
  performanceChart.data.labels = performanceLabels;
  performanceChart.data.datasets[0].data = activeData;
  performanceChart.data.datasets[1].data = alertData;
  performanceChart.update();
}

function calculateHealthScore(stats) {
  // Health score based on fleet metrics
  let score = 100;
  
  // Deduct for low fuel
  score -= stats.low_fuel_count * 5;
  
  // Deduct for alerts
  score -= Math.min(stats.unresolved_alerts * 2, 30);
  
  // Deduct for maintenance vehicles
  const maintenanceCount = stats.status_breakdown.maintenance || 0;
  score -= maintenanceCount * 5;
  
  // Bonus for active vehicles
  score += Math.min(stats.active_vehicles * 2, 20);
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function refreshData() {
  loadData();
}
