import { useEffect, useMemo, useState } from "react";

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

type BehaviorRecordProps = {
  onBack?: () => void;
  token?: string | null;
};

const API_BASE = "http://localhost:3001";

const GROUP_NAMES: Record<string, string> = {
  environment: "🌿 環境保育聯盟",
  government: "🚧 地方政府局",
  farming: "🐄 農牧產業協會",
  animal: "🐕 動物保護團體",
  greenEnergy: "☀️ 綠能科技企業",
  education: "🎓 教育推動單位",
  unassigned: "未分配",
};

function normalizeGroupId(value: unknown): Player["groupId"] {
  return Object.keys(GROUP_NAMES).includes(String(value)) ? (value as Player["groupId"]) : "unassigned";
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

export default function BehaviorRecord({ onBack, token }: BehaviorRecordProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(Boolean(token));
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [groupFilter, setGroupFilter] = useState<Player["groupId"] | "all">("all");

  const filteredPlayers = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return players.filter((player) => {
      const matchGroup = groupFilter === "all" || player.groupId === groupFilter;
      const matchText = !text || [player.name, player.username, player.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(text));
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
        const res = await fetch(`${API_BASE}/api/teacher/players`, {
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
        setStatusMessage("已讀取學生資料，請選擇一位學生查看遊戲歷程");
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

  async function loadPlayerActivityLogs(player: Player) {
    if (!token || !/^\d+$/.test(player.id)) return;

    setSelectedPlayer(player);
    setIsLoadingLogs(true);
    setActivityLogs([]);
    setStatusMessage(`正在讀取 ${player.name} 的遊戲歷程...`);

    try {
      const res = await fetch(`${API_BASE}/api/teacher/activity-logs?userId=${player.id}&limit=500`, {
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

  return (
    <div className="min-h-screen bg-[#f3efe6] p-5 text-stone-800">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 rounded-[28px] border-4 border-stone-700 bg-[#fffaf0] p-5 shadow-[0_8px_0_rgba(68,64,60,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-stone-500">STUDENT DATA CENTER</p>
              <h1 className="mt-1 text-3xl font-black tracking-wide text-stone-800">教師端｜學生資料</h1>
              <p className="mt-2 text-sm font-semibold text-stone-600">
                這個頁面只用來查看學生資料與遊戲歷程。請先選擇學生，就能看到他在遊戲中的文字、按鈕點擊、卡牌解鎖與地圖決策流程。
              </p>
              {statusMessage ? <p className="mt-2 text-xs font-black tracking-wide text-stone-500">{statusMessage}</p> : null}
            </div>

            {onBack ? <button type="button" onClick={onBack} className="rounded-2xl border-2 border-stone-400 bg-white px-4 py-2 font-black shadow-sm transition hover:-translate-y-0.5">回首頁</button> : null}
          </div>
        </header>

        <main className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-[24px] border-4 border-stone-700 bg-white p-4 shadow-[0_6px_0_rgba(68,64,60,0.25)]">
            <div className="mb-4">
              <h2 className="text-xl font-black">選擇學生</h2>
              <p className="mt-1 text-sm font-bold text-stone-500">共 {players.length} 位學生</p>
            </div>

            <div className="mb-4 grid gap-2">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜尋學生名稱或 Email"
                className="rounded-2xl border-2 border-stone-300 bg-stone-50 px-3 py-2 text-sm font-bold outline-none focus:border-stone-700"
              />
              <select
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value as Player["groupId"] | "all")}
                className="rounded-2xl border-2 border-stone-300 bg-stone-50 px-3 py-2 text-sm font-bold outline-none focus:border-stone-700"
              >
                <option value="all">全部小組</option>
                {Object.entries(GROUP_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>

            <div className="max-h-[62vh] space-y-2 overflow-auto pr-1">
              {isLoadingPlayers ? (
                <p className="text-sm font-bold text-stone-500">讀取中...</p>
              ) : filteredPlayers.length === 0 ? (
                <p className="text-sm font-bold text-stone-500">沒有符合的學生</p>
              ) : (
                filteredPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => loadPlayerActivityLogs(player)}
                    className={`w-full rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 ${selectedPlayer?.id === player.id ? "border-[#8f6b28] bg-[#fff0bd]" : "border-stone-200 bg-stone-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-stone-800">{player.name}</p>
                      {player.isGroupLeader ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-700">組長</span> : null}
                    </div>
                    <p className="mt-1 text-xs font-bold text-stone-500">{GROUP_NAMES[player.groupId]}</p>
                    {player.email ? <p className="mt-1 truncate text-xs font-semibold text-stone-400">{player.email}</p> : null}
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="rounded-[24px] border-4 border-stone-700 bg-[#fffaf0] p-5 shadow-[0_6px_0_rgba(68,64,60,0.25)]">
            {!selectedPlayer ? (
              <div className="flex min-h-[52vh] items-center justify-center rounded-[22px] border-2 border-dashed border-stone-300 bg-white/70 p-8 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-stone-700 bg-[#fff0bd] text-4xl">👀</div>
                  <h2 className="text-2xl font-black text-stone-800">請先從左側選擇學生</h2>
                  <p className="mt-2 text-sm font-bold text-stone-500">選擇後會在這裡呈現完整遊戲歷程。</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-5 flex flex-col gap-3 border-b-4 border-stone-700 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black tracking-[0.2em] text-stone-500">ACTIVITY TIMELINE</p>
                    <h2 className="text-2xl font-black text-stone-800">{selectedPlayer.name} 的遊戲歷程</h2>
                    <p className="mt-1 text-sm font-bold text-stone-500">{GROUP_NAMES[selectedPlayer.groupId]}{selectedPlayer.isGroupLeader ? "｜組長" : ""}</p>
                  </div>
                  <button type="button" onClick={() => loadPlayerActivityLogs(selectedPlayer)} disabled={isLoadingLogs} className="rounded-2xl border-2 border-blue-700 bg-blue-600 px-4 py-2 font-black text-white disabled:opacity-50">重新整理歷程</button>
                </div>

                {isLoadingLogs ? (
                  <p className="font-black text-stone-500">讀取學生歷程中...</p>
                ) : activityLogs.length === 0 ? (
                  <p className="font-black text-stone-500">目前沒有學生歷程</p>
                ) : (
                  <div className="max-h-[62vh] space-y-3 overflow-auto pr-1">
                    {activityLogs.map((log, index) => (
                      <div key={log.id} className="relative rounded-2xl border-2 border-stone-300 bg-white p-4 pl-14 shadow-sm">
                        <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-stone-700 bg-[#fff0bd] text-sm font-black text-stone-800">{index + 1}</div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-stone-800">{log.eventLabel || log.eventType}</p>
                              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-black text-stone-600">{getActionBadge(log)}</span>
                            </div>
                            <p className="mt-1 text-xs font-bold text-stone-500">{log.eventType}｜{log.targetType || "-"}｜{log.targetId || "-"}</p>
                          </div>
                          <p className="text-xs font-black text-stone-500">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs font-bold text-stone-600 md:grid-cols-2">
                          <div className="rounded-xl bg-stone-50 p-2"><span className="text-stone-400">前一次：</span>{formatLogValue(log.previousValue)}</div>
                          <div className="rounded-xl bg-stone-50 p-2"><span className="text-stone-400">新內容：</span>{formatLogValue(log.newValue)}</div>
                        </div>

                        {log.metadata ? <div className="mt-2 rounded-xl bg-stone-50 p-2 text-xs font-bold text-stone-500"><span className="text-stone-400">補充：</span>{formatLogValue(log.metadata)}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
