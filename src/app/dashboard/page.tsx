'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  EmojiEvents,
  CalendarToday,
  People,
  Edit,
  CloudUpload,
  Search,
} from '@mui/icons-material';
import AddMatchForm from '@/components/AddMatchForm';
import AdminPanel from '@/components/AdminPanel';
import EditMatchDialog from '@/components/EditMatchDialog';
import BulkMatchImport from '@/components/BulkMatchImport';

type Match = {
  id: number;
  scheduledAt: string | Date;
  type: 'SINGLES' | 'DOUBLES';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  stage?: 'GROUP_STAGE' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';
  team1Score: number | null;
  team2Score: number | null;
  winnerTeam: number | null;
  notes: string | null;
  team1: string;
  team2: string;
  team1Name?: string;
  team2Name?: string;
  tournamentId?: number | null;
  group1?: { id: number; name: string; color: string | null } | null;
  group2?: { id: number; name: string; color: string | null } | null;
  players?: Array<{
    id: number;
    playerId: number;
    teamSide: number;
    position: number;
    player: { id: number; name: string };
  }>;
  isUpcoming?: boolean;
};

type Player = {
  id: number;
  name: string;
  userId: number | null;
  isActive: boolean;
};

type Tournament = {
  id: number;
  name: string;
  status: string;
  matchType: 'SINGLES' | 'DOUBLES';
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedTournamentForImport, setSelectedTournamentForImport] = useState<number | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerFilter, setPlayerFilter] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, router]);

  const fetchData = async () => {
    try {
      const [matchesRes, playersRes, tournamentsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/players'),
        fetch('/api/tournaments?status=ACTIVE'),
      ]);

      if (matchesRes.ok) {
        const data = await matchesRes.json();
        setMatches(Array.isArray(data) ? data : []);
      }

      if (playersRes.ok) {
        const data = await playersRes.json();
        setPlayers(Array.isArray(data) ? data : []);
      }

      if (tournamentsRes.ok) {
        const data = await tournamentsRes.json();
        setTournaments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Separate matches by status
  const inProgressMatches = matches
    .filter((m) => m.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  
  const scheduledMatches = matches
    .filter((m) => m.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  
  const completedMatches = matches
    .filter((m) => m.status === 'COMPLETED')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()); // Most recent first

  // Filter scheduled matches by player name
  const filteredScheduledMatches = scheduledMatches.filter((match) => {
    if (!playerFilter.trim()) return true;
    
    const filterLower = playerFilter.toLowerCase();
    const playerNames = match.players?.map(p => p.player.name.toLowerCase()) || [];
    
    return playerNames.some(name => name.includes(filterLower));
  });

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    // Use IST timezone (Asia/Kolkata)
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' });
    const day = d.toLocaleString('en-US', { day: 'numeric', timeZone: 'Asia/Kolkata' });
    const year = d.toLocaleString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
    const time = d.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true, 
      timeZone: 'Asia/Kolkata' 
    });
    
    return `${month} ${day}, ${year} ${time} IST`;
  };

  const getStatusColor = (status: string): "default" | "primary" | "success" | "error" | "warning" => {
    switch (status) {
      case 'SCHEDULED':
        return 'primary';
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatTeamDisplay = (teamLabel: string, teamName: string | undefined, players: any[] | undefined, teamSide: number, groupColor: string | null | undefined) => {
    if (!players) return teamLabel;
    
    const teamPlayers = players.filter(p => p.teamSide === teamSide);
    const playerNames = teamPlayers.map(p => p.player.name).join(' & ');
    
    // Use the group color if available and not null/undefined
    const chipColor = (groupColor && groupColor !== 'null') ? groupColor : null;
    
    // Format with bold team name
    const displayLabel = teamName 
      ? `${teamName} (${playerNames})` 
      : (playerNames || teamLabel);
    
    return (
      <Chip
        label={displayLabel}
        size="small"
        style={chipColor ? {
          backgroundColor: chipColor,
          color: 'white',
        } : undefined}
        sx={{
          fontWeight: 'bold',  // Make entire chip bold
          height: 'auto',
          py: 0.5,
          px: 1.5,
        }}
      />
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
          {user?.isAdmin && (
            <>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddMatch(true)}
              >
                Schedule Match
              </Button>

              {tournaments.length > 0 && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<CloudUpload />}
                  onClick={() => {
                    setSelectedTournamentForImport(tournaments[0].id);
                    setShowBulkImport(true);
                  }}
                >
                  Bulk Import Matches
                </Button>
              )}

              <Button
                variant="outlined"
                onClick={() => setShowAdminPanel(true)}
              >
                Admin Panel
              </Button>
            </>
          )}
        </Stack>

        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          sx={{ mb: 4 }}
        >
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <People color="primary" />
                <Typography color="text.secondary" variant="body2">
                  Active Players
                </Typography>
              </Stack>
              <Typography variant="h4">
                {players.filter((p) => p.isActive).length}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <EmojiEvents color="primary" />
                <Typography color="text.secondary" variant="body2">
                  Total Matches
                </Typography>
              </Stack>
              <Typography variant="h4">{matches.length}</Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <CalendarToday color="primary" />
                <Typography color="text.secondary" variant="body2">
                  Scheduled
                </Typography>
              </Stack>
              <Typography variant="h4">{scheduledMatches.length}</Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <EmojiEvents color="success" />
                <Typography color="text.secondary" variant="body2">
                  Completed
                </Typography>
              </Stack>
              <Typography variant="h4">{completedMatches.length}</Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* In Progress Matches - Full Width Alert Section */}
        {inProgressMatches.length > 0 && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.lighter' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <EmojiEvents color="warning" />
              <Typography variant="h6" color="warning.main">
                Live Matches ({inProgressMatches.length})
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {inProgressMatches.map((match) => {
                const isUserPlaying = user?.playerId && match.players?.some(
                  (p) => p.playerId === user.playerId
                );
                
                return (
                  <Card 
                    key={match.id} 
                    variant="outlined"
                    sx={{
                      ...(isUserPlaying && {
                        borderColor: 'warning.main',
                        borderWidth: 2,
                        backgroundColor: 'warning.lighter',
                      }),
                    }}
                  >
                    <CardContent>
                      {isUserPlaying && (
                        <Chip 
                          label="⭐ Your Match" 
                          size="small" 
                          color="warning"
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={0.5}>
                          <Chip label={match.type} size="small" color="primary" variant="outlined" />
                          {match.tournamentId ? (
                            <Chip label="Tournament" size="small" color="warning" variant="outlined" />
                          ) : (
                            <Chip label="Unranked" size="small" variant="outlined" />
                          )}
                        </Stack>
                        <Chip
                          label="LIVE"
                          size="small"
                          color="warning"
                          sx={{ animation: 'pulse 2s infinite' }}
                        />
                      </Stack>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ fontWeight: 'bold' }}>
                          {formatTeamDisplay(match.team1, match.team1Name, match.players, 1, match.group1?.color)}
                        </Box>
                        <Typography variant="body1" fontWeight="medium">vs</Typography>
                        <Box sx={{ fontWeight: 'bold' }}>
                          {formatTeamDisplay(match.team2, match.team2Name, match.players, 2, match.group2?.color)}
                        </Box>
                      </Box>
                      {match.team1Score !== null && match.team2Score !== null && (
                        <Typography variant="h6" color="warning.main" sx={{ my: 1 }}>
                          {match.team1Score} - {match.team2Score}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Started: {formatDate(match.scheduledAt)}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        {user?.isAdmin && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="info"
                            startIcon={<Edit />}
                            onClick={() => setEditingMatch(match)}
                            sx={{ minWidth: 'auto' }}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => router.push(`/match/${match.id}`)}
                          sx={{ minWidth: 'auto' }}
                        >
                          View Live
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Paper>
        )}

        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={3}
        >
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CalendarToday />
                  <Typography variant="h6">Scheduled Matches</Typography>
                </Stack>
                {scheduledMatches.length > 0 && (
                  <Chip 
                    label={`${filteredScheduledMatches.length} of ${scheduledMatches.length}`} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
              
              {scheduledMatches.length > 0 && (
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Filter by player name..."
                  value={playerFilter}
                  onChange={(e) => setPlayerFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              )}
              
              <Divider sx={{ mb: 2 }} />

              {scheduledMatches.length === 0 ? (
                <Typography color="text.secondary">No scheduled matches</Typography>
              ) : filteredScheduledMatches.length === 0 ? (
                <Typography color="text.secondary">No matches found for "{playerFilter}"</Typography>
              ) : (
                <Stack spacing={3}>
                  {/* Group scheduled matches by tournament */}
                  {(() => {
                    // Group scheduled matches by tournament
                    const grouped = filteredScheduledMatches.reduce((acc, match) => {
                      const tournamentId = match.tournamentId || 0; // 0 for unranked
                      if (!acc[tournamentId]) {
                        acc[tournamentId] = [];
                      }
                      acc[tournamentId].push(match);
                      return acc;
                    }, {} as Record<number, Match[]>);

                    // Get tournament names
                    const getTournamentName = (tournamentId: number) => {
                      if (tournamentId === 0) return 'Unranked Matches';
                      const tournament = tournaments.find(t => t.id === tournamentId);
                      return tournament?.name || `Tournament ${tournamentId}`;
                    };

                    return Object.entries(grouped)
                      .sort(([a], [b]) => Number(b) - Number(a)) // Sort by tournament ID desc
                      .map(([tournamentIdStr, tournamentMatches]) => {
                        const tournamentId = Number(tournamentIdStr);

                        return (
                          <Box key={tournamentId}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight="600" color="primary">
                                {getTournamentName(tournamentId)}
                              </Typography>
                              <Chip 
                                label={`${tournamentMatches.length} match${tournamentMatches.length !== 1 ? 'es' : ''}`} 
                                size="small" 
                                variant="outlined"
                              />
                            </Stack>
                            <Box sx={{
                              maxHeight: '400px',
                              overflowY: 'auto',
                              pr: 1,
                              '&::-webkit-scrollbar': {
                                width: '6px',
                              },
                              '&::-webkit-scrollbar-track': {
                                backgroundColor: 'action.hover',
                                borderRadius: '3px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'primary.main',
                                borderRadius: '3px',
                                '&:hover': {
                                  backgroundColor: 'primary.dark',
                                },
                              },
                            }}>
                            <Stack spacing={1.5}>
                              {tournamentMatches.map((match) => {
                                // Check if logged-in user is playing in this match
                                const isUserPlaying = user?.playerId && match.players?.some(
                                  (p) => p.playerId === user.playerId
                                );
                                
                                return (
                                  <Card 
                                    key={match.id} 
                                    variant="outlined"
                                    sx={{
                                      bgcolor: 'background.default',
                                      ...(isUserPlaying && {
                                        borderColor: 'primary.main',
                                        borderWidth: 2,
                                        backgroundColor: 'action.hover',
                                      }),
                                    }}
                                  >
                                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                      {isUserPlaying && (
                                        <Chip 
                                          label="⭐ Your Match" 
                                          size="small" 
                                          color="primary"
                                          sx={{ mb: 1, height: 20, fontSize: '0.7rem' }}
                                        />
                                      )}
                                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                        <Stack direction="row" spacing={0.5}>
                                          <Chip label={match.type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                          {match.stage && match.stage !== 'GROUP_STAGE' && (
                                            <Chip 
                                              label={match.stage.replace('_', ' ')} 
                                              size="small" 
                                              color="secondary"
                                              sx={{ height: 20, fontSize: '0.7rem' }} 
                                            />
                                          )}
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">
                                          {formatDate(match.scheduledAt)}
                                        </Typography>
                                      </Stack>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                        <Box sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                          {formatTeamDisplay(match.team1, match.team1Name, match.players, 1, match.group1?.color)}
                                        </Box>
                                        <Typography variant="body2" fontWeight="medium">vs</Typography>
                                        <Box sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                          {formatTeamDisplay(match.team2, match.team2Name, match.players, 2, match.group2?.color)}
                                        </Box>
                                      </Box>
                                      {match.notes && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                          {match.notes}
                                        </Typography>
                                      )}
                                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        {user?.isAdmin ? (
                                          <>
                                            <Button
                                              variant="contained"
                                              color="success"
                                              size="small"
                                              onClick={() => router.push(`/match/${match.id}`)}
                                              sx={{ minWidth: 'auto', py: 0.5, fontSize: '0.75rem' }}
                                            >
                                              Start Match
                                            </Button>
                                            <Button
                                              variant="outlined"
                                              color="info"
                                              size="small"
                                              startIcon={<Edit fontSize="small" />}
                                              onClick={() => setEditingMatch(match)}
                                              sx={{ minWidth: 'auto', py: 0.5, fontSize: '0.75rem' }}
                                            >
                                              Edit
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            variant="outlined"
                                            color="info"
                                            size="small"
                                            onClick={() => router.push(`/match/${match.id}`)}
                                            sx={{ minWidth: 'auto', py: 0.5, fontSize: '0.75rem' }}
                                          >
                                            View Details
                                          </Button>
                                        )}
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </Stack>
                            </Box>
                          </Box>
                        );
                      });
                  })()}
                </Stack>
              )}
            </Paper>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <EmojiEvents />
                <Typography variant="h6">Recent Results</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {completedMatches.length === 0 ? (
                <Typography color="text.secondary">No completed matches</Typography>
              ) : (
                <Stack spacing={3}>
                  {/* Group matches by tournament */}
                  {(() => {
                    // Group completed matches by tournament
                    const grouped = completedMatches.reduce((acc, match) => {
                      const tournamentId = match.tournamentId || 0; // 0 for unranked
                      if (!acc[tournamentId]) {
                        acc[tournamentId] = [];
                      }
                      acc[tournamentId].push(match);
                      return acc;
                    }, {} as Record<number, Match[]>);

                    // Get tournament names
                    const getTournamentName = (tournamentId: number) => {
                      if (tournamentId === 0) return 'Unranked Matches';
                      const tournament = tournaments.find(t => t.id === tournamentId);
                      return tournament?.name || `Tournament ${tournamentId}`;
                    };

                    return Object.entries(grouped)
                      .sort(([a], [b]) => Number(b) - Number(a)) // Sort by tournament ID desc
                      .map(([tournamentIdStr, tournamentMatches]) => {
                        const tournamentId = Number(tournamentIdStr);

                        return (
                          <Box key={tournamentId}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight="600" color="primary">
                                {getTournamentName(tournamentId)}
                              </Typography>
                              <Chip 
                                label={`${tournamentMatches.length} match${tournamentMatches.length !== 1 ? 'es' : ''}`} 
                                size="small" 
                                variant="outlined"
                              />
                            </Stack>
                            <Box sx={{
                              maxHeight: '400px',
                              overflowY: 'auto',
                              pr: 1,
                              '&::-webkit-scrollbar': {
                                width: '6px',
                              },
                              '&::-webkit-scrollbar-track': {
                                backgroundColor: 'action.hover',
                                borderRadius: '3px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'primary.main',
                                borderRadius: '3px',
                                '&:hover': {
                                  backgroundColor: 'primary.dark',
                                },
                              },
                            }}>
                            <Stack spacing={1.5}>
                              {tournamentMatches.map((match) => (
                                <Card key={match.id} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                      <Stack direction="row" spacing={0.5}>
                                        <Chip label={match.type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                        {match.stage && match.stage !== 'GROUP_STAGE' && (
                                          <Chip 
                                            label={match.stage.replace('_', ' ')} 
                                            size="small" 
                                            color="secondary"
                                            sx={{ height: 20, fontSize: '0.7rem' }} 
                                          />
                                        )}
                                      </Stack>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDate(match.scheduledAt)}
                                      </Typography>
                                    </Stack>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                      <Box sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {formatTeamDisplay(match.team1, match.team1Name, match.players, 1, match.group1?.color)}
                                      </Box>
                                      <Typography variant="body2" fontWeight="medium">vs</Typography>
                                      <Box sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {formatTeamDisplay(match.team2, match.team2Name, match.players, 2, match.group2?.color)}
                                      </Box>
                                    </Box>
                                    {match.team1Score !== null && match.team2Score !== null && (
                                      <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                                        {match.team1Score} - {match.team2Score}
                                      </Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </Stack>
                            </Box>
                          </Box>
                        );
                      });
                  })()}
                </Stack>
              )}
            </Paper>
          </Box>
        </Stack>

        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Active Players ({players.filter((p) => p.isActive).length})
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack 
            direction="row" 
            flexWrap="wrap" 
            gap={1}
          >
            {players
              .filter((p) => p.isActive)
              .map((player) => (
                <Chip 
                  key={player.id}
                  label={player.name} 
                  variant="outlined"
                  onClick={() => router.push(`/players/${player.id}`)}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                />
              ))}
          </Stack>
        </Paper>
      </Container>

      {showAddMatch && (
        <AddMatchForm
          onClose={() => {
            setShowAddMatch(false);
            fetchData();
          }}
          players={players.filter((p) => p.isActive)}
          currentUserId={user?.id || 0}
          tournaments={tournaments}
        />
      )}

      {showAdminPanel && user?.isAdmin && (
        <AdminPanel
          onClose={() => {
            setShowAdminPanel(false);
            fetchData();
          }}
        />
      )}

      {editingMatch && (
        <EditMatchDialog
          open={!!editingMatch}
          match={editingMatch}
          players={players.filter((p) => p.isActive)}
          onClose={() => setEditingMatch(null)}
          onSuccess={() => {
            fetchData();
            setEditingMatch(null);
          }}
        />
      )}

      {showBulkImport && selectedTournamentForImport && (
        <BulkMatchImport
          open={showBulkImport}
          onClose={() => {
            setShowBulkImport(false);
            setSelectedTournamentForImport(null);
          }}
          onSuccess={() => {
            fetchData();
            setShowBulkImport(false);
            setSelectedTournamentForImport(null);
          }}
          tournamentId={selectedTournamentForImport}
          userId={user?.id || 0}
        />
      )}
    </Box>
  );
}
