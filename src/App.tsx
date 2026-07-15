import { useState } from 'react';
import './App.css';
import { HomeScreen } from './screens/HomeScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import type { Question } from './utils/aikenParser';
import { Modal } from './components/Modal';
import { useQuizStore } from './store/useQuizStore';

type AppState = 
  | { status: 'home' }
  | { status: 'quiz', evalId: string, randomize: boolean, isResuming: boolean, isReviewMode: boolean }
  | { status: 'results', evalId: string, correct: number, total: number, incorrectQuestions: Question[] };

function App() {
  const [appState, setAppState] = useState<AppState>({ status: 'home' });
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, evalId?: string}>({ isOpen: false });
  const [resumeModal, setResumeModal] = useState<{isOpen: boolean, evalId?: string}>({ isOpen: false });
  
  const attempts = useQuizStore(state => state.attempts);
  const resetAttempt = useQuizStore(state => state.resetAttempt);
  const saveAttempt = useQuizStore(state => state.saveAttempt);

  const handleStartQuizClick = (evalId: string) => {
    const attempt = attempts[evalId];
    if (attempt) {
      if (attempt.isCompleted) {
        // Go directly to review mode
        setAppState({ status: 'quiz', evalId, randomize: false, isResuming: true, isReviewMode: true });
      } else {
        // In progress
        setResumeModal({ isOpen: true, evalId });
      }
    } else {
      setConfirmModal({ isOpen: true, evalId });
    }
  };

  const handleRestartQuizClick = (evalId: string) => {
    setConfirmModal({ isOpen: true, evalId });
  };

  const handleStartQuiz = (randomize: boolean) => {
    if (confirmModal.evalId) {
      // Starting from scratch (even if completed attempt exists)
      resetAttempt(confirmModal.evalId);
      setAppState({ status: 'quiz', evalId: confirmModal.evalId, randomize, isResuming: false, isReviewMode: false });
    }
    setConfirmModal({ isOpen: false });
  };

  const handleResume = (resume: boolean) => {
    if (resumeModal.evalId) {
      if (!resume) {
        // Restarting an in-progress attempt
        resetAttempt(resumeModal.evalId);
        setResumeModal({ isOpen: false });
        setConfirmModal({ isOpen: true, evalId: resumeModal.evalId });
      } else {
        // Resuming
        setAppState({ status: 'quiz', evalId: resumeModal.evalId, randomize: false, isResuming: true, isReviewMode: false });
        setResumeModal({ isOpen: false });
      }
    }
  };

  const handleQuizComplete = (correct: number, total: number, incorrectQuestions: Question[]) => {
    if (appState.status === 'quiz') {
      const attempt = attempts[appState.evalId];
      if (attempt && !appState.isReviewMode) {
        // Mark as completed
        saveAttempt(appState.evalId, {
          ...attempt,
          isCompleted: true,
          correctCount: correct,
          totalCount: total
        });
      }
      
      setAppState({
        status: 'results',
        evalId: appState.evalId,
        correct,
        total,
        incorrectQuestions
      });
    }
  };

  const goHome = () => setAppState({ status: 'home' });

  return (
    <div className="app-container">
      {appState.status === 'home' && (
        <HomeScreen onStartQuiz={handleStartQuizClick} onRestartQuiz={handleRestartQuizClick} />
      )}
      
      {appState.status === 'quiz' && (
        <QuizScreen 
          evaluationId={appState.evalId} 
          randomize={appState.randomize}
          isResuming={appState.isResuming}
          isReviewMode={appState.isReviewMode}
          onComplete={handleQuizComplete}
          onCancel={goHome}
        />
      )}

      {appState.status === 'results' && (
        <ResultsScreen
          originalEvaluationId={appState.evalId}
          correctCount={appState.correct}
          totalCount={appState.total}
          incorrectQuestions={appState.incorrectQuestions}
          onGoHome={goHome}
        />
      )}

      <Modal 
        isOpen={confirmModal.isOpen}
        title="Opciones de Cuestionario"
        message="¿Deseas aleatorizar el orden de las preguntas y las opciones?"
        confirmText="Sí, aleatorizar"
        cancelText="No, mantener orden"
        onConfirm={() => handleStartQuiz(true)}
        onSecondaryAction={() => handleStartQuiz(false)}
        onClose={() => setConfirmModal({ isOpen: false })}
      />

      <Modal 
        isOpen={resumeModal.isOpen}
        title="Progreso Guardado"
        message="Tienes un avance guardado en este cuestionario sin terminar. ¿Deseas retomarlo donde lo dejaste o empezar de cero?"
        confirmText="Retomar"
        cancelText="Empezar de cero"
        onConfirm={() => handleResume(true)}
        onSecondaryAction={() => handleResume(false)}
        onClose={() => setResumeModal({ isOpen: false })}
      />
    </div>
  );
}

export default App;
