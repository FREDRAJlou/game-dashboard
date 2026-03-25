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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface BulkMatchImportProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tournamentId: number;
  userId: number;
}

interface ParsedMatch {
  session: number;
  player1: string;
  player2: string;
  group1: string;
  group2: string;
  id?: number;
}

export default function BulkMatchImport({
  open,
  onClose,
  onSuccess,
  tournamentId,
  userId,
}: BulkMatchImportProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [csvData, setCsvData] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const steps = ['Paste CSV Data', 'Preview & Import', 'Results'];

  const handlePasteData = () => {
    if (!csvData.trim()) {
      setError('Please paste CSV data');
      return;
    }

    try {
      // Parse CSV for preview
      const rows = csvData
        .split('\n')
        .slice(1) // Skip header
        .filter((line) => line.trim())
        .map((line) => {
          const [session, match] = line.split('\t').map((s) => s.trim());
          return { session: parseInt(session), match };
        });

      setPreview(rows);
      setActiveStep(1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/matches/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          csvData,
          scheduledById: userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to import matches');
      }

      setImportResult(data);
      setSuccess(data.message);
      setActiveStep(2);

      setTimeout(() => {
        onSuccess();
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
        setCsvData('');
        setPreview([]);
        setError(null);
        setSuccess(null);
        setImportResult(null);
      }, 300);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" paragraph>
              Paste your CSV data with two columns: <strong>Session</strong> and <strong>Match</strong>
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Format: Session [TAB] PlayerName1 (GroupLetter) vs PlayerName2 (GroupLetter)
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Example: 1 [TAB] Rahul (A) vs Bharani (B)
              </Typography>
            </Alert>

            <TextField
              fullWidth
              multiline
              rows={12}
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Session	Table 1 Match
1	Rahul (A) vs Bharani (B)
2	Arun (A) vs Nawaz (B)
3	Rahul (A) vs Mahesh (B)
..."
              variant="outlined"
              sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                💡 Tip: Copy directly from Excel/Google Sheets with tab separation
              </Typography>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="body1">
                Found <strong>{preview.length}</strong> matches to import
              </Typography>
              <Button size="small" onClick={() => setActiveStep(0)}>
                Edit Data
              </Button>
            </Stack>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Session</strong></TableCell>
                    <TableCell><strong>Match</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.slice(0, 20).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.session}</TableCell>
                      <TableCell>{row.match}</TableCell>
                    </TableRow>
                  ))}
                  {preview.length > 20 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="caption" color="text.secondary">
                          ... and {preview.length - 20} more
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="warning" sx={{ mt: 2 }}>
              This will create {preview.length} new matches in the tournament. This action cannot be undone.
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            {importResult && (
              <>
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    ✅ Import Complete!
                  </Typography>
                  <Typography variant="body2">
                    Successfully created <strong>{importResult.created}</strong> out of{' '}
                    <strong>{importResult.parsed}</strong> matches
                  </Typography>
                </Alert>

                {importResult.errors && importResult.errors.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      ⚠️ Errors/Warnings ({importResult.errors.length}):
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {importResult.errors.map((err: string, idx: number) => (
                        <Typography key={idx} variant="caption" display="block">
                          • {err}
                        </Typography>
                      ))}
                    </Box>
                  </Alert>
                )}

                {importResult.matches && importResult.matches.length > 0 && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Created Matches (showing first 10):
                    </Typography>
                    <TableContainer sx={{ maxHeight: 300 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Session</TableCell>
                            <TableCell>Player 1</TableCell>
                            <TableCell>Player 2</TableCell>
                            <TableCell>Groups</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {importResult.matches.slice(0, 10).map((match: ParsedMatch) => (
                            <TableRow key={match.id}>
                              <TableCell>{match.session}</TableCell>
                              <TableCell>{match.player1}</TableCell>
                              <TableCell>{match.player2}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.5}>
                                  <Chip label={match.group1} size="small" />
                                  <Typography variant="caption">vs</Typography>
                                  <Chip label={match.group2} size="small" />
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const getActionButtons = () => {
    switch (activeStep) {
      case 0:
        return (
          <Button
            variant="contained"
            onClick={handlePasteData}
            disabled={!csvData.trim()}
            startIcon={<CloudUploadIcon />}
          >
            Preview Import
          </Button>
        );
      case 1:
        return (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={loading || preview.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {loading ? 'Importing...' : `Import ${preview.length} Matches`}
          </Button>
        );
      case 2:
        return (
          <Button variant="contained" onClick={handleClose}>
            Close
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
          <CloudUploadIcon color="primary" />
          <Typography variant="h6">Bulk Match Import</Typography>
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
          {activeStep === 2 ? 'Close' : 'Cancel'}
        </Button>
        {activeStep > 0 && activeStep < 2 && (
          <Button onClick={() => setActiveStep(activeStep - 1)} disabled={loading}>
            Back
          </Button>
        )}
        {getActionButtons()}
      </DialogActions>
    </Dialog>
  );
}
