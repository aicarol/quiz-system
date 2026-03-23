import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { styles } from "./styles/styles";
import QuizPage from "./pages/QuizPage";
import WrongBookPage from "./pages/WrongBookPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FavoritesPage from "./pages/FavoritesPage";
import LoginRequiredPage from "./components/LoginRequiredPage";
import { shuffleArray } from "./utils/helpers";
import { api } from "./api/api";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authLoading, setAuthLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jumpNumber, setJumpNumber] = useState("");
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState({});
  const [remainingRandomQuestionNumbers, setRemainingRandomQuestionNumbers] =
    useState([]);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] =
    useState(false);
  const [isCurrentQuestionFromRandom, setIsCurrentQuestionFromRandom] =
    useState(false);

  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0
  });

  const [randomCycleStats, setRandomCycleStats] = useState({
    total: 0,
    correct: 0
  });

  const [wrongQuestionNumbers, setWrongQuestionNumbers] = useState([]);

  const [progressLoaded, setProgressLoaded] = useState(false);

  const saveTimeoutRef = useRef(null);

  const [favoriteQuestionNumbers, setFavoriteQuestionNumbers] = useState([]);

  useEffect(() => {
    async function fetchMe() {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await api.get("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUser(response.data.user);
      } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
        setToken("");
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    fetchMe();
  }, [token]);

  useEffect(() => {
    if (!user) {
      setQuestions([]);
      setProgressLoaded(false);
      setLoading(false);
      return;
    }

    async function fetchQuestions() {
      try {
        setLoading(true);
        setError("");
        setProgressLoaded(false);

        const response = await api.get("/api/questions");

        const fetchedQuestions = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.questions)
          ? response.data.questions
          : [];

        setQuestions(fetchedQuestions);
      } catch (err) {
        console.error(err);
        setError("Failed to load questions.");
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, [user]);

  useEffect(() => {
    if (!user || !questions.length) return;

    loadProgress();
  }, [user, questions]);

  useEffect(() => {
    if (!user || !questions.length || !progressLoaded) return;

    const currentQuestion = questions[currentIndex];

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveProgress({
        lastQuestionNumber: currentQuestion?.questionNumber ?? null,
        remainingRandomPool: remainingRandomQuestionNumbers,
        randomCycleStats,
        wrongQuestionNumbers,
        favoriteQuestionNumbers
      });
    }, 1000); // 1秒

  }, [
    user,
    questions,
    currentIndex,
    remainingRandomQuestionNumbers,
    randomCycleStats,
    wrongQuestionNumbers,
    favoriteQuestionNumbers,
    progressLoaded
  ]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!questions.length) return;
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    setShuffledOptionsMap((prev) => {
      if (prev[currentQuestion.questionNumber]) {
        return prev;
      }

      return {
        ...prev,
        [currentQuestion.questionNumber]: shuffleArray(currentQuestion.options)
      };
    });
  }, [questions, currentIndex]);

  const currentQuestion = useMemo(() => {
    if (!questions.length) return null;

    const q = questions[currentIndex];
    if (!q) return null;

    const shuffledOptions = shuffledOptionsMap[q.questionNumber] || q.options;

    return {
      ...q,
      options: shuffledOptions
    };
  }, [questions, currentIndex, shuffledOptionsMap]);

  const wrongQuestions = useMemo(() => {
    const wrongSet = new Set(wrongQuestionNumbers);
    return questions.filter((q) => wrongSet.has(q.questionNumber));
  }, [questions, wrongQuestionNumbers]);

  const favoriteQuestions = useMemo(() => {
    const favoriteSet = new Set(favoriteQuestionNumbers);
    return questions.filter((q) => favoriteSet.has(q.questionNumber));
  }, [questions, favoriteQuestionNumbers]);

  async function loadProgress() {
    if (!token) return;

    try {
      const response = await api.get("/api/progress", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const progress = response.data;

      if (
        progress.lastQuestionNumber !== null &&
        progress.lastQuestionNumber !== undefined
      ) {
        const savedIndex = questions.findIndex(
          (q) => q.questionNumber === progress.lastQuestionNumber
        );

        if (savedIndex !== -1) {
          setCurrentIndex(savedIndex);
        }
      }

      if (Array.isArray(progress.remainingRandomPool)) {
        setRemainingRandomQuestionNumbers(progress.remainingRandomPool);
      }

      if (
        progress.randomCycleStats &&
        typeof progress.randomCycleStats.total === "number" &&
        typeof progress.randomCycleStats.correct === "number"
      ) {
        setRandomCycleStats(progress.randomCycleStats);
      }

      if (Array.isArray(progress.wrongQuestionNumbers)) {
        setWrongQuestionNumbers(progress.wrongQuestionNumbers);
      }

      if (Array.isArray(progress.favoriteQuestionNumbers)) {
        setFavoriteQuestionNumbers(progress.favoriteQuestionNumbers);
      }
    } catch (err) {
      console.error("Failed to load progress:", err);
    } finally {
      setProgressLoaded(true);
    }
  }

  async function saveProgress({
    lastQuestionNumber,
    remainingRandomPool,
    randomCycleStats,
    wrongQuestionNumbers,
    favoriteQuestionNumbers
  }) {
    if (!token) return;

    try {
      await api.put(
        "/api/progress",
        {
          lastQuestionNumber,
          remainingRandomPool,
          randomCycleStats,
          wrongQuestionNumbers,
          favoriteQuestionNumbers
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  }

  function handleSelectOption(key) {
    setSelectedKey(key);
    setShowExplanation(true);

    if (hasAnsweredCurrentQuestion || !currentQuestion) return;

    const selectedOption = currentQuestion.options.find(
      (option) => option.key === key
    );

    const isCorrect = !!selectedOption?.isCorrect;
    const currentQuestionNumber = currentQuestion.questionNumber;

    setSessionStats((prev) => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0)
    }));

    const isStillInRandomPool =
      remainingRandomQuestionNumbers.includes(currentQuestionNumber);

    if (isCurrentQuestionFromRandom || isStillInRandomPool) {
      setRandomCycleStats((prev) => ({
        total: prev.total + 1,
        correct: prev.correct + (isCorrect ? 1 : 0)
      }));
    }

    if (isStillInRandomPool) {
      setRemainingRandomQuestionNumbers((prev) =>
        prev.filter((questionNumber) => questionNumber !== currentQuestionNumber)
      );
    }

    if (!isCorrect) {
      setWrongQuestionNumbers((prev) => {
        if (prev.includes(currentQuestionNumber)) return prev;
        return [...prev, currentQuestionNumber];
      });
    }

    setHasAnsweredCurrentQuestion(true);
  }

  function resetQuestionState() {
    setSelectedKey("");
    setShowExplanation(false);
    setHasAnsweredCurrentQuestion(false);
    setIsCurrentQuestionFromRandom(false);
  }

  function goToNextQuestion() {
    if (!questions.length) return;
    setCurrentIndex((prev) => (prev + 1) % questions.length);
    resetQuestionState();
  }

  function goToPrevQuestion() {
    if (!questions.length) return;
    setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
    resetQuestionState();
  }

  function goToRandomQuestion() {
    if (!questions.length) return;

    const currentQuestionNumber = questions[currentIndex]?.questionNumber;

    if (remainingRandomQuestionNumbers.length === 0) {
      alert(
        "You have completed this random cycle. Please click 'Reset Random Pool' to start a new cycle."
      );
      return;
    }

    const pool = [...remainingRandomQuestionNumbers];

    let candidatePool = pool.filter(
      (questionNumber) => questionNumber !== currentQuestionNumber
    );

    if (candidatePool.length === 0) {
      candidatePool = [...pool];
    }

    const randomPosition = Math.floor(Math.random() * candidatePool.length);
    const nextQuestionNumber = candidatePool[randomPosition];

    const nextIndex = questions.findIndex(
      (q) => q.questionNumber === nextQuestionNumber
    );

    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
      resetQuestionState();
      setIsCurrentQuestionFromRandom(true);
    }

    const updatedPool = pool.filter(
      (questionNumber) => questionNumber !== nextQuestionNumber
    );

    setRemainingRandomQuestionNumbers(updatedPool);
  }

  function jumpToQuestion() {
    const number = parseInt(jumpNumber, 10);

    if (isNaN(number)) {
      alert("Please enter a valid question number");
      return;
    }

    const index = questions.findIndex((q) => q.questionNumber === number);

    if (index === -1) {
      alert("Question not found");
      return;
    }

    setCurrentIndex(index);
    resetQuestionState();
    setJumpNumber("");
  }

  function resetRandomPool() {
    const fullPool = questions.map((q) => q.questionNumber);
    setRemainingRandomQuestionNumbers(fullPool);
    setRandomCycleStats({ total: 0, correct: 0 });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setToken("");
  }

  function getOptionStyle(option) {
    if (!showExplanation) {
      return styles.option;
    }

    if (option.isCorrect) {
      return {
        ...styles.option,
        ...styles.correctOption
      };
    }

    if (selectedKey === option.key && !option.isCorrect) {
      return {
        ...styles.option,
        ...styles.wrongOption
      };
    }

    return styles.option;
  }

  function removeWrongQuestion(questionNumber) {
    setWrongQuestionNumbers((prev) =>
      prev.filter((number) => number !== questionNumber)
    );
  }

  function clearWrongBook() {
    setWrongQuestionNumbers([]);
  }

  function toggleFavoriteQuestion(questionNumber) {
    setFavoriteQuestionNumbers((prev) =>
      prev.includes(questionNumber)
        ? prev.filter((number) => number !== questionNumber)
        : [...prev, questionNumber]
    );
  }

  function removeFavoriteQuestion(questionNumber) {
    setFavoriteQuestionNumbers((prev) =>
      prev.filter((number) => number !== questionNumber)
    );
  }

  function clearFavorites() {
    setFavoriteQuestionNumbers([]);
  }

  if (authLoading) {
    return <div style={styles.page}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage setUser={setUser} setToken={setToken} />}
        />

        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/"
          element={
            user ? (
              loading ? (
                <div style={styles.page}>Loading questions...</div>
              ) : error ? (
                <div style={styles.page}>{error}</div>
              ) : (
                <QuizPage
                  currentQuestion={currentQuestion}
                  currentIndex={currentIndex}
                  totalQuestions={questions.length}
                  selectedKey={selectedKey}
                  showExplanation={showExplanation}
                  handleSelectOption={handleSelectOption}
                  getOptionStyle={getOptionStyle}
                  goToPrevQuestion={goToPrevQuestion}
                  goToRandomQuestion={goToRandomQuestion}
                  goToNextQuestion={goToNextQuestion}
                  jumpNumber={jumpNumber}
                  setJumpNumber={setJumpNumber}
                  jumpToQuestion={jumpToQuestion}
                  remainingRandomCount={remainingRandomQuestionNumbers.length}
                  resetRandomPool={resetRandomPool}
                  randomCycleStats={randomCycleStats}
                  sessionStats={sessionStats}
                  wrongCount={wrongQuestionNumbers.length}
                  handleLogout={handleLogout}
                  isFavorite={favoriteQuestionNumbers.includes(currentQuestion?.questionNumber)}
                  toggleFavoriteQuestion={toggleFavoriteQuestion}
                />
              )
            ) : (
              <LoginRequiredPage />
            )
          }
        />

        <Route
          path="/wrong-book"
          element={
            user ? (
              loading ? (
                <div style={styles.page}>Loading questions...</div>
              ) : error ? (
                <div style={styles.page}>{error}</div>
              ) : (
                <WrongBookPage
                  wrongQuestions={wrongQuestions}
                  removeWrongQuestion={removeWrongQuestion}
                  clearWrongBook={clearWrongBook}
                />
              )
            ) : (
              <LoginRequiredPage />
            )
          }
        />

        <Route
          path="/favorites"
          element={
            user ? (
              loading ? (
                <div style={styles.page}>Loading questions...</div>
              ) : error ? (
                <div style={styles.page}>{error}</div>
              ) : (
                <FavoritesPage
                  favoriteQuestions={favoriteQuestions}
                  removeFavoriteQuestion={removeFavoriteQuestion}
                  clearFavorites={clearFavorites}
                />
              )
            ) : (
              <LoginRequiredPage />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;