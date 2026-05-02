import { useEffect, useMemo, useState, type ReactNode } from "react";

type GroupId =
  | "environment"
  | "government"
  | "farming"
  | "animal"
  | "greenEnergy"
  | "education";

type Player = {
  id: string;
  name: string;
  username?: string;
  email?: string;
  groupId: GroupId | "unassigned";
  groupName?: string;
  isGroupLeader?: boolean;
};

type ActivityLog = {
  id: number;
  userId: number;
  username: string;
  groupId?: string | null;
  eventType: string;
  eventLabel?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  createdAt: string;
};

type AnalyticsRow = {
  dimensionValue: string;
  count: number;
  studentCount: number;
  groupCount: number;
  examples?: string[];
};

type AnalyticsOptions = {
  groups: { id: string; name: string }[];
  students: { id: string; name: string; email?: string; groupId: string; groupName: string }[];
  cards: { id: string; name: string }[];
  eventTypes: string[];
  targetTypes: string[];
  districts: string[];
};

type AnalyticsPayload = {
  summary: {
    metric: string;
    dimension: string;
    totalCount: number;
    rowCount: number;
    averagePerStudent: number;
    totalStudents: number;
  };
  rows: AnalyticsRow[];
  options: AnalyticsOptions;
};

type BehaviorRecordProps = {
  onBack?: () => void;
  token?: string | null;
};

const ANALYSIS_API_BASE = import.meta.env.VITE_ANALYSIS_API_BASE_URL || "http://localhost:3002";

const GROUP_NAMES: Record<string, string> = {
  environment: "🌿 環境保育聯盟",
  government: "🚧 地方政府局",
  farming: "🐄 農牧產業協會",
  animal: "🐕 動物保護團體",
  greenEnergy: "☀️ 綠能科技企業",
  education: "🎓 教育推動單位",
  unassigned: "未分配",
};

const METRIC_OPTIONS = [
  { value: "card_collected", label: "卡牌被蒐集次數" },
  { value: "card_used_as_evidence", label: "卡牌被當作證據次數" },
  { value: "inquiry_plan_count", label: "調查書建立份數" },
  { value: "final_summary_count", label: "探究總結送出份數" },
  { value: "map_action_count", label: "地圖決策操作次數" },
  { value: "barrage_count", label: "彈幕送出次數" },
  { value: "suspect_vote_count", label: "嫌犯投票次數" },
  { value: "activity_log_count", label: "學生遊戲歷程事件次數" },
];

const DIMENSION_OPTIONS = [
  { value: "card", label: "依卡牌" },
  { value: "student", label: "依學生" },
  { value: "group", label: "依小組" },
  { value: "district", label: "依地區" },
  { value: "eventType", label: "依事件類型" },
  { value: "targetType", label: "依目標類型" },
  { value: "date", label: "依日期" },
  { value: "all", label: "只看總量" },
];

const SORT_OPTIONS = [
  { value: "count", label: "依次數" },
  { value: "studentCount", label: "依學生人數" },
  { value: "groupCount", label: "依小組數" },
  { value: "dimensionValue", label: "依名稱" },
];

function normalizeGroupId(value: unknown): Player["groupId"] {
  return Object.keys(GROUP_NAMES).includes(String(value))
    ? (value as Player["groupId"])
    : "unassigned";
}

function formatLogValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  try {
    const text = JSON.stringify(value);
    return text.length > 180 ? `${text.slice(0, 180)}...` : text;
  } catch {
    return String(value);
  }
}

function getActionBadge(log: ActivityLog) {
  if (log.eventType.includes("map")) return "地圖決策";
  if (log.eventType.includes("text") || log.eventType.includes("summary")) return "文字撰寫";
  if (log.eventType.includes("card")) return "卡牌探究";
  if (log.eventType.includes("login")) return "登入";
  if (log.eventType.includes("title")) return "稱號";
  return "操作";
}

function SelectBox({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-black text-stone-500">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border-2 border-stone-300 bg-white px-3 py-2 text-sm font-black text-stone-800 outline-none focus:border-stone-700">
        {children}
      </select>
    </label>
  );
}

