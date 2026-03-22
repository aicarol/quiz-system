import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { styles } from "../styles/styles";
import { shuffleArray } from "../utils/helpers";

export default function WrongBookPage({
  wrongQuestions,
  removeWrongQuestion,
  clearWrongBook
}) {
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

          <div style={styles.emptyState}>No wrong questions yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.topBar}>
          <div style={styles.topRow}>
            <span>
              Wrong Book - Question {currentWrongQuestion.questionNumber}
            </span>
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
              onClick={() =>
                removeWrongQuestion(currentWrongQuestion.questionNumber)
              }
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