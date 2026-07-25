export type Flashcard = { front: string; back: string };
export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
};

export const dummyFlashcards: Flashcard[] = [
  { front: "What is photosynthesis?", back: "The process by which plants convert sunlight, water, and CO₂ into glucose and oxygen." },
  { front: "Define mitochondria", back: "Organelles known as the powerhouse of the cell — they generate ATP through cellular respiration." },
  { front: "What is Newton's First Law?", back: "An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by a force." },
  { front: "What is the Pythagorean theorem?", back: "In a right triangle: a² + b² = c², where c is the hypotenuse." },
  { front: "What is a variable in programming?", base: "A named container that stores a value which can change during execution.", back: "A named container that stores a value which can change during execution." } as Flashcard,
  { front: "Define osmosis", back: "The movement of water across a semipermeable membrane from low to high solute concentration." },
  { front: "What is Big-O notation?", back: "A mathematical notation describing the upper bound of an algorithm's time or space complexity." },
  { front: "What is a democracy?", back: "A system of government where power is vested in the people, typically through elected representatives." },
  { front: "Define entropy", back: "A measure of disorder or randomness in a thermodynamic system." },
  { front: "What is DNA?", back: "Deoxyribonucleic acid — the molecule carrying genetic instructions in all known living organisms." },
];

export const dummyQuiz: QuizQuestion[] = [
  {
    question: "What organelle is known as the powerhouse of the cell?",
    options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
    answerIndex: 1,
  },
  {
    question: "What does the Pythagorean theorem state?",
    options: ["a + b = c", "a² + b² = c²", "a² - b² = c²", "a × b = c"],
    answerIndex: 1,
  },
  {
    question: "Which gas do plants absorb during photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    answerIndex: 2,
  },
  {
    question: "Newton's First Law is also known as the law of…",
    options: ["Gravity", "Inertia", "Acceleration", "Momentum"],
    answerIndex: 1,
  },
  {
    question: "What does DNA stand for?",
    options: [
      "Deoxyribonucleic acid",
      "Dinitrogen acid",
      "Dual nucleic acid",
      "Deoxy-nitro acid",
    ],
    answerIndex: 0,
  },
];
