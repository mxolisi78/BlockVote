import type { Candidate } from "../lib/blockvote";

type Props = {
  candidate: Candidate;
  canVote: boolean;
  onVote: (id: bigint) => void;
  voting: boolean;
  totalVotes: bigint;
};

export function CandidateCard({
  candidate,
  canVote,
  onVote,
  voting,
  totalVotes,
}: Props) {
  const pct =
    totalVotes > 0n
      ? Number((candidate.voteCount * 10000n) / totalVotes) / 100
      : 0;

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <div style={styles.name}>{candidate.name}</div>
          <div style={styles.role}>Student Representative</div>
        </div>
        <div style={styles.voteCount}>
          <div style={styles.voteNum}>{candidate.voteCount.toString()}</div>
          <div style={styles.voteLabel}>votes</div>
        </div>
      </div>

      <div style={styles.bar}>
        <div
          style={{
            ...styles.barFill,
            width: `${pct}%`,
          }}
        />
      </div>

      <div style={styles.bottom}>
        <span style={styles.pct}>{pct.toFixed(1)}%</span>

        <button
          style={{
            ...styles.button,
            opacity: canVote && !voting ? 1 : 0.4,
            cursor: canVote && !voting ? "pointer" : "not-allowed",
          }}
          disabled={!canVote || voting}
          onClick={() => onVote(candidate.id)}
        >
          {voting ? "Voting..." : canVote ? "VOTE" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#12121a",
    border: "1px solid #26263a",
    borderRadius: 14,
    padding: 22,
    marginBottom: 16,
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  name: { fontSize: 20, fontWeight: 600 },
  role: { color: "#8a8aa3", fontSize: 13, marginTop: 4 },
  voteCount: { textAlign: "right" },
  voteNum: {
    fontSize: 26,
    fontWeight: 700,
    color: "#7c5cff",
    fontFamily: "monospace",
  },
  voteLabel: { fontSize: 11, color: "#8a8aa3", letterSpacing: 1 },
  bar: {
    height: 6,
    background: "#1f1f2a",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "linear-gradient(90deg, #7c5cff, #a78bfa)",
    transition: "width 0.4s ease",
  },
  bottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  pct: {
    color: "#a78bfa",
    fontFamily: "monospace",
    fontSize: 13,
  },
  button: {
    background: "#7c5cff",
    color: "#fff",
    border: "none",
    padding: "10px 24px",
    borderRadius: 8,
    fontWeight: 700,
    letterSpacing: 1,
    fontSize: 13,
    transition: "opacity 0.2s",
  },
};