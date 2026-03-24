'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Link,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface TeamStanding {
  rank: number;
  team: {
    id: number;
    name: string;
    players: Array<{
      id: number;
      name: string;
    }>;
  };
  groupName: string;
  groupColor?: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  tournamentPoints: number;
  gamePointsScored: number;
  pointDifferential: number;
  qualified: boolean;
}

interface TeamLeaderboardProps {
  tournamentId: number;
  groupId?: number;  // Optional: filter by specific group
  showQualified?: boolean;  // Show qualification status
}

export default function TeamLeaderboard({
  tournamentId,
  groupId,
  showQualified = false,
}: TeamLeaderboardProps) {
  const router = useRouter();
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamStandings();
  }, [tournamentId, groupId]);

  const fetchTeamStandings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all team performances for this tournament
      const response = await fetch(`/api/tournaments/${tournamentId}/team-standings${groupId ? `?groupId=${groupId}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch team standings');
      }

      const data = await response.json();
      setStandings(data.standings || []);
    } catch (err) {
      console.error('Error fetching team standings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team standings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  if (standings.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">No team data available</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div">
          🏆 Team Leaderboard {groupId && `(Doubles)`}
        </Typography>
      </Box>
      
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>#</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Team</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Group</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>M</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>W</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>L</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Win %</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pts</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Scored</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Diff</TableCell>
            {showQualified && (
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {standings.map((standing) => (
            <TableRow
              key={standing.team.id}
              sx={{
                backgroundColor: standing.rank <= 2 ? 'action.hover' : 'inherit',
                '&:hover': { backgroundColor: 'action.selected' },
              }}
            >
              <TableCell align="center">
                {standing.rank <= 3 ? (
                  <Box display="flex" alignItems="center" justifyContent="center">
                    <EmojiEventsIcon
                      sx={{
                        color:
                          standing.rank === 1
                            ? 'gold'
                            : standing.rank === 2
                            ? 'silver'
                            : '#CD7F32',
                        fontSize: 24,
                      }}
                    />
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {standing.rank}
                    </Typography>
                  </Box>
                ) : (
                  standing.rank
                )}
              </TableCell>
              
              <TableCell>
                <Box>
                  <Link
                    component="button"
                    variant="body2"
                    fontWeight="medium"
                    onClick={() => router.push(`/teams/${standing.team.id}`)}
                    sx={{
                      textDecoration: 'none',
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {standing.team.name}
                  </Link>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {standing.team.players.map(p => p.name).join(' & ')}
                  </Typography>
                </Box>
              </TableCell>
              
              <TableCell>
                <Chip
                  label={standing.groupName}
                  size="small"
                  sx={{
                    bgcolor: standing.groupColor || 'primary.main',
                    color: 'white',
                    fontWeight: 'medium',
                  }}
                />
              </TableCell>
              
              <TableCell align="center">{standing.matchesPlayed}</TableCell>
              <TableCell align="center">
                <Typography color="success.main" fontWeight="medium">
                  {standing.wins}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography color="error.main" fontWeight="medium">
                  {standing.losses}
                </Typography>
              </TableCell>
              <TableCell align="center">{Math.round(standing.winRate)}%</TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {standing.tournamentPoints.toFixed(1)}
                </Typography>
              </TableCell>
              <TableCell align="center">{standing.gamePointsScored}</TableCell>
              <TableCell align="center">
                <Typography 
                  variant="body2" 
                  fontWeight="medium"
                  color={standing.pointDifferential > 0 ? 'success.main' : standing.pointDifferential < 0 ? 'error.main' : 'text.secondary'}
                >
                  {standing.pointDifferential > 0 ? '+' : ''}{standing.pointDifferential}
                </Typography>
              </TableCell>
              
              {showQualified && (
                <TableCell align="center">
                  {standing.qualified ? (
                    <Chip label="Qualified" color="success" size="small" />
                  ) : standing.rank <= 2 ? (
                    <Chip label="Eligible" color="warning" size="small" />
                  ) : (
                    <Chip label="-" size="small" variant="outlined" />
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
