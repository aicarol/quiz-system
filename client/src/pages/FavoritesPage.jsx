import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { styles } from "../styles/styles";
import { shuffleArray } from "../utils/helpers";

export default function FavoritesPage({
  favoriteQuestions,
  removeFavoriteQuestion,
  clearFavorites,
  examType
}) {
  const [favoriteIndex, setFavoriteIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState({});

  useEffect(() => {
    if (favoriteQuestions.length === 0) return;

    if (favoriteIndex >= favoriteQuestions.length) {
      setFavoriteIndex(0);
      return;
    }

    const currentFavoriteQuestion = favoriteQuestions[favoriteIndex];
    if (!currentFavoriteQuestion) return;

    setShuffledOptionsMap((prev) => {
      if (prev[currentFavoriteQuestion.questionNumber]) {
        return prev;
      }

      return {
        ...prev,
        [currentFavoriteQuestion.questionNumber]: shuffleArray(
          currentFavoriteQuestion.options
        )
      };
    });
  }, [favoriteQuestions, favoriteIndex]);

  const currentFavoriteQuestion = useMemo(() => {
    if (!favoriteQuestions.length) return null;

    const q = favoriteQuestions[favoriteIndex];
    const shuffledOptions = shuffledOptionsMap[q.questionNumber] || q.options;

    return {
      ...q,
      options: shuffledOptions
    };
  }, [favoriteQuestions, favoriteIndex, shuffledOptionsMap]);

  function resetFavoriteState() {
    setSelectedKey("");
    setShowExplanation(false);
  }

  function handleFavoriteSelectOption(key) {
    setSelectedKey(key);
    setShowExplanation(true);
  }

  function goToNextFavoriteQuestion() {
    if (!favoriteQuestions.length) return;
    setFavoriteIndex((prev) => (prev + 1) % favoriteQuestions.length);
    resetFavoriteState();
  }

  function goToPrevFavoriteQuestion() {
    if (!favoriteQuestions.length) return;
    setFavoriteIndex(
      (prev) => (prev - 1 + favoriteQuestions.length) % favoriteQuestions.length
    );
    resetFavoriteState();
  }

  function goToRandomFavoriteQuestion() {
    if (!favoriteQuestions.length) return;

    let randomIndex = favoriteIndex;

    while (favoriteQuestions.length > 1 && randomIndex === favoriteIndex) {
      randomIndex = Math.floor(Math.random() * favoriteQuestions.length);
    }

    setFavoriteIndex(randomIndex);
    resetFavoriteState();
  }

  function getFavoriteOptionStyle(option) {
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

  if (!favoriteQuestions.length) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.topBar}>
            <div>
              <div style={styles.topRow}>
                <span>Favorites</span>
                <span>0 questions</span>
              </div>

              <div style={{ marginTop: "12px", color: "#666", fontSize: "14px" }}>
                Current Exam: {examType}
              </div>
            </div>

            <Link to="/" style={styles.linkButton}>
              Back to Quiz
            </Link>
          </div>

          <div style={styles.emptyState}>No favorite questions yet.</div>
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
              Favorites - Question {currentFavoriteQuestion.questionNumber}
            </span>
            <span>
              {favoriteIndex + 1} / {favoriteQuestions.length}
            </span>
          </div>

          <div style={styles.topActions}>
            <Link to="/" style={styles.linkButton}>
              Back to Quiz
            </Link>

            <button
              style={styles.secondaryButton}
              onClick={() =>
                removeFavoriteQuestion(currentFavoriteQuestion.questionNumber)
              }
            >
              Remove This Question
            </button>

            <button style={styles.secondaryButton} onClick={clearFavorites}>
              Clear Favorites
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "12px", color: "#666", fontSize: "14px" }}>
          Current Exam: {examType}
        </div>

        <h2 style={styles.question}>{currentFavoriteQuestion.question}</h2>

        <div style={styles.optionsContainer}>
          {currentFavoriteQuestion.options.map((option, index) => {
            const displayKey = String.fromCharCode(65 + index);

            return (
              <button
                key={`${currentFavoriteQuestion.questionNumber}-${option.key}`}
                style={getFavoriteOptionStyle(option)}
                onClick={() => handleFavoriteSelectOption(option.key)}
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
              <strong>Correct Answer:</strong> {currentFavoriteQuestion.answer}
            </p>
            <p>
              <strong>Explanation:</strong> {currentFavoriteQuestion.explanation}
            </p>
          </div>
        )}

        <div style={styles.buttonRow}>
          <button style={styles.navButton} onClick={goToPrevFavoriteQuestion}>
            Previous
          </button>

          <button style={styles.navButton} onClick={goToRandomFavoriteQuestion}>
            Random
          </button>

          <button style={styles.navButton} onClick={goToNextFavoriteQuestion}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}