export const styles = {
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