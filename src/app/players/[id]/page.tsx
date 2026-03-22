'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  EmojiEvents,
  TrendingUp,
  SportsScore,
} from '@mui/icons-material';
import PlayerPerformanceCharts from '@/components/analytics/PlayerPerformanceCharts';

interface PlayerStats {
  player: {
    id: number;
    name: string;
  };
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
  singles: {
    matches: number;
    wins: number;
    losses: number;
    winRate: number;
    gamePoints: number;
    tournamentPoints: number;
    avgGamePointsPerMatch: number;
  };
  doubles: {
    matches: number;
    wins: number;
    losses: number;
    winRate: number;
    gamePoints: number;
    tournamentPoints: number;
    avgGamePointsPerMatch: number;
  };
  byType: {
    singles: {
      matches: number;
      wins: number;
      losses: number;
      winRate: number;
    };
    doubles: {
      matches: number;
      wins: number;
      losses: number;
      winRate: number;
    };
  };
  recentForm: Array<{
    matchId: number;
    result: 'WIN' | 'LOSS';
    points: number;
    opponentPoints: number;
    date: string;
    opponent: string;
    type: string;
  }>;
  chartData: any;
}

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const playerId = resolvedParams.id;
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlayerStats();
  }, [playerId]);

  const fetchPlayerStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/players/${playerId}/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch player stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load player stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !stats) {
    return (
      <Container sx={{ mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="error">{error || 'Player not found'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>
        Back
      </Button>

      {/* Player Info Card */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #00e5ff 30%, #7c4dff 90%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 700,
              color: 'white',
            }}
          >
            {stats.player.name.charAt(0).toUpperCase()}
          </Box>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h3" gutterBottom>
              {stats.player.name}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip
                icon={<SportsScore />}
                label={`${stats.overall.totalMatches} Matches`}
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<EmojiEvents />}
                label={`${stats.overall.wins} Wins`}
                color="success"
              />
              <Chip
                icon={<TrendingUp />}
                label={`${stats.overall.winRate}% Win Rate`}
                color="info"
              />
            </Stack>
          </Box>
        </Stack>

        {/* Quick Stats Grid */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Game Points Scored
              </Typography>
              <Typography variant="h5" color="primary">
                {stats.overall.gamePointsScored}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Avg Points/Match
              </Typography>
              <Typography variant="h5" color="primary">
                {stats.overall.avgGamePointsPerMatch}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Singles Win Rate
              </Typography>
              <Typography variant="h5" color="success.main">
                {stats.byType.singles.winRate}%
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Doubles Win Rate
              </Typography>
              <Typography variant="h5" color="info.main">
                {stats.byType.doubles.winRate}%
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Performance Charts */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          Performance Analytics
        </Typography>
        <PlayerPerformanceCharts stats={stats} />
      </Box>

      {/* Recent Matches Table */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
          Recent Matches
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Opponent</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell align="center"><strong>Score</strong></TableCell>
                <TableCell align="center"><strong>Result</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.recentForm.map((match) => (
                <TableRow
                  key={match.matchId}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' },
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push(`/match/${match.matchId}`)}
                >
                  <TableCell>
                    {new Date(match.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{match.opponent}</TableCell>
                  <TableCell>
                    <Chip
                      label={match.type}
                      size="small"
                      variant="outlined"
                      color={match.type === 'SINGLES' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {match.points} - {match.opponentPoints}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={match.result}
                      size="small"
                      color={match.result === 'WIN' ? 'success' : 'error'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {stats.recentForm.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No matches played yet
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
