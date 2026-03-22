export type MatchWithPlayers = {
  id: number;
  scheduledAt: string | Date;
  type: 'SINGLES' | 'DOUBLES';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  team1Score: number | null;
  team2Score: number | null;
  winnerTeam: number | null;
  notes: string | null;
  players: Array<{
    id: number;
    teamSide: number;
    position: number;
    player: {
      id: number;
      name: string;
      userId: number | null;
    };
  }>;
};

export function groupPlayersByTeam(players: MatchWithPlayers['players']) {
  return players.reduce(
    (acc, entry) => {
      if (entry.teamSide === 1) acc.team1.push(entry.player.name);
      if (entry.teamSide === 2) acc.team2.push(entry.player.name);
      return acc;
    },
    { team1: [] as string[], team2: [] as string[] }
  );
}

export function formatTeamLabel(names: string[]) {
  return names.join(' + ');
}
