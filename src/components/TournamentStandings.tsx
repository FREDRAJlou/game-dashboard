'use client';

import { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import { EmojiEvents, BarChart as BarChartIcon, Close } from '@mui/icons-material';
import GroupAnalytics from '@/components/analytics/GroupAnalytics';
import TeamLeaderboard from '@/components/TeamLeaderboard';

interface PlayerStanding {
  player: {
    id: number;
    name: string;
  };
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  tournamentPoints: number;       // Points for standings (e.g., 3 for win, 0 for loss)
  totalGamePointsScored: number;  // Actual game points scored in matches (renamed)
}

interface GroupStanding {
  group: {
    id: number;
    name: string;
    color: string;
  };
  standings: PlayerStanding[];
  totalMatches: number;  // Actual number of matches for this group
}

interface TournamentStandingsProps {
  tournamentId: number;
}

export default function TournamentStandings({ tournamentId }: TournamentStandingsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    fetchStandings();
  }, [tournamentId]);

  const fetchStandings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournamentId}/standings`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch standings');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching standings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data || !data.groupStandings || data.groupStandings.length === 0) {
    return (
      <Alert severity="info">
        No standings available yet. Complete some matches to see the leaderboard!
      </Alert>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleViewAnalytics = async (groupId: number) => {
    setAnalyticsOpen(true);
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const currentGroup = data.groupStandings[selectedTab];

  // Calculate group-level statistics for leaderboard
  const groupLeaderboard = data.groupStandings.map((groupData: GroupStanding) => {
    const totalMatches = groupData.totalMatches;  // Use the actual match count from API
    // For wins: in doubles, multiple players from same group win together, so we need unique wins
    // Count wins by dividing total player wins by team size (2 for doubles, 1 for singles)
    const totalPlayerWins = groupData.standings.reduce((sum: number, s: PlayerStanding) => sum + s.wins, 0);
    const teamSize = data.tournament.matchType === 'DOUBLES' ? 2 : 1;
    const totalWins = Math.round(totalPlayerWins / teamSize);  // Divide by team size to get actual match wins
    
    const totalPoints = groupData.standings.reduce((sum: number, s: PlayerStanding) => sum + s.tournamentPoints, 0);
    const totalScored = groupData.standings.reduce((sum: number, s: PlayerStanding) => sum + s.totalGamePointsScored, 0);
    
    // Calculate average win rate ONLY for players who have played matches
    const playersWithMatches = groupData.standings.filter((s: PlayerStanding) => s.matchesPlayed > 0);
    const avgWinRate = playersWithMatches.length > 0
      ? playersWithMatches.reduce((sum: number, s: PlayerStanding) => sum + s.winRate, 0) / playersWithMatches.length
      : 0;
    
    // Find top performer by tournament points, then wins, then win rate (same as standings ranking)
    const topPlayer = groupData.standings.length > 0 
      ? [...groupData.standings].sort((a: PlayerStanding, b: PlayerStanding) => {
          if (b.tournamentPoints !== a.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.winRate - a.winRate;
        })[0]
      : null;
    
    return {
      group: groupData.group,
      totalMatches,
      totalWins,
      totalPoints,
      totalScored,
      avgWinRate: Math.round(avgWinRate),
      topPlayer: topPlayer?.player.name || 'N/A',
      topPlayerPoints: topPlayer?.tournamentPoints || 0,
      topPlayerWins: topPlayer?.wins || 0,
    };
  }).sort((a: any, b: any) => {
    // Sort by total points, then wins, then avg win rate
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    return b.avgWinRate - a.avgWinRate;
  });

  return (
    <Paper elevation={2}>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <EmojiEvents color="primary" />
          <Typography variant="h5" component="h2">
            {data.tournament.name} - Standings
          </Typography>
          <Chip 
            label={`${data.totalMatches} match${data.totalMatches !== 1 ? 'es' : ''} completed`} 
            size="small" 
            color="success"
          />
        </Stack>

        {/* Group Leaderboard - IPL Style */}
        {data.groupStandings.length > 1 && (
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Group Leaderboard
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pts = Tournament Points | Scored = Total Game Points
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Group</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>M</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>W</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Pts</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Scored</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Avg W%</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Top Player</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupLeaderboard.map((group: any, index: number) => (
                    <TableRow
                      key={group.group.id}
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                        backgroundColor: index === 0 && group.totalMatches > 0
                          ? (theme: any) => theme.palette.mode === 'dark'
                            ? 'rgba(76, 175, 80, 0.1)'
                            : 'rgba(76, 175, 80, 0.05)'
                          : 'inherit',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{index + 1}</TableCell>
                      <TableCell>
                        <Chip
                          label={group.group.name}
                          size="small"
                          sx={{
                            backgroundColor: group.group.color,
                            color: 'white',
                            fontWeight: index === 0 ? 700 : 500,
                          }}
                        />
                        {index === 0 && group.totalMatches > 0 && (
                          <Chip 
                            label="🏆" 
                            size="small" 
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">{group.totalMatches}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={group.totalWins} 
                          size="small" 
                          color="success" 
                          variant={group.totalWins > 0 ? 'filled' : 'outlined'}
                          sx={{ minWidth: 32 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontWeight="bold" color="primary" fontSize="1rem">
                          {group.totalPoints}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontSize="0.875rem" color="success.main">
                          {group.totalScored}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontSize="0.875rem">
                          {group.avgWinRate}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.875rem">
                          {group.topPlayer}
                          {group.topPlayerGamePoints > 0 && (
                            <Typography component="span" fontSize="0.75rem" color="text.secondary" sx={{ ml: 0.5 }}>
                              ({group.topPlayerGamePoints} game pts, {group.topPlayerPoints} tourney pts)
                            </Typography>
                          )}
                          {group.topPlayerGamePoints === 0 && (
                            <Typography component="span" fontSize="0.75rem" color="text.secondary" sx={{ ml: 0.5 }}>
                              (No matches)
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Team Standings (for doubles tournaments) */}
        {data.tournament.matchType === 'DOUBLES' && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Team Standings (Doubles)
            </Typography>
            <TeamLeaderboard tournamentId={tournamentId} showQualified={false} />
          </Box>
        )}

        {data.groupStandings.length > 1 && (
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            sx={{ mb: 2 }}
            variant="fullWidth"
          >
            {data.groupStandings.map((groupData: GroupStanding, index: number) => (
              <Tab 
                key={groupData.group.id}
                label={groupData.group.name}
                sx={{
                  backgroundColor: selectedTab === index ? groupData.group.color : 'transparent',
                  color: selectedTab === index ? 'white' : 'inherit',
                  '&.Mui-selected': {
                    color: 'white',
                  },
                }}
              />
            ))}
          </Tabs>
        )}

        {currentGroup && (
          <>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Chip
                label={currentGroup.group.name}
                sx={{
                  backgroundColor: currentGroup.group.color,
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<BarChartIcon />}
                onClick={() => handleViewAnalytics(currentGroup.group.id)}
              >
                View Analytics
              </Button>
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell><strong>Rank</strong></TableCell>
                    <TableCell><strong>Player</strong></TableCell>
                    <TableCell align="center"><strong>P</strong></TableCell>
                    <TableCell align="center"><strong>W</strong></TableCell>
                    <TableCell align="center"><strong>L</strong></TableCell>
                    <TableCell align="center"><strong>Win %</strong></TableCell>
                    <TableCell align="center"><strong>Pts</strong></TableCell>
                    <TableCell align="center"><strong>Score</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentGroup.standings.map((standing: PlayerStanding, index: number) => (
                    <TableRow 
                      key={standing.player.id}
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                        backgroundColor: index === 0 && standing.matchesPlayed > 0 ? 'success.light' : 'inherit',
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontWeight={index < 3 ? 'bold' : 'normal'}>
                            {index + 1}
                          </Typography>
                          {index === 0 && standing.matchesPlayed > 0 && (
                            <EmojiEvents color="warning" fontSize="small" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={index < 3 ? 'bold' : 'normal'}>
                          {standing.player.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{standing.matchesPlayed}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={standing.wins} 
                          size="small" 
                          color="success" 
                          variant={standing.wins > 0 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={standing.losses} 
                          size="small" 
                          color="error" 
                          variant={standing.losses > 0 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {standing.matchesPlayed > 0 ? `${standing.winRate}%` : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          fontWeight="bold" 
                          color="primary"
                          fontSize="1.1rem"
                        >
                          {standing.tournamentPoints}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          fontSize="0.9rem"
                          color="text.secondary"
                        >
                          {standing.totalGamePointsScored}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {currentGroup.standings.filter((s: PlayerStanding) => s.matchesPlayed === 0).length === currentGroup.standings.length && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No matches completed in this group yet
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* All Matches Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            All Tournament Matches
          </Typography>
          
          {data.totalMatches === 0 ? (
            <Alert severity="info">No matches in this tournament yet</Alert>
          ) : (
            <Stack spacing={2}>
              {/* Group matches by status */}
              {(() => {
                const allMatches = data.groupStandings.flatMap((gs: GroupStanding) => 
                  gs.standings.flatMap((standing: PlayerStanding) => [])
                );
                
                // Fetch all matches for this tournament
                const [matches, setMatches] = useState<any[]>([]);
                const [matchesLoading, setMatchesLoading] = useState(true);
                
                useEffect(() => {
                  const fetchMatches = async () => {
                    try {
                      const response = await fetch('/api/matches');
                      const allMatches = await response.json();
                      const tournamentMatches = allMatches
                        .filter((m: any) => m.tournamentId === tournamentId)
                        .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
                      setMatches(tournamentMatches);
                    } catch (error) {
                      console.error('Error fetching matches:', error);
                    } finally {
                      setMatchesLoading(false);
                    }
                  };
                  fetchMatches();
                }, []);

                if (matchesLoading) {
                  return (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress size={30} />
                    </Box>
                  );
                }

                // Group by status
                const scheduled = matches.filter(m => m.status === 'SCHEDULED');
                const inProgress = matches.filter(m => m.status === 'IN_PROGRESS');
                const completed = matches.filter(m => m.status === 'COMPLETED');

                return (
                  <>
                    {inProgress.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600" color="warning.main" sx={{ mb: 1 }}>
                          In Progress ({inProgress.length})
                        </Typography>
                        <Stack spacing={1}>
                          {inProgress.map((match: any) => (
                            <Card key={match.id} variant="outlined" sx={{ bgcolor: 'warning.light', borderColor: 'warning.main' }}>
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Box sx={{ flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                      <Chip label={match.type} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      {match.stage && match.stage !== 'GROUP_STAGE' && (
                                        <Chip label={match.stage.replace('_', ' ')} size="small" color="secondary" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      )}
                                    </Stack>
                                    <Typography variant="body2" fontWeight="600">
                                      {match.team1} vs {match.team2}
                                    </Typography>
                                    {match.team1Score !== null && match.team2Score !== null && (
                                      <Typography variant="body2" color="primary" fontWeight="bold">
                                        {match.team1Score} - {match.team2Score}
                                      </Typography>
                                    )}
                                  </Box>
                                  <Chip label="LIVE" color="warning" size="small" />
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {scheduled.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600" color="info.main" sx={{ mb: 1 }}>
                          Scheduled ({scheduled.length})
                        </Typography>
                        <Stack spacing={1}>
                          {scheduled.slice(0, 10).map((match: any) => (
                            <Card key={match.id} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Box sx={{ flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                      <Chip label={match.type} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      {match.stage && match.stage !== 'GROUP_STAGE' && (
                                        <Chip label={match.stage.replace('_', ' ')} size="small" color="secondary" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      )}
                                    </Stack>
                                    <Typography variant="body2" fontWeight="600">
                                      {match.team1} vs {match.team2}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(match.scheduledAt).toLocaleDateString('en-US', { 
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                      })}
                                    </Typography>
                                  </Box>
                                  <Chip label="SCHEDULED" color="info" size="small" variant="outlined" />
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                          {scheduled.length > 10 && (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', pt: 0.5 }}>
                              + {scheduled.length - 10} more scheduled matches
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}

                    {completed.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600" color="success.main" sx={{ mb: 1 }}>
                          Completed ({completed.length})
                        </Typography>
                        <Stack spacing={1}>
                          {completed.slice(0, 10).map((match: any) => (
                            <Card key={match.id} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Box sx={{ flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                      <Chip label={match.type} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      {match.stage && match.stage !== 'GROUP_STAGE' && (
                                        <Chip label={match.stage.replace('_', ' ')} size="small" color="secondary" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      )}
                                    </Stack>
                                    <Typography variant="body2" fontWeight="600">
                                      {match.team1} vs {match.team2}
                                    </Typography>
                                    <Typography variant="h6" color="primary" fontWeight="bold">
                                      {match.team1Score} - {match.team2Score}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(match.scheduledAt).toLocaleDateString('en-US', { 
                                        month: 'short', day: 'numeric' 
                                      })}
                                    </Typography>
                                  </Box>
                                  <Chip label="COMPLETED" color="success" size="small" />
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                          {completed.length > 10 && (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', pt: 0.5 }}>
                              + {completed.length - 10} more completed matches
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Stack>
          )}
        </Box>
      </Box>

      {/* Analytics Dialog */}
      <Dialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {analyticsData?.group.name} - Analytics
            </Typography>
            <IconButton onClick={() => setAnalyticsOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {analyticsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : analyticsData ? (
            <GroupAnalytics data={analyticsData} />
          ) : (
            <Alert severity="error">Failed to load analytics</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
