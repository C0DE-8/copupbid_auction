import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiRefreshCw, FiSearch, FiUsers } from "react-icons/fi";
import { Gavel, ShieldCheck, Trophy, WalletCards } from "lucide-react";
import styles from "./Auctions.module.css";
import coinImg from "../../assets/copupcoin.png";
import coinGif from "../../assets/copup.gif";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import SidebarFrame from "../../components/SidebarFrame/SidebarFrame";
import { api, imgUrl } from "../../lib/api";
import { emitBalanceUpdated } from "../../lib/copupEvents";
import { useToast } from "../../components/Toast/ToastContext";

const FILTERS = [
  { key: "all", label: "All rooms" },
  { key: "active", label: "Live" },
  { key: "pending", label: "Upcoming" },
  { key: "hold", label: "Holding" },
  { key: "completed", label: "Won" },
];

function formatCoins(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function formatMoney(value, currency = "NGN") {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${currency} 0`;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency || "NGN"} ${n.toLocaleString()}`;
  }
}

function coinsToCurrency(coins, rate) {
  const unit = Number(rate?.unit || 0);
  const price = Number(rate?.price || 0);
  if (!(unit > 0) || !(price > 0)) return 0;
  return (Number(coins || 0) / unit) * price;
}

function formatTime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const rest = mins % 60;
    return `${hours}h ${rest}m`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function secondsUntil(value, now = Date.now()) {
  if (!value) return 0;
  const target = new Date(String(value).replace(" ", "T")).getTime();
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.floor((target - now) / 1000));
}

function getCountdownParts(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(secs).padStart(2, "0"),
  };
}

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

function FlipUnit({ value, label }) {
  const previous = usePrevious(value);
  const changed = previous !== value && previous !== undefined;

  return (
    <div className={styles.flipUnit}>
      <div className={`${styles.flipCard} ${changed ? styles.flipCardActive : ""}`} aria-hidden="true">
        <div className={styles.flipSheet}>
          <div className={`${styles.flipPane} ${styles.flipPaneUp}`}>
            <span className={styles.flipInn}>{value}</span>
          </div>
          <div className={`${styles.flipPane} ${styles.flipPaneDown}`}>
            <span className={styles.flipInn}>{value}</span>
          </div>
        </div>

        {changed ? (
          <div key={`${label}-${previous}-before`} className={styles.flipBefore}>
            <div className={`${styles.flipPane} ${styles.flipPaneUp}`}>
              <span className={styles.flipShadow} />
              <span className={styles.flipInn}>{previous}</span>
            </div>
            <div className={`${styles.flipPane} ${styles.flipPaneDown}`}>
              <span className={styles.flipShadow} />
              <span className={styles.flipInn}>{previous}</span>
            </div>
          </div>
        ) : null}

        {changed ? (
          <div key={`${label}-${value}-active`} className={styles.flipActive}>
            <div className={`${styles.flipPane} ${styles.flipPaneUp}`}>
              <span className={styles.flipShadow} />
              <span className={styles.flipInn}>{value}</span>
            </div>
            <div className={`${styles.flipPane} ${styles.flipPaneDown}`}>
              <span className={styles.flipShadow} />
              <span className={styles.flipInn}>{value}</span>
            </div>
          </div>
        ) : null}
      </div>
      <span className={styles.flipLabel}>{label}</span>
    </div>
  );
}

