export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string;
}

export interface Evaluation {
  id: string;
  name: string;
  createdAt: number;
  questions: Question[];
}

export function parseAiken(text: string): Question[] {
  const lines = text.split(/\r?\n/);
  const questions: Question[] = [];
  
  let currentQuestionText = '';
  let currentOptions: Option[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const answerMatch = line.match(/^ANSWER:\s*([A-Z])/i);
    const optionMatch = line.match(/^([A-Z])[.)]\s+(.*)/i);
    
    if (answerMatch) {
      if (!currentQuestionText) {
        throw new Error(`Línea ${i + 1}: Se encontró 'ANSWER' sin una pregunta previa.`);
      }
      if (currentOptions.length < 2) {
        throw new Error(`Línea ${i + 1}: La pregunta debe tener al menos 2 opciones.`);
      }
      const answerId = answerMatch[1].toUpperCase();
      if (!currentOptions.some(o => o.id === answerId)) {
        throw new Error(`Línea ${i + 1}: La respuesta correcta '${answerId}' no existe en las opciones.`);
      }

      questions.push({
        id: crypto.randomUUID(),
        text: currentQuestionText.trim(),
        options: currentOptions,
        correctOptionId: answerId
      });
      currentQuestionText = '';
      currentOptions = [];
      continue;
    }
    
    if (optionMatch) {
      if (!currentQuestionText) {
        throw new Error(`Línea ${i + 1}: Se encontró una opción antes del enunciado de la pregunta.`);
      }
      currentOptions.push({
        id: optionMatch[1].toUpperCase(),
        text: optionMatch[2].trim()
      });
      continue;
    }
    
    // Si ya empezamos a leer opciones, encontrar texto que no es opción ni ANSWER es un error
    if (currentOptions.length > 0) {
      throw new Error(`Línea ${i + 1}: Formato inválido. Se esperaba otra opción o la línea de 'ANSWER:'.`);
    }

    currentQuestionText += (currentQuestionText ? '\n' : '') + line;
  }
  
  if (currentQuestionText) {
    throw new Error(`Fin del archivo: La última pregunta está incompleta (falta 'ANSWER:' u opciones).`);
  }

  if (questions.length === 0) {
    throw new Error("El archivo no contiene preguntas válidas.");
  }

  return questions;
}
