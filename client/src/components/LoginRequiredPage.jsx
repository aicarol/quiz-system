import { Link } from "react-router-dom";
import { styles } from "../styles/styles";

export default function LoginRequiredPage() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.question}>Please login first</h2>
        <div style={styles.buttonRow}>
          <Link to="/login" style={styles.linkButton}>
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}