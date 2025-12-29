
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, update, remove, get } from 'firebase/database';
import { db } from '../firebase';
import { UserProfile, RoomData, PlayerState, Question } from '../types';
import { getCheerMessage } from '../services/geminiService';

interface GameScreenProps {
  user: UserProfile;
  roomId: string;
  onExit: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ user, roomId, onExit }) => {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [cheer, setCheer] = useState('가즈아! 수학 영웅!');
  const [isCopied, setIsCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);

    // Join room logic
    const joinIfMissing = async () => {
      const snap = await get(roomRef);
      if (snap.exists()) {
        const data = snap.val() as RoomData;
        if (!data.players[user.uid]) {
          await update(ref(db, `rooms/${roomId}/players`), {
            [user.uid]: {
              uid: user.uid,
              displayName: user.displayName,
              photoURL: user.photoURL,
              score: 0,
              currentQuestionIndex: 0,
              isReady: false,
              isFinished: false,
            }
          });
        }
      }
    };
    joinIfMissing();

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoom(snapshot.val());
      } else {
        onExit();
      }
    });

    return () => unsubscribe();
  }, [roomId, user, onExit]);

  useEffect(() => {
    if (room?.status === 'playing') {
      inputRef.current?.focus();
    }
    if (room?.status === 'finished') {
      const p = room.players[user.uid];
      if (p) {
        getCheerMessage(p.score).then(setCheer);
      }
    }
  }, [room?.status, user.uid, room?.players]);

  const handleReady = async () => {
    await update(ref(db, `rooms/${roomId}/players/${user.uid}`), { isReady: true });
    
    // Check if both are ready
    if (room) {
      // Fixed: Cast Object.values results to PlayerState[] to resolve unknown type errors
      const players = Object.values(room.players) as PlayerState[];
      const readyCount = players.filter(p => p.isReady || p.uid === user.uid).length;
      if (readyCount === players.length || players.length === 1) {
        await update(ref(db, `rooms/${roomId}`), { status: 'playing' });
      }
    }
  };

  const submitAnswer = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!room || room.status !== 'playing') return;

    const player = room.players[user.uid];
    if (player.isFinished) return;

    const currentQuestion = room.questions[player.currentQuestionIndex];
    const isCorrect = parseInt(answerInput) === currentQuestion.answer;
    
    const nextIndex = player.currentQuestionIndex + 1;
    const isFinished = nextIndex >= room.questions.length;

    const updates: any = {
      [`rooms/${roomId}/players/${user.uid}/score`]: isCorrect ? player.score + 1 : player.score,
      [`rooms/${roomId}/players/${user.uid}/currentQuestionIndex`]: nextIndex,
      [`rooms/${roomId}/players/${user.uid}/isFinished`]: isFinished,
    };

    setAnswerInput('');
    await update(ref(db), updates);

    // Check if everyone finished
    const snapshot = await get(ref(db, `rooms/${roomId}/players`));
    if (snapshot.exists()) {
      const players = Object.values(snapshot.val()) as PlayerState[];
      if (players.every(p => p.isFinished)) {
        let winnerUid: string | 'draw' = 'draw';
        if (players.length > 1) {
          if (players[0].score > players[1].score) winnerUid = players[0].uid;
          else if (players[1].score > players[0].score) winnerUid = players[1].uid;
        } else {
          winnerUid = players[0].uid;
        }
        await update(ref(db, `rooms/${roomId}`), { status: 'finished', winnerUid });
      }
    }
  }, [answerInput, room, roomId, user.uid]);

  const copyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#/join/${roomId}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!room) return null;

  const player = room.players[user.uid];
  // Fixed: Cast Object.values to PlayerState[] to ensure opponent properties are typed correctly
  const opponent = (Object.values(room.players) as PlayerState[]).find(p => p.uid !== user.uid);

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col p-4">
      {/* Top Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-6">
        <button onClick={onExit} className="bg-white px-4 py-2 rounded-xl shadow-sm text-gray-500 font-bold hover:bg-gray-50 transition-all">
          ← 나가기
        </button>
        <div className="bg-white px-6 py-2 rounded-2xl shadow-sm border-2 border-indigo-200">
          <span className="text-sm text-gray-400 mr-2">방 코드:</span>
          <span className="text-xl font-bold text-indigo-600 tracking-widest">{roomId}</span>
        </div>
        <button 
          onClick={copyLink}
          className={`${isCopied ? 'bg-green-500' : 'bg-indigo-500'} text-white px-4 py-2 rounded-xl shadow-sm font-bold transition-all`}
        >
          {isCopied ? '복사됨!' : '링크 복사'}
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col gap-6">
        
        {/* Opponent Status (if battle) */}
        {opponent && (
          <div className="bg-white rounded-3xl p-4 shadow-md flex items-center gap-4 border-l-8 border-red-400">
            <img src={opponent.photoURL} alt="Opponent" className="w-12 h-12 rounded-full border-2 border-red-100" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-700">{opponent.displayName}</span>
                <span className="text-red-500 font-bold">{opponent.score}점</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-400 transition-all duration-500" 
                  style={{ width: `${(opponent.currentQuestionIndex / 9) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Game State Logic */}
        <div className="flex-1 bg-white rounded-[2rem] shadow-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
          
          {room.status === 'waiting' && (
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <div className="relative">
                  <img src={user.photoURL} className="w-24 h-24 rounded-full border-4 border-indigo-200" alt="Me" />
                  {player.isReady && <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></div>}
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">상대를 기다리는 중...</h2>
              <p className="text-gray-500 mb-8">방 코드를 친구에게 알려주세요!</p>
              {!player.isReady && (
                <button 
                  onClick={handleReady}
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-12 py-4 rounded-2xl shadow-lg text-2xl transform hover:scale-105 active:scale-95 transition-all"
                >
                  준비 완료!
                </button>
              )}
            </div>
          )}

          {room.status === 'playing' && !player.isFinished && (
            <div className="w-full max-w-lg text-center">
              <div className="mb-6 flex justify-between items-center">
                <span className="text-indigo-400 font-bold">문제 {player.currentQuestionIndex + 1} / 9</span>
                <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full font-bold">내 점수: {player.score}</span>
              </div>
              
              <div className="text-7xl font-bold text-gray-800 mb-12 drop-shadow-sm">
                {room.questions[player.currentQuestionIndex].expression} = ?
              </div>

              <form onSubmit={submitAnswer} className="flex gap-4">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  placeholder="정답은?"
                  className="flex-1 text-3xl text-center font-bold px-4 py-6 rounded-3xl border-4 border-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-inner"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  autoFocus
                />
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 rounded-3xl font-bold text-2xl shadow-xl transition-all"
                >
                  확인
                </button>
              </form>
            </div>
          )}

          {room.status === 'playing' && player.isFinished && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">모든 문제를 풀었어요!</h2>
              <p className="text-gray-500">다른 플레이어가 끝날 때까지 기다려주세요...</p>
            </div>
          )}

          {room.status === 'finished' && (
            <div className="text-center w-full">
              <div className="mb-4">
                {room.winnerUid === user.uid ? (
                  <div className="text-7xl mb-4">🏆</div>
                ) : room.winnerUid === 'draw' ? (
                  <div className="text-7xl mb-4">🤝</div>
                ) : (
                  <div className="text-7xl mb-4">🔥</div>
                )}
              </div>
              
              <h2 className="text-4xl font-bold text-gray-800 mb-2">
                {room.winnerUid === user.uid ? '승리했어요!' : room.winnerUid === 'draw' ? '무승부예요!' : '거의 다 왔어요!'}
              </h2>
              
              <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-6 my-8 inline-block min-w-[300px]">
                <div className="text-sm text-indigo-400 mb-1 uppercase tracking-widest font-bold">Gemini의 응원</div>
                <div className="text-2xl font-bold text-indigo-700">"{cheer}"</div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                {/* Fixed: Cast Object.values results to PlayerState[] to resolve property access errors in map callback */}
                {(Object.values(room.players) as PlayerState[]).map(p => (
                  <div key={p.uid} className={`p-4 rounded-2xl border-2 ${p.uid === user.uid ? 'bg-white border-indigo-400' : 'bg-gray-50 border-gray-200'}`}>
                    <img src={p.photoURL} className="w-12 h-12 rounded-full mx-auto mb-2" alt={p.displayName} />
                    <div className="font-bold text-gray-700 truncate">{p.displayName}</div>
                    <div className="text-2xl font-bold text-indigo-600">{p.score}점</div>
                  </div>
                ))}
              </div>

              <button 
                onClick={onExit}
                className="bg-gray-800 hover:bg-black text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-lg transition-all"
              >
                로비로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
