'use client';

import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getPieChartOptions } from '@/lib/chart-config';
import ChartWrapper from './ChartWrapper';
import { useTheme } from '@/contexts/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  title?: string;
  labels: string[];
  data: number[];
  colors: string[];
  loading?: boolean;
  error?: string | null;
  height?: number;
}

export default function PieChartComponent({
  title,
  labels,
  data,
  colors,
  loading = false,
  error = null,
  height = 300,
}: PieChartProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderColor: colors.map((c) => c),
        borderWidth: 2,
      },
    ],
  };

  const hasData = data.some((value) => value > 0);

  return (
    <ChartWrapper
      title={title}
      loading={loading}
      error={error}
      showEmpty={!hasData}
      emptyMessage="No data to display"
      height={height}
    >
      <Pie data={chartData} options={getPieChartOptions(isDark)} />
    </ChartWrapper>
  );
}
