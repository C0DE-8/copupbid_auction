// src/pages/HeistResult/HeistResult.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "./HeistResult.module.css";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { api, imgUrl } from "../../lib/api";
import { useToast } from "../../components/Toast/ToastContext.jsx";

function fmtSeconds(s) {
  if (s == null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return "—";
  const mm = String(Math.floor(n / 60)).padStart(2, "0");
  const ss = String(Math.floor(n % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function HeistResult() {
  const { id } = useParams();
  const heistId = Number(id);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [heist, setHeist] = useState(null);
  const [winner, setWinner] = useState(null);
  const [userBestTime, setUserBestTime] = useState(null);

  const fetchResult = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/heists/heist/${heistId}/result`);
      setHeist(data?.heist || null);
      setUserBestTime(data?.userBestTime != null ? Number(data.userBestTime) : null);
      setWinner(
        data?.winner
          ? { ...data.winner, image: data?.winner?.image ? imgUrl(data.winner.image) : "" }
          : null
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load result");
    } finally {
      setLoading(false);
    }
  }, [toast, heistId]);

  useEffect(() => {
    if (!Number.isFinite(heistId)) return;
    fetchResult();
  }, [fetchResult, heistId]);

  const status = useMemo(() => String(heist?.status || "").toLowerCase(), [heist?.status]);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.topRow}>
            <Link to={`/heist/${heistId}`} className={styles.backBtn}>
              ← Back to Heist
            </Link>
            <button className={styles.ghostBtn} onClick={fetchResult} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.title}>
              {loading ? "Loading…" : heist?.name || "Heist Result"}
            </div>

            <div className={styles.meta}>
              <span className={styles.pill}>
                Status: <b>{status ? status.toUpperCase() : "—"}</b>
              </span>
              <span className={styles.pill}>
                Your best: <b>{fmtSeconds(userBestTime)}</b>
              </span>
            </div>

            <div className={styles.winnerBox}>
              <div className={styles.wLabel}>Winner</div>

              {winner ? (
                <div className={styles.wRow}>
                  {winner.image ? (
                    <img src={winner.image} alt="winner" className={styles.avatar} />
                  ) : (
                    <div className={styles.avatarFallback} />
                  )}
                  <div>
                    <div className={styles.wName}>{winner.username || winner.full_name || "Unknown"}</div>
                    <div className={styles.wSub}>Winner ID: {winner.id}</div>
                  </div>
                </div>
              ) : (
                <div className={styles.wEmpty}>
                  No winner yet. Winner appears when the heist is completed.
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <Link to={`/heist/${heistId}`} className={styles.primaryBtn}>
                Go to Play
              </Link>
              <Link to="/heist" className={styles.ghostBtn}>
                All Heists
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}