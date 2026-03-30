import { Link } from "react-router-dom";
import { styles } from "../styles/styles";
import { getAccuracy } from "../utils/helpers";

export default function QuizPage({
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
  wrongCount,
  favoriteCount,
  handleLogout,
  isFavorite,
  toggleFavoriteQuestion,
  examType
}) {
  if (!currentQuestion) {
    return <div style={styles.page}>No questions found.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.topRow}>
                <span>Question {currentQuestion.questionNumber}</span>
                <span>
                {currentIndex + 1} / {totalQuestions}
                </span>
            </div>
            <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
              Current Exam: {examType}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link to="/wrong-book" style={styles.linkButton}>
              Wrong Book ({wrongCount})
              </Link>

              <Link to="/favorites" style={styles.linkButton}>
              Favorites ({favoriteCount})
              </Link>

              <button style={styles.secondaryButton} onClick={handleLogout}>
              Logout
              </button>

              <button style={styles.secondaryButton} 
                onClick={() => {
                  localStorage.removeItem("examType");
                  window.location.reload(); 
                }}>
              Switch Exam
              </button>
          </div>
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

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <button
            style={{
                ...styles.secondaryButton,
                fontWeight: "600"
            }}
            onClick={() => toggleFavoriteQuestion(currentQuestion.questionNumber)}
            >
            {isFavorite ? "★ Favorited" : "☆ Add to Favorites"}
          </button>
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
              <strong>Correct Answer:</strong>{" "}
              {currentQuestion.answerText || currentQuestion.answer}
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