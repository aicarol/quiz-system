import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001"
    : "https://quiz-api-bfq5.onrender.com";

function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
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
  const [remainingRandomIndexes, setRemainingRandomIndexes] = useState([]);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/questions`);
        const fetchedQuestions = response.data;
        setQuestions(fetchedQuestions);

        const savedQuestionNumber = localStorage.getItem("lastQuestionNumber");

        if (savedQuestionNumber) {
          const savedIndex = fetchedQuestions.findIndex(
            (q) => q.questionNumber === parseInt(savedQuestionNumber, 10)
          );

          if (savedIndex !== -1) {
            setCurrentIndex(savedIndex);
          }
        }

        // initialize random questions memory 
        setRemainingRandomIndexes(
          fetchedQuestions.map((_, index) => index)
        );
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
      "lastQuestionNumber",
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

  const currentQuestion = useMemo(() => {
    if (!questions.length) return null;

    const q = questions[currentIndex];
    const shuffledOptions = shuffledOptionsMap[q.questionNumber] || q.options;

    return {
      ...q,
      options: shuffledOptions
    };
  }, [questions, currentIndex, shuffledOptionsMap]);

  function handleSelectOption(key) {
    setSelectedKey(key);
    setShowExplanation(true);
  }

  function resetQuestionState() {
    setSelectedKey("");
    setShowExplanation(false);
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

    setRemainingRandomIndexes((prev) => {
      let pool = [...prev];

      // reset when it's all done
      if (pool.length === 0) {
        pool = questions.map((_, index) => index).filter((index) => index !== currentIndex);
      }

      // if in the current, remove first
      pool = pool.filter((index) => index !== currentIndex);

      // if empty after remove, then it means this round has done, reset it
      if (pool.length === 0) {
        pool = questions.map((_, index) => index).filter((index) => index !== currentIndex);
      }

      const randomPosition = Math.floor(Math.random() * pool.length);
      const nextIndex = pool[randomPosition];

      const updatedPool = pool.filter((_, index) => index !== randomPosition);

      setCurrentIndex(nextIndex);
      resetQuestionState();

      return updatedPool;
    });
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

  if (loading) {
    return <div style={styles.page}>Loading questions...</div>;
  }

  if (error) {
    return <div style={styles.page}>{error}</div>;
  }

  if (!currentQuestion) {
    return <div style={styles.page}>No questions found.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.topRow}>
          <span>Question {currentQuestion.questionNumber}</span>
          <span>
            {currentIndex + 1} / {questions.length}
          </span>
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

        <div style={styles.randomInfo}>
          Random pool remaining: {remainingRandomIndexes.length}
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
    maxWidth: "900px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "16px",
    color: "#555",
    fontSize: "14px"
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
  randomInfo: {
    marginTop: "16px",
    color: "#666",
    fontSize: "14px"
  }
};

export default App;