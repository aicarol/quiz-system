import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001"
    : "https://quiz-api-bfq5.onrender.com";

const STORAGE_KEYS = {
  lastQuestionNumber: "lastQuestionNumber",
  remainingRandomPool: "remainingRandomPool",
  randomCycleStats: "randomCycleStats",
  wrongQuestionNumbers: "wrongQuestionNumbers"
};

function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getAccuracy(stats) {
  if (!stats || stats.total === 0) return "0%";
  return `${((stats.correct / stats.total) * 100).toFixed(1)}%`;
}

function App() {
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

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/questions`);
        const fetchedQuestions = response.data;
        setQuestions(fetchedQuestions);

        const savedQuestionNumber = localStorage.getItem(
          STORAGE_KEYS.lastQuestionNumber
        );

        if (savedQuestionNumber) {
          const savedIndex = fetchedQuestions.findIndex(
            (q) => q.questionNumber === parseInt(savedQuestionNumber, 10)
          );

          if (savedIndex !== -1) {
            setCurrentIndex(savedIndex);
          }
        }

        const savedRandomPoolRaw = localStorage.getItem(
          STORAGE_KEYS.remainingRandomPool
        );

        if (savedRandomPoolRaw) {
          try {
            const parsedPool = JSON.parse(savedRandomPoolRaw);

            if (Array.isArray(parsedPool)) {
              const validQuestionNumbers = new Set(
                fetchedQuestions.map((q) => q.questionNumber)
              );

              const filteredPool = parsedPool.filter((questionNumber) =>
                validQuestionNumbers.has(questionNumber)
              );

              setRemainingRandomQuestionNumbers(filteredPool);
            } else {
              setRemainingRandomQuestionNumbers(
                fetchedQuestions.map((q) => q.questionNumber)
              );
            }
          } catch {
            setRemainingRandomQuestionNumbers(
              fetchedQuestions.map((q) => q.questionNumber)
            );
          }
        } else {
          setRemainingRandomQuestionNumbers(
            fetchedQuestions.map((q) => q.questionNumber)
          );
        }

        const savedRandomCycleStatsRaw = localStorage.getItem(
          STORAGE_KEYS.randomCycleStats
        );

        if (savedRandomCycleStatsRaw) {
          try {
            const parsedStats = JSON.parse(savedRandomCycleStatsRaw);

            if (
              parsedStats &&
              typeof parsedStats.total === "number" &&
              typeof parsedStats.correct === "number"
            ) {
              setRandomCycleStats(parsedStats);
            } else {
              setRandomCycleStats({ total: 0, correct: 0 });
            }
          } catch {
            setRandomCycleStats({ total: 0, correct: 0 });
          }
        } else {
          setRandomCycleStats({ total: 0, correct: 0 });
        }

        const savedWrongQuestionNumbersRaw = localStorage.getItem(
          STORAGE_KEYS.wrongQuestionNumbers
        );

        if (savedWrongQuestionNumbersRaw) {
          try {
            const parsedWrongList = JSON.parse(savedWrongQuestionNumbersRaw);

            if (Array.isArray(parsedWrongList)) {
              const validQuestionNumbers = new Set(
                fetchedQuestions.map((q) => q.questionNumber)
              );

              const filteredWrongList = parsedWrongList.filter((questionNumber) =>
                validQuestionNumbers.has(questionNumber)
              );

              setWrongQuestionNumbers(filteredWrongList);
            } else {
              setWrongQuestionNumbers([]);
            }
          } catch {
            setWrongQuestionNumbers([]);
          }
        } else {
          setWrongQuestionNumbers([]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load questions.");
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, []);

  useEffect(() => {
    if (!questions.length) return;

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    localStorage.setItem(
      STORAGE_KEYS.lastQuestionNumber,
      currentQuestion.questionNumber.toString()
    );

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

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(
        STORAGE_KEYS.remainingRandomPool,
        JSON.stringify(remainingRandomQuestionNumbers)
      );
    }
  }, [remainingRandomQuestionNumbers, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(
        STORAGE_KEYS.randomCycleStats,
        JSON.stringify(randomCycleStats)
      );
    }
  }, [randomCycleStats, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(
        STORAGE_KEYS.wrongQuestionNumbers,
        JSON.stringify(wrongQuestionNumbers)
      );
    }
  }, [wrongQuestionNumbers, loading]);

  const currentQuestion = useMemo(() => {
    if (!questions.length) return null;

    const q = questions[currentIndex];
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

    let pool = [...remainingRandomQuestionNumbers];

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
      setSelectedKey("");
      setShowExplanation(false);
      setHasAnsweredCurrentQuestion(false);
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

  if (loading) {
    return <div style={styles.page}>Loading questions...</div>;
  }

  if (error) {
    return <div style={styles.page}>{error}</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
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
            />
          }
        />
        <Route
          path="/wrong-book"
          element={
            <WrongBookPage
              wrongQuestions={wrongQuestions}
              removeWrongQuestion={removeWrongQuestion}
              clearWrongBook={clearWrongBook}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function QuizPage({
  currentQuestion,
  currentIndex,
  totalQuestions,
  selectedKey,
  showExplanation,
  handleSelectOption,
  getOptionStyle,
  goToPrevQuestion,
  goToRandomQuestion,
  goToNextQuestion,
  jumpNumber,
  setJumpNumber,
  jumpToQuestion,
  remainingRandomCount,
  resetRandomPool,
  randomCycleStats,
  sessionStats,
  wrongCount
}) {
  if (!currentQuestion) {
    return <div style={styles.page}>No questions found.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.topBar}>
          <div style={styles.topRow}>
            <span>Question {currentQuestion.questionNumber}</span>
            <span>
              {currentIndex + 1} / {totalQuestions}
            </span>
          </div>

          <Link to="/wrong-book" style={styles.linkButton}>
            Wrong Book ({wrongCount})
          </Link>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statTitle}>Random Cycle Accuracy</div>
            <div style={styles.statValue}>{getAccuracy(randomCycleStats)}</div>
            <div style={styles.statSubtext}>
              Correct: {randomCycleStats.correct} / {randomCycleStats.total}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statTitle}>This Session Accuracy</div>
            <div style={styles.statValue}>{getAccuracy(sessionStats)}</div>
            <div style={styles.statSubtext}>
              Correct: {sessionStats.correct} / {sessionStats.total}
            </div>
          </div>
        </div>

        <h2 style={styles.question}>{currentQuestion.question}</h2>

        <div style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const displayKey = String.fromCharCode(65 + index);

            return (
              <button
                key={`${currentQuestion.questionNumber}-${option.key}`}
                style={getOptionStyle(option)}
                onClick={() => handleSelectOption(option.key)}
                disabled={showExplanation}
              >
                <strong>{displayKey}.</strong> {option.text}
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div style={styles.explanationBox}>
            <p>
              <strong>Correct Answer:</strong> {currentQuestion.answer}
            </p>
            <p>
              <strong>Explanation:</strong> {currentQuestion.explanation}
            </p>
          </div>
        )}

        <div style={styles.buttonRow}>
          <button style={styles.navButton} onClick={goToPrevQuestion}>
            Previous
          </button>

          <button style={styles.navButton} onClick={goToRandomQuestion}>
            Random
          </button>

          <button style={styles.navButton} onClick={goToNextQuestion}>
            Next
          </button>
        </div>

        <div style={styles.jumpRow}>
          <input
            type="number"
            placeholder="Go to question"
            value={jumpNumber}
            onChange={(e) => setJumpNumber(e.target.value)}
            style={styles.jumpInput}
          />

          <button style={styles.navButton} onClick={jumpToQuestion}>
            Go
          </button>
        </div>

        <div style={styles.randomInfoRow}>
          <div style={styles.randomInfo}>
            Random pool remaining: {remainingRandomCount}
          </div>

          <button style={styles.resetPoolButton} onClick={resetRandomPool}>
            Reset Random Pool
          </button>
        </div>
      </div>
    </div>
  );
}

function WrongBookPage({ wrongQuestions, removeWrongQuestion, clearWrongBook }) {
  const [wrongIndex, setWrongIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState({});

  useEffect(() => {
    if (wrongQuestions.length === 0) return;

    if (wrongIndex >= wrongQuestions.length) {
      setWrongIndex(0);
      return;
    }

    const currentWrongQuestion = wrongQuestions[wrongIndex];
    if (!currentWrongQuestion) return;

    setShuffledOptionsMap((prev) => {
      if (prev[currentWrongQuestion.questionNumber]) {
        return prev;
      }

      return {
        ...prev,
        [currentWrongQuestion.questionNumber]: shuffleArray(
          currentWrongQuestion.options
        )
      };
    });
  }, [wrongQuestions, wrongIndex]);

  const currentWrongQuestion = useMemo(() => {
    if (!wrongQuestions.length) return null;

    const q = wrongQuestions[wrongIndex];
    const shuffledOptions = shuffledOptionsMap[q.questionNumber] || q.options;

    return {
      ...q,
      options: shuffledOptions
    };
  }, [wrongQuestions, wrongIndex, shuffledOptionsMap]);

  function resetWrongState() {
    setSelectedKey("");
    setShowExplanation(false);
  }

  function handleWrongSelectOption(key) {
    setSelectedKey(key);
    setShowExplanation(true);
  }

  function goToNextWrongQuestion() {
    if (!wrongQuestions.length) return;
    setWrongIndex((prev) => (prev + 1) % wrongQuestions.length);
    resetWrongState();
  }

  function goToPrevWrongQuestion() {
    if (!wrongQuestions.length) return;
    setWrongIndex(
      (prev) => (prev - 1 + wrongQuestions.length) % wrongQuestions.length
    );
    resetWrongState();
  }

  function goToRandomWrongQuestion() {
    if (!wrongQuestions.length) return;

    let randomIndex = wrongIndex;

    while (wrongQuestions.length > 1 && randomIndex === wrongIndex) {
      randomIndex = Math.floor(Math.random() * wrongQuestions.length);
    }

    setWrongIndex(randomIndex);
    resetWrongState();
  }

  function getWrongOptionStyle(option) {
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

  if (!wrongQuestions.length) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.topBar}>
            <div style={styles.topRow}>
              <span>Wrong Book</span>
              <span>0 questions</span>
            </div>

            <Link to="/" style={styles.linkButton}>
              Back to Quiz
            </Link>
          </div>

          <div style={styles.emptyState}>
            No wrong questions yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.topBar}>
          <div style={styles.topRow}>
            <span>Wrong Book - Question {currentWrongQuestion.questionNumber}</span>
            <span>
              {wrongIndex + 1} / {wrongQuestions.length}
            </span>
          </div>

          <div style={styles.topActions}>
            <Link to="/" style={styles.linkButton}>
              Back to Quiz
            </Link>

            <button
              style={styles.secondaryButton}
              onClick={() => removeWrongQuestion(currentWrongQuestion.questionNumber)}
            >
              Remove This Question
            </button>

            <button style={styles.secondaryButton} onClick={clearWrongBook}>
              Clear Wrong Book
            </button>
          </div>
        </div>

        <h2 style={styles.question}>{currentWrongQuestion.question}</h2>

        <div style={styles.optionsContainer}>
          {currentWrongQuestion.options.map((option, index) => {
            const displayKey = String.fromCharCode(65 + index);

            return (
              <button
                key={`${currentWrongQuestion.questionNumber}-${option.key}`}
                style={getWrongOptionStyle(option)}
                onClick={() => handleWrongSelectOption(option.key)}
                disabled={showExplanation}
              >
                <strong>{displayKey}.</strong> {option.text}
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div style={styles.explanationBox}>
            <p>
              <strong>Correct Answer:</strong> {currentWrongQuestion.answer}
            </p>
            <p>
              <strong>Explanation:</strong> {currentWrongQuestion.explanation}
            </p>
          </div>
        )}

        <div style={styles.buttonRow}>
          <button style={styles.navButton} onClick={goToPrevWrongQuestion}>
            Previous
          </button>

          <button style={styles.navButton} onClick={goToRandomWrongQuestion}>
            Random
          </button>

          <button style={styles.navButton} onClick={goToNextWrongQuestion}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f6fb",
    padding: "24px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
  },
  card: {
    maxWidth: "980px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "16px"
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    color: "#555",
    fontSize: "14px",
    flex: 1,
    minWidth: "260px"
  },
  topActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  linkButton: {
    padding: "10px 16px",
    borderRadius: "10px",
    backgroundColor: "#111827",
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px"
  },
  secondaryButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #d6dbe6",
    backgroundColor: "#ffffff",
    color: "#333",
    fontSize: "14px",
    cursor: "pointer"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "24px"
  },
  statCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #dbe4f0",
    borderRadius: "12px",
    padding: "16px"
  },
  statTitle: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "8px"
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#222"
  },
  statSubtext: {
    marginTop: "6px",
    fontSize: "14px",
    color: "#666"
  },
  question: {
    fontSize: "28px",
    lineHeight: 1.5,
    marginBottom: "24px",
    color: "#222"
  },
  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  option: {
    textAlign: "left",
    border: "1px solid #d6dbe6",
    backgroundColor: "#f9fbff",
    borderRadius: "12px",
    padding: "16px",
    fontSize: "18px",
    cursor: "pointer",
    lineHeight: 1.5,
    color: "#222"
  },
  correctOption: {
    backgroundColor: "#dff4df",
    border: "1px solid #8bc48b",
    color: "#1f3d1f"
  },
  wrongOption: {
    backgroundColor: "#fde2e2",
    border: "1px solid #e49797",
    color: "#7a1f1f"
  },
  explanationBox: {
    marginTop: "24px",
    backgroundColor: "#f3f7e8",
    border: "1px solid #c8d7a8",
    borderRadius: "12px",
    padding: "16px",
    fontSize: "17px",
    lineHeight: 1.6
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
    flexWrap: "wrap"
  },
  jumpRow: {
    display: "flex",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap",
    alignItems: "center"
  },
  navButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer"
  },
  jumpInput: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d6dbe6",
    fontSize: "16px",
    width: "180px",
    backgroundColor: "#ffffff",
    color: "#333",
    outline: "none",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
  },
  randomInfoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap"
  },
  randomInfo: {
    color: "#666",
    fontSize: "14px"
  },
  resetPoolButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #d6dbe6",
    backgroundColor: "#ffffff",
    color: "#333",
    fontSize: "14px",
    cursor: "pointer"
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center",
    fontSize: "20px",
    color: "#666"
  }
};

export default App;