'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, CompareArrows } from '@mui/icons-material';
import Header from '@/components/Header';

type Player = {
  id: number;
  name: string;
};

type PlayerStats = {
  playerId: number;
  playerName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
  totalPointsScored: number;
  totalPointsConceded: number;
  averagePointsScored: number;
  averagePointsConceded: number;
  pointDifferential: number;
};

export default function ComparePlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [player1Id, setPlayer1Id] = useState<number | ''>('');
  const [player2Id, setPlayer2Id] = useState<number | ''>('');
  const [player1Stats, setPlayer1Stats] = useState<PlayerStats | null>(null);
  const [player2Stats, setPlayer2Stats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (!response.ok) throw new Error('Failed to fetch players');
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      console.error('Error fetching players:', err);
      setError('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStats = async (playerId: number): Promise<PlayerStats | null> => {
    try {
      const response = await fetch(`/api/players/${playerId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch player stats');
      return await response.json();
    } catch (err) {
      console.error('Error fetching player stats:', err);
      return null;
    }
  };

  const handleCompare = async () => {
    if (!player1Id || !player2Id) {
      setError('Please select both players to compare');
      return;
    }

    if (player1Id === player2Id) {
      setError('Please select different players to compare');
      return;
    }

    setComparing(true);
    setError('');

    try {
      const [stats1, stats2] = await Promise.all([
        fetchPlayerStats(player1Id as number),
        fetchPlayerStats(player2Id as number),
      ]);

      setPlayer1Stats(stats1);
      setPlayer2Stats(stats2);
    } catch (err) {
      setError('Failed to load comparison data');
    } finally {
      setComparing(false);
    }
  };

  const renderStatComparison = (
    label: string,
    value1: number | string,
    value2: number | string,
    isPercentage: boolean = false,
    higherIsBetter: boolean = true
  ) => {
    const numValue1 = typeof value1 === 'string' ? parseFloat(value1) : value1;
    const numValue2 = typeof value2 === 'string' ? parseFloat(value2) : value2;
    
    const player1Better = higherIsBetter ? numValue1 > numValue2 : numValue1 < numValue2;
    const player2Better = higherIsBetter ? numValue2 > numValue1 : numValue2 < numValue1;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
          {label}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 2,
              backgroundColor: player1Better ? 'success.light' : 'background.paper',
              border: player1Better ? '2px solid' : '1px solid',
              borderColor: player1Better ? 'success.main' : 'divider',
            }}
          >
            <Typography variant="h6" align="center" fontWeight="bold">
              {isPercentage ? `${value1}%` : value1}
            </Typography>
          </Paper>
          <CompareArrows color="action" />
          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 2,
              backgroundColor: player2Better ? 'success.light' : 'background.paper',
              border: player2Better ? '2px solid' : '1px solid',
              borderColor: player2Better ? 'success.main' : 'divider',
            }}
          >
            <Typography variant="h6" align="center" fontWeight="bold">
              {isPercentage ? `${value2}%` : value2}
            </Typography>
          </Paper>
        </Stack>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box>
        <Header />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/dashboard')}
          sx={{ mb: 3 }}
        >
          Back to Dashboard
        </Button>

        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Compare Players
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Select two players to compare their performance statistics
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" sx={{ mb: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Player 1</InputLabel>
              <Select
                value={player1Id}
                onChange={(e) => setPlayer1Id(e.target.value as number)}
                label="Player 1"
              >
                <MenuItem value="">
                  <em>Select a player</em>
                </MenuItem>
                {players.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              <CompareArrows fontSize="large" color="primary" />
            </Box>
            
            <FormControl fullWidth>
              <InputLabel>Player 2</InputLabel>
              <Select
                value={player2Id}
                onChange={(e) => setPlayer2Id(e.target.value as number)}
                label="Player 2"
              >
                <MenuItem value="">
                  <em>Select a player</em>
                </MenuItem>
                {players.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleCompare}
            disabled={!player1Id || !player2Id || comparing}
            startIcon={comparing ? <CircularProgress size={20} /> : <CompareArrows />}
          >
            {comparing ? 'Loading...' : 'Compare'}
          </Button>

          {player1Stats && player2Stats && (
            <Box sx={{ mt: 4 }}>
              <Divider sx={{ mb: 4 }} />
              
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Box flex={1}>
                  <Typography variant="h5" align="center" fontWeight="bold" color="primary">
                    {player1Stats.playerName}
                  </Typography>
                </Box>
                <Box />
                <Box flex={1}>
                  <Typography variant="h5" align="center" fontWeight="bold" color="primary">
                    {player2Stats.playerName}
                  </Typography>
                </Box>
              </Stack>

              {renderStatComparison(
                'Matches Played',
                player1Stats.matchesPlayed,
                player2Stats.matchesPlayed,
                false,
                true
              )}

              {renderStatComparison(
                'Matches Won',
                player1Stats.matchesWon,
                player2Stats.matchesWon,
                false,
                true
              )}

              {renderStatComparison(
                'Win Rate',
                player1Stats.winRate.toFixed(1),
                player2Stats.winRate.toFixed(1),
                true,
                true
              )}

              {renderStatComparison(
                'Total Points Scored',
                player1Stats.totalPointsScored,
                player2Stats.totalPointsScored,
                false,
                true
              )}

              {renderStatComparison(
                'Total Points Conceded',
                player1Stats.totalPointsConceded,
                player2Stats.totalPointsConceded,
                false,
                false
              )}

              {renderStatComparison(
                'Average Points Per Match',
                player1Stats.averagePointsScored.toFixed(1),
                player2Stats.averagePointsScored.toFixed(1),
                false,
                true
              )}

              {renderStatComparison(
                'Point Differential',
                player1Stats.pointDifferential > 0 ? `+${player1Stats.pointDifferential}` : player1Stats.pointDifferential,
                player2Stats.pointDifferential > 0 ? `+${player2Stats.pointDifferential}` : player2Stats.pointDifferential,
                false,
                true
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