export default function BehaviorRecord({ onBack, token }: BehaviorRecordProps) {
  const [mode, setMode] = useState<"analytics" | "timeline">("analytics");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(Boolean(token));
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [groupFilter, setGroupFilter] = useState<Player["groupId"] | "all">("all");

  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [metric, setMetric] = useState("card_collected");
  const [dimension, setDimension] = useState("card");
  const [analyticsGroupId, setAnalyticsGroupId] = useState("all");
  const [analyticsUserId, setAnalyticsUserId] = useState("all");
  const [cardId, setCardId] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [districtName, setDistrictName] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("count");
  const [sortDir, setSortDir] = useState("desc");

  const filteredPlayers = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return players.filter((player) => {
      const matchGroup = groupFilter === "all" || player.groupId === groupFilter;
      const matchText =
        !text ||
        [player.name, player.username, player.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text));
      return matchGroup && matchText;
    });
  }, [players, keyword, groupFilter]);

  useEffect(() => {
    if (!token) {
      setIsLoadingPlayers(false);
      return;
    }

    let ignore = false;

    async function loadPlayers() {
      setIsLoadingPlayers(true);
      setStatusMessage("正在讀取學生資料...");

      try {
        const res = await fetch(`${ANALYSIS_API_BASE}/api/teacher/players`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "讀取學生資料失敗");
        if (ignore) return;

        const nextPlayers = (data.players || []).map((player: any) => {
          const groupId = normalizeGroupId(player.groupId);
          return {
            id: String(player.id),
            name: player.name || player.username || `學生 ${player.id}`,
            username: player.username,
            email: player.email,
            groupId,
            groupName: GROUP_NAMES[groupId],
            isGroupLeader: Boolean(player.isGroupLeader),
          };
        }) as Player[];

        setPlayers(nextPlayers);
        setStatusMessage("已讀取學生資料");
      } catch (error) {
        console.error(error);
        setStatusMessage(error instanceof Error ? error.message : "讀取學生資料失敗");
      } finally {
        if (!ignore) setIsLoadingPlayers(false);
      }
    }

    loadPlayers();

    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || mode !== "analytics") return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mode, metric, dimension, analyticsGroupId, analyticsUserId, cardId, eventType, targetType, districtName, dateFrom, dateTo, sortBy, sortDir]);

  async function loadAnalytics() {
    if (!token) return;
    setIsLoadingAnalytics(true);
    setStatusMessage("正在依照篩選條件產生統計...");

    try {
      const params = new URLSearchParams({
        metric,
        dimension,
        groupId: analyticsGroupId,
        userId: analyticsUserId,
        cardId,
        eventType,
        targetType,
        districtName,
        sortBy,
        sortDir,
      });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`${ANALYSIS_API_BASE}/api/teacher/analytics-query?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "讀取統計失敗");
      setAnalytics(data);
      setStatusMessage("統計資料已更新");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "讀取統計失敗");
    } finally {
      setIsLoadingAnalytics(false);
    }
  }

  async function loadPlayerActivityLogs(player: Player) {
    if (!token || !/^\d+$/.test(player.id)) return;

    setSelectedPlayer(player);
    setIsLoadingLogs(true);
    setActivityLogs([]);
    setStatusMessage(`正在讀取 ${player.name} 的遊戲歷程...`);

    try {
      const res = await fetch(`${ANALYSIS_API_BASE}/api/teacher/activity-logs?userId=${player.id}&limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "讀取學生歷程失敗");
      setActivityLogs(data.logs || []);
      setStatusMessage(`已讀取 ${player.name} 的遊戲歷程`);
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "讀取學生歷程失敗");
    } finally {
      setIsLoadingLogs(false);
    }
  }

  function resetAnalyticsFilters() {
    setMetric("card_collected");
    setDimension("card");
    setAnalyticsGroupId("all");
    setAnalyticsUserId("all");
    setCardId("all");
    setEventType("all");
    setTargetType("all");
    setDistrictName("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("count");
    setSortDir("desc");
  }

  return (
    <div className="min-h-screen bg-[#f3efe6] p-5 text-stone-800">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 rounded-[28px] border-4 border-stone-700 bg-[#fffaf0] p-5 shadow-[0_8px_0_rgba(68,64,60,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-stone-500">STUDENT DATA CENTER</p>
              <h1 className="mt-1 text-3xl font-black tracking-wide text-stone-800">教師端｜學生資料與遊戲分析</h1>
              <p className="mt-2 text-sm font-semibold text-stone-600">
                可用多個下拉選單自由組合統計：卡牌蒐集、證據使用、調查書、小組、學生、地圖、彈幕與投票資料。
              </p>
              {statusMessage ? <p className="mt-2 text-xs font-black tracking-wide text-stone-500">{statusMessage}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode("analytics")} className={`rounded-2xl border-2 px-4 py-2 font-black transition hover:-translate-y-0.5 ${mode === "analytics" ? "border-stone-800 bg-[#fff0bd]" : "border-stone-300 bg-white"}`}>自訂統計</button>
              <button type="button" onClick={() => setMode("timeline")} className={`rounded-2xl border-2 px-4 py-2 font-black transition hover:-translate-y-0.5 ${mode === "timeline" ? "border-stone-800 bg-[#fff0bd]" : "border-stone-300 bg-white"}`}>學生歷程</button>
              {onBack ? <button type="button" onClick={onBack} className="rounded-2xl border-2 border-stone-400 bg-white px-4 py-2 font-black shadow-sm transition hover:-translate-y-0.5">回首頁</button> : null}
            </div>
          </div>
        </header>

        {mode === "analytics" ? (
          <main className="grid gap-5">
            <section className="rounded-[24px] border-4 border-stone-700 bg-white p-4 shadow-[0_6px_0_rgba(68,64,60,0.25)]">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black">自訂資料查詢</h2>
                  <p className="mt-1 text-sm font-bold text-stone-500">選擇「要看什麼」＋「怎麼分組」＋「篩選條件」，下方會自動產生結果。</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={resetAnalyticsFilters} className="rounded-2xl border-2 border-stone-300 bg-stone-50 px-4 py-2 text-sm font-black">重設</button>
                  <button type="button" onClick={loadAnalytics} disabled={isLoadingAnalytics} className="rounded-2xl border-2 border-blue-700 bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">重新整理</button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <SelectBox label="我要看什麼數據" value={metric} onChange={setMetric}>{METRIC_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</SelectBox>
                <SelectBox label="資料怎麼分組" value={dimension} onChange={setDimension}>{DIMENSION_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</SelectBox>
                <SelectBox label="篩選小組" value={analyticsGroupId} onChange={setAnalyticsGroupId}>
                  <option value="all">全部小組</option>
                  {(analytics?.options.groups || Object.entries(GROUP_NAMES).filter(([id]) => id !== "unassigned").map(([id, name]) => ({ id, name }))).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </SelectBox>
                <SelectBox label="篩選學生" value={analyticsUserId} onChange={setAnalyticsUserId}>
                  <option value="all">全部學生</option>
                  {(analytics?.options.students || players.map((player) => ({ id: player.id, name: player.name, groupName: GROUP_NAMES[player.groupId], groupId: player.groupId }))).map((student) => <option key={student.id} value={student.id}>{student.name}｜{student.groupName}</option>)}
                </SelectBox>
                <SelectBox label="篩選卡牌" value={cardId} onChange={setCardId}>
                  <option value="all">全部卡牌</option>
                  {(analytics?.options.cards || []).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                </SelectBox>
                <SelectBox label="篩選地區" value={districtName} onChange={setDistrictName}>
                  <option value="all">全部地區</option>
                  {(analytics?.options.districts || []).map((name) => <option key={name} value={name}>{name}</option>)}
                </SelectBox>
                <SelectBox label="事件類型" value={eventType} onChange={setEventType}>
                  <option value="all">全部事件</option>
                  {(analytics?.options.eventTypes || []).map((name) => <option key={name} value={name}>{name}</option>)}
                </SelectBox>
                <SelectBox label="目標類型" value={targetType} onChange={setTargetType}>
                  <option value="all">全部目標</option>
                  {(analytics?.options.targetTypes || []).map((name) => <option key={name} value={name}>{name}</option>)}
                </SelectBox>
                <label className="grid gap-1 text-xs font-black text-stone-500">開始日期<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-2xl border-2 border-stone-300 bg-white px-3 py-2 text-sm font-black text-stone-800 outline-none focus:border-stone-700" /></label>
                <label className="grid gap-1 text-xs font-black text-stone-500">結束日期<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-2xl border-2 border-stone-300 bg-white px-3 py-2 text-sm font-black text-stone-800 outline-none focus:border-stone-700" /></label>
                <SelectBox label="排序依據" value={sortBy} onChange={setSortBy}>{SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</SelectBox>
                <SelectBox label="排序方向" value={sortDir} onChange={setSortDir}><option value="desc">由高到低</option><option value="asc">由低到高</option></SelectBox>
              </div>
            </section>

            <section className="rounded-[24px] border-4 border-stone-700 bg-[#fffaf0] p-5 shadow-[0_6px_0_rgba(68,64,60,0.25)]">
              {isLoadingAnalytics ? (
                <p className="font-black text-stone-500">正在產生統計...</p>
              ) : !analytics ? (
                <p className="font-black text-stone-500">尚未讀取統計資料</p>
              ) : (
                <div>
                  <div className="mb-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border-2 border-stone-300 bg-white p-4"><p className="text-xs font-black text-stone-400">總次數</p><p className="mt-1 text-3xl font-black">{analytics.summary.totalCount}</p></div>
                    <div className="rounded-2xl border-2 border-stone-300 bg-white p-4"><p className="text-xs font-black text-stone-400">結果列數</p><p className="mt-1 text-3xl font-black">{analytics.summary.rowCount}</p></div>
                    <div className="rounded-2xl border-2 border-stone-300 bg-white p-4"><p className="text-xs font-black text-stone-400">平均每位學生</p><p className="mt-1 text-3xl font-black">{analytics.summary.averagePerStudent}</p></div>
                    <div className="rounded-2xl border-2 border-stone-300 bg-white p-4"><p className="text-xs font-black text-stone-400">學生總數</p><p className="mt-1 text-3xl font-black">{analytics.summary.totalStudents}</p></div>
                  </div>

                  <div className="overflow-auto rounded-2xl border-2 border-stone-300 bg-white">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                      <thead className="bg-stone-100 text-xs font-black text-stone-500">
                        <tr>
                          <th className="border-b-2 border-stone-300 p-3">項目</th>
                          <th className="border-b-2 border-stone-300 p-3">次數 / 加總</th>
                          <th className="border-b-2 border-stone-300 p-3">涉及學生數</th>
                          <th className="border-b-2 border-stone-300 p-3">涉及小組數</th>
                          <th className="border-b-2 border-stone-300 p-3">範例</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.rows.length === 0 ? (
                          <tr><td colSpan={5} className="p-5 text-center font-black text-stone-400">這個條件下沒有資料</td></tr>
                        ) : analytics.rows.map((row) => (
                          <tr key={row.dimensionValue} className="border-b border-stone-200 align-top">
                            <td className="p-3 font-black text-stone-800">{row.dimensionValue}</td>
                            <td className="p-3 font-black text-blue-700">{row.count}</td>
                            <td className="p-3 font-bold">{row.studentCount}</td>
                            <td className="p-3 font-bold">{row.groupCount}</td>
                            <td className="p-3 text-xs font-bold text-stone-500">{row.examples?.length ? row.examples.join("｜") : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </main>
        ) : (
          <main className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <aside className="rounded-[24px] border-4 border-stone-700 bg-white p-4 shadow-[0_6px_0_rgba(68,64,60,0.25)]">
              <div className="mb-4">
                <h2 className="text-xl font-black">選擇學生</h2>
                <p className="mt-1 text-sm font-bold text-stone-500">共 {players.length} 位學生</p>
              </div>

              <div className="mb-4 grid gap-2">
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜尋學生名稱或 Email" className="rounded-2xl border-2 border-stone-300 bg-stone-50 px-3 py-2 text-sm font-bold outline-none focus:border-stone-700" />
                <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value as Player["groupId"] | "all")} className="rounded-2xl border-2 border-stone-300 bg-stone-50 px-3 py-2 text-sm font-bold outline-none focus:border-stone-700">
                  <option value="all">全部小組</option>
                  {Object.entries(GROUP_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>

              <div className="max-h-[62vh] space-y-2 overflow-auto pr-1">
                {isLoadingPlayers ? <p className="text-sm font-bold text-stone-500">讀取中...</p> : filteredPlayers.length === 0 ? <p className="text-sm font-bold text-stone-500">沒有符合的學生</p> : filteredPlayers.map((player) => (
                  <button key={player.id} type="button" onClick={() => loadPlayerActivityLogs(player)} className={`w-full rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 ${selectedPlayer?.id === player.id ? "border-[#8f6b28] bg-[#fff0bd]" : "border-stone-200 bg-stone-50"}`}>
                    <div className="flex items-center justify-between gap-2"><p className="font-black text-stone-800">{player.name}</p>{player.isGroupLeader ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-700">組長</span> : null}</div>
                    <p className="mt-1 text-xs font-bold text-stone-500">{GROUP_NAMES[player.groupId]}</p>
                    {player.email ? <p className="mt-1 truncate text-xs font-semibold text-stone-400">{player.email}</p> : null}
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-[24px] border-4 border-stone-700 bg-[#fffaf0] p-5 shadow-[0_6px_0_rgba(68,64,60,0.25)]">
              {!selectedPlayer ? (
                <div className="flex min-h-[52vh] items-center justify-center rounded-[22px] border-2 border-dashed border-stone-300 bg-white/70 p-8 text-center">
                  <div><div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-stone-700 bg-[#fff0bd] text-4xl">👀</div><h2 className="text-2xl font-black text-stone-800">請先從左側選擇學生</h2><p className="mt-2 text-sm font-bold text-stone-500">選擇後會在這裡呈現完整遊戲歷程。</p></div>
                </div>
              ) : (
                <div>
                  <div className="mb-5 flex flex-col gap-3 border-b-4 border-stone-700 pb-4 md:flex-row md:items-center md:justify-between">
                    <div><p className="text-xs font-black tracking-[0.2em] text-stone-500">ACTIVITY TIMELINE</p><h2 className="text-2xl font-black text-stone-800">{selectedPlayer.name} 的遊戲歷程</h2><p className="mt-1 text-sm font-bold text-stone-500">{GROUP_NAMES[selectedPlayer.groupId]}{selectedPlayer.isGroupLeader ? "｜組長" : ""}</p></div>
                    <button type="button" onClick={() => loadPlayerActivityLogs(selectedPlayer)} disabled={isLoadingLogs} className="rounded-2xl border-2 border-blue-700 bg-blue-600 px-4 py-2 font-black text-white disabled:opacity-50">重新整理歷程</button>
                  </div>

                  {isLoadingLogs ? <p className="font-black text-stone-500">讀取學生歷程中...</p> : activityLogs.length === 0 ? <p className="font-black text-stone-500">目前沒有學生歷程</p> : (
                    <div className="max-h-[62vh] space-y-3 overflow-auto pr-1">
                      {activityLogs.map((log, index) => (
                        <div key={log.id} className="relative rounded-2xl border-2 border-stone-300 bg-white p-4 pl-14 shadow-sm">
                          <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-stone-700 bg-[#fff0bd] text-sm font-black text-stone-800">{index + 1}</div>
                          <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black text-stone-800">{log.eventLabel || log.eventType}</p><span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-black text-stone-600">{getActionBadge(log)}</span></div><p className="mt-1 text-xs font-bold text-stone-500">{log.eventType}｜{log.targetType || "-"}｜{log.targetId || "-"}</p></div><p className="text-xs font-black text-stone-500">{new Date(log.createdAt).toLocaleString()}</p></div>
                          <div className="mt-3 grid gap-2 text-xs font-bold text-stone-600 md:grid-cols-2"><div className="rounded-xl bg-stone-50 p-2"><span className="text-stone-400">前一次：</span>{formatLogValue(log.previousValue)}</div><div className="rounded-xl bg-stone-50 p-2"><span className="text-stone-400">新內容：</span>{formatLogValue(log.newValue)}</div></div>
                          {log.metadata ? <div className="mt-2 rounded-xl bg-stone-50 p-2 text-xs font-bold text-stone-500"><span className="text-stone-400">補充：</span>{formatLogValue(log.metadata)}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
