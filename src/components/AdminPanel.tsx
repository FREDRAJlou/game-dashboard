'use client';

import { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Typography,
  Divider,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import { Delete, PersonAdd } from '@mui/icons-material';

type Player = {
  id: number;
  name: string;
  userId: number | null;
  isActive: boolean;
};

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [tabValue, setTabValue] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerForm, setPlayerForm] = useState({
    name: '',
    username: '',
    password: '',
    isAdmin: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const response = await fetch('/api/players/manage');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/players/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create player');
      }
      setPlayerForm({ name: '', username: '', password: '', isAdmin: false });
      setMessage('Player created successfully');
      await loadPlayers();
      
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create player');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (playerId: number, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/players/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, isActive: !currentStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update player');
      }
      await loadPlayers();
      setMessage('Player status updated');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update player');
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Admin Panel</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Add Player" />
            <Tab label="Manage Players" />
          </Tabs>
        </Box>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Add Player Tab */}
        {tabValue === 0 && (
          <form onSubmit={handleCreatePlayer}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Player Name"
                value={playerForm.name}
                onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                required
                disabled={submitting}
              />

              <TextField
                fullWidth
                label="Username (for login)"
                value={playerForm.username}
                onChange={(e) => setPlayerForm({ ...playerForm, username: e.target.value })}
                required
                disabled={submitting}
                helperText="Used to log into the system"
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={playerForm.password}
                onChange={(e) => setPlayerForm({ ...playerForm, password: e.target.value })}
                required
                disabled={submitting}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={playerForm.isAdmin}
                    onChange={(e) => setPlayerForm({ ...playerForm, isAdmin: e.target.checked })}
                    disabled={submitting}
                  />
                }
                label="Grant admin access"
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={submitting}
                startIcon={<PersonAdd />}
              >
                {submitting ? 'Creating...' : 'Create Player'}
              </Button>
            </Stack>
          </form>
        )}

        {/* Manage Players Tab */}
        {tabValue === 1 && (
          <Box>
            {loading ? (
              <Typography>Loading players...</Typography>
            ) : players.length === 0 ? (
              <Typography color="text.secondary">No players yet</Typography>
            ) : (
              <List>
                {players.map((player) => (
                  <Paper key={player.id} variant="outlined" sx={{ mb: 1 }}>
                    <ListItem
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant={player.isActive ? 'outlined' : 'contained'}
                            color={player.isActive ? 'error' : 'success'}
                            onClick={() => handleToggleActive(player.id, player.isActive)}
                          >
                            {player.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={player.name}
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" component="span">
                              Status: {player.isActive ? 'Active' : 'Inactive'}
                            </Typography>
                            {player.userId && (
                              <Typography variant="caption" component="span" color="primary">
                                • Has Login
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                    </ListItem>
                  </Paper>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
