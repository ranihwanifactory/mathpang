
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
  type?: 'calc' | 'word'; // 'calc' for 1+1, 'word' for story problems
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
  hostUid: string; // The creator of the room
  status: 'waiting' | 'playing' | 'finished';
  players: Record<string, PlayerState>;
  questions: Question[];
  createdAt: number;
  winnerUid?: string | 'draw';
}

export type GameMode = 'practice' | 'battle';
