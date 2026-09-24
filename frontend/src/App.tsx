import { useCallback, useEffect, useState } from "react";
import {
  connectWallet,
  getCurrentAccount,
  getBalance,
  isMetaMaskInstalled,
} from "./lib/wallet";
import {
  readElectionState,
  readElectionName,
  readCandidates,
  readVoterStatus,
  castVote,
  type Candidate,
} from "./lib/blockvote";
import { CandidateCard } from "./components/CandidateCard";

type ElectionState = {
  started: boolean;
  ended: boolean;
  candidateCount: number;
  totalVotes: bigint;
};

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("0");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [electionName, setElectionName] = useState("");
  const [state, setState] = useState<ElectionState | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voter, setVoter] = useState({ registered: false, hasVoted: false });
  const [votingId, setVotingId] = useState<bigint | null>(null);

  // Load chain data
  const refreshChainData = useCallback(
    async (viewer?: string | null) => {
      try {
        const [name, es, cs] = await Promise.all([
          readElectionName(),
          readElectionState(),
          readCandidates(),
        ]);
        setElectionName(name);
        setState(es);
        setCandidates(cs);

        const who = viewer ?? address;
        if (who) {
          const vs = await readVoterStatus(who as `0x${string}`);
          setVoter(vs);
          setBalance(await getBalance(who));
        }
      } catch (e) {
        // Ignore initial errors before wallet connects
        console.warn(e);
      }
    },
    [address]
  );

  useEffect(() => {
    (async () => {
      const acc = await getCurrentAccount();
      if (acc) {
        setAddress(acc);
        setBalance(await getBalance(acc));
      }
      await refreshChainData(acc);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setError(null);
    setNotice(null);
    setConnecting(true);
    try {
      const acc = await connectWallet();
      setAddress(acc);
      setBalance(await getBalance(acc));
      await refreshChainData(acc);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  async function handleVote(candidateId: bigint) {
    if (!address) {
      setError("Connect your wallet first");
      return;
    }
    setError(null);
    setNotice(null);
    setVotingId(candidateId);
    try {
      const hash = await castVote(address as `0x${string}`, candidateId);
      setNotice(
        `Transaction sent: ${hash.slice(0, 10)}...${hash.slice(-6)} — waiting for confirmation...`
      );

      // Poll for a few seconds until the state updates
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const vs = await readVoterStatus(address as `0x${string}`);
        if (vs.hasVoted) {
          setNotice("✔ Your vote has been recorded on-chain");
          await refreshChainData(address);
          break;
        }
      }
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.cause?.reason ||
        e?.details ||
        e?.message ||
        "Vote failed";
      setError(String(msg).split("\n")[0]);
    } finally {
      setVotingId(null);
    }
  }

  function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  const canVote =
    !!address &&
    voter.registered &&
    !voter.hasVoted &&
    state?.started === true &&
    state?.ended === false;

  // ---------- UI ----------

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.brandDot} />
          <span style={styles.brandName}>BLOCKVOTE</span>
        </div>
        <div style={styles.headerRight}>
          {address ? (
            <div style={styles.walletPill}>
              <span style={styles.walletDot} />
              <span style={styles.walletAddr}>{shortAddr(address)}</span>
              <span style={styles.walletBal}>
                {Number(balance).toFixed(2)} ETH
              </span>
            </div>
          ) : (
            <button
              style={styles.connectBtn}
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>Blockchain Voting Platform</h1>
        <p style={styles.subtitle}>
          {electionName || "Loading..."} · Ethereum Sepolia (local)
        </p>

        {!isMetaMaskInstalled() && (
          <div style={styles.warnBox}>
            MetaMask is not installed. Install it from{" "}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#ffd87a" }}
            >
              metamask.io
            </a>{" "}
            and refresh.
          </div>
        )}

        {error && <div style={styles.errorBox}>❌ {error}</div>}
        {notice && <div style={styles.noticeBox}>{notice}</div>}

        {state && (
          <div style={styles.statusRow}>
            <StatusBadge
              label="Election"
              value={
                state.ended
                  ? "ENDED"
                  : state.started
                    ? "LIVE"
                    : "NOT STARTED"
              }
              color={
                state.ended ? "#a78bfa" : state.started ? "#4ade80" : "#8a8aa3"
              }
            />
            <StatusBadge
              label="Your status"
              value={
                !address
                  ? "Not connected"
                  : !voter.registered
                    ? "Not registered"
                    : voter.hasVoted
                      ? "Voted ✓"
                      : "Eligible"
              }
              color={
                !address
                  ? "#8a8aa3"
                  : !voter.registered
                    ? "#ff9b9b"
                    : voter.hasVoted
                      ? "#4ade80"
                      : "#ffd87a"
              }
            />
            <StatusBadge
              label="Total votes"
              value={state.totalVotes.toString()}
              color="#a78bfa"
            />
          </div>
        )}

        <div style={styles.list}>
          {candidates.length === 0 && state && state.candidateCount === 0 && (
            <div style={styles.empty}>
              No candidates yet. Admin must add candidates.
            </div>
          )}

          {candidates.map((c) => (
            <CandidateCard
              key={c.id.toString()}
              candidate={c}
              canVote={canVote}
              voting={votingId === c.id}
              onVote={handleVote}
              totalVotes={state?.totalVotes ?? 0n}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={styles.statusBadge}>
      <div style={styles.statusLabel}>{label}</div>
      <div style={{ ...styles.statusValue, color }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#eaeaf0",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 32px",
    borderBottom: "1px solid #1f1f2a",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#7c5cff",
    boxShadow: "0 0 12px #7c5cff",
  },
  brandName: { fontWeight: 700, letterSpacing: 2 },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  connectBtn: {
    background: "#7c5cff",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
  walletPill: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#14141c",
    border: "1px solid #26263a",
    padding: "8px 14px",
    borderRadius: 999,
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4ade80",
  },
  walletAddr: { fontFamily: "monospace", fontSize: 13 },
  walletBal: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#a78bfa",
  },
  main: { maxWidth: 760, margin: "0 auto", padding: "48px 24px" },
  title: { fontSize: 36, margin: 0, textAlign: "center", fontWeight: 700 },
  subtitle: {
    textAlign: "center",
    color: "#8a8aa3",
    marginTop: 8,
    marginBottom: 32,
  },
  warnBox: {
    background: "#3b2c0f",
    border: "1px solid #7a5a1a",
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
    color: "#ffd87a",
  },
  errorBox: {
    background: "#3b0f0f",
    border: "1px solid #7a1a1a",
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
    color: "#ff9b9b",
  },
  noticeBox: {
    background: "#122f1c",
    border: "1px solid #1d6a3e",
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
    color: "#7bffae",
  },
  statusRow: {
    display: "flex",
    gap: 12,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  statusBadge: {
    flex: 1,
    minWidth: 140,
    background: "#12121a",
    border: "1px solid #26263a",
    borderRadius: 10,
    padding: "12px 14px",
  },
  statusLabel: {
    fontSize: 11,
    color: "#8a8aa3",
    letterSpacing: 1,
    marginBottom: 6,
  },
  statusValue: { fontSize: 15, fontWeight: 700 },
  list: { marginTop: 8 },
  empty: {
    textAlign: "center",
    color: "#8a8aa3",
    padding: 40,
    border: "1px dashed #26263a",
    borderRadius: 12,
  },
};

export default App;