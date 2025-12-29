
export const generateMathQuestions = async (count: number = 9): Promise<{ expression: string; answer: number }[]> => {
  const questions: { expression: string; answer: number }[] = [];
  const operators = ['+', '-', '*'];

  for (let i = 0; i < count; i++) {
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a, b, expression, answer;

    if (op === '+') {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      expression = `${a} + ${b}`;
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * a) + 1; // Ensure positive result
      expression = `${a} - ${b}`;
      answer = a - b;
    } else {
      // Multiplication for kids (1-9)
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 1;
      expression = `${a} × ${b}`;
      answer = a * b;
    }

    questions.push({ expression, answer });
  }

  // Simulate async delay for consistency with previous API call
  return new Promise((resolve) => {
    setTimeout(() => resolve(questions), 500);
  });
};

export const getCheerMessage = async (score: number): Promise<string> => {
  const messages = [
    "정말 대단해요! 최고의 수학 실력이에요!",
    "와우! 계산 천재가 나타났다!",
    "포기하지 않고 끝까지 해낸 당신이 진정한 영웅!",
    "수학 실력이 쑥쑥 늘고 있어요!",
    "정말 멋진 대결이었어요! 다음에도 화이팅!",
    "와! 엄청난 집중력이네요!",
    "오늘의 수학 대장은 바로 당신!",
    "실력이 정말 놀라워요. 계속 연습해봐요!",
    "천재적인 계산 능력에 깜짝 놀랐어요!"
  ];

  const highScores = [
    "완벽해요! 만점이라니 믿기지 않아요!",
    "수학의 신이 강림하셨나요? 대단해요!",
    "모든 문제를 맞히다니, 정말 대단한 실력이에요!"
  ];

  let selectedMessage;
  if (score >= 9) {
    selectedMessage = highScores[Math.floor(Math.random() * highScores.length)];
  } else {
    selectedMessage = messages[Math.floor(Math.random() * messages.length)];
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve(selectedMessage), 300);
  });
};
