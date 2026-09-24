import { useState } from "react";
import type { Candidate } from "../lib/blockvote";
import {
  adminAddCandidate,
  adminRegisterVoter,
  adminStartElection,
  adminEndElection,
} from "../lib/blockvote";

type Props = {
  address: string | null;
  isAdmin: boolean;
  state: {
    started: boolean;
    ended: boolean;
    candidateCount: number;
    totalVotes: bigint;
  } | null;
  candidates: Candidate[];
  onRefresh: () => Promise<void>;
  setNotice: (msg: string | null) => void;
  setError: (msg: string | null) => void;
};

export function AdminPanel({
  address,
  isAdmin,
  state,
  candidates,
  onRefresh,
  setNotice,
  setError,
}: Props) {
  const [newCandidate, setNewCandidate] = useState("");
  const [newVoter, setNewVoter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<`0x${string}`>) {
    if (!address) {
      setError("Connect your wallet first");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(label);
    try {
      const hash = await fn();
      setNotice(`${label} — tx: ${hash.slice(0, 10)}...${hash.slice(-6)}`);
      // Give the chain a moment, then refresh
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 500));
      }
      await onRefresh();
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.cause?.reason ||
        e?.details ||
        e?.message ||
        `${label} failed`;
      setError(String(msg).split("\n")[0]);
    } finally {
      setBusy(null);
    }
  }

  const disabled = !isAdmin || !address;
  const started = state?.started ?? false;
  const ended = state?.ended ?? false;

  return (
    <div style={styles.wrap}>
      {!isAdmin && address && (
        <div style={styles.warnBox}>
          ⚠ You are not the admin. The admin is{" "}
          <span style={styles.mono}>
            the deployer wallet (Account #0)
          </span>
          . Actions below will revert.
        </div>
      )}

      {!address && (
        <div style={styles.warnBox}>
          Connect the admin wallet (Account #0) to use this panel.
        </div>
      )}

      {/* ---------- Candidates ---------- */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Candidates</h2>

        {started && (
          <p style={styles.hint}>
            Election has started. Candidates can no longer be added.
          </p>
        )}

        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Candidate name (e.g. Alice Johnson)"
            value={newCandidate}
            onChange={(e) => setNewCandidate(e.target.value)}
            disabled={disabled || started || ended}
          />
          <button
            style={styles.btn}
            disabled={disabled || started || ended || !newCandidate || !!busy}
            onClick={() =>
              run("Add candidate", () =>
                adminAddCandidate(address as `0x${string}`, newCandidate)
              ).then(() => setNewCandidate(""))
            }
          >
            {busy === "Add candidate" ? "Adding..." : "Add Candidate"}
          </button>
        </div>

        <ul style={styles.list}>
          {candidates.map((c) => (
            <li key={c.id.toString()} style={styles.listItem}>
              <span style={styles.mono}>#{c.id.toString()}</span>
              <span>{c.name}</span>
              <span style={styles.muted}>{c.voteCount.toString()} votes</span>
            </li>
          ))}
          {candidates.length === 0 && (
            <li style={styles.listItemMuted}>(no candidates yet)</li>
          )}
        </ul>
      </section>

      {/* ---------- Voters ---------- */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Register Voter</h2>

        {started && (
          <p style={styles.hint}>
            Election has started. Voters can no longer be registered.
          </p>
        )}

        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="0x... voter address"
            value={newVoter}
            onChange={(e) => setNewVoter(e.target.value)}
            disabled={disabled || started || ended}
          />
          <button
            style={styles.btn}
            disabled={disabled || started || ended || !newVoter || !!busy}
            onClick={() =>
              run("Register voter", () =>
                adminRegisterVoter(
                  address as `0x${string}`,
                  newVoter as `0x${string}`
                )
              ).then(() => setNewVoter(""))
            }
          >
            {busy === "Register voter" ? "Registering..." : "Register"}
          </button>
        </div>
      </section>

      {/* ---------- Election control ---------- */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Election Control</h2>

        <div style={styles.row}>
          <button
            style={styles.btn}
            disabled={
              disabled || started || ended || (state?.candidateCount ?? 0) === 0
            }
            onClick={() => run("Start election", () => adminStartElection(address as `0x${string}`))}
          >
            {busy === "Start election" ? "Starting..." : "Start Election"}
          </button>

          <button
            style={{ ...styles.btn, background: "#7a1a1a" }}
            disabled={disabled || !started || ended}
            onClick={() => run("End election", () => adminEndElection(address as `0x${string}`))}
          >
            {busy === "End election" ? "Ending..." : "End Election"}
          </button>
        </div>
      </section>

      {/* ---------- Live results ---------- */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Live Results</h2>
        <div style={styles.resultsGrid}>
          {candidates.map((c) => (
            <div key={c.id.toString()} style={styles.resultCard}>
              <div style={styles.resultName}>{c.name}</div>
              <div style={styles.resultVotes}>{c.voteCount.toString()}</div>
            </div>
          ))}
        </div>
        <div style={styles.totalRow}>
          Total votes:{" "}
          <span style={styles.mono}>{state?.totalVotes.toString() ?? "0"}</span>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 20 },
  warnBox: {
    background: "#3b2c0f",
    border: "1px solid #7a5a1a",
    padding: 14,
    borderRadius: 10,
    color: "#ffd87a",
  },
  section: {
    background: "#12121a",
    border: "1px solid #26263a",
    borderRadius: 14,
    padding: 20,
  },
  sectionTitle: { margin: 0, marginBottom: 14, fontSize: 16 },
  hint: { color: "#8a8aa3", margin: "0 0 12px 0", fontSize: 13 },
  row: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: 220,
    background: "#0a0a0f",
    color: "#eaeaf0",
    border: "1px solid #26263a",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    fontFamily: "monospace",
  },
  btn: {
    background: "#7c5cff",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontWeight: 700,
    letterSpacing: 0.5,
    fontSize: 13,
    cursor: "pointer",
  },
  list: { listStyle: "none", padding: 0, margin: 0 },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #1f1f2a",
  },
  listItemMuted: {
    padding: "10px 0",
    color: "#8a8aa3",
    fontStyle: "italic",
  },
  muted: { color: "#a78bfa", fontFamily: "monospace", fontSize: 13 },
  mono: { fontFamily: "monospace" },
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 10,
    marginBottom: 14,
  },
  resultCard: {
    background: "#0a0a0f",
    border: "1px solid #26263a",
    borderRadius: 10,
    padding: 14,
  },
  resultName: { fontSize: 13, color: "#8a8aa3", marginBottom: 6 },
  resultVotes: {
    fontSize: 24,
    fontWeight: 700,
    fontFamily: "monospace",
    color: "#7c5cff",
  },
  totalRow: { fontSize: 13, color: "#a1a1b8" },
};