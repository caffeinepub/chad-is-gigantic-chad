import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Game, Score } from '../backend';

export function useGetAvailableGames() {
  const { actor, isFetching } = useActor();

  return useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAvailableGames();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetHighScores(game: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Score[]>({
    queryKey: ['highScores', game],
    queryFn: async () => {
      if (!actor) return [];
      const scores = await actor.getHighScores(game);
      return scores.sort((a, b) => Number(b.score - a.score)).slice(0, 10);
    },
    enabled: !!actor && !isFetching && !!game,
  });
}

export function useGetPlayerScore(game: string, playerName: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint | null>({
    queryKey: ['playerScore', game, playerName],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPlayerScore(game, playerName);
    },
    enabled: !!actor && !isFetching && !!game && !!playerName,
  });
}

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      playerName,
      score,
    }: {
      game: string;
      playerName: string;
      score: bigint;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.submitScore(game, playerName, score);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['highScores', variables.game] });
      queryClient.invalidateQueries({ queryKey: ['playerScore', variables.game, variables.playerName] });
    },
  });
}
