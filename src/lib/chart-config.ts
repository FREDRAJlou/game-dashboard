import { ChartOptions } from 'chart.js';

// Chart color scheme
export const chartColors = {
  primary: '#00e5ff',
  secondary: '#7c4dff',
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  win: '#4caf50',
  loss: '#f44336',
  gradient: {
    cyan: ['#00e5ff', '#00b8d4'],
    purple: ['#7c4dff', '#651fff'],
    green: ['#4caf50', '#388e3c'],
    red: ['#f44336', '#d32f2f'],
    blue: ['#2196f3', '#1976d2'],
  },
};

// Common chart options
export const getCommonChartOptions = (isDark: boolean = true): ChartOptions => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        color: isDark ? '#ffffff' : '#000000',
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif',
        },
        padding: 15,
      },
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      titleColor: isDark ? '#ffffff' : '#000000',
      bodyColor: isDark ? '#ffffff' : '#000000',
      borderColor: chartColors.primary,
      borderWidth: 1,
      padding: 12,
      titleFont: {
        size: 14,
        weight: 'bold',
      },
      bodyFont: {
        size: 13,
      },
    },
  },
});

// Line chart specific options
export const getLineChartOptions = (isDark: boolean = true) => ({
  ...getCommonChartOptions(isDark),
  plugins: {
    ...getCommonChartOptions(isDark).plugins,
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        color: isDark ? '#ffffff' : '#000000',
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif',
        },
        padding: 15,
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        display: true,
      },
      ticks: {
        color: isDark ? '#ffffff' : '#000000',
      },
    },
    y: {
      grid: {
        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        display: true,
      },
      ticks: {
        color: isDark ? '#ffffff' : '#000000',
      },
      beginAtZero: true,
    },
  },
  elements: {
    line: {
      tension: 0.4, // Smooth curves
      borderWidth: 2,
    },
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
    },
  },
} as ChartOptions<'line'>);

// Bar chart specific options
export const getBarChartOptions = (isDark: boolean = true, horizontal: boolean = false) => ({
  ...getCommonChartOptions(isDark),
  indexAxis: horizontal ? ('y' as const) : ('x' as const),
  plugins: {
    ...getCommonChartOptions(isDark).plugins,
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        color: isDark ? '#ffffff' : '#000000',
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif',
        },
        padding: 15,
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        display: !horizontal,
      },
      ticks: {
        color: isDark ? '#ffffff' : '#000000',
      },
      beginAtZero: true,
    },
    y: {
      grid: {
        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        display: horizontal,
      },
      ticks: {
        color: isDark ? '#ffffff' : '#000000',
      },
      beginAtZero: true,
    },
  },
  elements: {
    bar: {
      borderRadius: 6,
      borderWidth: 0,
    },
  },
} as ChartOptions<'bar'>);

// Pie/Doughnut chart specific options
export const getPieChartOptions = (isDark: boolean = true) => ({
  ...getCommonChartOptions(isDark),
  plugins: {
    ...getCommonChartOptions(isDark).plugins,
    legend: {
      display: true,
      position: 'right' as const,
      labels: {
        color: isDark ? '#ffffff' : '#000000',
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif',
        },
        padding: 15,
      },
    },
  },
} as ChartOptions<'pie'>);

// Radar chart specific options
export const getRadarChartOptions = (isDark: boolean = true) => ({
  ...getCommonChartOptions(isDark),
  scales: {
    r: {
      grid: {
        color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      },
      angleLines: {
        color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      },
      ticks: {
        color: isDark ? '#ffffff' : '#000000',
        backdropColor: 'transparent',
      },
      pointLabels: {
        color: isDark ? '#ffffff' : '#000000',
        font: {
          size: 12,
        },
      },
      beginAtZero: true,
    },
  },
  elements: {
    line: {
      borderWidth: 2,
    },
    point: {
      radius: 4,
      hoverRadius: 6,
    },
  },
} as ChartOptions<'radar'>);

// Helper function to create gradient
export const createGradient = (
  ctx: CanvasRenderingContext2D,
  colors: string[],
  vertical: boolean = true
) => {
  const gradient = vertical
    ? ctx.createLinearGradient(0, 0, 0, 400)
    : ctx.createLinearGradient(0, 0, 400, 0);
  
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });
  
  return gradient;
};

// Helper to generate color array
export const generateColorArray = (count: number, baseColor: string = chartColors.primary): string[] => {
  const colors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.success,
    chartColors.warning,
    chartColors.info,
    chartColors.error,
  ];
  
  if (count <= colors.length) {
    return colors.slice(0, count);
  }
  
  // If more colors needed, generate variations
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
};

// Calculate win rate
export const calculateWinRate = (wins: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Format date for charts
export const formatChartDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format time for charts
export const formatChartTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
