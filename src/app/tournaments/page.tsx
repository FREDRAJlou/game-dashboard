'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HomeIcon from '@mui/icons-material/Home';
import TournamentManager from '@/components/TournamentManager';
import GroupManager from '@/components/GroupManager';
import TournamentStandings from '@/components/TournamentStandings';
import PlayoffManager from '@/components/PlayoffManager';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Tournament {
  id: number;
  name: string;
  description?: string;
  matchType: 'SINGLES' | 'DOUBLES';
  startDate: string;
  endDate?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  groups: Group[];
  _count: {
    matches: number;
  };
}

interface Group {
  id: number;
  name: string;
  description?: string;
  color?: string;
  tournamentId: number;
  _count: {
    members: number;
  };
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [playoffDialogOpen, setPlayoffDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [viewingLeaderboard, setViewingLeaderboard] = useState<number | null>(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tournaments');
      if (!response.ok) {
        throw new Error('Failed to fetch tournaments');
      }
      const data = await response.json();
      setTournaments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tournament? This will also delete all groups and matches.')) {
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tournament');
      }

      await fetchTournaments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateGroup = (tournamentId: number) => {
    setSelectedTournamentId(tournamentId);
    setSelectedGroup(null);
    setGroupDialogOpen(true);
  };

  const handleOpenPlayoffs = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setSelectedTournamentId(tournament.id);
    setPlayoffDialogOpen(true);
  };

  const handleEditGroup = (group: Group, tournamentId: number) => {
    setSelectedGroup(group);
    setSelectedTournamentId(tournamentId);
    setGroupDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'COMPLETED':
        return 'info';
      case 'DRAFT':
        return 'warning';
      case 'ARCHIVED':
        return 'default';
      default:
        return 'default';
    }
  };

  if (!user) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">Please log in to view tournaments</Alert>
      </Container>
    );
  }

  if (viewingLeaderboard) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button
          onClick={() => setViewingLeaderboard(null)}
          sx={{ mb: 2 }}
        >
          ← Back to Tournaments
        </Button>
        <TournamentStandings tournamentId={viewingLeaderboard} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => router.push('/dashboard')}
            size="small"
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Dashboard
          </Button>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => router.push('/dashboard')}
            size="small"
            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
          >
            Home
          </Button>
          <Typography 
            variant="h4" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.5rem', sm: '2.125rem' }
            }}
          >
            <EmojiEventsIcon fontSize="large" color="primary" />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Tournaments
            </Box>
          </Typography>
        </Stack>
        {user.isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedTournament(null);
              setTournamentDialogOpen(true);
            }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Create Tournament
          </Button>
        )}
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : tournaments.length === 0 ? (
        <Alert severity="info">
          No tournaments yet. {user.isAdmin && 'Create your first tournament to get started!'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {tournaments.map((tournament) => (
            <Grid size={{ xs: 12, md: 6 }} key={tournament.id}>
              <Card>
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'start', sm: 'center' }}
                    spacing={1}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
                      {tournament.name}
                    </Typography>
                    <Chip
                      label={tournament.status}
                      color={getStatusColor(tournament.status) as any}
                      size="small"
                    />
                  </Stack>

                  {tournament.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {tournament.description}
                    </Typography>
                  )}

                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Type:</strong>{' '}
                      <Chip
                        label={tournament.matchType}
                        size="small"
                        color={tournament.matchType === 'SINGLES' ? 'primary' : 'secondary'}
                        sx={{ fontWeight: 'medium' }}
                      />
                    </Typography>
                    <Typography variant="body2">
                      <strong>Start:</strong> {new Date(tournament.startDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}
                    </Typography>
                    {tournament.endDate && (
                      <Typography variant="body2">
                        <strong>End:</strong> {new Date(tournament.endDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>Matches:</strong> {tournament._count.matches}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Groups:</strong> {tournament.groups.length}
                    </Typography>
                  </Stack>

                  {tournament.groups.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {tournament.groups.map((group) => (
                        <Chip
                          key={group.id}
                          label={`${group.name} (${group._count.members})`}
                          size="small"
                          onClick={user.isAdmin ? () => handleEditGroup(group, tournament.id) : undefined}
                          sx={{
                            backgroundColor: group.color || 'action.selected',
                            color: 'white',
                            cursor: user.isAdmin ? 'pointer' : 'default',
                            '&:hover': user.isAdmin ? {
                              opacity: 0.8,
                            } : {},
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', px: 2, gap: 1 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                      size="small"
                      onClick={() => setViewingLeaderboard(tournament.id)}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      View Standings
                    </Button>
                    {user.isAdmin && (
                      <>
                        <Button
                          size="small"
                          startIcon={<GroupsIcon />}
                          onClick={() => handleCreateGroup(tournament.id)}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          Add Group
                        </Button>
                        {tournament.groups.length === 2 && tournament.status === 'ACTIVE' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EmojiEventsIcon />}
                            onClick={() => handleOpenPlayoffs(tournament)}
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                            color="warning"
                          >
                            Playoffs
                          </Button>
                        )}
                      </>
                    )}
                  </Stack>
                  {user.isAdmin && (
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTournament(tournament);
                          setTournamentDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTournament(tournament.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <TournamentManager
        open={tournamentDialogOpen}
        onClose={() => {
          setTournamentDialogOpen(false);
          setSelectedTournament(null);
        }}
        onSuccess={fetchTournaments}
        tournament={selectedTournament}
        userId={user.id}
      />

      <GroupManager
        open={groupDialogOpen}
        onClose={() => {
          setGroupDialogOpen(false);
          setSelectedTournamentId(null);
          setSelectedGroup(null);
        }}
        onSuccess={fetchTournaments}
        group={selectedGroup}
        tournamentId={selectedTournamentId || undefined}
      />

      <PlayoffManager
        open={playoffDialogOpen}
        onClose={() => {
          setPlayoffDialogOpen(false);
          setSelectedTournament(null);
          setSelectedTournamentId(null);
        }}
        onSuccess={fetchTournaments}
        tournamentId={selectedTournamentId || 0}
        groups={selectedTournament?.groups || []}
        userId={user.id}
        matchType={selectedTournament?.matchType || 'SINGLES'}
      />
    </Container>
  );
}
