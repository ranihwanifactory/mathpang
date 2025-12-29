import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, update, get, remove } from 'firebase/database';
import { db } from '../firebase';
import { UserProfile, RoomData, PlayerState, Question } from '../types';
import { getCheerMessage } from '../services/geminiService';

interface GameScreenProps {
  user: UserProfile;
  roomId: string;
  onExit: () => void;
}

const AnimatedScore: React.FC<{ target: number }> = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000; // 1 second
    const increment = target / (duration / 16); // 60fps approx

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  return <span className={count === target ? "animate-count-pop" : ""}>{count}점</span>;
};

const GameScreen: React.FC<GameScreenProps> = ({ user, roomId, onExit }) => {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [cheer, setCheer] = useState('가즈아! 수학 영웅!');
  const [isExiting, setIsExiting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Sync room data
  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as RoomData;
        setRoom(data);
      } else {
        if (!isExiting) {
          alert("방장이 방을 나갔거나 방이 삭제되었습니다.");
          onExit();
        }
      }
    });
    return () => unsubscribe();
  }, [roomId, onExit, isExiting]);

  // 2. Handle missing player registration
  useEffect(() => {
    if (room && !room.players?.[user.uid] && !isRegistering && !isExiting) {
      if (room.status !== 'waiting') {
        alert("이미 시작된 게임에는 입장할 수 없어요.");
        onExit();
        return;
      }
      
      const playersCount = Object.keys(room.players || {}).length;
      if (playersCount >= 2) {
        alert("방이 이미 가득 찼어요.");
        onExit();
        return;
      }

      const registerPlayer = async () => {
        setIsRegistering(true);
        try {
          const newPlayerData: PlayerState = {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            score: 0,
            currentQuestionIndex: 0,
            isReady: false,
            isFinished: false,
          };
          await update(ref(db, `rooms/${roomId}/players/${user.uid}`), newPlayerData);
        } catch (e) {
          console.error("Failed to register player:", e);
        } finally {
          setIsRegistering(false);
        }
      };
      registerPlayer();
    }
  }, [room, user, roomId, isRegistering, isExiting, onExit]);

  useEffect(() => {
    if (room?.status === 'playing') {
      inputRef.current?.focus();
    }
    if (room?.status === 'finished') {
      const p = room.players?.[user.uid];
      if (p) getCheerMessage(p.score).then(setCheer);
    }
  }, [room?.status, user.uid, room?.players]);

  const handleExit = async () => {
    setIsExiting(true);
    if (room) {
      if (room.hostUid === user.uid) {
        await remove(ref(db, `rooms/${roomId}`));
      } else {
        await remove(ref(db, `rooms/${roomId}/players/${user.uid}`));
      }
    }
    onExit();
  };

  const handleReady = async () => {
    await update(ref(db, `rooms/${roomId}/players/${user.uid}`), { isReady: true });
    const snapshot = await get(ref(db, `rooms/${roomId}`));
    if (snapshot.exists()) {
      const currentRoom = snapshot.val() as RoomData;
      const players = Object.values(currentRoom.players || {}) as PlayerState[];
      const readyCount = players.filter(p => p.isReady).length;
      if (readyCount === players.length && players.length >= 1) {
        await update(ref(db, `rooms/${roomId}`), { status: 'playing' });
      }
    }
  };

  const shareInviteLink = async () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#/join/${roomId}`;
    const shareData = {
      title: '수학 대장 대결 초대!',
      text: `${user.displayName}님이 수학 대결에 초대했습니다! 방 번호: ${roomId}`,
      url: inviteUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing', err);
        // Fallback to copy
        copyToClipboard(inviteUrl);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      copyToClipboard(inviteUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    });
  };

  const submitAnswer = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!room || room.status !== 'playing') return;

    const player = room.players?.[user.uid];
    if (!player || player.isFinished) return;

    const currentQuestion = room.questions[player.currentQuestionIndex];
    if (!currentQuestion) return;

    const isCorrect = parseInt(answerInput) === currentQuestion.answer;
    
    const nextIndex = player.currentQuestionIndex + 1;
    const isFinished = nextIndex >= room.questions.length;
    const now = Date.now();

    const updates: any = {
      [`rooms/${roomId}/players/${user.uid}/score`]: isCorrect ? player.score + 1 : player.score,
      [`rooms/${roomId}/players/${user.uid}/currentQuestionIndex`]: nextIndex,
      [`rooms/${roomId}/players/${user.uid}/isFinished`]: isFinished,
    };
    
    if (isFinished) {
      updates[`rooms/${roomId}/players/${user.uid}/finishedAt`] = now;
    }

    setAnswerInput('');
    await update(ref(db), updates);

    const snapshot = await get(ref(db, `rooms/${roomId}/players`));
    if (snapshot.exists()) {
      const players = Object.values(snapshot.val() || {}) as PlayerState[];
      if (players.every(p => p.isFinished)) {
        let winnerUid: string | 'draw' = 'draw';
        
        if (players.length > 1) {
          const p1 = players[0];
          const p2 = players[1];
          
          if (p1.score > p2.score) {
            winnerUid = p1.uid;
          } else if (p2.score > p1.score) {
            winnerUid = p2.uid;
          } else {
            // Scores are tied: tie-breaker is finishedAt (who finished first)
            const t1 = p1.finishedAt || now;
            const t2 = p2.finishedAt || now;
            
            if (t1 < t2) {
              winnerUid = p1.uid;
            } else if (t2 < t1) {
              winnerUid = p2.uid;
            } else {
              winnerUid = 'draw';
            }
          }
        } else if (players.length === 1) { 
          winnerUid = players[0].uid; 
        }
        await update(ref(db, `rooms/${roomId}`), { status: 'finished', winnerUid });
      }
    }
  }, [answerInput, room, roomId, user.uid]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="text-center animate-pulse">
          <div className="text-4xl mb-4">🚪</div>
          <p className="text-indigo-600 font-bold text-xl">방에 입장하고 있어요...</p>
        </div>
      </div>
    );
  }

  const player = room.players?.[user.uid];
  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="text-center animate-pulse">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-indigo-600 font-bold text-xl">참가자 명단에 등록 중...</p>
        </div>
      </div>
    );
  }

  const playersList = Object.values(room.players || {}) as PlayerState[];
  const opponent = playersList.find(p => p.uid !== user.uid);
  const totalQuestions = room.questions.length;

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col overflow-hidden">
      {/* HUD Bar */}
      <div className="bg-white px-6 py-4 shadow-md flex items-center justify-between z-10">
        <button 
          onClick={handleExit} 
          className="bg-gray-100 hover:bg-red-100 hover:text-red-600 px-4 py-2 rounded-xl text-gray-600 font-bold transition-all flex items-center gap-2"
        >
          <span>← 나갈래</span>
          {room.hostUid === user.uid && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">방폭파</span>}
        </button>
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
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"></div>
          
          {/* Progress Indicators */}
          <div className="grid grid-cols-1 gap-4 mb-8">
             <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">나 (Hero)</span>
                     {player.isReady && room.status === 'waiting' && <span className="text-[10px] text-green-500 font-bold">READY!</span>}
                   </div>
                   <div className="text-right"><span className="text-xs font-semibold inline-block text-blue-600">{Math.round((player.currentQuestionIndex / totalQuestions) * 100)}%</span></div>
                </div>
                <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-blue-100 border border-blue-200 shadow-inner">
                   <div style={{ width: `${(player.currentQuestionIndex / totalQuestions) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"></div>
                </div>
             </div>
             {opponent && (
               <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">상대 (Rival)</span>
                       {opponent.isReady && room.status === 'waiting' && <span className="text-[10px] text-green-500 font-bold">READY!</span>}
                     </div>
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
              <div className="text-center w-full max-w-md">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 animate-pop-in">수학 영웅을 기다려요!</h2>
                
                <div className="bg-indigo-50 p-6 rounded-3xl mb-8 border-2 border-indigo-100 animate-slide-up-fade delay-100">
                  <p className="text-indigo-600 font-bold mb-4">친구를 초대해보세요!</p>
                  <button 
                    onClick={shareInviteLink}
                    className={`w-full ${shareSuccess ? 'bg-green-500' : 'bg-indigo-600'} text-white py-4 rounded-2xl text-xl font-bold transition-all shadow-lg transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {shareSuccess ? '복사 완료!' : '초대 링크 공유하기'}
                  </button>
                  <p className="mt-3 text-[11px] text-gray-400 font-bold">카카오톡이나 문자로 친구에게 보내보세요!</p>
                </div>

                {!player.isReady ? (
                  <button 
                    onClick={handleReady} 
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-6 rounded-3xl shadow-xl text-3xl transform hover:scale-105 active:scale-95 transition-all animate-slide-up-fade delay-200"
                  >
                    전투 준비!
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-4 animate-slide-up-fade delay-200">
                    <div className="text-6xl animate-bounce-slow">⏳</div>
                    <div className="text-blue-500 font-bold text-xl">상대방의 준비를 기다리고 있어요...</div>
                  </div>
                )}
              </div>
            )}

            {room.status === 'playing' && !player.isFinished && (
              <div className="w-full max-w-2xl text-center flex flex-col items-center">
                <div className={`w-full p-8 rounded-3xl mb-8 border-4 border-dashed transition-all animate-pop-in ${room.questions[player.currentQuestionIndex]?.type === 'word' ? 'bg-orange-50 border-orange-200' : 'bg-white border-blue-100'}`}>
                  <div className="text-xs text-indigo-400 font-bold mb-2 tracking-widest uppercase">
                    {room.questions[player.currentQuestionIndex]?.type === 'word' ? '💡 서술형 문제' : '⚡️ 암산 문제'} ({player.currentQuestionIndex + 1}/{totalQuestions})
                  </div>
                  <div className={`${room.questions[player.currentQuestionIndex]?.type === 'word' ? 'text-2xl lg:text-3xl' : 'text-5xl lg:text-7xl'} font-bold text-gray-800 leading-tight`}>
                    {room.questions[player.currentQuestionIndex]?.expression}
                    {room.questions[player.currentQuestionIndex]?.type === 'calc' && ' = ?'}
                  </div>
                </div>

                <form onSubmit={submitAnswer} className="w-full max-w-sm flex flex-col gap-4 animate-slide-up-fade delay-100">
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    placeholder="정답"
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
              <div className="text-center animate-pop-in">
                <div className="text-6xl mb-6 float-anim">🎯</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">모든 문제를 완료했습니다!</h2>
                <p className="text-gray-500">상대의 결과를 기다리고 있어요...</p>
              </div>
            )}

            {room.status === 'finished' && (
              <div className="text-center w-full max-w-lg overflow-visible">
                <div className="mb-6 animate-pop-in opacity-0" style={{ animationFillMode: 'forwards' }}>
                  {room.winnerUid === user.uid ? (
                    <div className="text-9xl float-anim">🥇</div>
                  ) : room.winnerUid === 'draw' ? (
                    <div className="text-9xl float-anim">🤝</div>
                  ) : (
                    <div className="text-9xl float-anim opacity-60">🥈</div>
                  )}
                </div>
                
                <h2 className="text-6xl font-bold mb-4 text-indigo-600 animate-winner-glow animate-pop-in delay-100 opacity-0" style={{ animationFillMode: 'forwards' }}>
                  {room.winnerUid === user.uid ? '승리했어요!' : room.winnerUid === 'draw' ? '무승부예요!' : '아쉽네요!'}
                </h2>
                
                <div className="bg-white border-4 border-indigo-100 rounded-[2.5rem] p-8 my-8 shadow-2xl animate-slide-up-fade delay-200 opacity-0" style={{ animationFillMode: 'forwards' }}>
                   <div className="text-gray-600 text-xl mb-6 italic font-bold">"{cheer}"</div>
                   {room.winnerUid !== 'draw' && playersList.length > 1 && playersList.every(p => p.score === playersList[0].score) && (
                     <div className="mb-4 text-sm font-bold text-orange-500 animate-pulse">
                       점수가 같아서 더 빨리 푼 사람이 승리했어요! ⚡️
                     </div>
                   )}
                   <div className="grid grid-cols-2 gap-6">
                      {playersList.map((p, idx) => (
                        <div 
                            key={p.uid} 
                            className={`p-6 rounded-3xl animate-slide-up-fade opacity-0 border-4 transition-all hover:scale-105 ${p.uid === user.uid ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}
                            style={{ animationDelay: `${300 + idx * 200}ms`, animationFillMode: 'forwards' }}
                        >
                           <div className="relative inline-block mb-3">
                               <img src={p.photoURL} className="w-16 h-16 rounded-full mx-auto border-4 border-white shadow-md" alt={p.displayName} />
                               {room.winnerUid === p.uid && <span className="absolute -top-2 -right-2 text-2xl">👑</span>}
                           </div>
                           <div className="font-bold text-gray-700 truncate text-lg mb-1">{p.displayName}</div>
                           <div className="text-4xl font-black text-gray-800">
                               <AnimatedScore target={p.score} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={handleExit} 
                  className="bg-gray-800 hover:bg-black text-white px-16 py-5 rounded-[2rem] font-bold text-2xl shadow-xl transition-all active:scale-95 animate-slide-up-fade delay-500 opacity-0" 
                  style={{ animationFillMode: 'forwards' }}
                >
                  로비로 이동
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;