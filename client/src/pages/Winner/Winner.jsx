import React, { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import SidebarFrame from "../../components/SidebarFrame/SidebarFrame";
import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import styles from "./Winner.module.css";
import { api, imgUrl } from "../../lib/api";
import { Award, Crown, RefreshCw, Trophy, Users } from "lucide-react";

function formatCoins(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function formatMoney(value, currency = "NGN") {
  const n = Number(value);
  if (!Number.isFinite(n)) return `0 ${currency}`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function coinsToCurrency(coins, rate) {
  const amount = Number(coins) || 0;
  const unit = Number(rate?.unit) || 0;
  const price = Number(rate?.price) || 0;
  if (!amount || !unit || !price) return null;
  return (amount / unit) * price;
}

function initial(name) {
  return String(name || "W").trim().slice(0, 1).toUpperCase() || "W";
}

export default function Winner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [coinRate, setCoinRate] = useState(null);

  const loadWinners = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [auctionRes, rateRes] = await Promise.allSettled([
        api.get("/users/auctions", { params: { status: "completed", limit: 100 } }),
        api.get("/users/coin-rate"),
      ]);

      if (rateRes.status === "fulfilled") {
        setCoinRate(rateRes.value.data || null);
      }

      if (auctionRes.status !== "fulfilled") {
        throw auctionRes.reason;
      }

      const auctions = Array.isArray(auctionRes.value.data?.data)
        ? auctionRes.value.data.data
        : [];

      const detailResults = await Promise.allSettled(
        auctions.map((auction) => api.get(`/users/${auction.id}/stats`))
      );

      const merged = auctions.map((auction, index) => {
        const stats =
          detailResults[index]?.status === "fulfilled"
            ? detailResults[index].value.data
            : null;
        const winner = stats?.winner || null;
        const spent = Number(winner?.totalSpent || winner?.finalPrice || stats?.currentBidAmount || 0);

        return {
          auction,
          stats,
          winner,
          spent,
        };
      });

      setItems(merged.filter((row) => row.winner || row.auction?.status === "completed"));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to load winners.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWinners();
  }, [loadWinners]);

  const totalCoins = useMemo(
    () => items.reduce((sum, row) => sum + (Number(row.spent) || 0), 0),
    [items]
  );
  const totalValue = coinsToCurrency(totalCoins, coinRate);
  const featured = items[0] || null;

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <SidebarFrame active="winners">
          <div className={styles.container}>
            <section className={styles.hero}>
              <div className={styles.heroCard}>
                <div className={styles.heroTop}>
                  <div className={styles.heroIcon}>
                    <Trophy size={22} />
                  </div>
                  <div className={styles.heroMain}>
                    <div className={styles.heroTitle}>Auction Winners</div>
                    <div className={styles.heroSub}>
                      Completed CopUpBid auctions, winner profiles, and total winning spend.
                    </div>
                    <div className={styles.pills}>
                      <span className={styles.pill}><Crown size={14} /> {items.length} completed wins</span>
                      <span className={styles.pillAlt}>{formatCoins(totalCoins)} coins spent</span>
                      {totalValue !== null ? (
                        <span className={styles.pillAlt}>{formatMoney(totalValue, coinRate?.currency || "NGN")}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.heroActions}>
                    <button type="button" className={styles.btnPrimary} onClick={loadWinners} disabled={loading}>
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.body}>
              {loading ? (
                <SkeletonGrid count={6} />
              ) : error ? (
                <div className={styles.stateCard}>
                  <div className={styles.stateTop}>
                    <div className={styles.stateIcon}><Award size={20} /></div>
                    <div>
                      <div className={styles.stateTitle}>We could not load winners</div>
                      <div className={styles.stateSub}>{error}</div>
                    </div>
                  </div>
                  <div className={styles.stateActions}>
                    <button type="button" className={styles.btnPrimary} onClick={loadWinners}>
                      <RefreshCw size={16} />
                      Try again
                    </button>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className={styles.stateCard}>
                  <div className={styles.stateTop}>
                    <div className={styles.stateIcon}><Trophy size={20} /></div>
                    <div>
                      <div className={styles.stateTitle}>No completed winners yet</div>
                      <div className={styles.stateSub}>
                        Completed auction winners will appear here once auction rooms close.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {featured ? (
                    <article className={styles.featuredWinner}>
                      <div className={styles.featuredMedia}>
                        {featured.auction?.image_url || featured.auction?.image ? (
                          <img src={imgUrl(featured.auction.image_url || featured.auction.image)} alt="" />
                        ) : (
                          <Trophy size={34} />
                        )}
                      </div>
                      <div className={styles.featuredCopy}>
                        <span>Latest winner</span>
                        <h2>{featured.winner?.username || "Winner"}</h2>
                        <p>
                          Won <strong>{featured.auction?.name || "Auction item"}</strong> with{" "}
                          <strong>{formatCoins(featured.spent)} coins</strong>
                          {coinsToCurrency(featured.spent, coinRate) !== null
                            ? `, valued at ${formatMoney(coinsToCurrency(featured.spent, coinRate), coinRate?.currency || "NGN")}`
                            : ""}
                          .
                        </p>
                      </div>
                      <div className={styles.featuredAvatar}>
                        {featured.winner?.profile ? (
                          <img src={imgUrl(featured.winner.profile)} alt="" />
                        ) : (
                          initial(featured.winner?.username)
                        )}
                      </div>
                    </article>
                  ) : null}

                  <div className={styles.winnerGrid}>
                    {items.map(({ auction, stats, winner, spent }) => {
                      const fiat = coinsToCurrency(spent, coinRate);
                      return (
                        <article className={styles.winnerCard} key={auction.id}>
                          <div className={styles.winnerCover}>
                            {auction.image_url || auction.image ? (
                              <img src={imgUrl(auction.image_url || auction.image)} alt="" />
                            ) : (
                              <Trophy size={26} />
                            )}
                            <span>{auction.category || "auction"}</span>
                          </div>

                          <div className={styles.winnerRow}>
                            <div className={styles.avatarWrap}>
                              {winner?.profile ? (
                                <img className={styles.avatar} src={imgUrl(winner.profile)} alt="" />
                              ) : (
                                <div className={styles.avatarFallback}>{initial(winner?.username)}</div>
                              )}
                            </div>
                            <div className={styles.winnerMain}>
                              <div className={styles.winnerName}>{winner?.username || "Winner"}</div>
                              <div className={styles.winnerSub}>Won {auction.name || `Auction #${auction.id}`}</div>
                            </div>
                          </div>

                          <div className={styles.metaGrid}>
                            <div className={styles.metaItem}>
                              <div className={styles.metaLabel}>Spent</div>
                              <div className={styles.metaValue}>{formatCoins(spent)} coins</div>
                            </div>
                            <div className={styles.metaItem}>
                              <div className={styles.metaLabel}>Value</div>
                              <div className={styles.metaValue}>
                                {fiat !== null ? formatMoney(fiat, coinRate?.currency || "NGN") : "Rate unavailable"}
                              </div>
                            </div>
                            <div className={styles.metaItem}>
                              <div className={styles.metaLabel}>Participants</div>
                              <div className={styles.metaValue}>
                                <Users size={14} /> {formatCoins(stats?.participants || auction.participant_count || 0)}
                              </div>
                            </div>
                            <div className={styles.metaItem}>
                              <div className={styles.metaLabel}>Status</div>
                              <div className={styles.metaValue}>Completed</div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </div>
        </SidebarFrame>
      </main>
      <Footer />
    </div>
  );
}
