'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { getLineChartOptions } from '@/lib/chart-config';
import ChartWrapper from './ChartWrapper';
import { useTheme } from '@/contexts/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LineChartProps {
  title?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor?: string;
    fill?: boolean;
  }>;
  loading?: boolean;
  error?: string | null;
  height?: number;
}

export default function LineChartComponent({
  title,
  labels,
  datasets,
  loading = false,
  error = null,
  height = 300,
}: LineChartProps) {
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
      <Line data={chartData} options={getLineChartOptions(isDark)} />
    </ChartWrapper>
  );
}
