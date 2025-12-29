
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoom(snapshot.val());
      } else {
        onExit();
      }
    });
    return () => unsubscribe();
  }, [roomId, onExit]);

  useEffect(() => {
    if (room?.status === 'playing') {
      inputRef.current?.focus();
    }
    if (room?.status === 'finished') {
      const p = room.players[user.uid];
      if (p) getCheerMessage(p.score).then(setCheer);
    }
  }, [room?.status, user.uid, room?.players]);

  const handleReady = async () => {
    await update(ref(db, `rooms/${roomId}/players/${user.uid}`), { isReady: true });
    if (room) {
      const players = Object.values(room.players) as PlayerState[];
      const readyCount = players.filter(p => p.isReady || p.uid === user.uid).length;
      if (readyCount === players.length) {
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

    // Final check for room completion
    const snapshot = await get(ref(db, `rooms/${roomId}/players`));
    if (snapshot.exists()) {
      const players = Object.values(snapshot.val()) as PlayerState[];
      if (players.every(p => p.isFinished)) {
        let winnerUid: string | 'draw' = 'draw';
        if (players.length > 1) {
          if (players[0].score > players[1].score) winnerUid = players[0].uid;
          else if (players[1].score > players[0].score) winnerUid = players[1].uid;
        } else { winnerUid = players[0].uid; }
        await update(ref(db, `rooms/${roomId}`), { status: 'finished', winnerUid });
      }
    }
  }, [answerInput, room, roomId, user.uid]);

  if (!room) return null;

  const player = room.players[user.uid];
  const playersList = Object.values(room.players) as PlayerState[];
  const opponent = playersList.find(p => p.uid !== user.uid);
  const totalQuestions = room.questions.length;

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col overflow-hidden">
      {/* HUD Bar */}
      <div className="bg-white px-6 py-4 shadow-md flex items-center justify-between z-10">
        <button onClick={onExit} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl text-gray-600 font-bold transition-all">← 나갈래</button>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase">내 점수</span>
            <span className="text-xl font-bold text-blue-600">{player.score}점</span>
          </div>
          {opponent && (
            <>
              <div className="w-px h-8 bg-gray-200 my-auto"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">상대 점수</span>
                <span className="text-xl font-bold text-red-500">{opponent.score}점</span>
              </div>
            </>
          )}
        </div>
        <div className="text-sm font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
          CODE: {roomId}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4">
        {/* Battle Arena */}
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"></div>
          
          {/* Progress Indicators */}
          <div className="grid grid-cols-1 gap-4 mb-8">
             <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                   <div><span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">나 (Hero)</span></div>
                   <div className="text-right"><span className="text-xs font-semibold inline-block text-blue-600">{Math.round((player.currentQuestionIndex / totalQuestions) * 100)}%</span></div>
                </div>
                <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-blue-100 border border-blue-200 shadow-inner">
                   <div style={{ width: `${(player.currentQuestionIndex / totalQuestions) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"></div>
                </div>
             </div>
             {opponent && (
               <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                     <div><span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">상대 (Rival)</span></div>
                     <div className="text-right"><span className="text-xs font-semibold inline-block text-red-600">{Math.round((opponent.currentQuestionIndex / totalQuestions) * 100)}%</span></div>
                  </div>
                  <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-red-100 border border-red-200 shadow-inner">
                     <div style={{ width: `${(opponent.currentQuestionIndex / totalQuestions) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-400 transition-all duration-500"></div>
                  </div>
               </div>
             )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {room.status === 'waiting' && (
              <div className="text-center animate-bounce-slow">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">준비되셨나요?</h2>
                {!player.isReady ? (
                  <button onClick={handleReady} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-12 py-5 rounded-3xl shadow-xl text-3xl transform hover:scale-105 active:scale-95 transition-all">전투 시작!</button>
                ) : (
                  <div className="text-blue-500 font-bold text-xl">상대를 기다리고 있어요...</div>
                )}
              </div>
            )}

            {room.status === 'playing' && !player.isFinished && (
              <div className="w-full max-w-2xl text-center flex flex-col items-center">
                <div className={`w-full p-8 rounded-3xl mb-8 border-4 border-dashed transition-all ${room.questions[player.currentQuestionIndex].type === 'word' ? 'bg-orange-50 border-orange-200' : 'bg-white border-blue-100'}`}>
                  <div className="text-xs text-indigo-400 font-bold mb-2 tracking-widest uppercase">
                    {room.questions[player.currentQuestionIndex].type === 'word' ? '💡 서술형 문제' : '⚡️ 암산 문제'} ({player.currentQuestionIndex + 1}/{totalQuestions})
                  </div>
                  <div className={`${room.questions[player.currentQuestionIndex].type === 'word' ? 'text-2xl lg:text-3xl' : 'text-5xl lg:text-7xl'} font-bold text-gray-800 leading-tight`}>
                    {room.questions[player.currentQuestionIndex].expression}
                    {room.questions[player.currentQuestionIndex].type === 'calc' && ' = ?'}
                  </div>
                </div>

                <form onSubmit={submitAnswer} className="w-full max-w-sm flex flex-col gap-4">
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    placeholder="정답을 입력하세요"
                    className="w-full text-4xl text-center font-bold px-4 py-6 rounded-3xl border-4 border-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-inner"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-3xl font-bold text-2xl shadow-xl transition-all active:scale-95">입력 완료</button>
                </form>
              </div>
            )}

            {room.status === 'playing' && player.isFinished && (
              <div className="text-center">
                <div className="text-6xl mb-6">🎯</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">모든 문제를 완료했습니다!</h2>
                <p className="text-gray-500">상대의 결과를 기다리고 있어요...</p>
              </div>
            )}

            {room.status === 'finished' && (
              <div className="text-center w-full max-w-lg">
                <div className="mb-6">
                  {room.winnerUid === user.uid ? (
                    <div className="text-8xl animate-bounce">🥇</div>
                  ) : room.winnerUid === 'draw' ? (
                    <div className="text-8xl">🤝</div>
                  ) : (
                    <div className="text-8xl">🥈</div>
                  )}
                </div>
                
                <h2 className="text-5xl font-bold text-gray-800 mb-4">
                  {room.winnerUid === user.uid ? '승리했어요!' : room.winnerUid === 'draw' ? '무승부예요!' : '아쉽네요!'}
                </h2>
                
                <div className="bg-white border-4 border-indigo-100 rounded-[2rem] p-8 my-8 shadow-lg">
                   <div className="text-gray-600 text-lg mb-4 italic font-bold">"{cheer}"</div>
                   <div className="grid grid-cols-2 gap-4">
                      {playersList.map(p => (
                        <div key={p.uid} className={`p-4 rounded-2xl ${p.uid === user.uid ? 'bg-blue-50 border-2 border-blue-200' : 'bg-red-50 border-2 border-red-200'}`}>
                           <img src={p.photoURL} className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-white shadow-sm" alt={p.displayName} />
                           <div className="font-bold text-gray-700 truncate text-sm">{p.displayName}</div>
                           <div className="text-2xl font-bold text-gray-800">{p.score}점</div>
                        </div>
                      ))}
                   </div>
                </div>

                <button onClick={onExit} className="bg-gray-800 hover:bg-black text-white px-16 py-4 rounded-2xl font-bold text-xl shadow-lg transition-all active:scale-95">로비로 이동</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
