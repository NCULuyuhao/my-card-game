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
  isGroupLeader?: boolean;
};

type Group = {
  id: GroupId;
  name: string;
  icon: string;
  color: string;
};

type ControlPageProps = {
  onBack?: () => void;
  token?: string | null;
  initialPlayers?: Player[];
  onSaveGroups?: (players: Player[]) => void;
};

const STORAGE_KEY = "miaoli-teacher-groups-v1";
const MAX_GROUP_SIZE = 6;
const API_BASE = "http://localhost:3001";

const GROUPS: Group[] = [
  { id: "environment", name: "環境保育聯盟", icon: "🌿", color: "border-emerald-300 bg-emerald-50" },
  { id: "government", name: "地方政府局", icon: "🚧", color: "border-amber-300 bg-amber-50" },
  { id: "farming", name: "農牧產業協會", icon: "🐄", color: "border-orange-300 bg-orange-50" },
  { id: "animal", name: "動物保護團體", icon: "🐕", color: "border-rose-300 bg-rose-50" },
  { id: "greenEnergy", name: "綠能科技企業", icon: "☀️", color: "border-yellow-300 bg-yellow-50" },
  { id: "education", name: "教育推動單位", icon: "🎓", color: "border-sky-300 bg-sky-50" },
];

function loadPlayers(): Player[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as Player[]) : [];
    return parsed.map((player) => ({ ...player, isGroupLeader: Boolean(player.isGroupLeader) }));
  } catch {
    return [];
  }
}

function normalizeGroupId(value: unknown): Player["groupId"] {
  return GROUPS.some((group) => group.id === value) ? (value as GroupId) : "unassigned";
}

function normalizePlayers(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    groupId: normalizeGroupId(player.groupId),
    isGroupLeader: player.groupId !== "unassigned" && Boolean(player.isGroupLeader),
  }));
}