function CountdownClock({ seconds, compact = false }) {
  const parts = getCountdownParts(seconds);
  return (
    <div className={`${styles.flipClock} ${compact ? styles.compactFlipClock : ""}`}>
      <FlipUnit value={parts.hours} label="Hours" />
      <span className={styles.flipSep}>:</span>
      <FlipUnit value={parts.minutes} label="Minutes" />
      <span className={styles.flipSep}>:</span>
      <FlipUnit value={parts.seconds} label="Seconds" />
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getAuctionImage(auction) {
  return auction?.image_url || auction?.image || "";
}

function getMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function Auctions() {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [auctions, setAuctions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [coinRate, setCoinRate] = useState(null);
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/users/profile");
      setProfile(data);
      localStorage.setItem("copup_bid_points", String(data?.bid_points ?? 0));
      localStorage.setItem("copup_task_coin", String(data?.task_coin ?? 0));
    } catch {
      setProfile(null);
    }
  }, []);

  const loadCoinRate = useCallback(async () => {
    try {
      const { data } = await api.get("/users/coin-rate");
      setCoinRate(data || null);
    } catch {
      setCoinRate(null);
    }
  }, []);

  const loadAuctions = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/users/auctions", { params: { limit: 100 } });
      const rows = Array.isArray(data?.data) ? data.data : [];
      setAuctions(rows.filter((item) => item.status !== "cancelled"));
    } catch (err) {
      setError(getMessage(err, "Unable to load auctions right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async () => {
    if (!auctionId) return;
    setDetailLoading(true);
    setError("");
    try {
      const [{ data: auction }, { data: liveStats }] = await Promise.all([
        api.get(`/users/auction/${auctionId}`),
        api.get(`/users/${auctionId}/stats`),
      ]);
      setDetail(auction);
      setStats(liveStats);
    } catch (err) {
      setError(getMessage(err, "Unable to open this auction room."));
    } finally {
      setDetailLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAuctions(), loadProfile(), loadCoinRate()]);
  }, [loadAuctions, loadProfile, loadCoinRate]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!auctionId) return undefined;
    const timer = window.setInterval(loadDetail, 8000);
    return () => window.clearInterval(timer);
  }, [auctionId, loadDetail]);

  const filteredAuctions = useMemo(() => {
    const term = query.trim().toLowerCase();
    return auctions.filter((auction) => {
      const statusMatch = filter === "all" || auction.status === filter;
      const text = `${auction.name || ""} ${auction.description || ""} ${auction.category || ""}`.toLowerCase();
      return statusMatch && (!term || text.includes(term));
    });
  }, [auctions, filter, query]);

  const selectedAuction = detail || auctions.find((item) => String(item.id) === String(auctionId));
  const isJoined = Boolean(stats?.isJoined || selectedAuction?.isJoined || selectedAuction?.is_joined);
  const entryOpen = selectedAuction ? ["pending", "active", "hold"].includes(selectedAuction.status) : false;
  const canBid = selectedAuction?.status === "active" && isJoined;
  const scheduledStartAt = selectedAuction?.scheduled_start_at || stats?.scheduled_start_at || stats?.scheduledStartAt;
  const scheduledStartSeconds = secondsUntil(scheduledStartAt, nowTick);
  const showScheduledStart = selectedAuction?.status === "pending" && scheduledStartSeconds > 0;
  const clockSeconds = showScheduledStart ? scheduledStartSeconds : displaySeconds;
  const detailTimerLabel = showScheduledStart
    ? "Auction start in"
    : selectedAuction?.status === "active"
      ? "Live countdown"
      : selectedAuction?.status === "hold"
        ? "Ready for admin start"
        : selectedAuction?.status === "completed"
          ? "Auction ended"
          : "Auction timer";
  const topBidder =
    stats?.leaderboard?.[0] ||
    (stats?.highestSpender
      ? {
          username: stats.highestSpender.username,
          totalSpent: stats.highestSpender.totalSpent,
        }
      : null);
  const completedWinner = selectedAuction?.status === "completed"
    ? (stats?.winner || (topBidder
        ? {
            username: topBidder.username,
            totalSpent: topBidder.total_spent ?? topBidder.totalSpent,
          }
        : null))
    : null;
  const winnerCoins = Number(completedWinner?.totalSpent || completedWinner?.finalPrice || selectedAuction?.final_price || 0);
  const winnerFiat = coinsToCurrency(winnerCoins, coinRate);

  useEffect(() => {
    setDisplaySeconds(Number(stats?.remainingSeconds ?? stats?.timerDuration ?? 0) || 0);
  }, [stats?.remainingSeconds, stats?.timerDuration, auctionId]);

  useEffect(() => {
    if (!auctionId) return undefined;
    const timer = window.setInterval(() => {
      setDisplaySeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [auctionId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function refreshAll() {
    setLoading(true);
    await Promise.all([loadAuctions(), loadProfile(), loadDetail()]);
  }

  async function handleJoin(id) {
    setBusyAction(`join-${id}`);
    setNotice("");
    try {
      await api.post(`/users/pay-entry/${id}`);
      setNotice("Entry confirmed. You can bid when this auction is live.");
      emitBalanceUpdated();
      await Promise.all([loadAuctions(), loadProfile(), loadDetail()]);
    } catch (err) {
      const msg = getMessage(err, "Unable to join auction.");
      setNotice(msg === "Entry fee already paid" ? "You already joined this auction." : msg);
      await loadDetail();
    } finally {
      setBusyAction("");
    }
  }

  async function handleBid(id) {
    setBusyAction(`bid-${id}`);
    setNotice("");
    try {
      const { data } = await api.post(`/users/bid/${id}`);
      toast.success(data?.message || "Bid placed successfully.");
      emitBalanceUpdated();
      await Promise.all([loadAuctions(), loadProfile(), loadDetail()]);
    } catch (err) {
      setNotice(getMessage(err, "Unable to place bid."));
      await loadDetail();
    } finally {
      setBusyAction("");
    }
  }

  const renderAuctionCard = (auction) => {
    const joined = Boolean(auction.is_joined || auction.isJoined);
    const cardEntryOpen = ["pending", "active", "hold"].includes(auction.status);
    const image = getAuctionImage(auction);
    const cardStartSeconds = auction.status === "pending"
      ? secondsUntil(auction.scheduled_start_at, nowTick)
      : 0;
    const showCardCountdown = cardStartSeconds > 0;

    return (
      <article className={`${styles.auctionCard} ${showCardCountdown ? styles.hasCountdown : ""}`} key={auction.id}>
        <button
          type="button"
          className={styles.cardImageButton}
          onClick={() => navigate(`/auctions/${auction.id}`)}
        >
          {image ? (
            <img src={imgUrl(image)} alt={auction.name} />
          ) : (
            <img src={coinImg} alt="" className={styles.fallbackImg} />
          )}
          <span className={`${styles.statusBadge} ${styles[auction.status] || ""}`}>
            {auction.status}
          </span>
        </button>

        <div className={styles.cardBody}>
          <div>
            <p className={styles.cardCategory}>{auction.category || "Auction item"}</p>
            <h2>{auction.name}</h2>
            <p>{auction.description || "Join the auction room and compete with CopUp Coins."}</p>
          </div>

          <div className={styles.cardStats}>
            <span><WalletCards size={15} /> {formatCoins(auction.entry_bid_points)} entry</span>
            <span><FiUsers /> {formatCoins(auction.participant_count)} joined</span>
          </div>

          {showCardCountdown ? (
            <div className={styles.cardStartCountdown}>
              <div className={styles.cardStartHeader}>
                <span>Auction start in</span>
                <strong>{formatTime(cardStartSeconds)}</strong>
              </div>
              <CountdownClock seconds={cardStartSeconds} compact />
            </div>
          ) : null}

          <div className={styles.cardActions}>
            <button type="button" onClick={() => navigate(`/auctions/${auction.id}`)}>
              View room
            </button>
            <button
              type="button"
              className={styles.joinButton}
              disabled={joined || !cardEntryOpen || busyAction === `join-${auction.id}`}
              onClick={() => handleJoin(auction.id)}
            >
              {joined ? "Joined" : !cardEntryOpen ? "Closed" : busyAction === `join-${auction.id}` ? "Joining..." : "Join auction"}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.content}>
        <SidebarFrame active="auctions">
          {notice ? <div className={styles.notice}>{notice}</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}

          {auctionId ? (
            <section className={styles.room}>
              <div className={styles.roomTopbar}>
                <button type="button" className={styles.backButton} onClick={() => navigate("/auctions")}>
                  <FiArrowLeft /> Auction list
                </button>
                <button type="button" className={styles.refreshButton} onClick={refreshAll}>
                  <FiRefreshCw /> Refresh
                </button>
              </div>

              {detailLoading && !selectedAuction ? (
                <div className={styles.loader}>
                  <img src={coinGif} alt="" />
                </div>
              ) : selectedAuction ? (
                <>
                  <div className={styles.roomHeroCard}>
                    <div className={styles.roomMedia}>
                      <img
                        src={imgUrl(getAuctionImage(selectedAuction)) || coinImg}
                        alt={selectedAuction.name}
                      />
                      <span className={`${styles.statusBadge} ${styles[selectedAuction.status] || ""}`}>
                        {selectedAuction.status}
                      </span>
                    </div>

                    <div className={styles.roomSummary}>
                      <p className={styles.cardCategory}>{selectedAuction.category || "Product auction"}</p>
                      <h1>{selectedAuction.name}</h1>
                      <p className={styles.roomDescription}>
                        {selectedAuction.description || "No product description has been added for this auction yet."}
                      </p>

                      <div className={styles.detailGrid}>
                        <div>
                          <span>Entry fee</span>
                          <strong>{formatCoins(selectedAuction.entry_bid_points)} coins</strong>
                        </div>
                        <div>
                          <span>Minimum users</span>
                          <strong>{formatCoins(selectedAuction.minimum_users)}</strong>
                        </div>
                        <div>
                          <span>Status</span>
                          <strong>{selectedAuction.status || "pending"}</strong>
                        </div>
                        <div>
                          <span>Listed</span>
                          <strong>{formatDate(selectedAuction.created_at)}</strong>
                        </div>
                      </div>

                      <div className={styles.topBidderCard}>
                        <Trophy size={20} />
                        <span>
                          <small>Top bidder</small>
                          <strong>{topBidder ? topBidder.username : "No bids yet"}</strong>
                        </span>
                        <b>{topBidder ? `${formatCoins(topBidder.total_spent ?? topBidder.totalSpent)} coins` : "0 coins"}</b>
                      </div>
                    </div>
                  </div>

                  <div className={styles.auctionWorkspace}>
                    <section className={styles.bidPanel}>
                      <div className={styles.panelTitleRow}>
                        <div>
                          <p className={styles.cardCategory}>Bidding room</p>
                          <h2>Auction control</h2>
                        </div>
                        <strong>{formatCoins(profile?.bid_points)} coins</strong>
                      </div>

                      <div className={styles.countdownModule} aria-label="Auction countdown">
                        <div className={styles.countdownHeader}>
                          <span>{detailTimerLabel}</span>
                          <strong>{clockSeconds > 0 ? formatTime(clockSeconds) : "0:00"}</strong>
                        </div>
                        <CountdownClock seconds={clockSeconds} />
                      </div>

                      <div className={styles.liveStats}>
                        <div>
                          <span>Current bid</span>
                          <strong>{formatCoins(stats?.currentBidAmount || selectedAuction.current_bid_amount)} coins</strong>
                        </div>
                        <div>
                          <span>Participants</span>
                          <strong>{formatCoins(stats?.participants || selectedAuction.participantCount)} joined</strong>
                        </div>
                        <div>
                          <span>Your spend</span>
                          <strong>{formatCoins(stats?.myTotalSpent)} coins</strong>
                        </div>
                      </div>

                      {completedWinner ? (
                        <div className={styles.winnerCallout}>
                          <div className={styles.winnerIcon}>
                            {completedWinner.profile ? (
                              <img src={imgUrl(completedWinner.profile)} alt="" />
                            ) : (
                              <Trophy size={24} />
                            )}
                          </div>
                          <div className={styles.winnerCopy}>
                            <span>Winning bidder</span>
                            <h3>{completedWinner.username || "Winner"}</h3>
                            <p>
                              Won this auction with <strong>{formatCoins(winnerCoins)} coins</strong>
                              {" "}spent, valued at <strong>{formatMoney(winnerFiat, coinRate?.currency || "NGN")}</strong>.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div className={styles.roomActions}>
                        {!isJoined ? (
                          <button
                            type="button"
                            className={styles.joinButton}
                            disabled={!entryOpen || busyAction === `join-${selectedAuction.id}`}
                            onClick={() => handleJoin(selectedAuction.id)}
                          >
                            {!entryOpen ? "Entry closed" : busyAction === `join-${selectedAuction.id}` ? "Joining..." : `Join for ${formatCoins(selectedAuction.entry_bid_points)} coins`}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={!canBid || busyAction === `bid-${selectedAuction.id}`}
                          onClick={() => handleBid(selectedAuction.id)}
                        >
                          {busyAction === `bid-${selectedAuction.id}` ? "Placing bid..." : "Place next bid"}
                        </button>
                      </div>

                      {!isJoined ? (
                        <p className={styles.helper}>Join the auction first. The backend will only accept bids from paid participants.</p>
                      ) : selectedAuction.status !== "active" ? (
                        <p className={styles.helper}>You are in this room. Bidding opens when the auction status becomes live.</p>
                      ) : (
                        <p className={styles.helper}>Each bid uses the platform bid increment and refreshes the live timer rules.</p>
                      )}
                    </section>

                    <aside className={styles.sidePanel}>
                      <h3>Leaderboard</h3>
                      {stats?.leaderboard?.length ? (
                        <div className={styles.leaderboard}>
                          {stats.leaderboard.map((row, index) => (
                            <div key={`${row.userId}-${index}`}>
                              <span>{index + 1}. {row.username}</span>
                              <strong>{formatCoins(row.totalSpent)} coins</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No bids yet. Be the first bidder when this room is active.</p>
                      )}
                    </aside>
                  </div>
                </>
              ) : null}
            </section>
          ) : (
            <section className={styles.listSection}>
              <div className={styles.controls}>
                <div className={styles.searchBox}>
                  <FiSearch />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search auction items"
                    aria-label="Search auction items"
                  />
                </div>
                <div className={styles.filterRow}>
                  {FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={filter === item.key ? styles.activeFilter : ""}
                      onClick={() => setFilter(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className={styles.loader}>
                  <img src={coinGif} alt="" />
                </div>
              ) : filteredAuctions.length ? (
                <div className={styles.auctionGrid}>{filteredAuctions.map(renderAuctionCard)}</div>
              ) : (
                <div className={styles.emptyState}>
                  <Gavel size={38} />
                  <h2>No auction items found</h2>
                  <p>When admin opens auction rooms, they will appear here for users to join and bid.</p>
                </div>
              )}
            </section>
          )}

          <section className={styles.infoStrip}>
            <div><ShieldCheck size={20} /><span>Entry fee is paid before bidding.</span></div>
            <div><Gavel size={20} /><span>Live bids use CopUp Coins.</span></div>
            <div><Trophy size={20} /><span>The highest bidder wins when the timer ends.</span></div>
          </section>

          <div className={styles.linkRow}>
            <Link to="/account">Buy more coins</Link>
            <Link to="/cart">Auction wins cart</Link>
          </div>
        </SidebarFrame>
      </main>
      <Footer />
    </div>
  );
}
