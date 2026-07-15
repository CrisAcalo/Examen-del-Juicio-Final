import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Evaluation, Question } from '../utils/aikenParser';

export interface QuizAttempt {
  questions: Question[];
  answers: Record<string, string>;
  currentIndex: number;
  isCompleted?: boolean;
  correctCount?: number;
  totalCount?: number;
}

interface QuizState {
  evaluations: Evaluation[];
  attempts: Record<string, QuizAttempt>;
  addEvaluation: (evaluation: Evaluation) => void;
  removeEvaluation: (id: string) => void;
  saveAttempt: (evalId: string, attempt: QuizAttempt) => void;
  resetAttempt: (evalId: string) => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      evaluations: [],
      attempts: {},
      addEvaluation: (evaluation) => 
        set((state) => ({ evaluations: [...state.evaluations, evaluation] })),
      removeEvaluation: (id) =>
        set((state) => {
          const newAttempts = { ...state.attempts };
          delete newAttempts[id];
          return { 
            evaluations: state.evaluations.filter(e => e.id !== id),
            attempts: newAttempts 
          };
        }),
      saveAttempt: (evalId, attempt) =>
        set((state) => ({ attempts: { ...state.attempts, [evalId]: attempt } })),
      resetAttempt: (evalId) =>
        set((state) => {
          const newAttempts = { ...state.attempts };
          delete newAttempts[evalId];
          return { attempts: newAttempts };
        }),
    }),
    {
      name: 'quiz-storage',
    }
  )
);
