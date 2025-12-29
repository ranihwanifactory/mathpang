
import { Question } from '../types';

const WORD_PROBLEMS: Omit<Question, 'id'>[] = [
  { expression: "사과가 15개 있었는데, 동생이 7개를 먹었어요. 남은 사과는 몇 개인가요?", answer: 8, type: 'word' },
  { expression: "연필 한 다스(12자루)가 2개 있습니다. 연필은 모두 몇 자루인가요?", answer: 24, type: 'word' },
  { expression: "버스에 사람이 25명 타고 있었어요. 정류장에서 9명이 내리고 3명이 탔습니다. 지금 버스에는 몇 명이 있나요?", answer: 19, type: 'word' },
  { expression: "한 바구니에 귤이 8개씩 들어있습니다. 4바구니에는 귤이 총 몇 개 있나요?", answer: 32, type: 'word' },
  { expression: "철수는 사탕을 42개, 영희는 28개 가지고 있습니다. 두 사람이 가진 사탕은 모두 몇 개인가요?", answer: 70, type: 'word' },
  { expression: "다리가 4개인 강아지가 9마리 있습니다. 강아지 다리는 모두 몇 개인가요?", answer: 36, type: 'word' },
  { expression: "빵 50개를 10명에게 똑같이 나누어 주려고 합니다. 한 명당 몇 개씩 받을까요?", answer: 5, type: 'word' },
  { expression: "어제는 책을 15페이지 읽었고, 오늘은 23페이지 읽었습니다. 이틀 동안 읽은 페이지는?", answer: 38, type: 'word' },
  { expression: "색종이가 80장 있었는데 35장을 썼습니다. 남은 색종이는 몇 장인가요?", answer: 45, type: 'word' },
  { expression: "토끼가 14마리, 닭이 6마리 있습니다. 동물들의 다리는 모두 합쳐 몇 개인가요? (토끼 4개, 닭 2개)", answer: 68, type: 'word' },
];

export const generateMathQuestions = async (count: number = 9): Promise<Question[]> => {
  const pool: Omit<Question, 'id'>[] = [...WORD_PROBLEMS];
  
  // Fill the rest with random calculations to reach at least 100 distinct items conceptually
  // In practice, we generate them dynamically but ensure the same set is picked for the room.
  const operators = ['+', '-', '×'];
  while (pool.length < 100) {
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a, b, expression, answer;
    if (op === '+') {
      a = Math.floor(Math.random() * 80) + 10;
      b = Math.floor(Math.random() * 80) + 10;
      expression = `${a} + ${b}`;
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 90) + 20;
      b = Math.floor(Math.random() * (a - 5)) + 5;
      expression = `${a} - ${b}`;
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 11) + 2;
      b = Math.floor(Math.random() * 9) + 1;
      expression = `${a} × ${b}`;
      answer = a * b;
    }
    pool.push({ expression, answer, type: 'calc' });
  }

  // Shuffle and pick 'count' questions
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count).map((q, idx) => ({
    ...q,
    id: idx
  }));

  return new Promise((resolve) => {
    setTimeout(() => resolve(selected), 300);
  });
};

export const getCheerMessage = async (score: number): Promise<string> => {
  const messages = [
    "포기하지 마세요! 당신은 할 수 있어요!",
    "거의 다 왔어요! 조금만 더 힘내세요!",
    "와! 엄청난 실력이네요! 박수!",
    "수학 영웅 탄생! 정말 대단해요!",
    "최고의 집중력이에요! 다음엔 더 잘할 수 있어요!",
    "친구와 함께하니 더 즐겁죠? 수고했어요!"
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};
