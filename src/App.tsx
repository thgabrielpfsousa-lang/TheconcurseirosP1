import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Trophy, 
  BookOpen,
  AlertCircle,
  Loader2,
  History,
  PlayCircle,
  ArrowLeft,
  XCircle,
  X,
  Maximize2,
  FileText
} from 'lucide-react';
import { Question, Option, View, Cargo } from './types';
import { getQuizQuestions } from './services/geminiService';
import { cargos } from './data/questions';
import { cn } from './lib/utils';

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('cargo_selection');
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
  
  // Quiz State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, Option>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Persistent State
  const [wrongQuestionIds, setWrongQuestionIds] = useState<number[]>([]);
  const [correctQuestionIds, setCorrectQuestionIds] = useState<number[]>([]);
  const [completedExams, setCompletedExams] = useState<number[]>([]);

  // Review State
  const [reviewIndex, setReviewIndex] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [currentTextToRead, setCurrentTextToRead] = useState<{id: string, title: string, content: string} | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      const allQuestions = await getQuizQuestions();
      setQuestions(allQuestions);
      
      // Load cargo from local storage if exists
      const storedCargoId = localStorage.getItem('selected_cargo_id');
      if (storedCargoId) {
        setSelectedCargoId(storedCargoId);
        setView('home');
        loadPersistentState(storedCargoId);
      }
      
      setLoading(false);
    }
    loadQuiz();
  }, []);

  const loadPersistentState = (cargoId: string) => {
    const storedWrongs = localStorage.getItem(`wrong_questions_${cargoId}`);
    const storedCorrects = localStorage.getItem(`correct_questions_${cargoId}`);
    const storedExams = localStorage.getItem(`completed_exams_${cargoId}`);
    
    setWrongQuestionIds(storedWrongs ? JSON.parse(storedWrongs) : []);
    setCorrectQuestionIds(storedCorrects ? JSON.parse(storedCorrects) : []);
    setCompletedExams(storedExams ? JSON.parse(storedExams) : []);
  };

  // Save state whenever it changes
  useEffect(() => {
    if (selectedCargoId) {
      localStorage.setItem(`wrong_questions_${selectedCargoId}`, JSON.stringify(wrongQuestionIds));
      localStorage.setItem(`correct_questions_${selectedCargoId}`, JSON.stringify(correctQuestionIds));
      localStorage.setItem(`completed_exams_${selectedCargoId}`, JSON.stringify(completedExams));
      localStorage.setItem('selected_cargo_id', selectedCargoId);
    }
  }, [wrongQuestionIds, correctQuestionIds, completedExams, selectedCargoId]);

  const filteredQuestions = questions.filter(q => q.cargoId === selectedCargoId);
  const subjectQuestions = selectedSubject 
    ? filteredQuestions.filter(q => q.subject === selectedSubject)
    : filteredQuestions;
  
  const examQuestions = selectedExamId 
    ? filteredQuestions.filter(q => q.examId === selectedExamId)
    : [];

  const quizQuestions = view === 'subject_quiz' 
    ? subjectQuestions 
    : view === 'quiz' && selectedExamId 
      ? examQuestions 
      : filteredQuestions;

  const selectedCargo = cargos.find(c => c.id === selectedCargoId);

  const subjects = [...new Set(filteredQuestions.map(q => q.subject))];

  const handleAnswer = (option: Option) => {
    const currentQuestion = view === 'review' 
      ? filteredQuestions.find(q => q.id === wrongQuestionIds[reviewIndex])!
      : quizQuestions[currentIndex];

    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));

    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    
    if (view === 'review') {
      if (reviewIndex < wrongQuestionIds.length - 1) {
        setReviewIndex(prev => prev + 1);
      } else {
        finishReview();
      }
    } else {
      if (currentIndex < quizQuestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        finishQuiz();
      }
    }
  };

  const handlePrevious = () => {
    setShowExplanation(false);
    if (view === 'review') {
      setReviewIndex(prev => Math.max(0, prev - 1));
    } else {
      setCurrentIndex(prev => Math.max(0, prev - 1));
    }
  };

  const finishQuiz = () => {
    const currentResults = quizQuestions.map(q => ({
      id: q.id,
      isCorrect: userAnswers[q.id] === q.correctAnswer
    }));

    const newWrongs = [...new Set([...wrongQuestionIds, ...currentResults.filter(r => !r.isCorrect).map(r => r.id)])];
    const newCorrects = [...new Set([...correctQuestionIds, ...currentResults.filter(r => r.isCorrect).map(r => r.id)])];
    
    // Remove from wrongs if now correct
    const filteredWrongs = newWrongs.filter(id => !newCorrects.includes(id));

    setWrongQuestionIds(filteredWrongs);
    setCorrectQuestionIds(newCorrects);
    
    if (selectedExamId) {
      setCompletedExams(prev => [...new Set([...prev, selectedExamId])]);
    }
    
    setIsFinished(true);
  };

  const finishReview = () => {
    const reviewedQuestions = wrongQuestionIds.map(id => filteredQuestions.find(q => q.id === id)!);
    const results = reviewedQuestions.map(q => ({
      id: q.id,
      isCorrect: userAnswers[q.id] === q.correctAnswer
    }));

    const newlyCorrect = results.filter(r => r.isCorrect).map(r => r.id);
    const stillWrong = results.filter(r => !r.isCorrect).map(r => r.id);

    const updatedCorrects = [...new Set([...correctQuestionIds, ...newlyCorrect])];
    const updatedWrongs = [...new Set([...stillWrong])];

    setCorrectQuestionIds(updatedCorrects);
    setWrongQuestionIds(updatedWrongs);
    setIsFinished(true);
  };

  const startQuiz = () => {
    setView('exam_list');
    setSelectedSubject(null);
    setSelectedExamId(null);
    setCurrentIndex(0);
    setUserAnswers({});
    setIsFinished(false);
    setShowExplanation(false);
  };

  const startExamQuiz = (examId: number) => {
    setSelectedExamId(examId);
    setView('quiz');
    setCurrentIndex(0);
    setUserAnswers({});
    setIsFinished(false);
    setShowExplanation(false);
  };

  const startSubjectQuiz = (subject: string) => {
    setSelectedSubject(subject);
    setView('subject_quiz');
    setCurrentIndex(0);
    setUserAnswers({});
    setIsFinished(false);
    setShowExplanation(false);
  };

  const startReview = () => {
    if (wrongQuestionIds.length === 0) return;
    setView('review');
    setReviewIndex(0);
    setUserAnswers({});
    setIsFinished(false);
    setShowExplanation(false);
  };

  const selectCargo = (cargoId: string) => {
    setSelectedCargoId(cargoId);
    loadPersistentState(cargoId);
    setView('home');
  };

  const resetToHome = () => {
    setView('home');
    setSelectedSubject(null);
    setSelectedExamId(null);
    setIsFinished(false);
    setUserAnswers({});
    setShowExplanation(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Carregando Simulado...</h2>
      </div>
    );
  }

  // --- CARGO SELECTION VIEW ---
  if (view === 'cargo_selection' || !selectedCargoId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full space-y-8"
        >
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/20"
            >
              <Trophy className="w-12 h-12" />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Portal do Candidato</h1>
              <p className="text-slate-500 text-lg">Selecione sua trilha de estudos para começar</p>
            </div>
          </div>

          <div className="grid gap-4">
            {cargos.map((cargo, idx) => (
              <motion.button 
                key={cargo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => selectCargo(cargo.id)}
                className="group relative bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left flex items-center gap-6 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors" />
                
                <div className="relative w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <BookOpen className="w-8 h-8" />
                </div>
                
                <div className="relative flex-1">
                  <h3 className="font-display font-bold text-slate-900 text-xl group-hover:text-blue-600 transition-colors">{cargo.name}</h3>
                  <p className="text-slate-500 font-medium">Prepare-se com simulados oficiais</p>
                </div>
                
                <div className="relative w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
          
          <p className="text-center text-slate-400 text-sm font-medium">
            © 2026 Simulado Premium • Todos os direitos reservados
          </p>
        </motion.div>
      </div>
    );
  }

  // --- HOME VIEW ---
  if (view === 'home') {
    const exams = [...new Set(filteredQuestions.map(q => q.examId))].sort((a, b) => a - b);
    const nextExamId = completedExams.length < exams.length 
      ? exams.find(id => !completedExams.includes(id)) || exams[0]
      : exams[0];
    
    const totalQuestions = filteredQuestions.length;
    const answeredCount = correctQuestionIds.length + wrongQuestionIds.length;
    const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8 md:space-y-10">
          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 tracking-tight">
                  {selectedCargo?.name}
                </h1>
              </div>
              <button 
                onClick={() => setView('cargo_selection')}
                className="text-blue-600 text-xs md:text-sm font-bold hover:text-blue-700 flex items-center gap-1 transition-colors ml-13 md:ml-15"
              >
                Alterar Cargo <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex items-center justify-around md:justify-center gap-4 md:gap-8">
              <div className="text-center">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Acertos</p>
                <p className="text-xl md:text-2xl font-display font-bold text-green-600">{correctQuestionIds.length}</p>
              </div>
              <div className="w-px h-6 md:h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Erros</p>
                <p className="text-xl md:text-2xl font-display font-bold text-red-600">{wrongQuestionIds.length}</p>
              </div>
              <div className="w-px h-6 md:h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Progresso</p>
                <p className="text-xl md:text-2xl font-display font-bold text-blue-600">{Math.round(progressPercent)}%</p>
              </div>
            </div>
          </header>

          {/* Main Actions Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Start Quiz */}
            <motion.button 
              whileHover={{ y: -5 }}
              onClick={startQuiz}
              className="group relative bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-blue-500/20 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 md:w-40 md:h-40 bg-white/10 rounded-full -mr-16 -mt-16 md:-mr-20 md:-mt-20 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6 backdrop-blur-sm">
                <PlayCircle className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <div className="relative space-y-1">
                <h3 className="text-xl md:text-2xl font-display font-bold text-white">Iniciar Provas</h3>
                <p className="text-blue-100 font-medium text-sm md:text-base">Próxima: Prova {nextExamId}</p>
              </div>
              <div className="relative mt-6 md:mt-8 flex items-center gap-2 text-white/80 font-bold text-xs md:text-sm group-hover:text-white transition-colors">
                Começar agora <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>

            {/* Review */}
            <motion.button 
              whileHover={{ y: -5 }}
              onClick={() => setView('review_list')}
              disabled={wrongQuestionIds.length === 0}
              className={cn(
                "group relative bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 text-left overflow-hidden transition-all",
                wrongQuestionIds.length === 0 ? "opacity-60 grayscale cursor-not-allowed" : "hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5"
              )}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-50 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600 mb-4 md:mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                <RotateCcw className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900">Refazer Erros</h3>
                <p className="text-slate-500 font-medium text-sm md:text-base">{wrongQuestionIds.length} questões pendentes</p>
              </div>
              <div className="mt-6 md:mt-8 flex items-center gap-2 text-amber-600 font-bold text-xs md:text-sm">
                Revisar agora <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>

            {/* History */}
            <motion.button 
              whileHover={{ y: -5 }}
              onClick={() => setView('history')}
              disabled={correctQuestionIds.length === 0}
              className={cn(
                "group relative bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 text-left overflow-hidden transition-all",
                correctQuestionIds.length === 0 ? "opacity-60 grayscale cursor-not-allowed" : "hover:border-green-500 hover:shadow-xl hover:shadow-green-500/5"
              )}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 bg-green-50 rounded-xl md:rounded-2xl flex items-center justify-center text-green-600 mb-4 md:mb-6 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                <History className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900">Histórico</h3>
                <p className="text-slate-500 font-medium text-sm md:text-base">{correctQuestionIds.length} acertos registrados</p>
              </div>
              <div className="mt-6 md:mt-8 flex items-center gap-2 text-green-600 font-bold text-xs md:text-sm">
                Ver gabaritos <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>
          </section>

          {/* Subjects Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-base md:text-lg font-display font-bold text-slate-900 flex items-center gap-2">
                <div className="w-1.5 md:w-2 h-5 md:h-6 bg-blue-600 rounded-full" />
                Estudar por Matéria
              </h3>
              <span className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-wider">{subjects.length} matérias</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subject, idx) => {
                const subjectCount = filteredQuestions.filter(q => q.subject === subject).length;
                return (
                  <motion.button
                    key={subject}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => startSubjectQuiz(subject)}
                    className="flex items-center justify-between p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-slate-100 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all group"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                        <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="text-left">
                        <span className="block font-display font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm md:text-base">
                          {subject}
                        </span>
                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {subjectCount} Questões
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
          
          <footer className="pt-8 md:pt-12 pb-6 text-center border-t border-slate-100">
            <p className="text-slate-400 text-[10px] md:text-sm font-medium flex items-center justify-center gap-2">
              <Trophy className="w-3 h-3 md:w-4 md:h-4" /> Simulado Premium • {selectedCargo?.name}
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // --- REVIEW LIST VIEW ---
  if (view === 'review_list') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-12 font-sans">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <button 
                onClick={resetToHome}
                className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-2 font-bold transition-all text-xs md:text-sm uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Painel
              </button>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600">
                  <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                Questões para Refazer
              </h1>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startReview}
              className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white px-6 md:px-8 py-4 rounded-xl md:rounded-2xl font-bold transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3"
            >
              <PlayCircle className="w-5 h-5 md:w-6 md:h-6" />
              Refazer Todas Agora
            </motion.button>
          </header>

          <div className="grid gap-4 md:gap-6">
            {wrongQuestionIds.map((id, idx) => {
              const q = filteredQuestions.find(item => item.id === id);
              if (!q) return null;
              return (
                <motion.div 
                  key={id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:border-amber-200 transition-colors"
                >
                  <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
                  <div className="flex justify-between items-start mb-4 md:mb-6">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="text-[10px] md:text-xs font-bold text-amber-600 bg-amber-50 px-2 md:px-3 py-1 md:py-1.5 rounded-full uppercase tracking-widest">Questão {q.id}</span>
                      <span className="text-[10px] md:text-xs font-bold text-slate-400 bg-slate-50 px-2 md:px-3 py-1 md:py-1.5 rounded-full uppercase tracking-widest">{q.subject}</span>
                    </div>
                  </div>
                  <p className="text-slate-800 font-medium text-lg md:text-xl leading-relaxed">{q.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- EXAM LIST VIEW ---
  if (view === 'exam_list') {
    const exams = [...new Set(filteredQuestions.map(q => q.examId))].sort((a, b) => a - b);
    const nextExamId = completedExams.length < exams.length 
      ? exams.find(id => !completedExams.includes(id)) || exams[0]
      : exams[0];

    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-12 font-sans">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <button 
                onClick={resetToHome}
                className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-2 font-bold transition-all text-xs md:text-sm uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Painel
              </button>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight">
                Escolha sua Prova
              </h1>
              <p className="text-slate-500 font-medium text-sm md:text-base">Selecione uma prova para iniciar ou continue de onde parou.</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startExamQuiz(nextExamId)}
              className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-4 md:py-4 rounded-xl md:rounded-2xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all"
            >
              <PlayCircle className="w-5 h-5 md:w-6 md:h-6" />
              Continuar: Prova {nextExamId}
            </motion.button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {exams.map((examId, idx) => {
              const isCompleted = completedExams.includes(examId);
              const examQCount = filteredQuestions.filter(q => q.examId === examId).length;
              
              return (
                <motion.button
                  key={examId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => startExamQuiz(examId)}
                  className={cn(
                    "group relative p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border transition-all text-left overflow-hidden",
                    isCompleted 
                      ? "bg-white border-green-100 hover:border-green-500" 
                      : "bg-white border-slate-100 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div className={cn(
                      "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all",
                      isCompleted ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                    )}>
                      <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    {isCompleted && (
                      <div className="bg-green-100 text-green-700 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider">
                        Concluída
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900">Prova {examId}</h3>
                    <p className="text-slate-500 font-medium text-sm md:text-base">{examQCount} Questões Oficiais</p>
                  </div>

                  <div className="mt-6 md:mt-8 flex items-center gap-2 text-blue-600 font-bold text-xs md:text-sm group-hover:translate-x-1 transition-transform">
                    {isCompleted ? "Refazer Prova" : "Iniciar Prova"} <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- HISTORY VIEW ---
  if (view === 'history') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-12 font-sans">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
          <header className="space-y-2">
            <button 
              onClick={resetToHome}
              className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-2 font-bold transition-all text-xs md:text-sm uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Painel
            </button>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-xl md:rounded-2xl flex items-center justify-center text-green-600">
                <History className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              Questões Acertadas
            </h1>
          </header>

          <div className="grid gap-4 md:gap-6">
            {correctQuestionIds.map((id, idx) => {
              const q = filteredQuestions.find(item => item.id === id);
              if (!q) return null;
              return (
                <motion.div 
                  key={id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:border-green-200 transition-colors"
                >
                  <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-green-500/20 group-hover:bg-green-500 transition-colors" />
                  <div className="flex justify-between items-start mb-4 md:mb-6">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="text-[10px] md:text-xs font-bold text-blue-600 bg-blue-50 px-2 md:px-3 py-1 md:py-1.5 rounded-full uppercase tracking-widest">Questão {q.id}</span>
                      <span className="text-[10px] md:text-xs font-bold text-green-600 bg-green-50 px-2 md:px-3 py-1 md:py-1.5 rounded-full uppercase tracking-widest">Gabarito: {q.correctAnswer}</span>
                    </div>
                  </div>
                  <p className="text-slate-800 font-medium text-lg md:text-xl leading-relaxed mb-4 md:mb-6">{q.text}</p>
                  <div className="p-4 md:p-6 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                    <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 md:mb-2">Resposta Correta</p>
                    <p className="text-slate-900 font-bold text-base md:text-lg">{q.options[q.correctAnswer]}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- RESULTS VIEW (QUIZ/REVIEW FINISHED) ---
  if (isFinished) {
    const currentQuestions = view === 'review' 
      ? filteredQuestions.filter(q => wrongQuestionIds.includes(q.id))
      : quizQuestions;
    
    const score = currentQuestions.filter(q => userAnswers[q.id] === q.correctAnswer).length;
    const total = currentQuestions.length;
    const percentage = total > 0 ? (score / total) * 100 : 0;
    const isSuccess = percentage >= 70;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-2xl shadow-slate-200/60 p-6 md:p-16 border border-slate-100 text-center space-y-6 md:space-y-10 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 md:h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />
          
          <div className="space-y-2 md:space-y-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl",
                isSuccess ? "bg-green-100 text-green-600 shadow-green-500/20" : "bg-blue-100 text-blue-600 shadow-blue-500/20"
              )}
            >
              {isSuccess ? <Trophy className="w-8 h-8 md:w-12 md:h-12" /> : <BookOpen className="w-8 h-8 md:w-12 md:h-12" />}
            </motion.div>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-slate-900 tracking-tight">
              {isSuccess ? "Excelente Desempenho!" : "Simulado Finalizado"}
            </h1>
            <p className="text-sm md:text-lg text-slate-500 font-medium">
              {isSuccess ? "Você está no caminho certo para a aprovação." : "Continue praticando para alcançar a excelência."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100">
              <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-2 text-center">Acertos</p>
              <p className="text-2xl md:text-4xl font-display font-bold text-green-600 text-center">{score}</p>
            </div>
            <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100">
              <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-2 text-center">Erros</p>
              <p className="text-2xl md:text-4xl font-display font-bold text-red-600 text-center">{total - score}</p>
            </div>
          </div>

          <div className="space-y-2 md:space-y-4">
            <div className="flex justify-between text-[9px] md:text-sm font-bold text-slate-400 uppercase tracking-widest px-2">
              <span>Aproveitamento</span>
              <span>{Math.round(percentage)}%</span>
            </div>
            <div className="h-2.5 md:h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 md:p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-all",
                  isSuccess ? "bg-green-500" : "bg-blue-600"
                )}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2 md:pt-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetToHome}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-3.5 md:py-5 rounded-xl md:rounded-[2rem] font-display font-bold text-sm md:text-lg transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 md:gap-3"
            >
              <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
              Voltar ao Painel
            </motion.button>
            {total - score > 0 && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView('review_list')}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-900 px-6 md:px-8 py-3.5 md:py-5 rounded-xl md:rounded-[2rem] font-display font-bold text-sm md:text-lg transition-all border border-slate-200 flex items-center justify-center gap-2 md:gap-3"
              >
                <RotateCcw className="w-4 h-4 md:w-6 md:h-6 text-amber-600" />
                Revisar Erros
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // --- QUIZ / REVIEW / SUBJECT QUIZ VIEW ---
  const currentQuestion = view === 'review' 
    ? filteredQuestions.find(q => q.id === wrongQuestionIds[reviewIndex])!
    : quizQuestions[currentIndex];

  const totalQuestions = view === 'review' 
    ? wrongQuestionIds.length 
    : quizQuestions.length;

  const currentNumber = view === 'review' ? reviewIndex + 1 : currentIndex + 1;
  const progress = (currentNumber / totalQuestions) * 100;

  const extractTexts = (questions: Question[]) => {
    const texts: { id: string; title: string; content: string }[] = [];
    const seenContents = new Set<string>();
    const questionToTextMap = new Map<number, string>();

    questions.forEach((q, index) => {
      let content = "";
      let title = "Texto de Apoio";

      if (q.text.includes("Enunciado:")) {
        const parts = q.text.split("Enunciado:");
        content = parts[0].trim();
      }

      if (content) {
        if (content.toLowerCase().includes("vide questão anterior") || content.toLowerCase().includes("vide poema anterior")) {
          // Inherit from previous question in the ORIGINAL questions array (filteredQuestions)
          // Find the index of q in filteredQuestions
          const qIdx = filteredQuestions.findIndex(item => item.id === q.id);
          if (qIdx > 0) {
            const prevQ = filteredQuestions[qIdx - 1];
            // Recursively find the text of the previous question
            const findPrevText = (idx: number): string => {
              if (idx < 0) return "";
              const prev = filteredQuestions[idx];
              if (prev.text.includes("Enunciado:")) {
                const p = prev.text.split("Enunciado:")[0].trim();
                if (p && !p.toLowerCase().includes("vide questão anterior") && !p.toLowerCase().includes("vide poema anterior")) {
                  return p;
                }
                return findPrevText(idx - 1);
              }
              return findPrevText(idx - 1);
            };
            content = findPrevText(qIdx - 1);
          } else {
            content = "";
          }
        }

        if (content) {
          questionToTextMap.set(q.id, content);
          
          // Try to find a better title
          const titleMatch = content.match(/^(Texto (?:de apoio|I|01|02|03|04|II|III|IV|V|VI|VII|VIII|IX|X|05|06|07|08|09|10))/i);
          if (titleMatch) title = titleMatch[1];

          if (!seenContents.has(content)) {
            seenContents.add(content);
            texts.push({
              id: `T${texts.length + 1}`,
              title: title,
              content: content
            });
          }
        }
      }
    });

    return texts;
  };

  const currentQuestionsForTexts = view === 'review'
    ? wrongQuestionIds.map(id => filteredQuestions.find(q => q.id === id)!).filter(Boolean)
    : quizQuestions;

  const examTexts = extractTexts(currentQuestionsForTexts);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Text Reader Modal */}
      <AnimatePresence>
        {showTextModal && currentTextToRead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200">
                    <FileText className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-3xl font-display font-bold text-slate-900 leading-tight">{currentTextToRead.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">Leitura de Apoio</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-[10px] md:text-xs text-indigo-600 font-bold uppercase tracking-widest">{currentTextToRead.id}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTextModal(false)}
                  className="p-2 md:p-4 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-red-500 active:scale-95"
                >
                  <X className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 md:p-20 bg-white selection:bg-indigo-100">
                <div className="max-w-3xl mx-auto">
                  <div className="prose prose-slate max-w-none">
                    <div className="text-slate-800 text-xl md:text-2xl leading-[1.8] whitespace-pre-wrap font-serif tracking-normal">
                      {currentTextToRead.content}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 md:p-10 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                <button 
                  onClick={() => setShowTextModal(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 md:px-16 py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-display font-bold text-base md:text-xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                >
                  Fechar Leitura
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 md:py-6 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={resetToHome} className="p-2 md:p-3 hover:bg-slate-50 rounded-xl md:rounded-2xl transition-colors text-slate-400 hover:text-blue-600 border border-transparent hover:border-slate-100">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div>
              <h1 className="font-display font-bold text-slate-900 text-base md:text-xl leading-tight">
                {view === 'review' ? 'Revisão de Erros' : view === 'subject_quiz' ? subjectQuestions[0]?.subject : selectedExamId ? `Prova ${selectedExamId}` : 'Simulado Oficial'}
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mt-0.5">
                Questão {currentNumber} de {totalQuestions}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progresso</p>
              <p className="text-sm font-display font-bold text-blue-600">{Math.round(progress)}%</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-display font-bold text-base md:text-lg shadow-lg shadow-blue-500/20">
              {currentNumber}
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-4 md:mt-6 h-1 md:h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={cn("h-full transition-all duration-700 ease-out", view === 'review' ? "bg-amber-500" : "bg-blue-600")}
          />
        </div>

        {/* Supporting Texts Tab */}
        {examTexts.length > 0 && (
          <div className="max-w-4xl mx-auto mt-4 md:mt-6 flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-slate-400 mr-2 shrink-0">
              <FileText className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Textos da Prova:</span>
            </div>
            <div className="flex gap-2">
              {examTexts.map((text) => (
                <button
                  key={text.id}
                  onClick={() => {
                    setCurrentTextToRead(text);
                    setShowTextModal(true);
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-100 hover:border-indigo-200 whitespace-nowrap flex items-center gap-2 shadow-sm active:scale-95"
                >
                  <div className="w-5 h-5 bg-indigo-600 text-white rounded-md flex items-center justify-center text-[8px]">
                    {text.id}
                  </div>
                  {text.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 p-4 md:p-12 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl w-full"
          >
            <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/60 p-6 md:p-14 border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-blue-50/30 rounded-full -mr-24 -mt-24 md:-mr-32 md:-mt-32 pointer-events-none" />
              
              <div className="relative mb-6 md:mb-12">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
                  <span className="px-3 md:px-4 py-1 md:py-1.5 bg-blue-50 text-blue-600 text-[8px] md:text-[10px] font-bold rounded-full uppercase tracking-[0.2em]">
                    Questão #{currentQuestion.id}
                  </span>
                  <span className="px-3 md:px-4 py-1 md:py-1.5 bg-slate-50 text-slate-400 text-[8px] md:text-[10px] font-bold rounded-full uppercase tracking-[0.2em]">
                    {currentQuestion.subject}
                  </span>
                </div>
                <h2 className="text-lg md:text-3xl font-display font-bold text-slate-900 leading-tight">
                  {currentQuestion.text}
                </h2>
              </div>

              <div className="relative grid gap-2 md:gap-4">
                {(Object.keys(currentQuestion.options) as Option[]).sort().map((key) => {
                  const isSelected = userAnswers[currentQuestion.id] === key;
                  const isCorrect = currentQuestion.correctAnswer === key;
                  const hasAnswered = !!userAnswers[currentQuestion.id];
                  
                  return (
                    <button
                      key={key}
                      disabled={hasAnswered}
                      onClick={() => handleAnswer(key)}
                      className={cn(
                        "group relative flex items-center gap-3 md:gap-6 p-4 md:p-6 rounded-xl md:rounded-[2rem] border-2 text-left transition-all duration-300 w-full",
                        !hasAnswered && "border-slate-50 hover:border-blue-200 hover:bg-blue-50/30",
                        hasAnswered && isCorrect && "border-green-500 bg-green-50/50 ring-4 md:ring-8 ring-green-500/5",
                        hasAnswered && isSelected && !isCorrect && "border-red-500 bg-red-50/50 ring-4 md:ring-8 ring-red-500/5",
                        !hasAnswered && isSelected && "border-blue-600 bg-blue-50/50 ring-4 md:ring-8 ring-blue-500/5",
                        hasAnswered && !isSelected && !isCorrect && "opacity-40 border-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 md:w-12 md:h-12 shrink-0 rounded-lg md:rounded-xl flex items-center justify-center font-display font-bold text-sm md:text-lg transition-all duration-300",
                        hasAnswered && isCorrect ? "bg-green-600 text-white scale-110" :
                        hasAnswered && isSelected && !isCorrect ? "bg-red-600 text-white scale-110" :
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                      )}>
                        {key}
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-2 md:gap-4">
                        <span className={cn(
                          "text-sm md:text-lg font-medium leading-snug",
                          hasAnswered && isCorrect ? "text-green-900" :
                          hasAnswered && isSelected && !isCorrect ? "text-red-900" :
                          isSelected ? "text-blue-900" : "text-slate-600"
                        )}>
                          {currentQuestion.options[key]}
                        </span>
                        {hasAnswered && isCorrect && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0">
                            <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7 text-green-600" />
                          </motion.div>
                        )}
                        {hasAnswered && isSelected && !isCorrect && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0">
                            <XCircle className="w-5 h-5 md:w-7 md:h-7 text-red-600" />
                          </motion.div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showExplanation && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 md:mt-12 p-4 md:p-8 bg-slate-50 rounded-xl md:rounded-[2.5rem] border border-slate-100 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 hidden md:block">
                      <AlertCircle className="w-16 h-16 md:w-24 md:h-24 text-blue-600" />
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4 text-blue-600 font-display font-bold uppercase tracking-widest text-[8px] md:text-xs">
                        <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                        Explicação Técnica
                      </div>
                      <p className="text-slate-600 leading-relaxed text-sm md:text-lg italic">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-6 md:mt-12 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 px-4">
              <button 
                onClick={handlePrevious}
                disabled={view === 'review' ? reviewIndex === 0 : currentIndex === 0}
                className="w-full md:w-auto flex items-center justify-center gap-2 md:gap-3 text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all font-display font-bold text-sm md:text-lg group py-2"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                Anterior
              </button>

              <button 
                onClick={handleNext}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-10 py-3.5 md:py-5 rounded-xl md:rounded-[2rem] font-display font-bold text-sm md:text-lg transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-2 md:gap-3 group"
              >
                {view === 'review' 
                  ? (reviewIndex === wrongQuestionIds.length - 1 ? 'Finalizar Revisão' : 'Próxima Questão')
                  : (currentIndex === quizQuestions.length - 1 ? 'Ver Resultado Final' : 'Próxima Questão')
                }
                <ChevronRight className="w-4 h-4 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="p-10 text-center text-slate-400 text-sm font-medium border-t border-slate-100 bg-white">
        <p>© 2026 Simulado Premium • {selectedCargo?.name}</p>
      </footer>
    </div>
  );
}
