'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface Player {
  id: number;
  name: string;
}

interface PlayerStanding {
  player: Player;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPoints: number;
}

interface GroupStanding {
  group: {
    id: number;
    name: string;
    color?: string;
  };
  standings: PlayerStanding[];
}

interface TournamentInfo {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
}

interface StandingsData {
  tournament: TournamentInfo;
  groupStandings: GroupStanding[];
  totalMatches: number;
}

interface TournamentLeaderboardProps {
  tournamentId: number;
}

export default function TournamentLeaderboard({ tournamentId }: TournamentLeaderboardProps) {
  const [data, setData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState(0);

  useEffect(() => {
    fetchStandings();
  }, [tournamentId]);

  const fetchStandings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/standings`);
      if (!response.ok) {
        throw new Error('Failed to fetch standings');
      }
      const standingsData = await response.json();
      setData(standingsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <Alert severity="error">{error || 'No data available'}</Alert>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'COMPLETED':
        return 'info';
      case 'DRAFT':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEventsIcon color="primary" />
              {data.tournament.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(data.tournament.startDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}
              {data.tournament.endDate && ` - ${new Date(data.tournament.endDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label={data.tournament.status} color={getStatusColor(data.tournament.status) as any} />
            <Chip label={`${data.totalMatches} Matches`} variant="outlined" />
          </Box>
        </Box>

        {data.groupStandings.length > 0 ? (
          <>
            <Tabs
              value={selectedGroup}
              onChange={(_, newValue) => setSelectedGroup(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2 }}
            >
              {data.groupStandings.map((groupData, index) => (
                <Tab
                  key={groupData.group.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {groupData.group.color && (
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: groupData.group.color,
                          }}
                        />
                      )}
                      {groupData.group.name}
                    </Box>
                  }
                />
              ))}
            </Tabs>

            {data.groupStandings.map((groupData, index) => (
              <Box key={groupData.group.id} hidden={selectedGroup !== index}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: groupData.group.color || 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Rank</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Player</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>
                          Matches
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>
                          Wins
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>
                          Losses
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>
                          Win Rate
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>
                          Points
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groupData.standings.length > 0 ? (
                        groupData.standings.map((standing, idx) => (
                          <TableRow
                            key={standing.player.id}
                            sx={{
                              '&:hover': { backgroundColor: 'action.hover' },
                              backgroundColor: idx < 3 ? 'action.selected' : 'inherit',
                            }}
                          >
                            <TableCell>
                              <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>
                                {getRankIcon(idx)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body1" sx={{ fontWeight: idx < 3 ? 'bold' : 'normal' }}>
                                {standing.player.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">{standing.matchesPlayed}</TableCell>
                            <TableCell align="center">
                              <Chip label={standing.wins} color="success" size="small" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={standing.losses} color="error" size="small" />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {standing.winRate.toFixed(1)}%
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{standing.totalPoints}</Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No matches played yet
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </>
        ) : (
          <Alert severity="info">No groups found for this tournament</Alert>
        )}
      </CardContent>
    </Card>
  );
}
