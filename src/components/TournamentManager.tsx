'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Tournament {
  id: number;
  name: string;
  description?: string;
  matchType?: 'SINGLES' | 'DOUBLES';
  startDate: string;
  endDate?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

interface TournamentManagerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tournament?: Tournament | null;
  userId: number;
}

export default function TournamentManager({
  open,
  onClose,
  onSuccess,
  tournament,
  userId,
}: TournamentManagerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [matchType, setMatchType] = useState<'SINGLES' | 'DOUBLES'>('SINGLES');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('DRAFT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setDescription(tournament.description || '');
      setMatchType(tournament.matchType || 'SINGLES');
      setStartDate(new Date(tournament.startDate));
      setEndDate(tournament.endDate ? new Date(tournament.endDate) : null);
      setStatus(tournament.status);
    } else {
      resetForm();
    }
  }, [tournament, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setMatchType('SINGLES');
    setStartDate(new Date());
    setEndDate(null);
    setStatus('DRAFT');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Tournament name is required');
      return;
    }

    if (!startDate) {
      setError('Start date is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = tournament
        ? `/api/tournaments/${tournament.id}`
        : '/api/tournaments';
      
      const method = tournament ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          matchType,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString() || null,
          status,
          ...(tournament ? {} : { createdById: userId }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save tournament');
      }

      setSuccess(tournament ? 'Tournament updated!' : 'Tournament created!');
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

  const handleClose = () => {
    if (!loading) {
      onClose();
      setTimeout(resetForm, 300);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {tournament ? 'Edit Tournament' : 'Create New Tournament'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <TextField
              label="Tournament Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              disabled={loading}
              placeholder="e.g., Spring Championship 2026"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={loading}
              placeholder="Optional description of the tournament..."
            />

            <FormControl fullWidth required>
              <InputLabel>Match Type</InputLabel>
              <Select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as 'SINGLES' | 'DOUBLES')}
                label="Match Type"
                disabled={loading || !!tournament}
              >
                <MenuItem value="SINGLES">Singles</MenuItem>
                <MenuItem value="DOUBLES">Doubles</MenuItem>
              </Select>
              {tournament && (
                <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                  Match type cannot be changed after tournament creation
                </Box>
              )}
            </FormControl>

            <DateTimePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                },
              }}
            />

            <DateTimePicker
              label="End Date (Optional)"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
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
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="ARCHIVED">Archived</MenuItem>
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
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {tournament ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
