'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Remove,
  CheckCircle,
  PlayArrow,
} from '@mui/icons-material';

type Match = {
  id: number;
  type: 'SINGLES' | 'DOUBLES';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  stage: 'GROUP_STAGE' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';
  team1Score: number | null;
  team2Score: number | null;
  tournamentId: number | null;
  group1?: { id: number; name: string; color: string };
  group2?: { id: number; name: string; color: string };
  players: Array<{
    teamSide: number;
    player: { id: number; name: string };
  }>;
  team1?: { name: string };
  team2?: { name: string };
  tournament?: { id: number; name: string };
};

export default function LiveMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const matchId = parseInt(resolvedParams.id);
  const router = useRouter();
  const { user } = useAuth();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Individual player scores for doubles
  const [playerScores, setPlayerScores] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchMatch();
    // Only poll for non-admins watching IN_PROGRESS matches
    // Polling disabled for completed/scheduled matches to reduce load
    if (!user?.isAdmin && match?.status === 'IN_PROGRESS') {
      const interval = setInterval(() => {
        fetchMatch();
      }, 10000); // Poll every 10 seconds instead of 3
      return () => clearInterval(interval);
    }
  }, [matchId, user?.isAdmin, match?.status]);

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      if (!response.ok) throw new Error('Failed to fetch match');
      
      const data = await response.json();
      setMatch(data);
      // Only update scores from server if not currently editing
      if (!isEditing) {
        setTeam1Score(data.team1Score || 0);
        setTeam2Score(data.team2Score || 0);
      }
    } catch (err) {
      console.error('Error fetching match:', err);
      setError(err instanceof Error ? err.message : 'Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!user?.isAdmin) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString(),
          userId: user.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to start match');
      await fetchMatch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start match');
    } finally {
      setUpdating(false);
    }
  };

  const handleScoreUpdate = async (team: 1 | 2, increment: number) => {
    if ((!user?.isAdmin && !user?.isScoringAdmin) || match?.status !== 'IN_PROGRESS') return;

    const newTeam1Score = team === 1 ? team1Score + increment : team1Score;
    const newTeam2Score = team === 2 ? team2Score + increment : team2Score;

    if (newTeam1Score < 0 || newTeam2Score < 0) return;

    // Set editing mode to prevent polling from overwriting
    setIsEditing(true);
    setTeam1Score(newTeam1Score);
    setTeam2Score(newTeam2Score);

    try {
      await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1Score: newTeam1Score,
          team2Score: newTeam2Score,
          userId: user.id,
        }),
      });
      // Re-enable polling after successful update
      setTimeout(() => setIsEditing(false), 1000);
    } catch (err) {
      console.error('Error updating score:', err);
      // Re-enable polling even on error
      setIsEditing(false);
    }
  };

  const handlePlayerScoreUpdate = async (playerId: number, increment: number) => {
    if ((!user?.isAdmin && !user?.isScoringAdmin) || match?.status !== 'IN_PROGRESS') return;

    const newScore = (playerScores[playerId] || 0) + increment;
    if (newScore < 0) return;

    setPlayerScores(prev => ({ ...prev, [playerId]: newScore }));

    // Also update team total
    const playerTeamSide = match?.players.find(p => p.player.id === playerId)?.teamSide;
    if (playerTeamSide === 1) {
      setTeam1Score(prev => prev + increment);
    } else if (playerTeamSide === 2) {
      setTeam2Score(prev => prev + increment);
    }
  };

  const handleCompleteMatch = async () => {
    if (!user?.isAdmin || match?.status !== 'IN_PROGRESS') return;
    
    if (team1Score === team2Score) {
      setError('Cannot complete match with tied scores');
      return;
    }

    setUpdating(true);
    try {
      const winnerTeam = team1Score > team2Score ? 1 : 2;
      
      const body: any = {
        team1Score,
        team2Score,
        winnerTeam,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      };

      // Include player scores for doubles matches
      if (match?.type === 'DOUBLES' && Object.keys(playerScores).length > 0) {
        body.playerScores = playerScores;
      }
      
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          userId: user.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to complete match');
      
      alert('Match completed successfully!');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete match');
    } finally {
      setUpdating(false);
    }
  };

  const getTeamDisplay = (teamSide: number) => {
    if (!match) return '';
    
    const teamPlayers = match.players.filter(p => p.teamSide === teamSide);
    const playerNames = teamPlayers.map(p => p.player.name).join(' & ');
    
    if (teamSide === 1 && match.team1) {
      return `${match.team1.name} (${playerNames})`;
    }
    if (teamSide === 2 && match.team2) {
      return `${match.team2.name} (${playerNames})`;
    }
    
    return playerNames;
  };

  const getGroupColor = (teamSide: number) => {
    if (!match) return undefined;
    return teamSide === 1 ? match.group1?.color : match.group2?.color;
  };

  const getStagePoints = () => {
    if (!match || !match.stage) return { singles: 1, doubles: 2 };
    
    switch (match.stage) {
      case 'QUARTER_FINAL':
        return { singles: 2, doubles: 4 };
      case 'SEMI_FINAL':
        return { singles: 3, doubles: 6 };
      case 'FINAL':
        return { singles: 5, doubles: 10 };
      default:
        return { singles: 1, doubles: 2 };
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error && !match) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => router.push('/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!match) return null;

  const points = getStagePoints();
  const stageLabel = match.stage ? match.stage.replace('_', ' ') : 'GROUP STAGE';

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => router.push('/dashboard')}
        sx={{ mb: 2 }}
      >
        Back to Dashboard
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={3}>
          {/* Match Header */}
          <Box textAlign="center">
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
              <Chip label={match.type} color="primary" />
              <Chip label={stageLabel} color="secondary" />
              <Chip 
                label={match.status.replace('_', ' ')} 
                color={match.status === 'IN_PROGRESS' ? 'warning' : 'primary'}
              />
              {match.tournament && (
                <Chip label={match.tournament.name} variant="outlined" />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Winner gets {match.type === 'SINGLES' ? points.singles : points.doubles} points
            </Typography>
          </Box>

          <Divider />

          {/* Scoreboard */}
          <Stack 
            direction={{ xs: 'column', md: 'row' }} 
            spacing={4}
            alignItems="stretch"
          >
            {/* Team 1 */}
            <Box sx={{ flex: 1 }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  backgroundColor: getGroupColor(1) || 'background.paper',
                  color: getGroupColor(1) ? 'white' : 'inherit',
                }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {match.group1?.name || 'Team 1'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  {getTeamDisplay(1)}
                </Typography>
                <Typography variant="h1" fontWeight="bold">
                  {team1Score}
                </Typography>
                
                {(user?.isAdmin || user?.isScoringAdmin) && match.status === 'IN_PROGRESS' && (
                  <>
                    {/* Individual player scoring for doubles */}
                    {match.type === 'DOUBLES' && match.players.filter(p => p.teamSide === 1).length > 0 ? (
                      <Stack spacing={2} sx={{ mt: 3 }}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Individual Player Scores
                        </Typography>
                        {match.players
                          .filter(p => p.teamSide === 1)
                          .map(player => (
                            <Box key={player.player.id}>
                              <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                                {player.player.name}: {playerScores[player.player.id] || 0}
                              </Typography>
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <IconButton 
                                  size="small"
                                  color="inherit"
                                  onClick={() => handlePlayerScoreUpdate(player.player.id, -1)}
                                  disabled={(playerScores[player.player.id] || 0) === 0}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small"
                                  color="inherit"
                                  onClick={() => handlePlayerScoreUpdate(player.player.id, 1)}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                    ) : (
                      /* Team-level scoring for singles */
                      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                        <IconButton 
                          color="inherit"
                          onClick={() => handleScoreUpdate(1, -1)}
                          disabled={team1Score === 0}
                        >
                          <Remove />
                        </IconButton>
                        <IconButton 
                          color="inherit"
                          onClick={() => handleScoreUpdate(1, 1)}
                        >
                          <Add />
                        </IconButton>
                      </Stack>
                    )}
                  </>
                )}
              </Paper>
            </Box>

            {/* VS */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: { md: 80 } }}>
              <Typography variant="h4" color="text.secondary">
                VS
              </Typography>
            </Box>

            {/* Team 2 */}
            <Box sx={{ flex: 1 }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  backgroundColor: getGroupColor(2) || 'background.paper',
                  color: getGroupColor(2) ? 'white' : 'inherit',
                }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {match.group2?.name || 'Team 2'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  {getTeamDisplay(2)}
                </Typography>
                <Typography variant="h1" fontWeight="bold">
                  {team2Score}
                </Typography>
                
                {(user?.isAdmin || user?.isScoringAdmin) && match.status === 'IN_PROGRESS' && (
                  <>
                    {/* Individual player scoring for doubles */}
                    {match.type === 'DOUBLES' && match.players.filter(p => p.teamSide === 2).length > 0 ? (
                      <Stack spacing={2} sx={{ mt: 3 }}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Individual Player Scores
                        </Typography>
                        {match.players
                          .filter(p => p.teamSide === 2)
                          .map(player => (
                            <Box key={player.player.id}>
                              <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                                {player.player.name}: {playerScores[player.player.id] || 0}
                              </Typography>
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <IconButton 
                                  size="small"
                                  color="inherit"
                                  onClick={() => handlePlayerScoreUpdate(player.player.id, -1)}
                                  disabled={(playerScores[player.player.id] || 0) === 0}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small"
                                  color="inherit"
                                  onClick={() => handlePlayerScoreUpdate(player.player.id, 1)}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                    ) : (
                      /* Team-level scoring for singles */
                      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                        <IconButton 
                          color="inherit"
                          onClick={() => handleScoreUpdate(2, -1)}
                          disabled={team2Score === 0}
                        >
                          <Remove />
                        </IconButton>
                        <IconButton 
                          color="inherit"
                          onClick={() => handleScoreUpdate(2, 1)}
                        >
                          <Add />
                        </IconButton>
                      </Stack>
                    )}
                  </>
                )}
              </Paper>
            </Box>
          </Stack>

          {/* Admin Controls */}
          {user?.isAdmin && (
            <Box textAlign="center">
              {match.status === 'SCHEDULED' && (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrow />}
                  onClick={handleStartMatch}
                  disabled={updating}
                >
                  Start Match
                </Button>
              )}

              {match.status === 'IN_PROGRESS' && (
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<CheckCircle />}
                  onClick={handleCompleteMatch}
                  disabled={updating || team1Score === team2Score}
                >
                  Complete Match
                </Button>
              )}

              {team1Score === team2Score && match.status === 'IN_PROGRESS' && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  Scores must be different to complete the match
                </Typography>
              )}
            </Box>
          )}

          {match.status === 'COMPLETED' && (
            <Alert severity="success">
              <Typography variant="h6">
                Match Completed! 
                {match.team1Score! > match.team2Score! 
                  ? ` ${getTeamDisplay(1)} wins!` 
                  : ` ${getTeamDisplay(2)} wins!`}
              </Typography>
            </Alert>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
