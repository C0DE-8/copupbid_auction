import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Heist.module.css";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { api, imgUrl } from "../../lib/api";
import { useToast } from "../../components/Toast/ToastContext.jsx";

import HeistHero from "./components/HeistHero";
import HeistCard from "./components/HeistCard";
import HeistSkeleton from "./components/HeistSkeleton";
import HeistEmpty from "./components/HeistEmpty";
import HeistRules from "./components/HeistRules";

function safeNum(v, f = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : f;
}

function toneFromStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v === "started") return "live";
  return "pending";
}

function sortHeists(list) {
  const rank = (s) => (String(s || "").toLowerCase() === "started" ? 0 : 1);
  return [...list].sort(
    (a, b) => rank(a.status) - rank(b.status) || safeNum(b.id) - safeNum(a.id)
  );
}

export default function Heist() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [heists, setHeists] = useState([]);
  const [payingId, setPayingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchHeists = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/heists/heists/available");

      // ✅ NEW BACKEND SHAPE: { server_time, heists: [] }
      const list = Array.isArray(data?.heists) ? data.heists : [];

      setHeists(sortHeists(list));
    } catch (e) {
      console.error("fetch heists error:", e);
      setHeists([]);
      toast.error(e?.response?.data?.message || e?.message || "Failed to load heists");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHeists();
  }, [fetchHeists, refreshKey]);

  const totalLive = useMemo(
    () => heists.filter((h) => String(h.status || "").toLowerCase() === "started").length,
    [heists]
  );

  const totalOpen = useMemo(
    () =>
      heists.filter((h) => ["pending", "started"].includes(String(h.status || "").toLowerCase()))
        .length,
    [heists]
  );

  const handlePayEntry = useCallback(
    async (heistId) => {
      setPayingId(heistId);
      try {
        const { data } = await api.post(`/heists/pay-entry/${heistId}`);
        toast.success(data?.message || "Entry paid. You can now play.");
        setRefreshKey((v) => v + 1);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Failed to pay entry";
        toast.error(msg);
      } finally {
        setPayingId(null);
      }
    },
    [toast]
  );

  const handleOpenHeist = useCallback(
    (heistId) => {
      navigate(`/heist/${heistId}`); // change if your route differs
    },
    [navigate]
  );

  const handleRefresh = useCallback(() => {
    toast.info("Refreshing heists…");
    setRefreshKey((v) => v + 1);
  }, [toast]);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <HeistHero totalOpen={totalOpen} totalLive={totalLive} onRefresh={handleRefresh} />

          <div className={styles.grid}>
            {loading ? (
              <>
                <HeistSkeleton />
                <HeistSkeleton />
                <HeistSkeleton />
              </>
            ) : heists.length === 0 ? (
              <HeistEmpty onRefresh={handleRefresh} />
            ) : (
              heists.map((h) => {
                const participantsJoined = safeNum(h.participantsJoined, safeNum(h.participants_count, 0));
                const minUsers = safeNum(h.minUsers, safeNum(h.min_users, 0));

                return (
                  <HeistCard
                    key={h.id}
                    heist={{
                      ...h,

                      // ✅ images
                      prize_image: h?.prize_image ? imgUrl(h.prize_image) : "",

                      // ✅ normalize counts
                      participantsJoined,
                      minUsers,

                      // ✅ normalize prices
                      ticket_price: safeNum(h.ticket_price, 0),
                      retry_ticket_price: safeNum(h.retry_ticket_price, 0),

                      // ✅ normalize new flags
                      ended: !!h.ended,
                      canStart: !!h.canStart,
                      submissions_locked: !!h.submissions_locked,
                    }}
                    tone={toneFromStatus(h.status)}
                    paying={payingId === h.id}
                    onPay={() => handlePayEntry(h.id)}
                    onOpen={() => handleOpenHeist(h.id)}
                  />
                );
              })
            )}
          </div>

          <HeistRules />
        </div>
      </main>

      <Footer />
    </div>
  );
}