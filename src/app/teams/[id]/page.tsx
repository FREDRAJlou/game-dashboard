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
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  EmojiEvents,
  TrendingUp,
  SportsScore,
  Group as GroupIcon,
} from '@mui/icons-material';
import TeamPerformanceCharts from '@/components/analytics/TeamPerformanceCharts';

interface TeamStats {
  team: {
    id: number;
    name: string;
    players: Array<{
      id: number;
      name: string;
    }>;
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
    avgTournamentPointsPerMatch: string;
  };
  recentForm: Array<{
    matchId: number;
    result: 'WIN' | 'LOSS';
    gamePoints: number;
    opponentPoints: number;
    tournamentPoints: number;
    date: string;
    opponent: string;
    tournament: string;
  }>;
  chartData: any;
}

export default function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.id;
  const router = useRouter();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeamStats();
  }, [teamId]);

  const fetchTeamStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamId}/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch team stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching team stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !stats) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Failed to load team stats'}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => router.back()}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>
        Back
      </Button>

      {/* Team Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              {stats.team.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Doubles Team
            </Typography>
          </Box>
        </Stack>

        {/* Team Members */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Team Members:
          </Typography>
          <Stack direction="row" spacing={1}>
            {stats.team.players.map((player) => (
              <Chip
                key={player.id}
                label={player.name}
                color="primary"
                variant="outlined"
                onClick={() => router.push(`/players/${player.id}`)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      </Paper>

      {/* Overall Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  Total Matches
                </Typography>
                <Typography variant="h4">{stats.overall.totalMatches}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  Win Rate
                </Typography>
                <Typography variant="h4" color={stats.overall.winRate >= 50 ? 'success.main' : 'error.main'}>
                  {stats.overall.winRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.overall.wins}W - {stats.overall.losses}L
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  Tournament Points
                </Typography>
                <Typography variant="h4">{stats.overall.tournamentPoints}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg: {stats.overall.avgTournamentPointsPerMatch} per match
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  Game Points
                </Typography>
                <Typography variant="h4">{stats.overall.gamePointsScored}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg: {stats.overall.avgGamePointsPerMatch} per match
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <TeamPerformanceCharts chartData={stats.chartData} />

      {/* Recent Form */}
      <Paper sx={{ mt: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
            Recent Match History
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Result</TableCell>
                <TableCell>Tournament</TableCell>
                <TableCell>Opponent</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell align="center">Pts Earned</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.recentForm.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No matches played yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentForm.map((match, index) => (
                  <TableRow
                    key={index}
                    hover
                    onClick={() => router.push(`/match/${match.matchId}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Chip
                        label={match.result}
                        color={match.result === 'WIN' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{match.tournament}</TableCell>
                    <TableCell>{match.opponent}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          color: match.result === 'WIN' ? 'success.main' : 'text.primary',
                        }}
                      >
                        {match.gamePoints} - {match.opponentPoints}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={<EmojiEvents />}
                        label={match.tournamentPoints}
                        size="small"
                        color={match.tournamentPoints > 0 ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(match.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}
