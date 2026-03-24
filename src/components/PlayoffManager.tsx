'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface Group {
  id: number;
  name: string;
  color?: string;
}

interface PlayoffManagerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tournamentId: number;
  groups: Group[];
  userId: number;
  matchType: 'SINGLES' | 'DOUBLES';
}

export default function PlayoffManager({
  open,
  onClose,
  onSuccess,
  tournamentId,
  groups,
  userId,
  matchType,
}: PlayoffManagerProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(new Date());
  const [qualifiedData, setQualifiedData] = useState<any>(null);
  const [semifinalData, setSemifinalData] = useState<any>(null);
  const [finalData, setFinalData] = useState<any>(null);

  const steps = ['Qualify Top Performers', 'Create Semi-Finals', 'Create Final'];

  useEffect(() => {
    if (open) {
      checkCurrentState();
    }
  }, [open, tournamentId]);

  const checkCurrentState = async () => {
    setLoading(true);
    try {
      // Check for existing semifinal and final matches
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      if (!response.ok) throw new Error('Failed to fetch tournament');
      
      const tournament = await response.json();
      
      // TODO: Check if semis/finals exist and set appropriate step
      // For now, start at step 0
      setActiveStep(0);
    } catch (err) {
      console.error('Error checking tournament state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQualifyPlayers = async () => {
    if (groups.length !== 2) {
      setError('Tournament must have exactly 2 groups for playoffs');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const qualifyPromises = groups.map(group =>
        fetch(`/api/tournaments/${tournamentId}/qualify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: group.id }),
        })
      );

      const responses = await Promise.all(qualifyPromises);
      
      for (const response of responses) {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to qualify players');
        }
      }

      const resultsData = await Promise.all(responses.map(r => r.json()));
      setQualifiedData(resultsData);
      setSuccess(`Successfully qualified top 2 ${matchType === 'SINGLES' ? 'players' : 'teams'} from each group!`);
      
      setTimeout(() => {
        setActiveStep(1);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemifinals = async () => {
    if (!scheduledDate) {
      setError('Please select a date for the semi-finals');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/create-playoffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: scheduledDate.toISOString(),
          scheduledById: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || data.error || 'Failed to create semi-finals');
      }

      const data = await response.json();
      setSemifinalData(data);
      setSuccess('Semi-final matches created successfully!');
      
      setTimeout(() => {
        setActiveStep(2);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFinal = async () => {
    if (!scheduledDate) {
      setError('Please select a date for the final');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/create-playoffs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: scheduledDate.toISOString(),
          scheduledById: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || data.error || 'Failed to create final');
      }

      const data = await response.json();
      setFinalData(data);
      setSuccess('Final match created successfully!');
      
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setTimeout(() => {
        setActiveStep(0);
        setError(null);
        setSuccess(null);
        setQualifiedData(null);
        setSemifinalData(null);
        setFinalData(null);
        setScheduledDate(new Date());
      }, 300);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" paragraph>
              This will automatically qualify the top 2 {matchType === 'SINGLES' ? 'players' : 'teams'} from each group based on:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="1. Tournament Points (most important)" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. Number of Wins" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. Win Rate (%)" />
              </ListItem>
            </List>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                You need exactly 2 groups with completed matches. The system will select the top 2 performers from each group.
              </Typography>
            </Alert>
            
            {qualifiedData && (
              <Paper sx={{ mt: 2, p: 2, bgcolor: 'success.light' }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  ✅ Qualified {matchType === 'SINGLES' ? 'Players' : 'Teams'}:
                </Typography>
                {qualifiedData.map((groupData: any, idx: number) => (
                  <Box key={idx} sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {groups[idx]?.name}:
                    </Typography>
                    <List dense>
                      {groupData.qualified?.slice(0, 2).map((item: any, i: number) => (
                        <ListItem key={i}>
                          <ListItemText 
                            primary={`${i + 1}. ${item.name || item.teamName}`}
                            secondary={`${item.tournamentPoints} pts | ${item.wins} wins`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body1" paragraph>
              Create semi-final matches between qualified {matchType === 'SINGLES' ? 'players' : 'teams'}:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'info.light', mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Match Structure:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Semi-Final 1:"
                    secondary={`1st from ${groups[0]?.name} vs 2nd from ${groups[1]?.name}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Semi-Final 2:"
                    secondary={`1st from ${groups[1]?.name} vs 2nd from ${groups[0]?.name}`}
                  />
                </ListItem>
              </List>
            </Paper>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Semi-Final Start Time"
                value={scheduledDate}
                onChange={(newValue) => setScheduledDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />
            </LocalizationProvider>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                The second semi-final will be scheduled 1 hour after the first.
                Winner points: {matchType === 'SINGLES' ? '3' : '6'} tournament points
              </Typography>
            </Alert>

            {semifinalData && (
              <Paper sx={{ mt: 2, p: 2, bgcolor: 'success.light' }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  ✅ Semi-Finals Created:
                </Typography>
                {semifinalData.semifinals?.map((match: any, idx: number) => (
                  <Typography key={idx} variant="body2">
                    Match {idx + 1}: {match.player1 || match.team1} vs {match.player2 || match.team2}
                  </Typography>
                ))}
              </Paper>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body1" paragraph>
              Create the final match between the winners of the two semi-finals.
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="medium">
                ⚠️ Both semi-final matches must be completed before creating the final.
              </Typography>
            </Alert>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Final Match Time"
                value={scheduledDate}
                onChange={(newValue) => setScheduledDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />
            </LocalizationProvider>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                The final will be created between the winners of the two semi-finals.
                Winner points: {matchType === 'SINGLES' ? '5' : '10'} tournament points
              </Typography>
            </Alert>

            {finalData && (
              <Paper sx={{ mt: 2, p: 2, bgcolor: 'success.light' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EmojiEventsIcon color="warning" />
                  <Typography variant="subtitle2" fontWeight="bold">
                    🏆 Final Match Created!
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {finalData.finals?.player1 || finalData.finals?.team1} vs {finalData.finals?.player2 || finalData.finals?.team2}
                </Typography>
              </Paper>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const getActionButton = () => {
    switch (activeStep) {
      case 0:
        return (
          <Button
            variant="contained"
            onClick={handleQualifyPlayers}
            disabled={loading || groups.length !== 2}
          >
            {loading ? <CircularProgress size={24} /> : 'Qualify Top Performers'}
          </Button>
        );
      case 1:
        return (
          <Button
            variant="contained"
            onClick={handleCreateSemifinals}
            disabled={loading || !scheduledDate}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Semi-Finals'}
          </Button>
        );
      case 2:
        return (
          <Button
            variant="contained"
            onClick={handleCreateFinal}
            disabled={loading || !scheduledDate}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Final'}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <EmojiEventsIcon color="primary" />
          <Typography variant="h6">Playoff Manager</Typography>
          <Chip label={matchType} size="small" color="primary" />
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2, mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Close
        </Button>
        {activeStep > 0 && (
          <Button onClick={() => setActiveStep(activeStep - 1)} disabled={loading}>
            Back
          </Button>
        )}
        {getActionButton()}
      </DialogActions>
    </Dialog>
  );
}
