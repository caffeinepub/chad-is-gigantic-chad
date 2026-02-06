import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Game {
    thumbnail: string;
    name: string;
    description: string;
}
export interface Score {
    score: bigint;
    playerName: string;
}
export interface backendInterface {
    getAvailableGames(): Promise<Array<Game>>;
    getHighScores(game: string): Promise<Array<Score>>;
    getPlayerScore(game: string, playerName: string): Promise<bigint | null>;
    submitScore(game: string, playerName: string, score: bigint): Promise<void>;
}
