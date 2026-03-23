'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Match {
  id: number;
  scheduledAt: string | Date;
  type: 'SINGLES' | 'DOUBLES';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  players?: Array<{
    id: number;
    playerId: number;
    teamSide: number;
    position: number;
    player: { id: number; name: string };
  }>;
}

interface Player {
  id: number;
  name: string;
  isActive: boolean;
}

interface EditMatchDialogProps {
  open: boolean;
  match: Match | null;
  players: Player[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditMatchDialog({
  open,
  match,
  players,
  onClose,
  onSuccess,
}: EditMatchDialogProps) {
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'SCHEDULED' | 'IN_PROGRESS' | 'CANCELLED'>('SCHEDULED');
  
  // Player selections
  const [team1Player1, setTeam1Player1] = useState<number>(0);
  const [team1Player2, setTeam1Player2] = useState<number>(0);
  const [team2Player1, setTeam2Player1] = useState<number>(0);
  const [team2Player2, setTeam2Player2] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (match && open) {
      setScheduledAt(new Date(match.scheduledAt));
      setNotes(match.notes || '');
      setStatus(match.status === 'COMPLETED' ? 'SCHEDULED' : match.status);
      
      // Set player selections
      if (match.players) {
        const t1p1 = match.players.find(p => p.teamSide === 1 && p.position === 1);
        const t1p2 = match.players.find(p => p.teamSide === 1 && p.position === 2);
        const t2p1 = match.players.find(p => p.teamSide === 2 && p.position === 1);
        const t2p2 = match.players.find(p => p.teamSide === 2 && p.position === 2);
        
        setTeam1Player1(t1p1?.playerId || 0);
        setTeam1Player2(t1p2?.playerId || 0);
        setTeam2Player1(t2p1?.playerId || 0);
        setTeam2Player2(t2p2?.playerId || 0);
      }
    }
  }, [match, open]);

  const handleSubmit = async () => {
    if (!match || !scheduledAt) {
      setError('Required fields are missing');
      return;
    }

    // Validate player selections
    const selectedPlayers: number[] = [];
    if (match.type === 'SINGLES') {
      if (!team1Player1 || !team2Player1) {
        setError('Please select both players');
        return;
      }
      selectedPlayers.push(team1Player1, team2Player1);
    } else {
      if (!team1Player1 || !team1Player2 || !team2Player1 || !team2Player2) {
        setError('Please select all 4 players for doubles match');
        return;
      }
      selectedPlayers.push(team1Player1, team1Player2, team2Player1, team2Player2);
    }

    // Check for duplicate players
    const uniquePlayers = new Set(selectedPlayers);
    if (uniquePlayers.size !== selectedPlayers.length) {
      setError('Cannot select the same player multiple times');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Build players array
      const playersData = [];
      if (match.type === 'SINGLES') {
        playersData.push(
          { playerId: team1Player1, teamSide: 1, position: 1 },
          { playerId: team2Player1, teamSide: 2, position: 1 }
        );
      } else {
        playersData.push(
          { playerId: team1Player1, teamSide: 1, position: 1 },
          { playerId: team1Player2, teamSide: 1, position: 2 },
          { playerId: team2Player1, teamSide: 2, position: 1 },
          { playerId: team2Player2, teamSide: 2, position: 2 }
        );
      }

      // Update match details
      const response = await fetch(`/api/matches/${match.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
          notes: notes.trim() || null,
          players: playersData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update match');
      }

      // Update status if changed
      if (status !== match.status) {
        const statusResponse = await fetch(`/api/matches/${match.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        if (!statusResponse.ok) {
          const data = await statusResponse.json();
          throw new Error(data.error || 'Failed to update match status');
        }
      }

      setSuccess('Match updated successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!match) return;
    
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/matches/${match.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete match');
      }

      setSuccess('Match deleted successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!match) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Match
          {match.status === 'COMPLETED' && (
            <Typography variant="caption" display="block" color="error">
              Completed matches cannot be edited
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            {match.status !== 'COMPLETED' ? (
              <>
                <DateTimePicker
                  label="Scheduled Time"
                  value={scheduledAt}
                  onChange={(newValue) => setScheduledAt(newValue)}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />

                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    label="Status"
                    disabled={loading}
                  >
                    <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                    <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Notes (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={2}
                  fullWidth
                  disabled={loading}
                  placeholder="Add any notes about the match..."
                />

                <Divider />

                <Typography variant="subtitle1" fontWeight="bold">Team 1 Players</Typography>
                <FormControl fullWidth required>
                  <InputLabel>Player 1</InputLabel>
                  <Select
                    value={team1Player1}
                    onChange={(e) => setTeam1Player1(e.target.value as number)}
                    label="Player 1"
                    disabled={loading}
                  >
                    <MenuItem value={0}>Select player...</MenuItem>
                    {players.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {match.type === 'DOUBLES' && (
                  <FormControl fullWidth required>
                    <InputLabel>Player 2</InputLabel>
                    <Select
                      value={team1Player2}
                      onChange={(e) => setTeam1Player2(e.target.value as number)}
                      label="Player 2"
                      disabled={loading}
                    >
                      <MenuItem value={0}>Select player...</MenuItem>
                      {players.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>Team 2 Players</Typography>
                <FormControl fullWidth required>
                  <InputLabel>Player 1</InputLabel>
                  <Select
                    value={team2Player1}
                    onChange={(e) => setTeam2Player1(e.target.value as number)}
                    label="Player 1"
                    disabled={loading}
                  >
                    <MenuItem value={0}>Select player...</MenuItem>
                    {players.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {match.type === 'DOUBLES' && (
                  <FormControl fullWidth required>
                    <InputLabel>Player 2</InputLabel>
                    <Select
                      value={team2Player2}
                      onChange={(e) => setTeam2Player2(e.target.value as number)}
                      label="Player 2"
                      disabled={loading}
                    >
                      <MenuItem value={0}>Select player...</MenuItem>
                      {players.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </>
            ) : (
              <Alert severity="info">
                Completed matches cannot be edited. You can only view the details.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {match.status !== 'COMPLETED' && (
            <Button 
              onClick={handleDelete} 
              color="error" 
              disabled={loading}
            >
              Delete Match
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {match.status !== 'COMPLETED' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Save Changes
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
