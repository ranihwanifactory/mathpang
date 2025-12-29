
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError('구글 로그인에 실패했어요.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(isRegistering ? '회원가입에 실패했어요.' : '아이디나 비밀번호를 확인해주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-indigo-600 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center float-anim">
        <h1 className="text-6xl text-white font-bold mb-2 drop-shadow-lg">수학 대장!</h1>
        <p className="text-blue-100 text-xl">친구와 함께하는 즐거운 암산 대결</p>
      </div>

      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {isRegistering ? '새로운 영웅 등록' : '수학 차원 로그인'}
        </h2>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            placeholder="이메일 주소"
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-500 outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-500 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all text-lg"
          >
            {isRegistering ? '회원가입 하기' : '모험 시작하기'}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="px-3 text-gray-400 text-sm">또는</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-blue-500 py-3 rounded-xl font-bold text-gray-700 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          구글로 로그인하기
        </button>

        <p className="mt-8 text-center text-gray-500 text-sm">
          {isRegistering ? '이미 아이디가 있나요?' : '처음 오셨나요?'}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-2 text-blue-500 font-bold hover:underline"
          >
            {isRegistering ? '로그인하러 가기' : '무료 회원가입'}
          </button>
        </p>
      </div>

      <div className="mt-12 text-blue-100/50 text-xs">
        &copy; 2024 Math Hero Battle. All rights reserved.
      </div>
    </div>
  );
};

export default AuthScreen;
