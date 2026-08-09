import "./Dashboard.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Camera,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileSearch,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldX,
  Target,
  TrendingUp,
} from "lucide-react";

/* =========================================================
   CONFIG
========================================================= */

const API = "http://192.168.0.100:8000";

/* =========================================================
   TYPES
========================================================= */

type Decision = "PROCEED" | "REVIEW" | "STOP";

type ScanType = "message" | "image";



interface Scan {
  id: string;
  type: ScanType;
  input?: string | null;
  filename?: string | null;
  riskScore: number;
  decision: Decision;
  category?: string;
  summary?: string;
  createdAt?: string | null;
}

interface Overview {
  totalScans: number;
  safeScans: number;
  reviewScans: number;
  dangerousScans: number;
  averageRisk: number;
  highestRisk: number;
  lowestRisk: number;
  totalThreats: number;
  financialRiskScans: number;
  privacyRiskScans: number;
}

interface RiskDistribution {
  proceed: number;
  review: number;
  stop: number;
}

interface ScannerTypes {
  message: number;
  image: number;
}

interface ThreatSeverity {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
}

interface CategoryData {
  category: string;
  count: number;
  averageRisk: number;
}

interface DailyTrend {
  date: string;
  scans: number;
  averageRisk: number;
  proceed: number;
  review: number;
  stop: number;
}

interface DashboardData {
  success: boolean;
  overview: Overview;
  riskDistribution: RiskDistribution;
  scannerTypes: ScannerTypes;
  threatSeverity: ThreatSeverity;
  categories: CategoryData[];
  dailyTrend: DailyTrend[];
  recentScans: Scan[];
  highRiskScans: Scan[];
}

interface Props {
  onBackToScanner?: () => void;
}

/* =========================================================
   DEFAULT DATA
========================================================= */

const EMPTY_DASHBOARD: DashboardData = {
  success: true,

  overview: {
    totalScans: 0,
    safeScans: 0,
    reviewScans: 0,
    dangerousScans: 0,
    averageRisk: 0,
    highestRisk: 0,
    lowestRisk: 0,
    totalThreats: 0,
    financialRiskScans: 0,
    privacyRiskScans: 0,
  },

  riskDistribution: {
    proceed: 0,
    review: 0,
    stop: 0,
  },

  scannerTypes: {
    message: 0,
    image: 0,
  },

  threatSeverity: {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  },

  categories: [],
  dailyTrend: [],
  recentScans: [],
  highRiskScans: [],
};

/* =========================================================
   HELPERS
========================================================= */

