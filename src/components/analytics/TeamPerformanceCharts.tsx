'use client';

import { Grid, Paper, Typography, Box } from '@mui/material';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

interface TeamPerformanceChartsProps {
  chartData: {
    winLoss: {
      wins: number;
      losses: number;
    };
    gamePointsByMatch: Array<{
      match: string;
      points: number;
      date: Date;
    }>;
    tournamentPointsByMatch: Array<{
      match: string;
      points: number;
      date: Date;
    }>;
    formTrend: Array<{
      match: string;
      winRate: number;
    }>;
  };
}

export default function TeamPerformanceCharts({ chartData }: TeamPerformanceChartsProps) {
  const { winLoss, gamePointsByMatch, tournamentPointsByMatch, formTrend } = chartData;

  // Prepare data for pie chart
  const winLossLabels = ['Wins', 'Losses'];
  const winLossValues = [winLoss.wins, winLoss.losses];
  const winLossColors = ['#4caf50', '#f44336'];

  // Prepare data for game points bar chart
  const gamePointsLabels = gamePointsByMatch.slice().reverse().map((item) => item.match);
  const gamePointsDataset = [{
    label: 'Game Points',
    data: gamePointsByMatch.slice().reverse().map((item) => item.points),
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  }];

  // Prepare data for tournament points bar chart
  const tournamentPointsLabels = tournamentPointsByMatch.slice().reverse().map((item) => item.match);
  const tournamentPointsDataset = [{
    label: 'Tournament Points',
    data: tournamentPointsByMatch.slice().reverse().map((item) => item.points),
    backgroundColor: '#ff9800',
    borderColor: '#ff9800',
  }];

  // Prepare data for form trend line chart
  const formTrendLabels = formTrend.map((item) => item.match);
  const formTrendDataset = [{
    label: 'Win Rate %',
    data: formTrend.map((item) => item.winRate),
    borderColor: '#2196f3',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    fill: true,
  }];

  return (
    <Grid container spacing={3}>
      {/* Win/Loss Distribution */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Win/Loss Distribution
          </Typography>
          <Box sx={{ height: 300 }}>
            {winLoss.wins + winLoss.losses > 0 ? (
              <PieChart
                labels={winLossLabels}
                data={winLossValues}
                colors={winLossColors}
              />
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Typography color="text.secondary">No matches played yet</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Win Rate Trend */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Win Rate Trend (%)
          </Typography>
          <Box sx={{ height: 300 }}>
            {formTrendLabels.length > 0 ? (
              <LineChart
                labels={formTrendLabels}
                datasets={formTrendDataset}
              />
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Typography color="text.secondary">No matches played yet</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Game Points per Match */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Game Points per Match (Last 10)
          </Typography>
          <Box sx={{ height: 300 }}>
            {gamePointsLabels.length > 0 ? (
              <BarChart
                labels={gamePointsLabels}
                datasets={gamePointsDataset}
              />
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Typography color="text.secondary">No matches played yet</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Tournament Points per Match */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Tournament Points per Match (Last 10)
          </Typography>
          <Box sx={{ height: 300 }}>
            {tournamentPointsLabels.length > 0 ? (
              <BarChart
                labels={tournamentPointsLabels}
                datasets={tournamentPointsDataset}
              />
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Typography color="text.secondary">No matches played yet</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
