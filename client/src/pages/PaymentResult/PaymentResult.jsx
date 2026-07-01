import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./PaymentResult.module.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { FiCheckCircle, FiXCircle, FiArrowLeft } from "react-icons/fi";
import { api } from "../../lib/api"; // ✅ add

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function PaymentResult() {
  const nav = useNavigate();
  const q = useQuery();

  const status = String(q.get("status") || "").toLowerCase();
  const coins = safeNum(q.get("coins"));
  const amount = safeNum(q.get("amount"));
  const reason = q.get("reason") || "";

  const ok = status === "success";

  const [profile, setProfile] = useState(null);

  // ✅ Optional: confirm new balance by fetching profile after success
  useEffect(() => {
    if (!ok) return;
    (async () => {
      try {
        const { data } = await api.get("/users/profile");
        setProfile(data);

        // cache like you do in dashboard
        if (data?.bid_points !== undefined) {
          localStorage.setItem("copup_bid_points", String(data.bid_points ?? 0));
        }
        if (data?.task_coin !== undefined) {
          localStorage.setItem("copup_task_coin", String(data.task_coin ?? 0));
        }
      } catch (e) {
        console.error("PaymentResult profile fetch failed:", e);
      }
    })();
  }, [ok]);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => {
      nav("/account?tab=deposit");
    }, 4500);
    return () => clearTimeout(t);
  }, [ok, nav]);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            {ok ? (
              <FiCheckCircle className={styles.okIcon} />
            ) : (
              <FiXCircle className={styles.badIcon} />
            )}
          </div>

          <div className={styles.title}>
            {ok ? "Payment Successful" : "Payment Failed"}
          </div>

          <div className={styles.sub}>
            {ok
              ? "Your top-up has been verified and your balance has been updated."
              : "We couldn’t complete your payment verification."}
          </div>

          <div className={styles.details}>
            {ok ? (
              <>
                <div className={styles.row}>
                  <span>Credited Coins</span>
                  <b>{coins.toLocaleString()}</b>
                </div>
                <div className={styles.row}>
                  <span>Amount Paid</span>
                  <b>{amount.toLocaleString()}</b>
                </div>

                {/* ✅ Optional balance confirmation */}
                {profile?.bid_points !== undefined ? (
                  <div className={styles.row}>
                    <span>New Bid Points</span>
                    <b>{Number(profile.bid_points).toLocaleString()}</b>
                  </div>
                ) : null}
              </>
            ) : (
              <div className={styles.reason}>
                <b>Reason:</b>{" "}
                {reason ? decodeURIComponent(reason) : "Payment not successful"}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={() => nav("/account?tab=deposit")}
            >
              Go to Deposit
            </button>

            <button className={styles.ghostBtn} onClick={() => nav(-1)}>
              <FiArrowLeft /> Back
            </button>
          </div>

          {ok ? <div className={styles.note}>Redirecting you back to Deposit…</div> : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}