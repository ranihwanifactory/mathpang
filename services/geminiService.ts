
/**
 * Generates math questions locally without using Gemini API.
 * Returns an array of objects with expression and answer.
 */
export const generateMathQuestions = async (count: number = 9): Promise<{ expression: string; answer: number }[]> => {
  const questions: { expression: string; answer: number }[] = [];
  const operators = ['+', '-', '×'];

  for (let i = 0; i < count; i++) {
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a, b, expression, answer;

    if (op === '+') {
      a = Math.floor(Math.random() * 45) + 5;
      b = Math.floor(Math.random() * 45) + 5;
      expression = `${a} + ${b}`;
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * (a - 5)) + 5; // Ensure positive result >= 5
      expression = `${a} - ${b}`;
      answer = a - b;
    } else {
      // Multiplication table (2x1 to 9x9)
      a = Math.floor(Math.random() * 8) + 2;
      b = Math.floor(Math.random() * 9) + 1;
      expression = `${a} × ${b}`;
      answer = a * b;
    }
    questions.push({ expression, answer });
  }

  // Simulate a tiny delay for a "generating" feel
  return new Promise((resolve) => {
    setTimeout(() => resolve(questions), 300);
  });
};

/**
 * Gets a random encouraging cheer message locally.
 */
export const getCheerMessage = async (score: number): Promise<string> => {
  const highScores = [
    "와! 정말 대단한 실력이에요! 만점 박사님!",
    "수학의 신이 여기 있었네요! 완벽합니다!",
    "친구들 중 최고일 거예요! 정말 멋져요!",
    "계산 속도가 빛보다 빠르네요! 최고!"
  ];
  
  const midScores = [
    "실력이 쑥쑥 늘고 있어요! 조금만 더 해볼까요?",
    "정말 잘했어요! 다음엔 더 높은 점수에 도전해요!",
    "포기하지 않고 끝까지 해낸 당신이 진정한 영웅!",
    "멋진 집중력이었어요! 대단해요!"
  ];

  const lowScores = [
    "괜찮아요! 연습하면 누구나 수학 왕이 될 수 있어요!",
    "조금 아쉽지만, 노력하는 모습이 정말 예뻐요!",
    "다음에 다시 도전해서 실력을 보여주세요! 화이팅!",
    "실수는 성공의 어머니! 다시 한 번 해볼까요?"
  ];

  let selectedList = lowScores;
  if (score >= 9) selectedList = highScores;
  else if (score >= 5) selectedList = midScores;

  const randomMessage = selectedList[Math.floor(Math.random() * selectedList.length)];
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(randomMessage), 100);
  });
};
