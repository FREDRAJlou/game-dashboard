'use client';

import { useState } from 'react';
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
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

interface BulkCompleteMatchesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  tournamentId: number;
  onComplete?: () => void;
}

interface ParsedMatch {
  player1Name: string;
  group1Name: string;
  player2Name: string;
  group2Name: string;
  player1Score: number;
  player2Score: number;
  winnerTeam: number;
  scheduledAt?: string;
  stage?: string;
}

export default function BulkCompleteMatches({
  open,
  onOpenChange,
  userId,
  tournamentId,
  onComplete,
}: BulkCompleteMatchesProps) {
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [csvText, setCsvText] = useState('');
  const [parsedMatches, setParsedMatches] = useState<ParsedMatch[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = () => {
    setStep('input');
    setCsvText('');
    setParsedMatches([]);
    setParseErrors([]);
    setResults(null);
  };

  const handleParse = () => {
    const errors: string[] = [];
    const matches: ParsedMatch[] = [];
    
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      setParseErrors(['CSV must contain at least a header row and one data row']);
      return;
    }

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length < 7) {
        errors.push(`Line ${i + 1}: Not enough columns (expected at least 7)`);
        continue;
      }

      const [player1Name, group1Name, player2Name, group2Name, player1ScoreStr, player2ScoreStr, winnerTeamStr, scheduledAt, stage] = parts;

      const player1Score = parseInt(player1ScoreStr);
      const player2Score = parseInt(player2ScoreStr);
      const winnerTeam = parseInt(winnerTeamStr);

      if (!player1Name || !player2Name || !group1Name || !group2Name) {
        errors.push(`Line ${i + 1}: Missing player or group names`);
        continue;
      }

      if (isNaN(player1Score) || isNaN(player2Score)) {
        errors.push(`Line ${i + 1}: Invalid scores`);
        continue;
      }

      if (winnerTeam !== 1 && winnerTeam !== 2) {
        errors.push(`Line ${i + 1}: WinnerTeam must be 1 or 2`);
        continue;
      }

      const actualWinner = player1Score > player2Score ? 1 : 2;
      if (actualWinner !== winnerTeam) {
        errors.push(`Line ${i + 1}: Winner doesn't match scores (${player1Score}-${player2Score}, winner=${winnerTeam})`);
        continue;
      }

      matches.push({
        player1Name,
        group1Name,
        player2Name,
        group2Name,
        player1Score,
        player2Score,
        winnerTeam,
        scheduledAt: scheduledAt || undefined,
        stage: stage || 'GROUP_STAGE',
      });
    }

    if (matches.length === 0 && errors.length === 0) {
      errors.push('No valid matches found in CSV');
    }

    setParseErrors(errors);
    setParsedMatches(matches);
    
    if (errors.length === 0) {
      setStep('preview');
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/matches/bulk-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matches: parsedMatches,
          scheduledById: userId,
          tournamentId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import matches');
      }

      setResults(data);
      setStep('result');
      
      if (data.summary.created > 0 && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Bulk Create & Complete Matches</Typography>
          <Chip label="Single Shot" size="small" color="primary" />
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={step === 'input' ? 0 : step === 'preview' ? 1 : 2} sx={{ mb: 3 }}>
            <Step><StepLabel>Paste CSV</StepLabel></Step>
            <Step><StepLabel>Preview</StepLabel></Step>
            <Step><StepLabel>Results</StepLabel></Step>
          </Stepper>

          {step === 'input' && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Paste CSV data with format: <code>Player1Name,Group1Name,Player2Name,Group2Name,Player1Score,Player2Score,WinnerTeam,ScheduledAt,Stage</code>
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  John Doe,A,Jane Smith,B,21,15,1,2025-01-15T10:00:00Z,GROUP_STAGE{'\n'}
                  Mike Johnson,A,Sarah Williams,C,18,21,2,2025-01-15T10:30:00Z,GROUP_STAGE
                </Typography>
              </Paper>

              <TextField
                placeholder="Paste CSV data here..."
                value={csvText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCsvText(e.target.value)}
                multiline
                rows={12}
                fullWidth
                sx={{ fontFamily: 'monospace', fontSize: '13px' }}
              />

              {parseErrors.length > 0 && (
                <Alert severity="error" icon={<ErrorIcon />}>
                  <Typography variant="subtitle2">Parsing Errors:</Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 0.5 }}>
                    {parseErrors.map((err, idx) => (
                      <Typography component="li" key={idx} variant="caption">{err}</Typography>
                    ))}
                  </Box>
                </Alert>
              )}
            </Stack>
          )}

          {step === 'preview' && (
            <Stack spacing={2}>
              <Alert severity="success" icon={<CheckCircleIcon />}>
                Found {parsedMatches.length} valid matches. Review and confirm to create & complete them.
              </Alert>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Player 1 (Group)</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell>Player 2 (Group)</TableCell>
                      <TableCell align="center">Winner</TableCell>
                      <TableCell align="center">Stage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsedMatches.map((match, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{match.player1Name} ({match.group1Name})</TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {match.player1Score} - {match.player2Score}
                          </Typography>
                        </TableCell>
                        <TableCell>{match.player2Name} ({match.group2Name})</TableCell>
                        <TableCell align="center">
                          <Typography variant="caption">
                            {match.winnerTeam === 1 ? match.player1Name : match.player2Name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={match.stage} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}

          {step === 'result' && results && (
            <Stack spacing={2}>
              {results.success ? (
                <>
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    <Typography variant="subtitle2">Import Complete!</Typography>
                    <Typography variant="caption">
                      Created: {results.summary.created} | Errors: {results.summary.errors}
                    </Typography>
                  </Alert>

                  {results.results.created.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Successfully Created:</Typography>
                      <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto', p: 1 }}>
                        <Stack spacing={0.5}>
                          {results.results.created.map((item: any, idx: number) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <Typography variant="caption">{item.player1} vs {item.player2}</Typography>
                              <Typography variant="caption" fontFamily="monospace">{item.score}</Typography>
                              <Typography variant="caption" color="text.secondary">Winner: {item.winner}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Paper>
                    </Box>
                  )}

                  {results.results.errors.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>Errors:</Typography>
                      <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto', p: 1, bgcolor: 'error.light' }}>
                        <Stack spacing={0.5}>
                          {results.results.errors.map((err: any, idx: number) => (
                            <Typography key={idx} variant="caption" color="error">{err.error}</Typography>
                          ))}
                        </Stack>
                      </Paper>
                    </Box>
                  )}
                </>
              ) : (
                <Alert severity="error" icon={<ErrorIcon />}>
                  <Typography variant="subtitle2">Import Failed</Typography>
                  <Typography variant="caption">{results.error}</Typography>
                </Alert>
              )}
            </Stack>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {step === 'input' && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleParse} variant="contained" disabled={!csvText.trim()}>
              Next: Preview
            </Button>
          </>
        )}
        
        {step === 'preview' && (
          <>
            <Button onClick={() => setStep('input')}>Back</Button>
            <Button onClick={handleImport} variant="contained" disabled={loading}>
              {loading ? <><CircularProgress size={20} sx={{ mr: 1 }} /> Importing...</> : `Create ${parsedMatches.length} Matches`}
            </Button>
          </>
        )}
        
        {step === 'result' && (
          <Button onClick={handleClose} variant="contained">Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
