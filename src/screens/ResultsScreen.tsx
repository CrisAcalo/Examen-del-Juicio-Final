import { useState } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { useQuizStore } from '../store/useQuizStore';
import type { Question } from '../utils/aikenParser';
import { Modal } from '../components/Modal';

interface ResultsScreenProps {
  originalEvaluationId: string;
  correctCount: number;
  totalCount: number;
  incorrectQuestions: Question[];
  onGoHome: () => void;
}

export function ResultsScreen({ originalEvaluationId, correctCount, totalCount, incorrectQuestions, onGoHome }: ResultsScreenProps) {
  const { evaluations, addEvaluation } = useQuizStore();
  const [selectedExtraEvalId, setSelectedExtraEvalId] = useState<string>('');
  const [created, setCreated] = useState(false);
  const [modal, setModal] = useState<{isOpen: boolean, message: string}>({ isOpen: false, message: '' });

  const percentage = Math.round((correctCount / totalCount) * 100);
  const isSuccess = percentage >= 70;

  const handleCreateReview = () => {
    const originalEval = evaluations.find(e => e.id === originalEvaluationId);
    let questionsToInclude = [...incorrectQuestions];

    if (selectedExtraEvalId) {
      const extraEval = evaluations.find(e => e.id === selectedExtraEvalId);
      if (extraEval) {
        const existingIds = new Set(questionsToInclude.map(q => q.id));
        const extraQs = extraEval.questions.filter(q => !existingIds.has(q.id));
        questionsToInclude = [...questionsToInclude, ...extraQs];
      }
    }

    const newEval = {
      id: crypto.randomUUID(),
      name: `Repaso: ${originalEval?.name || 'Evaluación'}`,
      createdAt: Date.now(),
      questions: questionsToInclude
    };

    addEvaluation(newEval);
    setCreated(true);
    setModal({
      isOpen: true,
      message: `Se ha creado la evaluación de repaso con ${questionsToInclude.length} preguntas.`
    });
  };

  return (
    <div className="container animate-fade-in">
      <div className="card results-card glass-panel">
        <h1 style={{ marginBottom: '2rem' }}>¡Cuestionario Completado!</h1>
        
        <div className="score-circle" style={{ borderColor: isSuccess ? 'var(--success-color)' : 'var(--primary-color)', color: isSuccess ? 'var(--success-color)' : 'var(--primary-color)' }}>
          {percentage}%
        </div>

        <div className="results-stats">
          <div className="stat-item">
            <span className="stat-value success">{correctCount}</span>
            <span className="stat-label">Correctas</span>
          </div>
          <div className="stat-item">
            <span className="stat-value error">{totalCount - correctCount}</span>
            <span className="stat-label">Incorrectas</span>
          </div>
        </div>

        <div className="results-actions">
          {incorrectQuestions.length > 0 && !created && (
            <div style={{ background: 'var(--surface-color-hover)', padding: '1rem', borderRadius: 'var(--radius)', width: '100%', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Crear Cuestionario de Repaso</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Incluirá las {incorrectQuestions.length} preguntas falladas.
              </p>
              
              <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Añadir preguntas de (Opcional):</label>
                <select 
                  value={selectedExtraEvalId}
                  onChange={(e) => setSelectedExtraEvalId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-color)', color: 'white', border: '1px solid var(--border-color)' }}
                >
                  <option value="">-- No añadir extras --</option>
                  {evaluations.filter(e => e.id !== originalEvaluationId).map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.questions.length})</option>
                  ))}
                </select>
              </div>

              <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreateReview}>
                <RefreshCw size={18} />
                Generar Repaso
              </button>
            </div>
          )}

          <button className="btn-secondary" onClick={onGoHome}>
            <Home size={18} />
            Volver al Inicio
          </button>
        </div>
      </div>
      
      <Modal 
        isOpen={modal.isOpen}
        title="Éxito"
        message={modal.message}
        isAlert={true}
        onClose={() => setModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}
