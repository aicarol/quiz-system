import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { styles } from "../styles/styles";
import { api } from "../api/api";

export default function LoginPage({ setUser, setToken }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      setSubmitting(true);
      setError("");

      const response = await api.post("/api/auth/login", {
        email,
        password
      });

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      setToken(token);
      setUser(user);

      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Login failed. Please check your email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.question}>Login</h2>

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

        {error && (
          <div style={{ color: "#b91c1c", marginTop: "12px" }}>{error}</div>
        )}

        <div style={styles.buttonRow}>
          <button
            style={styles.navButton}
            onClick={handleLogin}
            disabled={submitting}
          >
            {submitting ? "Logging in..." : "Login"}
          </button>
        </div>

        <div style={{ marginTop: "16px" }}>
          <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}