function formatCategory(value?: string): string {
  return String(value || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "No timestamp";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function Dashboard({
  onBackToScanner,
}: Props) {
  const [data, setData] =
    useState<DashboardData>(EMPTY_DASHBOARD);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  /* =======================================================
     FETCH DASHBOARD
  ======================================================= */

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          `${API}/api/dashboard`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.detail ||
              "Dashboard request failed."
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to connect to backend."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* =======================================================
     INITIAL LOAD + AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    const refreshTimer = window.setInterval(() => {
      void loadDashboard(true);
    }, 15000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(refreshTimer);
    };
  }, [loadDashboard]);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const totalDecisions =
    data.riskDistribution.proceed +
    data.riskDistribution.review +
    data.riskDistribution.stop;

  const donutStyle = useMemo(() => {
    if (totalDecisions === 0) {
      return {
        background:
          "conic-gradient(rgba(255,255,255,.06) 0 360deg)",
      };
    }

    const proceedAngle =
      (data.riskDistribution.proceed /
        totalDecisions) *
      360;

    const reviewAngle =
      (data.riskDistribution.review /
        totalDecisions) *
      360;

    return {
      background: `
        conic-gradient(
          #5ee7a7 0 ${proceedAngle}deg,
          #f7c85c ${proceedAngle}deg
          ${proceedAngle + reviewAngle}deg,
          #ff6571
          ${proceedAngle + reviewAngle}deg
          360deg
        )
      `,
    };
  }, [
    data.riskDistribution,
    totalDecisions,
  ]);

  const maxDay = Math.max(
    1,
    ...data.dailyTrend.map(
      (item) => item.scans
    )
  );

  const chartPoints = data.dailyTrend
    .map((item, index) => {
      const x =
        data.dailyTrend.length === 1
          ? 50
          : (index /
              (data.dailyTrend.length - 1)) *
            100;

      const y =
        94 -
        (item.scans / maxDay) * 72;

      return `${x},${y}`;
    })
    .join(" ");

  const maxCategory = Math.max(
    1,
    ...data.categories.map(
      (item) => item.count
    )
  );

  const maxSeverity = Math.max(
    1,
    data.threatSeverity.LOW,
    data.threatSeverity.MEDIUM,
    data.threatSeverity.HIGH,
    data.threatSeverity.CRITICAL
  );

  const scannerTotal =
    data.scannerTypes.message +
    data.scannerTypes.image;

  const messagePercentage =
    scannerTotal > 0
      ? Math.round(
          (data.scannerTypes.message /
            scannerTotal) *
            100
        )
      : 0;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="dashboard-page">
      {/* Background */}
      <div className="dashboard-background-grid" />
      <div className="dashboard-glow dashboard-glow-one" />
      <div className="dashboard-glow dashboard-glow-two" />

      <div className="dashboard-shell">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="dashboard-header">

          <div className="dashboard-brand">

            <div className="dashboard-brand-icon">
              <Shield size={19} />
            </div>

            <div>
              <div className="dashboard-brand-name">
                Trap<span>Veil</span>
              </div>

              <div className="dashboard-brand-subtitle">
                Digital Safety Intelligence
              </div>
            </div>

          </div>

          <div className="dashboard-header-actions">

            <div className="live-status">
              <span className="live-dot" />
              Live analytics
            </div>

            <button
              type="button"
              className="dashboard-refresh"
              onClick={() =>
                void loadDashboard(true)
              }
              disabled={refreshing}
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "refresh-spinning"
                    : ""
                }
              />

              {refreshing
                ? "Updating"
                : "Refresh"}
            </button>

            {onBackToScanner && (
              <button
                type="button"
                className="dashboard-back-button"
                onClick={onBackToScanner}
              >
                <FileSearch size={15} />
                Scanner
              </button>
            )}

          </div>

        </header>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="dashboard-hero">

          <div>

            <div className="dashboard-eyebrow">
              <LayoutDashboard size={13} />
              SECURITY OPERATIONS CENTER
            </div>

            <h1>
              Threat intelligence,
              <span> at a glance.</span>
            </h1>

            <p>
              Real-time visibility into every
              TrapVeil analysis, risk signal,
              and detected threat.
            </p>

          </div>

          <div className="dashboard-system-card">

            <div className="system-card-orbit">
              <ShieldCheck size={23} />
            </div>

            <div>
              <strong>
                Protection engine
              </strong>

              <span>
                MongoDB + TrapVeil AI
              </span>
            </div>

            <b className="system-online">
              <i />
              Online
            </b>

          </div>

        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="dashboard-error">

            <CircleAlert size={17} />

            <div>
              <strong>
                Dashboard connection issue
              </strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
            >
              Retry
            </button>

          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="dashboard-stat-grid">

          <Stat
            title="Total scans"
            value={data.overview.totalScans}
            icon={<Activity size={17} />}
            cls="blue"
            note="All TrapVeil analyses"
          />

          <Stat
            title="Safe"
            value={data.overview.safeScans}
            icon={<ShieldCheck size={17} />}
            cls="green"
            note="PROCEED decisions"
          />

          <Stat
            title="Needs review"
            value={data.overview.reviewScans}
            icon={<AlertTriangle size={17} />}
            cls="yellow"
            note="REVIEW decisions"
          />

          <Stat
            title="High risk"
            value={data.overview.dangerousScans}
            icon={<ShieldX size={17} />}
            cls="red"
            note="STOP decisions"
          />

        </section>

        {/* =================================================
            RISK OVERVIEW + SCAN VOLUME
        ================================================= */}

        <section className="dashboard-grid two">

          <Panel
            kicker="RISK OVERVIEW"
            title="Decision distribution"
            icon={<Target size={18} />}
          >

            <div className="risk-layout">

              <div
                className="risk-donut"
                style={donutStyle}
              >
                <div>
                  <strong>
                    {data.overview.averageRisk}
                  </strong>

                  <span>
                    AVG RISK
                  </span>
                </div>
              </div>

              <div className="risk-legend">

                <Legend
                  c="safe"
                  n="Safe"
                  v={
                    data.riskDistribution
                      .proceed
                  }
                  total={totalDecisions}
                />

                <Legend
                  c="review"
                  n="Review"
                  v={
                    data.riskDistribution
                      .review
                  }
                  total={totalDecisions}
                />

                <Legend
                  c="stop"
                  n="Stop"
                  v={
                    data.riskDistribution
                      .stop
                  }
                  total={totalDecisions}
                />

              </div>

            </div>

            <div className="risk-range">

              <b>
                Lowest
                <strong>
                  {data.overview.lowestRisk}
                </strong>
              </b>

              <b>
                Average
                <strong>
                  {data.overview.averageRisk}
                </strong>
              </b>

              <b>
                Highest
                <strong>
                  {data.overview.highestRisk}
                </strong>
              </b>

            </div>

          </Panel>

          <Panel
            kicker="ACTIVITY"
            title="Scan volume"
            icon={<BarChart3 size={18} />}
          >

            <div className="chart-area">

              {data.dailyTrend.length ? (
                <>
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >

                    <line
                      x1="0"
                      y1="94"
                      x2="100"
                      y2="94"
                    />

                    <line
                      x1="0"
                      y1="58"
                      x2="100"
                      y2="58"
                    />

                    <line
                      x1="0"
                      y1="22"
                      x2="100"
                      y2="22"
                    />

                    <polyline
                      points={chartPoints}
                    />

                  </svg>

                  <div className="chart-labels">

                    {data.dailyTrend.map(
                      (item) => (
                        <span key={item.date}>
                          {new Date(
                            `${item.date}T00:00:00`
                          ).toLocaleDateString(
                            [],
                            {
                              weekday:
                                "short",
                            }
                          )}
                        </span>
                      )
                    )}

                  </div>
                </>
              ) : (
                <Empty
                  icon={
                    <BarChart3 size={26} />
                  }
                  text="No scan activity yet"
                  sub="Run a few scans to populate the trend."
                />
              )}

            </div>

          </Panel>

        </section>

        {/* =================================================
            SCANNER MIX + THREAT SEVERITY
        ================================================= */}

        <section className="dashboard-grid two">

          <Panel
            kicker="SCANNER MIX"
            title="What are users scanning?"
            icon={<Camera size={18} />}
          >

            <div className="scanner-mix">

              <div
                className="scanner-ring"
                style={{
                  background: `
                    conic-gradient(
                      #7ca8ff
                      0 ${messagePercentage * 3.6}deg,
                      #b794ff
                      ${messagePercentage * 3.6}deg
                      360deg
                    )
                  `,
                }}
              >
                <div>
                  <strong>
                    {scannerTotal}
                  </strong>

                  <span>
                    SCANS
                  </span>
                </div>
              </div>

              <div className="scanner-mix-list">

                <Mix
                  icon={
                    <MessageSquare
                      size={15}
                    />
                  }
                  title="Messages"
                  count={
                    data.scannerTypes
                      .message
                  }
                  pct={messagePercentage}
                  cls="message"
                />

                <Mix
                  icon={
                    <ImageIcon
                      size={15}
                    />
                  }
                  title="Screenshots"
                  count={
                    data.scannerTypes
                      .image
                  }
                  pct={
                    100 -
                    messagePercentage
                  }
                  cls="image"
                />

              </div>

            </div>

          </Panel>

          <Panel
            kicker="THREAT INTELLIGENCE"
            title="Threat severity"
            icon={
              <AlertTriangle size={18} />
            }
          >

            <div className="severity-list">

              {(
                [
                  "CRITICAL",
                  "HIGH",
                  "MEDIUM",
                  "LOW",
                ] as const
              ).map((severity) => {

                const value =
                  data.threatSeverity[
                    severity
                  ];

                return (
                  <div
                    className="severity-row"
                    key={severity}
                  >

                    <div>
                      <i
                        className={severity.toLowerCase()}
                      />

                      <strong>
                        {severity}
                      </strong>

                      <b>{value}</b>
                    </div>

                    <span>
                      <em
                        className={severity.toLowerCase()}
                        style={{
                          width: `${
                            (value /
                              maxSeverity) *
                            100
                          }%`,
                        }}
                      />
                    </span>

                  </div>
                );
              })}

            </div>

            <div className="threat-total">
              <span>
                Total detected signals
              </span>

              <strong>
                {data.overview.totalThreats}
              </strong>
            </div>

          </Panel>

        </section>

        {/* =================================================
            CATEGORIES + USER IMPACT
        ================================================= */}

        <section className="dashboard-grid two">

          <Panel
            kicker="PATTERN ANALYSIS"
            title="Top risk categories"
            icon={
              <TrendingUp size={18} />
            }
          >

            <div className="category-list">

              {data.categories.length ? (
                data.categories.map(
                  (item, index) => (
                    <div
                      className="category-row"
                      key={item.category}
                    >

                      <b>
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </b>

                      <div>

                        <div>
                          <strong>
                            {formatCategory(
                              item.category
                            )}
                          </strong>

                          <span>
                            {item.count} scans
                          </span>
                        </div>

                        <small>
                          <i
                            style={{
                              width: `${
                                (item.count /
                                  maxCategory) *
                                100
                              }%`,
                            }}
                          />
                        </small>

                      </div>

                      <strong>
                        {item.averageRisk}
                        <span>
                          {" "}
                          risk
                        </span>
                      </strong>

                    </div>
                  )
                )
              ) : (
                <Empty
                  icon={
                    <TrendingUp size={25} />
                  }
                  text="No categories yet"
                  sub="Categories appear after scans."
                />
              )}

            </div>

          </Panel>

          <Panel
            kicker="USER IMPACT"
            title="Risk exposure"
            icon={<Shield size={18} />}
          >

            <div className="impact-metrics">

              <Impact
                cls="financial"
                value={
                  data.overview
                    .financialRiskScans
                }
                label="Financial risk scans"
                icon="₹"
              />

              <Impact
                cls="privacy"
                value={
                  data.overview
                    .privacyRiskScans
                }
                label="Privacy risk scans"
                icon="⌁"
              />

            </div>

            <div className="impact-note">
              <ShieldCheck size={14} />

              <span>
                TrapVeil prioritizes
                actionable safety signals
                instead of raw model output.
              </span>
            </div>

          </Panel>

        </section>

        {/* =================================================
            RECENT SCANS + HIGH RISK
        ================================================= */}

        <section className="dashboard-grid activity-lists">

          <Panel
            kicker="LIVE FEED"
            title="Recent scans"
            icon={<Clock3 size={18} />}
          >

            <div className="scan-list">

              {data.recentScans.length ? (
                data.recentScans.map(
                  (scan) => (
                    <div
                      className="scan-row"
                      key={scan.id}
                    >

                      <div
                        className={`scan-type-icon ${scan.type}`}
                      >
                        {scan.type ===
                        "image" ? (
                          <ImageIcon
                            size={15}
                          />
                        ) : (
                          <MessageSquare
                            size={15}
                          />
                        )}
                      </div>

                      <div className="scan-main">

                        <div>
                          <strong>
                            {formatCategory(
                              scan.category
                            )}
                          </strong>

                          <span>
                            {formatDate(
                              scan.createdAt
                            )}
                          </span>
                        </div>

                        <p>
                          {scan.filename ||
                            scan.input ||
                            scan.summary ||
                            "TrapVeil scan"}
                        </p>

                      </div>

                      <div className="scan-score">
                        <strong>
                          {scan.riskScore}
                        </strong>

                        <span>
                          /100
                        </span>
                      </div>

                      <em
                        className={`decision-pill ${scan.decision.toLowerCase()}`}
                      >
                        {scan.decision}
                      </em>

                      <ChevronRight
                        size={14}
                      />

                    </div>
                  )
                )
              ) : (
                <Empty
                  icon={
                    <FileSearch size={25} />
                  }
                  text="No recent scans"
                  sub="Your latest analyses will appear here."
                />
              )}

            </div>

          </Panel>

          <Panel
            kicker="PRIORITY QUEUE"
            title="High-risk alerts"
            icon={
              <CircleAlert size={18} />
            }
          >

            <div className="alert-list">

              {data.highRiskScans.length ? (
                data.highRiskScans.map(
                  (scan) => (
                    <div
                      className="alert-row"
                      key={scan.id}
                    >

                      <div className="alert-score">

                        <strong>
                          {scan.riskScore}
                        </strong>

                        <span>
                          risk
                        </span>

                      </div>

                      <div>

                        <strong>
                          {formatCategory(
                            scan.category
                          )}
                        </strong>

                        <span>
                          {scan.summary ||
                            scan.filename ||
                            "High-risk content detected"}
                        </span>

                      </div>

                      <ShieldX
                        size={16}
                      />

                    </div>
                  )
                )
              ) : (
                <Empty
                  icon={
                    <ShieldCheck
                      size={27}
                    />
                  }
                  text="No high-risk alerts"
                  sub="Your priority queue is clear."
                />
              )}

            </div>

            <div className="alert-footer">
              <span>
                Threshold
              </span>

              <strong>
                Risk score ≥ 70
              </strong>
            </div>

          </Panel>

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="dashboard-footer">

          <div>
            <Shield size={14} />

            <strong>
              TrapVeil
            </strong>

            <span>
              Security Operations Dashboard
            </span>
          </div>

          <span>
            Auto-refreshing every 15 seconds
          </span>

        </footer>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="dashboard-loading">

            <RefreshCw
              size={17}
              className="refresh-spinning"
            />

            <span>
              Loading security intelligence...
            </span>

          </div>
        )}

      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function Stat({
  title,
  value,
  icon,
  cls,
  note,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  cls: string;
  note: string;
}) {
  return (
    <article
      className={`dashboard-stat-card ${cls}`}
    >
      <div>
        <span>{title}</span>
        {icon}
      </div>

      <strong>{value}</strong>

      <small>{note}</small>
    </article>
  );
}

