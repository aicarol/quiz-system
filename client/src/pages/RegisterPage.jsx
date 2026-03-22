import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { styles } from "../styles/styles";
import { api } from "../api/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleRegister() {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await api.post("/api/auth/register", {
        email,
        password
      });

      navigate("/login");
    } catch (err) {
      console.error(err);
      setError("Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.question}>Register</h2>

        <div style={styles.jumpRow}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.jumpInput}
          />
        </div>

        <div style={styles.jumpRow}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.jumpInput}
          />
        </div>

        <div style={styles.jumpRow}>
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.jumpInput}
          />
        </div>

        {error && (
          <div style={{ color: "#b91c1c", marginTop: "12px" }}>{error}</div>
        )}

        <div style={styles.buttonRow}>
          <button
            style={styles.navButton}
            onClick={handleRegister}
            disabled={submitting}
          >
            {submitting ? "Registering..." : "Register"}
          </button>
        </div>

        <div style={{ marginTop: "16px" }}>
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}