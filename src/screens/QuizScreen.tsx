import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, X, RotateCcw, Home, LayoutGrid, X as CloseIcon } from 'lucide-react';
import { useQuizStore } from '../store/useQuizStore';
import type { Question } from '../utils/aikenParser';
import { Modal } from '../components/Modal';

interface QuizScreenProps {
  evaluationId: string;
  randomize: boolean;
  isResuming: boolean;
  isReviewMode: boolean;
  onComplete: (correct: number, total: number, incorrectQuestions: Question[]) => void;
  onCancel: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function QuizScreen({ evaluationId, randomize, isResuming, isReviewMode, onComplete, onCancel }: QuizScreenProps) {
  const evaluations = useQuizStore((state) => state.evaluations);
  const evaluation = evaluations.find(e => e.id === evaluationId);
  const attempts = useQuizStore(state => state.attempts);
  const saveAttempt = useQuizStore(state => state.saveAttempt);
  const resetAttempt = useQuizStore(state => state.resetAttempt);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    
    if (isResuming && attempts[evaluationId]) {
      const attempt = attempts[evaluationId];
      setQuestions(attempt.questions);
      setAnswers(attempt.answers);
      setCurrentIndex(isReviewMode ? 0 : attempt.currentIndex);
    } else if (evaluation) {
      // Start fresh
      let qs = evaluation.questions.map(q => ({
        ...q,
        options: randomize ? shuffleArray(q.options) : q.options
      }));
      if (randomize) qs = shuffleArray(qs);
      
      setQuestions(qs);
      setAnswers({});
      setCurrentIndex(0);
      
      saveAttempt(evaluationId, {
        questions: qs,
        answers: {},
        currentIndex: 0
      });
    }
    initialized.current = true;
  }, [evaluation, evaluationId, isResuming, isReviewMode, attempts, randomize, saveAttempt]);

  const updateAttempt = (newAnswers: Record<string, string>, newIdx: number) => {
    if (isReviewMode) return;
    saveAttempt(evaluationId, {
      questions,
      answers: newAnswers,
      currentIndex: newIdx,
      isCompleted: attempts[evaluationId]?.isCompleted,
      correctCount: attempts[evaluationId]?.correctCount,
      totalCount: attempts[evaluationId]?.totalCount
    });
  };

  if (!evaluation || questions.length === 0) {
    return (
      <div className="container animate-fade-in">
        <p>Cargando cuestionario...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedOptionId = answers[currentQuestion.id];
  // In review mode, it's considered answered if they made a choice, but we still reveal correct regardless
  const isAnswered = isReviewMode || !!selectedOptionId;

  const handleOptionSelect = (optionId: string) => {
    if (isReviewMode || !!selectedOptionId) return;
    const newAnswers = { ...answers, [currentQuestion.id]: optionId };
    setAnswers(newAnswers);
    updateAttempt(newAnswers, currentIndex);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const newIdx = currentIndex + 1;
      setCurrentIndex(newIdx);
      updateAttempt(answers, newIdx);
    }
  };
  
  const handleJump = (idx: number) => {
    setCurrentIndex(idx);
    updateAttempt(answers, idx);
    // On mobile, close sidebar after jumping
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const finishQuiz = () => {
    let correctCount = 0;
    const incorrectQs: Question[] = [];
    
    questions.forEach(q => {
      const selected = answers[q.id];
      if (selected === q.correctOptionId) {
        correctCount++;
      } else {
        incorrectQs.push(q);
      }
    });
    
    onComplete(correctCount, questions.length, incorrectQs);
  };

  const handleFinishAttempt = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      setModalOpen(true);
    } else {
      finishQuiz();
    }
  };

  const confirmReset = () => {
    resetAttempt(evaluationId);
    setAnswers({});
    setCurrentIndex(0);
    saveAttempt(evaluationId, {
      questions,
      answers: {},
      currentIndex: 0
    });
    setResetModalOpen(false);
  };

  let currentCorrectCount = 0;
  let currentIncorrectCount = 0;
  
  questions.forEach(q => {
    const userAns = answers[q.id];
    if (userAns || isReviewMode) {
      // In review mode, if they didn't answer it's wrong, but if they answered, we check if it's correct.
      // Actually in review mode they can't answer new questions.
      // If we just count what's in answers:
      if (userAns === q.correctOptionId) {
        currentCorrectCount++;
      } else if (userAns) {
        currentIncorrectCount++;
      }
    }
  });

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;

  return (
    <div className="container">
      <div className="quiz-layout">
        
        <div className="quiz-main animate-fade-in">
        <div className="quiz-header">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn-secondary" onClick={onCancel}>Volver</button>
            {!isReviewMode && (
              <button className="btn-secondary" onClick={() => setResetModalOpen(true)} title="Reiniciar Cuestionario" style={{ padding: '0.75rem' }}>
                <RotateCcw size={18} />
              </button>
            )}
            {isReviewMode && (
              <span style={{ marginLeft: '1rem', background: 'rgba(139, 92, 246, 0.2)', color: '#d8b4fe', padding: '0.2rem 0.8rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Modo Revisión
              </span>
            )}
          </div>
          <div className="progress-text" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
            <span>Pregunta {currentIndex + 1} de {questions.length}</span>
            <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              <LayoutGrid size={20} />
            </button>
          </div>
        </div>

        <div className="card question-card glass-panel">
          <h2 className="question-text">{currentQuestion.text}</h2>

          <div className="options-list">
            {currentQuestion.options.map((opt) => {
              let btnClass = "option-btn";
              
              if (isAnswered) {
                if (opt.id === currentQuestion.correctOptionId) {
                  btnClass += " correct";
                } else if (opt.id === selectedOptionId) {
                  btnClass += " incorrect";
                }
              }

              return (
                <button
                  key={opt.id}
                  className={btnClass}
                  disabled={isAnswered}
                  onClick={() => handleOptionSelect(opt.id)}
                  style={isReviewMode && opt.id !== currentQuestion.correctOptionId && opt.id !== selectedOptionId ? { opacity: 0.4 } : {}}
                >
                  <div className="option-icon">
                    {isAnswered && opt.id === currentQuestion.correctOptionId ? <Check size={14} /> :
                     isAnswered && opt.id === selectedOptionId ? <X size={14} /> : 
                     opt.id}
                  </div>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="quiz-footer">
          {currentIndex < questions.length - 1 && (
            <button className="btn-primary animate-fade-in" onClick={handleNext}>
              Siguiente Pregunta
              <ArrowRight size={18} />
            </button>
          )}
          
          {currentIndex === questions.length - 1 && !isReviewMode && (
            <button className="btn-primary animate-fade-in" style={{marginLeft: '1rem'}} onClick={handleFinishAttempt}>
              Ver Resultados
              <ArrowRight size={18} />
            </button>
          )}

          {currentIndex === questions.length - 1 && isReviewMode && (
            <button className="btn-primary animate-fade-in" style={{marginLeft: '1rem'}} onClick={onCancel}>
              Salir de Revisión
              <Home size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      
      <div className="quiz-sidebar-wrapper">
        <div className={`quiz-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Navegación</h3>
            <button className="icon-btn menu-toggle-btn" style={{ marginLeft: 0, marginTop: 0 }} onClick={() => setIsSidebarOpen(false)}>
              <CloseIcon size={20} />
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{currentCorrectCount}</div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Correctas</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{currentIncorrectCount}</div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Incorrectas</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-color)', color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{totalCount - answeredCount}</div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Faltan</div>
            </div>
          </div>
          
          <div className="question-grid" style={{ marginTop: 0, overflowY: 'auto', alignContent: 'start', flex: 1 }}>
            {questions.map((q, idx) => {
              let statusClass = "";
              const userAns = answers[q.id];
              
              if (userAns || isReviewMode) {
                statusClass = userAns === q.correctOptionId ? "correct" : "incorrect";
              }
              
              return (
                <div 
                  key={q.id} 
                  className={`grid-item ${currentIndex === idx ? 'active' : ''} ${statusClass}`}
                  onClick={() => handleJump(idx)}
                  title={userAns ? (statusClass === 'correct' ? 'Correcto' : 'Incorrecto') : 'Sin responder'}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>

      <Modal 
        isOpen={modalOpen}
        title="Terminar Cuestionario"
        message={`Has respondido ${Object.keys(answers).length} de ${questions.length} preguntas. ¿Seguro que deseas terminar ahora? Las preguntas sin responder se contarán como incorrectas.`}
        confirmText="Sí, ver resultados"
        cancelText="Continuar cuestionario"
        onConfirm={() => {
          setModalOpen(false);
          finishQuiz();
        }}
        onClose={() => setModalOpen(false)}
      />

      <Modal 
        isOpen={resetModalOpen}
        title="Reiniciar Cuestionario"
        message="¿Estás seguro de que deseas eliminar todas tus respuestas actuales y volver a empezar?"
        confirmText="Sí, reiniciar"
        cancelText="Cancelar"
        onConfirm={confirmReset}
        onClose={() => setResetModalOpen(false)}
      />
    </div>
  );
}