export default function ControlPage({ onBack, token, initialPlayers, onSaveGroups }: ControlPageProps) {
  const [players, setPlayers] = useState<Player[]>(() =>
    initialPlayers ? normalizePlayers(initialPlayers) : loadPlayers(),
  );
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const groupedPlayers = useMemo(() => {
    const result: Record<Player["groupId"], Player[]> = {
      unassigned: [],
      environment: [],
      government: [],
      farming: [],
      animal: [],
      greenEnergy: [],
      education: [],
    };

    players.forEach((player) => {
      result[player.groupId].push(player);
    });

    return result;
  }, [players]);

  const assignedCount = players.filter((player) => player.groupId !== "unassigned").length;
  const leaderCount = players.filter((player) => player.groupId !== "unassigned" && player.isGroupLeader).length;

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let ignore = false;

    async function loadStudents() {
      setIsLoading(true);
      setStatusMessage("正在讀取學生帳號...");

      try {
        const res = await fetch(`${API_BASE}/api/teacher/players`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "讀取學生失敗");
        if (ignore) return;

        const nextPlayers = (data.players || []).map((player: any) => ({
          id: String(player.id),
          name: player.name || player.username || `學生 ${player.id}`,
          username: player.username,
          email: player.email,
          groupId: normalizeGroupId(player.groupId),
          isGroupLeader: Boolean(player.isGroupLeader),
        })) as Player[];

        const normalized = normalizePlayers(nextPlayers);
        setPlayers(normalized);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        setStatusMessage("已同步資料庫中的學生分組與組長設定");
      } catch (error) {
        console.error(error);
        setStatusMessage(error instanceof Error ? error.message : "讀取學生失敗");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadStudents();

    return () => {
      ignore = true;
    };
  }, [token]);

  function commitLocal(nextPlayers: Player[]) {
    const normalized = normalizePlayers(nextPlayers);
    setPlayers(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    onSaveGroups?.(normalized);
  }

  async function save(nextPlayers: Player[]) {
    const normalized = normalizePlayers(nextPlayers);
    commitLocal(normalized);

    if (!token) {
      setStatusMessage("已暫存到本機，尚未連接資料庫");
      return;
    }

    setIsSaving(true);
    setStatusMessage("正在儲存分組與組長設定...");

    try {
      const res = await fetch(`${API_BASE}/api/teacher/players/groups`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignments: normalized
            .filter((player) => /^\d+$/.test(player.id))
            .map((player) => ({
              userId: Number(player.id),
              groupId: player.groupId === "unassigned" ? null : player.groupId,
              isGroupLeader: player.groupId !== "unassigned" && Boolean(player.isGroupLeader),
            })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "儲存失敗");
      setStatusMessage("分組與組長設定已儲存到資料庫");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setIsSaving(false);
    }
  }

  function removePlayer(playerId: string) {
    save(players.map((player) =>
      player.id === playerId ? { ...player, groupId: "unassigned", isGroupLeader: false } : player,
    ));
  }

  function movePlayer(playerId: string, groupId: Player["groupId"]) {
    const currentPlayer = players.find((player) => player.id === playerId);
    const isSameGroup = currentPlayer?.groupId === groupId;

    if (!isSameGroup && groupId !== "unassigned" && groupedPlayers[groupId].length >= MAX_GROUP_SIZE) {
      alert("這一組已經有 6 位成員了");
      return;
    }

    save(players.map((player) =>
      player.id === playerId
        ? { ...player, groupId, isGroupLeader: groupId === "unassigned" ? false : player.isGroupLeader }
        : player,
    ));
  }

  function setGroupLeader(playerId: string, groupId: Player["groupId"]) {
    if (groupId === "unassigned") return;
    save(players.map((player) =>
      player.groupId !== groupId ? player : { ...player, isGroupLeader: player.id === playerId },
    ));
  }

  function clearGroupLeader(groupId: GroupId) {
    save(players.map((player) =>
      player.groupId === groupId ? { ...player, isGroupLeader: false } : player,
    ));
  }

  function autoAssignGroups() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    save(shuffled.map((player, index) => ({
      ...player,
      groupId: GROUPS[index % GROUPS.length].id,
      isGroupLeader: false,
    })));
  }

  function clearGroups() {
    save(players.map((player) => ({ ...player, groupId: "unassigned", isGroupLeader: false })));
  }

  function reloadFromDatabase() {
    if (!token) return;
    setPlayers([]);
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-[#f3efe6] p-5 text-stone-800">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 rounded-[28px] border-4 border-stone-700 bg-[#fffaf0] p-5 shadow-[0_8px_0_rgba(68,64,60,0.35)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-stone-500">GROUP MANAGEMENT</p>
              <h1 className="mt-1 text-3xl font-black tracking-wide text-stone-800">教師端｜小組管理</h1>
              <p className="mt-2 text-sm font-semibold text-stone-600">
                這個頁面只用來分配學生小組與設定組長。目前共有 {players.length} 位學生，已分配 {assignedCount} 位，未分配 {groupedPlayers.unassigned.length} 位，已設定 {leaderCount} 位組長。
              </p>
              {statusMessage ? <p className="mt-2 text-xs font-black tracking-wide text-stone-500">{statusMessage}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {onBack ? <button type="button" onClick={onBack} className="rounded-2xl border-2 border-stone-400 bg-white px-4 py-2 font-black shadow-sm transition hover:-translate-y-0.5">回首頁</button> : null}
              {token ? <button type="button" onClick={reloadFromDatabase} disabled={isLoading || isSaving} className="rounded-2xl border-2 border-blue-700 bg-blue-600 px-4 py-2 font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50">重新讀取資料庫</button> : null}
              <button type="button" onClick={autoAssignGroups} disabled={isLoading || isSaving || players.length === 0} className="rounded-2xl border-2 border-emerald-700 bg-emerald-600 px-4 py-2 font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50">自動平均分組</button>
              <button type="button" onClick={clearGroups} disabled={isLoading || isSaving || players.length === 0} className="rounded-2xl border-2 border-red-700 bg-red-600 px-4 py-2 font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50">清空分組</button>
            </div>
          </div>
        </header>

        <section className="mb-5">
          <div className="rounded-[24px] border-4 border-stone-700 bg-white p-4 shadow-[0_6px_0_rgba(68,64,60,0.25)]">
            <h2 className="mb-3 text-xl font-black">未分配學生</h2>
            <div className="flex flex-wrap gap-2">
              {isLoading ? (
                <p className="text-sm font-bold text-stone-500">讀取中...</p>
              ) : groupedPlayers.unassigned.length === 0 ? (
                <p className="text-sm font-bold text-stone-500">目前沒有未分配學生</p>
              ) : (
                groupedPlayers.unassigned.map((player) => (
                  <PlayerChip key={player.id} player={player} onRemove={() => removePlayer(player.id)} onMove={(groupId) => movePlayer(player.id, groupId)} />
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((group) => {
            const members = groupedPlayers[group.id];
            const leader = members.find((player) => player.isGroupLeader);

            return (
              <div key={group.id} className={`rounded-[24px] border-4 p-4 shadow-[0_6px_0_rgba(68,64,60,0.22)] ${group.color}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black"><span className="mr-2">{group.icon}</span>{group.name}</h2>
                    <p className="mt-1 text-sm font-bold text-stone-600">{members.length} / {MAX_GROUP_SIZE} 人<span className="mx-2">｜</span>組長：{leader ? leader.name : "未設定"}</p>
                  </div>
                  <div className="rounded-full border-2 border-stone-700 bg-white px-3 py-1 text-sm font-black">{members.length >= MAX_GROUP_SIZE ? "已滿" : "可加入"}</div>
                </div>

                <div className="min-h-48 space-y-2">
                  {members.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white/60 p-4 text-center text-sm font-bold text-stone-500">尚未分配成員</div>
                  ) : (
                    members.map((player) => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        onRemove={() => removePlayer(player.id)}
                        onMove={(groupId) => movePlayer(player.id, groupId)}
                        onSetLeader={() => setGroupLeader(player.id, group.id)}
                        onClearLeader={() => clearGroupLeader(group.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function PlayerChip({ player, onRemove, onMove }: { player: Player; onRemove: () => void; onMove: (groupId: Player["groupId"]) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-stone-300 bg-stone-50 px-3 py-2">
      <span className="font-black">{player.name}</span>
      <GroupSelect value={player.groupId} onChange={onMove} />
      <button type="button" onClick={onRemove} className="font-black text-red-600">✕</button>
    </div>
  );
}

function PlayerRow({ player, onRemove, onMove, onSetLeader, onClearLeader }: { player: Player; onRemove: () => void; onMove: (groupId: Player["groupId"]) => void; onSetLeader: () => void; onClearLeader: () => void }) {
  return (
    <div className={`rounded-2xl border-2 p-3 shadow-sm ${player.isGroupLeader ? "border-purple-400 bg-purple-50" : "border-white/80 bg-white/80"}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-stone-800">{player.name}</p>
            {player.isGroupLeader ? <span className="rounded-full border border-purple-400 bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-700">👑 組長</span> : null}
          </div>
          {player.username || player.email ? <p className="mt-0.5 text-xs font-semibold text-stone-500">{[player.username, player.email].filter(Boolean).join("｜")}</p> : null}
        </div>
        <button type="button" onClick={onRemove} className="rounded-full bg-red-100 px-2 py-1 font-black text-red-700">移除</button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <GroupSelect value={player.groupId} onChange={onMove} />
        {player.isGroupLeader ? (
          <button type="button" onClick={onClearLeader} className="rounded-xl border-2 border-purple-300 bg-white px-3 py-1 text-sm font-black text-purple-700">取消組長</button>
        ) : (
          <button type="button" onClick={onSetLeader} className="rounded-xl border-2 border-purple-700 bg-purple-600 px-3 py-1 text-sm font-black text-white">設為組長</button>
        )}
      </div>
    </div>
  );
}

function GroupSelect({ value, onChange }: { value: Player["groupId"]; onChange: (groupId: Player["groupId"]) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as Player["groupId"])} className="w-full rounded-xl border-2 border-stone-300 bg-white px-2 py-1 text-sm font-bold outline-none focus:border-stone-700">
      <option value="unassigned">未分配</option>
      {GROUPS.map((group) => <option key={group.id} value={group.id}>{group.icon} {group.name}</option>)}
    </select>
  );
}
