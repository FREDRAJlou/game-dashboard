'use client';

import { Grid, Typography, Box, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import { chartColors } from '@/lib/chart-config';

interface PerformanceStats {
  wins: number;
  losses: number;
  winRate: number;
  gamePoints: number;
  tournamentPoints: number;
  matches: number;  // Changed from matchesPlayed to matches
  avgGamePointsPerMatch: number;
}

interface PlayerStats {
  overall: {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    gamePointsScored: number;
    gamePointsConceded: number;
    tournamentPoints: number;
    avgGamePointsPerMatch: number;
  };
  singles: PerformanceStats;
  doubles: PerformanceStats;
  chartData: {
    winLoss: {
      wins: number;
      losses: number;
    };
    pointsByMatch: Array<{
      match: string;
      points: number;
      date: Date;
    }>;
    formTrend: Array<{
      match: string;
      winRate: number;
    }>;
    stagePerformance: Array<{
      stage: string;
      wins: number;
      losses: number;
      total: number;
    }>;
  };
}

interface PlayerPerformanceChartsProps {
  stats: PlayerStats | null;
  loading?: boolean;
  error?: string | null;
}

export default function PlayerPerformanceCharts({
  stats,
  loading = false,
  error = null,
}: PlayerPerformanceChartsProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!stats) {
    return null;
  }

  const { chartData, overall, singles, doubles } = stats;

  // Determine which stats to display based on active tab
  const currentStats = activeTab === 0 
    ? { ...overall, matches: overall.totalMatches, gamePoints: overall.gamePointsScored, avgGamePointsPerMatch: overall.avgGamePointsPerMatch, tournamentPoints: overall.tournamentPoints }
    : activeTab === 1 
    ? singles 
    : doubles;
  const tabLabel = activeTab === 0 ? 'Overall' : activeTab === 1 ? 'Singles' : 'Doubles';

  return (
    <Box>
      {/* Tabs for Overall/Singles/Doubles */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overall" />
          <Tab label={`Singles (${singles.matches} matches)`} />
          <Tab label={`Doubles (${doubles.matches} matches)`} />
        </Tabs>
      </Box>

      {/* Stats Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">{currentStats.wins}</Typography>
            <Typography variant="body2" color="text.secondary">Wins</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h4" color="error">{currentStats.losses}</Typography>
            <Typography variant="body2" color="text.secondary">Losses</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">{Math.round(currentStats.gamePoints)}</Typography>
            <Typography variant="body2" color="text.secondary">Game Points</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">{currentStats.tournamentPoints.toFixed(1)}</Typography>
            <Typography variant="body2" color="text.secondary">Tournament Pts</Typography>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
      {/* Win/Loss Pie Chart */}
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <PieChart
          title={`${tabLabel} Win/Loss Ratio`}
          labels={['Wins', 'Losses']}
          data={[currentStats.wins, currentStats.losses]}
          colors={[chartColors.win, chartColors.loss]}
          loading={loading}
          error={error}
          height={300}
        />
      </Grid>

      {/* Points by Match Bar Chart */}
      <Grid size={{ xs: 12, md: 6, lg: 8 }}>
        <BarChart
          title="Points Scored (Last 10 Matches)"
          labels={chartData.pointsByMatch.map((m) => m.match)}
          datasets={[
            {
              label: 'Points',
              data: chartData.pointsByMatch.map((m) => m.points),
              backgroundColor: chartColors.primary,
              borderColor: chartColors.primary,
            },
          ]}
          loading={loading}
          error={error}
          height={300}
        />
      </Grid>

      {/* Form Trend Line Chart */}
      <Grid size={{ xs: 12, md: 6, lg: 8 }}>
        <LineChart
          title="Win Rate Trend (Last 10 Matches)"
          labels={chartData.formTrend.map((f) => f.match)}
          datasets={[
            {
              label: 'Win Rate %',
              data: chartData.formTrend.map((f) => f.winRate),
              borderColor: chartColors.secondary,
              backgroundColor: `${chartColors.secondary}33`,
              fill: true,
            },
          ]}
          loading={loading}
          error={error}
          height={300}
        />
      </Grid>

      {/* Stage Performance Bar Chart */}
      {chartData.stagePerformance.length > 0 && (
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <BarChart
            title="Performance by Stage"
            labels={chartData.stagePerformance.map((s) => s.stage)}
            datasets={[
              {
                label: 'Wins',
                data: chartData.stagePerformance.map((s) => s.wins),
                backgroundColor: chartColors.win,
              },
              {
                label: 'Losses',
                data: chartData.stagePerformance.map((s) => s.losses),
                backgroundColor: chartColors.loss,
              },
            ]}
            loading={loading}
            error={error}
            height={300}
          />
        </Grid>
      )}
    </Grid>
    </Box>
  );
}
