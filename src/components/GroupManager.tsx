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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface Group {
  id: number;
  name: string;
  description?: string;
  color?: string;
  tournamentId: number;
}

interface Player {
  id: number;
  name: string;
  isActive: boolean;
}

interface GroupMember {
  player: Player;
}

interface GroupManagerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: Group | null;
  tournamentId?: number;
}

const PRESET_COLORS = [
  '#1976d2', // Blue
  '#d32f2f', // Red
  '#388e3c', // Green
  '#f57c00', // Orange
  '#7b1fa2', // Purple
  '#c2185b', // Pink
  '#0097a7', // Cyan
  '#fbc02d', // Yellow
];

export default function GroupManager({
  open,
  onClose,
  onSuccess,
  group,
  tournamentId,
}: GroupManagerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPlayers();
      if (group) {
        setName(group.name);
        setDescription(group.description || '');
        setColor(group.color || PRESET_COLORS[0]);
        fetchGroupMembers(group.id);
      } else {
        resetForm();
      }
    }
  }, [group, open]);

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.filter((p: Player) => p.isActive));
      }
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const fetchGroupMembers = async (groupId: number) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Failed to fetch group members:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setSelectedPlayers([]);
    setMembers([]);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (!tournamentId && !group) {
      setError('Tournament ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create or update group
      const url = group ? `/api/groups/${group.id}` : '/api/groups';
      const method = group ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          ...(group ? {} : { tournamentId }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save group');
      }

      const savedGroup = await response.json();

      // Add new players if this is a new group or players were selected
      if (selectedPlayers.length > 0) {
        const addMembersResponse = await fetch(`/api/groups/${savedGroup.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: selectedPlayers }),
        });

        if (!addMembersResponse.ok) {
          throw new Error('Failed to add players to group');
        }
      }

      setSuccess(group ? 'Group updated!' : 'Group created!');
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (playerId: number) => {
    if (!group) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/groups/${group.id}/members/${playerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove player');
      }

      setMembers(members.filter((m) => m.player.id !== playerId));
      setSuccess('Player removed from group');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setTimeout(resetForm, 300);
    }
  };

  const availablePlayers = players.filter(
    (p) => !members.some((m) => m.player.id === p.id)
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{group ? 'Manage Group' : 'Create New Group'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <TextField
            label="Group Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            disabled={loading}
            placeholder="e.g., Group A, Team Red"
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={loading}
            placeholder="Optional description..."
          />

          <FormControl fullWidth>
            <InputLabel>Color</InputLabel>
            <Select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              label="Color"
              disabled={loading}
            >
              {PRESET_COLORS.map((c) => (
                <MenuItem key={c} value={c}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: '2px solid #ddd',
                      }}
                    />
                    {c}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {group && members.length > 0 && (
            <>
              <Divider sx={{ mt: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Current Members ({members.length})
              </Typography>
              <List dense>
                {members.map((member) => (
                  <ListItem
                    key={member.player.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveMember(member.player.id)}
                        disabled={loading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={member.player.name} />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          <Divider />

          <FormControl fullWidth>
            <InputLabel>Add Players</InputLabel>
            <Select
              multiple
              value={selectedPlayers}
              onChange={(e) => setSelectedPlayers(e.target.value as number[])}
              input={<OutlinedInput label="Add Players" />}
              disabled={loading || loadingPlayers}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const player = players.find((p) => p.id === value);
                    return player ? (
                      <Chip key={value} label={player.name} size="small" />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {availablePlayers.map((player) => (
                <MenuItem key={player.id} value={player.id}>
                  {player.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {group ? 'Update Group' : 'Create Group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
