import { styles } from "../styles/styles";
import { useNavigate } from "react-router-dom";

export default function SelectExamPage({ setExamType }) {
  const navigate = useNavigate();
  const savedExam = localStorage.getItem("examType");

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ color: "#111", fontWeight: "600", marginBottom: "16px" }}>
          Select Exam
        </h2>

        {savedExam && (
          <div style={{ marginTop: "10px", color: "#666" }}>
            Last selected: {savedExam}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: "20px"
          }}
        >
          <button
            style={{
              ...styles.navButton,
              backgroundColor: savedExam === "PENG" ? "#dbeafe" : undefined
            }}
            onClick={() => {
              setExamType("PENG");
              navigate("/");
            }}
          >
            P.Eng Exam
          </button>

          <button
            style={{
              ...styles.navButton,
              backgroundColor: savedExam === "CITIZEN" ? "#dbeafe" : undefined
            }}
            onClick={() => {
              setExamType("CITIZEN");
              navigate("/");
            }}
          >
            Citizenship Exam
          </button>
        </div>
      </div>
    </div>
  );
}