/* =========================================================
   PANEL
========================================================= */

function Panel({
  kicker,
  title,
  icon,
  children,
}: {
  kicker: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="dashboard-panel">

      <header>
        <div>
          <span>{kicker}</span>
          <h2>{title}</h2>
        </div>

        {icon}
      </header>

      {children}

    </article>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function Legend({
  c,
  n,
  v,
  total,
}: {
  c: string;
  n: string;
  v: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? Math.round((v / total) * 100)
      : 0;

  return (
    <div className="legend-item">

      <i className={c} />

      <div>
        <strong>{v}</strong>
        <span>{n}</span>
      </div>

      <b>
        {percentage}%
      </b>

    </div>
  );
}

/* =========================================================
   SCANNER MIX
========================================================= */

function Mix({
  icon,
  title,
  count,
  pct,
  cls,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  pct: number;
  cls: string;
}) {
  return (
    <div className="mix">

      <i className={cls}>
        {icon}
      </i>

      <div>
        <strong>{title}</strong>
        <span>{count} scans</span>
      </div>

      <b>{pct}%</b>

    </div>
  );
}

/* =========================================================
   IMPACT
========================================================= */

function Impact({
  cls,
  value,
  label,
  icon,
}: {
  cls: string;
  value: number;
  label: string;
  icon: string;
}) {
  return (
    <div
      className={`impact ${cls}`}
    >
      <i>{icon}</i>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function Empty({
  icon,
  text,
  sub,
}: {
  icon: ReactNode;
  text: string;
  sub: string;
}) {
  return (
    <div className="empty">

      {icon}

      <strong>{text}</strong>

      <span>{sub}</span>

    </div>
  );
}