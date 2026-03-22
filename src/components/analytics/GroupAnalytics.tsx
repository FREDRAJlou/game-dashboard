'use client';

import { Grid } from '@mui/material';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';
import { chartColors, generateColorArray } from '@/lib/chart-config';

interface GroupAnalyticsData {
  group: {
    id: number;
    name: string;
    color: string | null;
  };
  standings: Array<{
    player: { id: number; name: string };
    matches: number;
    wins: number;
    losses: number;
    points: number;
  }>;
  stats: {
    totalCompletedMatches: number;
    totalScheduledMatches: number;
    completionRate: number;
    avgScoreDifferential: number;
  };
  chartData: {
    standingsPoints: Array<{
      player: string;
      points: number;
      wins: number;
    }>;
    participation: Array<{
      player: string;
      matches: number;
    }>;
    competitiveness: Array<{
      match: string;
      differential: number;
    }>;
  };
}

interface GroupAnalyticsProps {
  data: GroupAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
}

export default function GroupAnalytics({
  data,
  loading = false,
  error = null,
}: GroupAnalyticsProps) {
  if (!data) {
    return null;
  }

  const { chartData, stats } = data;

  return (
    <Grid container spacing={3}>
      {/* Standings Points Bar Chart */}
      <Grid size={{ xs: 12, md: 6 }}>
        <BarChart
          title="Points by Player"
          labels={chartData.standingsPoints.map((s) => s.player)}
          datasets={[
            {
              label: 'Total Points',
              data: chartData.standingsPoints.map((s) => s.points),
              backgroundColor: chartColors.primary,
              borderColor: chartColors.primary,
            },
          ]}
          loading={loading}
          error={error}
          height={300}
        />
      </Grid>

      {/* Completion Rate Pie Chart */}
      <Grid size={{ xs: 12, md: 6 }}>
        <PieChart
          title="Match Completion"
          labels={['Completed', 'Remaining']}
          data={[
            stats.totalCompletedMatches,
            Math.max(0, stats.totalScheduledMatches - stats.totalCompletedMatches),
          ]}
          colors={[chartColors.success, chartColors.warning]}
          loading={loading}
          error={error}
          height={300}
        />
      </Grid>

      {/* Participation Bar Chart */}
      <Grid size={{ xs: 12, md: 6 }}>
        <BarChart
          title="Matches Played per Player"
          labels={chartData.participation.map((p) => p.player)}
          datasets={[
            {
              label: 'Matches',
              data: chartData.participation.map((p) => p.matches),
              backgroundColor: chartColors.secondary,
              borderColor: chartColors.secondary,
            },
          ]}
          loading={loading}
          error={error}
          height={300}
        />
      </Grid>

      {/* Win/Loss Distribution */}
      <Grid size={{ xs: 12, md: 6 }}>
        <BarChart
          title="Wins vs Losses"
          labels={chartData.standingsPoints.map((s) => s.player)}
          datasets={[
            {
              label: 'Wins',
              data: chartData.standingsPoints.map((s) => s.wins),
              backgroundColor: chartColors.win,
            },
            {
              label: 'Losses',
              data: chartData.standingsPoints.map((s) => {
                const standing = data.standings.find(st => st.player.name === s.player);
                return standing?.losses || 0;
              }),
              backgroundColor: chartColors.loss,
            },
          ]}
          loading={loading}
          error={error}
          height={300}
        />
      </Grid>

      {/* Score Differentials (Competitiveness) */}
      {chartData.competitiveness.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <BarChart
            title={`Match Competitiveness (Avg Differential: ${stats.avgScoreDifferential} pts)`}
            labels={chartData.competitiveness.map((c) => c.match)}
            datasets={[
              {
                label: 'Score Differential',
                data: chartData.competitiveness.map((c) => c.differential),
                backgroundColor: chartColors.info,
                borderColor: chartColors.info,
              },
            ]}
            loading={loading}
            error={error}
            height={300}
          />
        </Grid>
      )}
    </Grid>
  );
}
