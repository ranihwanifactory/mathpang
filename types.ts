
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

export interface Question {
  id: number;
  expression: string;
  answer: number;
}

export interface PlayerState {
  uid: string;
  displayName: string;
  photoURL: string;
  score: number;
  currentQuestionIndex: number;
  isReady: boolean;
  isFinished: boolean;
}

export interface RoomData {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Record<string, PlayerState>;
  questions: Question[];
  createdAt: number;
  winnerUid?: string | 'draw';
}

export type GameMode = 'practice' | 'battle';
