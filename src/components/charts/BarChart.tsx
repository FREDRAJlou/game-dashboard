'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getBarChartOptions } from '@/lib/chart-config';
import ChartWrapper from './ChartWrapper';
import { useTheme } from '@/contexts/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  title?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
  }>;
  loading?: boolean;
  error?: string | null;
  height?: number;
  horizontal?: boolean;
}

export default function BarChartComponent({
  title,
  labels,
  datasets,
  loading = false,
  error = null,
  height = 300,
  horizontal = false,
}: BarChartProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const chartData = {
    labels,
    datasets,
  };

  const hasData = datasets.some((dataset) => dataset.data.some((value) => value > 0));

  return (
    <ChartWrapper
      title={title}
      loading={loading}
      error={error}
      showEmpty={!hasData}
      emptyMessage="No data to display"
      height={height}
    >
      <Bar data={chartData} options={getBarChartOptions(isDark, horizontal)} />
    </ChartWrapper>
  );
}
