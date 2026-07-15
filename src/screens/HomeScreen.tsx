import React, { useRef, useState, useMemo } from 'react';
import { Upload, Play, Trash2, Activity, CheckCircle, Target, FileText } from 'lucide-react';
import { useQuizStore } from '../store/useQuizStore';
import { parseAiken } from '../utils/aikenParser';
import { Modal } from '../components/Modal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HomeScreenProps {
  onStartQuiz: (evaluationId: string) => void;
  onRestartQuiz: (evaluationId: string) => void;
}

export function HomeScreen({ onStartQuiz, onRestartQuiz }: HomeScreenProps) {
  const { evaluations, addEvaluation, removeEvaluation, attempts } = useQuizStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [modal, setModal] = useState<{isOpen: boolean, title: string, message: string, isAlert: boolean, onConfirm?: () => void}>({
    isOpen: false, title: '', message: '', isAlert: true
  });
  
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setModal({
        isOpen: true,
        title: 'Archivo inválido',
        message: 'Por favor, asegúrate de subir un archivo con extensión .txt',
        isAlert: true
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      try {
        const questions = parseAiken(text);
        addEvaluation({
          id: crypto.randomUUID(),
          name: file.name.replace('.txt', ''),
          createdAt: Date.now(),
          questions
        });
      } catch (err: any) {
        setModal({
          isOpen: true,
          title: 'Error de validación Aiken',
          message: err.message || 'Error desconocido al procesar el archivo.',
          isAlert: true
        });
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  React.useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        setIsDragging(true);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
    };
  }, []);

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModal({
      isOpen: true,
      title: 'Eliminar Evaluación',
      message: '¿Estás seguro de que deseas eliminar este cuestionario? Esta acción no se puede deshacer.',
      isAlert: false,
      onConfirm: () => {
        removeEvaluation(id);
        setModal(m => ({ ...m, isOpen: false }));
      }
    });
  };

  const kpis = useMemo(() => {
    const completed = Object.values(attempts).filter(a => a.isCompleted);
    const totalCompleted = completed.length;
    let totalQs = 0;
    let correctQs = 0;

    const chartData = completed.map(a => {
      const evalName = evaluations.find(e => e.id === Object.keys(attempts).find(k => attempts[k] === a))?.name || 'Evaluación';
      totalQs += (a.totalCount || 0);
      correctQs += (a.correctCount || 0);
      return {
        name: evalName.substring(0, 15) + (evalName.length > 15 ? '...' : ''),
        score: Math.round(((a.correctCount || 0) / (a.totalCount || 1)) * 100)
      };
    }).slice(-5);

    const avgScore = totalQs > 0 ? Math.round((correctQs / totalQs) * 100) : 0;

    return { totalCompleted, avgScore, totalQs, chartData };
  }, [attempts, evaluations]);

  return (
    <>
      <div className="container animate-fade-in">
        <div className="home-header">
        <div className="home-header-title">
          <h1 style={{ background: 'linear-gradient(to right, var(--primary-color), #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '1.1rem' }}>Visualiza tu progreso y gestiona tus cuestionarios</p>
        </div>
        
        <input 
          type="file" 
          accept=".txt" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <button className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)' }} onClick={() => fileInputRef.current?.click()}>
          <Upload size={20} />
          Importar Aiken (.txt)
        </button>
      </div>

      {kpis.totalCompleted > 0 && (
        <div className="dashboard-kpis">
          <div className="kpi-card glass-panel">
            <div className="kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-color)' }}>
              <Target size={24} />
            </div>
            <div className="kpi-content">
              <span className="kpi-value">{kpis.totalCompleted}</span>
              <span className="kpi-label">Cuestionarios Terminados</span>
            </div>
          </div>
          <div className="kpi-card glass-panel">
            <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)' }}>
              <CheckCircle size={24} />
            </div>
            <div className="kpi-content">
              <span className="kpi-value">{kpis.avgScore}%</span>
              <span className="kpi-label">Precisión Media</span>
            </div>
          </div>
          <div className="kpi-card glass-panel">
            <div className="kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              <Activity size={24} />
            </div>
            <div className="kpi-content">
              <span className="kpi-value">{kpis.totalQs}</span>
              <span className="kpi-label">Preguntas Respondidas</span>
            </div>
          </div>
        </div>
      )}

      {evaluations.length === 0 ? (
        <div 
          className="empty-state card glass-panel" 
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: 'pointer', border: '2px dashed rgba(255,255,255,0.1)' }}
        >
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <Upload size={40} color="var(--primary-color)" />
          </div>
          <h2 style={{ marginBottom: '1rem' }}>Comienza tu estudio</h2>
          <p>Arrastra tu archivo .txt aquí o haz clic para seleccionarlo.</p>
          <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            <FileText size={18} />
            Seleccionar archivo .txt
          </button>
        </div>
      ) : (
        <div className="dashboard-layout" style={{ minWidth: 0 }}>
          {kpis.chartData.length > 0 && (
            <div style={{ minWidth: 0 }}>
              <div className="dashboard-charts glass-panel" style={{ height: '100%', marginBottom: 0, minWidth: 0 }}>
                <h3 className="section-title">Últimas Puntuaciones (%)</h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={kpis.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                        {kpis.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.score >= 70 ? 'var(--success-color)' : 'var(--error-color)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <div style={kpis.chartData.length === 0 ? { gridColumn: '1 / -1', minWidth: 0 } : { minWidth: 0 }}>
            <h3 className="section-title">Tus Evaluaciones</h3>
            <div className="eval-list" style={{ marginTop: '0' }}>
              {evaluations.map(evalItem => {
                const attempt = attempts[evalItem.id];
                const isCompleted = attempt?.isCompleted;
                
                return (
                  <div key={evalItem.id} className="card eval-card glass-panel" onClick={() => onStartQuiz(evalItem.id)}>
                    <div className="eval-info">
                      <h3>{evalItem.name}</h3>
                      <p style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>{evalItem.questions.length} preguntas</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>•</span>
                        <span>{new Date(evalItem.createdAt).toLocaleDateString()}</span>
                        {isCompleted && (
                          <>
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>•</span>
                            <span style={{ 
                              color: (attempt.correctCount || 0) >= Math.round(evalItem.questions.length * 0.7) ? 'var(--success-color)' : 'var(--error-color)',
                              fontWeight: 'bold',
                              background: 'rgba(255,255,255,0.05)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px'
                            }}>
                              Última nota: {attempt.correctCount}/{attempt.totalCount || evalItem.questions.length}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    
                    <div className="eval-actions">
                      <button 
                        className="icon-btn" 
                        title="Eliminar"
                        onClick={(e) => confirmDelete(evalItem.id, e)}
                      >
                        <Trash2 size={20} />
                      </button>
                      <button 
                        className="icon-btn" 
                        title={isCompleted ? "Jugar de nuevo" : "Jugar"} 
                        style={{ color: 'var(--primary-color)', background: 'rgba(99, 102, 241, 0.1)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestartQuiz(evalItem.id);
                        }}
                      >
                        <Play size={20} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        isAlert={modal.isAlert}
        onConfirm={modal.onConfirm}
        confirmText={modal.isAlert ? "Aceptar" : "Sí, eliminar"}
        cancelText="Cancelar"
        onClose={() => setModal(m => ({ ...m, isOpen: false }))}
      />
    </div>

    {isDragging && (
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            processFile(file);
          }
        }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.9)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          border: '4px dashed var(--primary-color)'
        }}
      >
        <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FileText size={80} color="var(--primary-color)" />
          <h2 style={{marginTop: '1.5rem', color: 'white', fontSize: '2rem'}}>Suelta tu archivo .txt aquí</h2>
        </div>
      </div>
    )}
    </>
  );
}
