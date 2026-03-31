'use client';

import { useState, FormEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Box,
  Typography,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';

type Player = {
  id: number;
  name: string;
};

interface Tournament {
  id: number;
  name: string;
  status: string;
  matchType: 'SINGLES' | 'DOUBLES';
}

interface GroupMember {
  id: number;
  playerId: number;
  player: {
    id: number;
    name: string;
  };
}

interface Group {
  id: number;
  name: string;
  color?: string;
  members?: GroupMember[];
}

interface AddMatchFormProps {
  onClose: () => void;
  players: Player[];
  currentUserId: number;
  tournaments?: Tournament[];
}

export default function AddMatchForm({ onClose, players, currentUserId, tournaments = [] }: AddMatchFormProps) {
  const [matchType, setMatchType] = useState<'SINGLES' | 'DOUBLES'>('SINGLES');
  const [team1PlayerIds, setTeam1PlayerIds] = useState<number[]>([]);
  const [team2PlayerIds, setTeam2PlayerIds] = useState<number[]>([]);
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [tournamentId, setTournamentId] = useState<number | ''>('');
  const [group1Id, setGroup1Id] = useState<number | ''>('');
  const [group2Id, setGroup2Id] = useState<number | ''>('');
  const [stage, setStage] = useState<string>('GROUP_STAGE');
  const [customPointsForWin, setCustomPointsForWin] = useState<number | ''>('');
  const [customPointsForLoss, setCustomPointsForLoss] = useState<number | ''>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const teamSize = matchType === 'DOUBLES' ? 2 : 1;

  const fetchGroups = async (tid: number) => {
    setLoadingGroups(true);
    try {
      const response = await fetch(`/api/groups?tournamentId=${tid}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleTournamentChange = (tid: number | '') => {
    setTournamentId(tid);
    setGroup1Id('');
    setGroup2Id('');
    // Clear team selections when tournament changes
    setTeam1PlayerIds([]);
    setTeam2PlayerIds([]);
    if (tid) {
      fetchGroups(tid);
    } else {
      setGroups([]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (team1PlayerIds.length !== teamSize || team2PlayerIds.length !== teamSize) {
      setError(`Please select ${teamSize} player(s) for each team`);
      return;
    }

    if (!scheduledAt) {
      setError('Please select a date and time');
      return;
    }

    // Validate tournament with groups requires group assignments
    if (tournamentId && groups.length > 0 && (!group1Id || !group2Id)) {
      setError('Tournament matches require both teams to be assigned to groups');
      return;
    }

    // Prevent scheduling tournament match without groups set up
    if (tournamentId && groups.length === 0) {
      setError('This tournament has no groups. Please create groups first or select "Unranked Match".');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt,
          type: matchType,
          team1PlayerIds,
          team2PlayerIds,
          team1Name: matchType === 'DOUBLES' && team1Name.trim() ? team1Name.trim() : null,
          team2Name: matchType === 'DOUBLES' && team2Name.trim() ? team2Name.trim() : null,
          scheduledById: currentUserId,
          status: 'SCHEDULED',
          notes: notes.trim() || null,
          tournamentId: tournamentId || null,
          group1Id: group1Id || null,
          group2Id: group2Id || null,
          stage: stage || 'GROUP_STAGE',
          customPointsForWin: customPointsForWin || null,
          customPointsForLoss: customPointsForLoss || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to schedule match');
      }

      onClose();
    } catch (err) {
      console.error('Error scheduling match:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule match');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeam1Change = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value as number[];
    const selectedIds = value.slice(0, teamSize);
    setTeam1PlayerIds(selectedIds);
    
    // Auto-detect and set group for team1 if tournament is selected
    if (tournamentId && groups.length > 0 && selectedIds.length > 0) {
      const firstPlayerId = selectedIds[0];
      const playerGroup = groups.find(g => 
        g.members?.some(m => m.playerId === firstPlayerId)
      );
      if (playerGroup) {
        setGroup1Id(playerGroup.id);
      }
    }
  };

  const handleTeam2Change = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value as number[];
    const selectedIds = value.slice(0, teamSize);
    setTeam2PlayerIds(selectedIds);
    
    // Auto-detect and set group for team2 if tournament is selected
    if (tournamentId && groups.length > 0 && selectedIds.length > 0) {
      const firstPlayerId = selectedIds[0];
      const playerGroup = groups.find(g => 
        g.members?.some(m => m.playerId === firstPlayerId)
      );
      if (playerGroup) {
        setGroup2Id(playerGroup.id);
      }
    }
  };

  // Get the group ID for a player
  const getPlayerGroupId = (playerId: number): number | null => {
    if (!tournamentId || groups.length === 0) return null;
    const group = groups.find(g => 
      g.members?.some(m => m.playerId === playerId)
    );
    return group ? group.id : null;
  };

  // Filter team1 players: If one player is selected, only show players from the same group
  const getAvailableTeam1Players = () => {
    let available = players.filter(p => !team2PlayerIds.includes(p.id));
    
    if (tournamentId && groups.length > 0 && team1PlayerIds.length > 0) {
      const firstPlayerGroupId = getPlayerGroupId(team1PlayerIds[0]);
      if (firstPlayerGroupId !== null) {
        // Only show players from the same group as the first selected player
        available = available.filter(p => getPlayerGroupId(p.id) === firstPlayerGroupId);
      }
    }
    
    return available;
  };

  // Filter team2 players: Show only players from OTHER groups (not team1's group)
  const getAvailableTeam2Players = () => {
    let available = players.filter(p => !team1PlayerIds.includes(p.id));
    
    if (tournamentId && groups.length > 0) {
      // If team1 has players, filter to only show players from different groups
      if (team1PlayerIds.length > 0) {
        const team1GroupId = getPlayerGroupId(team1PlayerIds[0]);
        if (team1GroupId !== null) {
          available = available.filter(p => {
            const playerGroupId = getPlayerGroupId(p.id);
            return playerGroupId !== null && playerGroupId !== team1GroupId;
          });
        }
      }
      
      // If team2 already has players selected, only show players from the same group
      if (team2PlayerIds.length > 0) {
        const firstPlayerGroupId = getPlayerGroupId(team2PlayerIds[0]);
        if (firstPlayerGroupId !== null) {
          available = available.filter(p => getPlayerGroupId(p.id) === firstPlayerGroupId);
        }
      }
    }
    
    return available;
  };

  const availableTeam1Players = getAvailableTeam1Players();
  const availableTeam2Players = getAvailableTeam2Players();

  // Filter tournaments by match type
  const filteredTournaments = tournaments.filter(t => t.matchType === matchType);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule New Match</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            <FormControl fullWidth>
              <InputLabel>Match Type</InputLabel>
              <Select
                value={matchType}
                label="Match Type"
                onChange={(e) => {
                  const newMatchType = e.target.value as 'SINGLES' | 'DOUBLES';
                  setMatchType(newMatchType);
                  setTeam1PlayerIds([]);
                  setTeam2PlayerIds([]);
                  
                  // Clear tournament selection if it doesn't match the new match type
                  if (tournamentId) {
                    const selectedTournament = tournaments.find(t => t.id === tournamentId);
                    if (selectedTournament && selectedTournament.matchType !== newMatchType) {
                      setTournamentId('');
                      setGroup1Id('');
                      setGroup2Id('');
                      setGroups([]);
                    }
                  }
                }}
              >
                <MenuItem value="SINGLES">Singles</MenuItem>
                <MenuItem value="DOUBLES">Doubles</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Match Category</InputLabel>
              <Select
                value={tournamentId}
                label="Match Category"
                onChange={(e) => handleTournamentChange(e.target.value as number | '')}
              >
                <MenuItem value="">
                  <em>Unranked Match (Casual/Practice)</em>
                </MenuItem>
                {filteredTournaments.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </MenuItem>
                ))}
              </Select>
              {filteredTournaments.length === 0 && tournaments.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  No {matchType.toLowerCase()} tournaments available. Switch match type to see other tournaments.
                </Typography>
              )}
              {filteredTournaments.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Showing {filteredTournaments.length} {matchType.toLowerCase()} tournament{filteredTournaments.length !== 1 ? 's' : ''}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Match Stage</InputLabel>
              <Select
                value={stage}
                label="Match Stage"
                onChange={(e) => setStage(e.target.value)}
              >
                <MenuItem value="GROUP_STAGE">Group Stage</MenuItem>
                <MenuItem value="ROUND_OF_16">Round of 16</MenuItem>
                <MenuItem value="QUARTER_FINAL">Quarter Final</MenuItem>
                <MenuItem value="SEMI_FINAL">Semi Final</MenuItem>
                <MenuItem value="THIRD_PLACE">3rd Place Playoff</MenuItem>
                <MenuItem value="FINAL">Final</MenuItem>
                <MenuItem value="ELIMINATOR">Eliminator</MenuItem>
                <MenuItem value="QUALIFIER_1">Qualifier 1</MenuItem>
                <MenuItem value="QUALIFIER_2">Qualifier 2</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {stage === 'GROUP_STAGE' ? 'League/round-robin matches' : 'Knockout/playoff match'}
              </Typography>
            </FormControl>

            {/* Custom Points for Non-Group Stage Matches */}
            {stage !== 'GROUP_STAGE' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Points for Win (Optional)"
                  type="number"
                  value={customPointsForWin}
                  onChange={(e) => setCustomPointsForWin(e.target.value ? parseInt(e.target.value) : '')}
                  fullWidth
                  helperText="Override tournament default points for winning this match"
                  inputProps={{ min: 0 }}
                />
                <TextField
                  label="Points for Loss (Optional)"
                  type="number"
                  value={customPointsForLoss}
                  onChange={(e) => setCustomPointsForLoss(e.target.value ? parseInt(e.target.value) : '')}
                  fullWidth
                  helperText="Override tournament default points for losing this match"
                  inputProps={{ min: 0 }}
                />
              </Box>
            )}

            {stage !== 'GROUP_STAGE' && customPointsForWin === '' && customPointsForLoss === '' && tournamentId && (
              <Alert severity="info">
                <Typography variant="caption">
                  If not specified, tournament default points will be used (check tournament settings).
                </Typography>
              </Alert>
            )}

            {tournamentId && loadingGroups && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Loading groups...
              </Alert>
            )}

            {tournamentId && !loadingGroups && groups.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                <strong>No groups found for this tournament.</strong>
                <br />
                Please create groups for this tournament first, or select "Unranked Match" to play without groups.
              </Alert>
            )}

            {tournamentId && groups.length > 0 && (
              <>
                <Alert severity="info" sx={{ mt: 1 }}>
                  Tournament mode: Teams must have players from the same group. Opposing teams must be from different groups. <strong>Both group selections are required.</strong>
                </Alert>
                    
                    <FormControl fullWidth required>
                      <InputLabel>Team 1 Group *</InputLabel>
                      <Select
                        value={group1Id}
                        label="Team 1 Group *"
                        onChange={(e) => setGroup1Id(e.target.value as number | '')}
                        disabled={loadingGroups}
                        required
                      >
                        <MenuItem value="">
                          <em>Select a group</em>
                        </MenuItem>
                        {groups.map((g) => (
                          <MenuItem key={g.id} value={g.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {g.color && (
                                <Box
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    backgroundColor: g.color,
                                  }}
                                />
                              )}
                              {g.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth required>
                      <InputLabel>Team 2 Group *</InputLabel>
                      <Select
                        value={group2Id}
                        label="Team 2 Group *"
                        onChange={(e) => setGroup2Id(e.target.value as number | '')}
                        disabled={loadingGroups}
                        required
                      >
                        <MenuItem value="">
                          <em>Select a group</em>
                        </MenuItem>
                        {groups.map((g) => (
                          <MenuItem key={g.id} value={g.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {g.color && (
                                <Box
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    backgroundColor: g.color,
                                  }}
                                />
                              )}
                              {g.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}

            <FormControl fullWidth>
              <InputLabel>Team 1 Players</InputLabel>
              <Select
                multiple
                value={team1PlayerIds}
                onChange={handleTeam1Change}
                input={<OutlinedInput label="Team 1 Players" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={players.find(p => p.id === value)?.name}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {availableTeam1Players.map((player) => (
                  <MenuItem
                    key={player.id}
                    value={player.id}
                    disabled={team1PlayerIds.length >= teamSize && !team1PlayerIds.includes(player.id)}
                  >
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Select {teamSize} player{teamSize > 1 ? 's' : ''}
                {tournamentId && groups.length > 0 && ' (players from same group)'}
              </Typography>
            </FormControl>

            {matchType === 'DOUBLES' && (
              <TextField
                label="Team 1 Name (Optional)"
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                fullWidth
                placeholder="e.g., Thunder Strikers, Team Alpha"
                helperText="Custom name for this doubles team"
              />
            )}

            <FormControl fullWidth>
              <InputLabel>Team 2 Players</InputLabel>
              <Select
                multiple
                value={team2PlayerIds}
                onChange={handleTeam2Change}
                input={<OutlinedInput label="Team 2 Players" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={players.find(p => p.id === value)?.name}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {availableTeam2Players.map((player) => (
                  <MenuItem
                    key={player.id}
                    value={player.id}
                    disabled={team2PlayerIds.length >= teamSize && !team2PlayerIds.includes(player.id)}
                  >
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Select {teamSize} player{teamSize > 1 ? 's' : ''}
                {tournamentId && groups.length > 0 && team1PlayerIds.length > 0 && ' (from different group)'}
              </Typography>
            </FormControl>

            {matchType === 'DOUBLES' && (
              <TextField
                label="Team 2 Name (Optional)"
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                fullWidth
                placeholder="e.g., Lightning Smashers, Team Bravo"
                helperText="Custom name for this doubles team"
              />
            )}

            <TextField
              fullWidth
              label="Scheduled Date & Time"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this match..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Scheduling...' : 'Schedule Match'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
