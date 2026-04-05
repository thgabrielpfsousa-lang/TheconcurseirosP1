export type Option = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Cargo {
  id: string;
  name: string;
}

export interface Question {
  id: number;
  cargoId: string;
  examId: number;
  subject: string;
  text: string;
  options: Partial<Record<Option, string>>;
  correctAnswer: Option;
  explanation?: string;
}

export interface QuizState {
  currentQuestionIndex: number;
  userAnswers: Record<number, Option>;
  isFinished: boolean;
  wrongQuestionIds: number[];
  correctQuestionIds: number[];
  isReviewing: boolean;
}

export type View = 'home' | 'quiz' | 'review' | 'history' | 'review_list' | 'cargo_selection' | 'subject_list' | 'subject_quiz' | 'exam_list';
