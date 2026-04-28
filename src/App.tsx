import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import LockedFlipCardsPage from "./LockedFlipCardsPage";
import MiaoliMapPage, { labelPositions, regions } from "./MiaoliMapPage";

type Page = "home" | "question1" | "question2" | "ready" | "cards" | "map";
type MapChoice = "保育" | "開發";
type MapState = Record<string, MapChoice>;

type EvidenceCardSummary = {
  id: string;
  title: string;
  imageSrc: string;
  content: string;
};

type FinalSummary = {
  studentThought: string;
  studentPlan: string;
  evidenceCards: EvidenceCardSummary[];
  finalDiscovery: string;
};

type TitleReward = {
  id: string;
  name: string;
  description: string;
};

const GAME_BTN =
  "relative overflow-hidden rounded-xl border px-5 py-3 text-sm font-semibold tracking-[0.12em] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]";
const GAME_BTN_BLUE =
  "border-stone-300 bg-white/85 text-stone-700 hover:border-stone-500 hover:bg-stone-50";
const GAME_BTN_DISABLED =
  "cursor-not-allowed border-stone-200 bg-stone-100/80 text-stone-400 shadow-none hover:translate-y-0 hover:shadow-none active:scale-100";

const HOME_TITLE_REWARDS: TitleReward[] = [
  { id: "water_novice", name: "水資源新手", description: "蒐集 3 張水資源卡牌" },
  { id: "water_advanced", name: "水資源老手", description: "蒐集 7 張水資源卡牌" },
  { id: "water_master", name: "水資源大師", description: "蒐集 10 張水資源卡牌" },
  { id: "land_novice", name: "土地資料新手", description: "蒐集 3 張土地資料卡牌" },
  { id: "land_advanced", name: "土地資料老手", description: "蒐集 7 張土地資料卡牌" },
  { id: "land_master", name: "土地資料大師", description: "蒐集 10 張土地資料卡牌" },
  { id: "leopard_novice", name: "石虎相關資料新手", description: "蒐集 3 張石虎相關資料卡牌" },
  { id: "leopard_advanced", name: "石虎相關資料老手", description: "蒐集 7 張石虎相關資料卡牌" },
  { id: "leopard_master", name: "石虎相關資料大師", description: "蒐集 10 張石虎相關資料卡牌" },
  { id: "rumor_novice", name: "NPC謠言新手", description: "蒐集 3 張 NPC 謠言卡牌" },
  { id: "rumor_advanced", name: "NPC謠言老手", description: "蒐集 7 張 NPC 謠言卡牌" },
  { id: "rumor_master", name: "NPC謠言大師", description: "蒐集 10 張 NPC 謠言卡牌" },
  { id: "cross_novice", name: "跨領域新手", description: "每個分類都至少蒐集 2 張卡牌" },
  { id: "cross_advanced", name: "跨領域老手", description: "每個分類都至少蒐集 4 張卡牌" },
  { id: "cross_master", name: "跨領域大師", description: "每個分類都至少蒐集 6 張卡牌" },
  { id: "investigation_novice", name: "探究新手", description: "完成 1 份調查書" },
  { id: "investigation_advanced", name: "探究老手", description: "完成 5 份調查書" },
  { id: "investigation_master", name: "探究大師", description: "完成 10 份調查書" },
];

const MAP_STORAGE_KEY = "miaoli-puzzle-map-v1";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getStoredMapState(): MapState {
  try {
    return JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "{}") as MapState;
  } catch {
    return {};
  }
}

function getMedalStyle(title: TitleReward) {
  const isMaster = title.id.includes("master") || title.name.includes("大師");
  const isAdvanced = title.id.includes("advanced") || title.name.includes("老手");

  if (isMaster) {
    return {
      rank: "MASTER",
      label: "大師級勳章",
      shine: "from-[#fff4c0] via-[#d8a93b] to-[#8b6320]",
      metal: "from-[#fff7cf] via-[#d8aa3d] to-[#8b6422]",
      border: "border-[#b7892e]",
      ribbon: "from-[#7b2f2f] via-[#9f4a3f] to-[#5d2323]",
      text: "text-[#5f4217]",
      glow: "shadow-[0_14px_28px_rgba(139,100,34,0.24)]",
      star: "★ ★ ★",
    };
  }

  if (isAdvanced) {
    return {
      rank: "VETERAN",
      label: "老手級勳章",
      shine: "from-[#ffffff] via-[#c9c9c4] to-[#8c8d88]",
      metal: "from-[#ffffff] via-[#c9c9c4] to-[#7f817c]",
      border: "border-[#9a9c96]",
      ribbon: "from-[#3f4f5e] via-[#607082] to-[#2f3b48]",
      text: "text-[#4f514c]",
      glow: "shadow-[0_14px_28px_rgba(75,85,99,0.18)]",
      star: "★ ★",
    };
  }

  return {
    rank: "ROOKIE",
    label: "新手級勳章",
    shine: "from-[#ffe4c4] via-[#b9784b] to-[#7a442b]",
    metal: "from-[#ffe2bf] via-[#b9784b] to-[#764126]",
    border: "border-[#9a5f3d]",
    ribbon: "from-[#5d4a3f] via-[#8a6b58] to-[#49382f]",
    text: "text-[#70452c]",
    glow: "shadow-[0_14px_28px_rgba(120,65,38,0.18)]",
    star: "★",
  };
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [studentThought, setStudentThought] = useState("");
  const [studentPlan, setStudentPlan] = useState("");
  const [finalSummaries, setFinalSummaries] = useState<FinalSummary[]>([]);
  const [isMapTaskOpen, setIsMapTaskOpen] = useState(false);
  const [reportPageIndex, setReportPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [earnedHomeTitles, setEarnedHomeTitles] = useState<TitleReward[]>([]);

  const canUseFullscreen =
    typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen);

  const mapState = useMemo(getStoredMapState, [page]);
  const markedMapCount = Object.values(mapState).filter(
    (value) => value === "保育" || value === "開發",
  ).length;
  const reportPageCount = finalSummaries.length + 1;

  useEffect(() => {
    const completedCount = finalSummaries.length;

    setEarnedHomeTitles((prev) => {
      const existingIds = new Set(prev.map((title) => title.id));
      const nextTitles = [...prev];

      const addTitle = (id: string) => {
        if (existingIds.has(id)) return;

        const reward = HOME_TITLE_REWARDS.find((title) => title.id === id);
        if (reward) nextTitles.push(reward);
      };

      if (completedCount >= 1) addTitle("investigation_novice");
      if (completedCount >= 5) addTitle("investigation_advanced");
      if (completedCount >= 10) addTitle("investigation_master");

      return nextTitles;
    });
  }, [finalSummaries.length]);

  useEffect(() => {
    window.history.replaceState({ page: "home" }, "", window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      setPage((event.state?.page as Page | undefined) || "home");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function goPage(nextPage: Page) {
    window.history.pushState({ page: nextPage }, "", window.location.href);
    setPage(nextPage);
  }

  function goToReportPage(nextIndex: number) {
    setReportPageIndex(clamp(nextIndex, 0, reportPageCount - 1));
  }

  function startNewExploration() {
    setStudentThought("");
    setStudentPlan("");
    goPage("question1");
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("無法切換全螢幕模式：", error);
    }
  }

  function updateHomeTitles(titles: TitleReward[]) {
    setEarnedHomeTitles((prev) => {
      const rewardMap = new Map(prev.map((title) => [title.id, title]));
      titles.forEach((title) => rewardMap.set(title.id, title));
      return Array.from(rewardMap.values());
    });
  }

  function handleSubmitSummary(summary: FinalSummary) {
    setFinalSummaries((prev) => [...prev, summary]);
    setReportPageIndex(finalSummaries.length);
    goPage("home");
  }

  function renderHomePage() {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f3efe6] p-6 text-stone-800">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(173,163,138,0.22),transparent_30%),linear-gradient(135deg,rgba(68,64,60,0.06)_0_1px,transparent_1px_32px)]" />
          <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-stone-300/20 blur-[90px]" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#b6c1ad]/25 blur-[110px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <header className="mb-6 overflow-hidden rounded-[34px] border border-stone-200/90 bg-white/72 p-7 shadow-[0_22px_70px_rgba(45,41,34,0.10)] backdrop-blur-xl">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="hidden lg:block" />

              <div className="text-center">
                <h1 className="font-serif text-5xl font-semibold tracking-[0.22em] text-stone-800 md:text-7xl">
                  淺山守望者
                </h1>
                <div className="mx-auto mt-4 h-px w-48 bg-gradient-to-r from-transparent via-stone-400 to-transparent" />
              </div>

              <div className="flex flex-col items-center gap-3 lg:items-end">
                {canUseFullscreen ? (
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className={`${GAME_BTN} ${GAME_BTN_BLUE}`}
                  >
                    {isFullscreen ? "離開全螢幕" : "進入全螢幕"}
                  </button>
                ) : null}

                <div className="grid grid-cols-3 gap-3">
                  <StatCard value={finalSummaries.length} label="調查書" color="blue" />
                  <StatCard value={markedMapCount} label="地圖標記" color="emerald" />
                  <StatCard value={earnedHomeTitles.length} label="稱號" color="amber" />
                </div>
              </div>
            </div>
          </header>

          <main className="grid gap-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {renderReportSection()}
              {renderMapSection()}
            </div>
            {renderTitleCollectionSection()}
          </main>
        </div>
      </div>
    );
  }

  function renderReportSection() {
    return (
      <section className="relative overflow-hidden rounded-[34px] border border-[#d7c8ad] bg-[#efe5d1]/88 p-5 shadow-[0_24px_70px_rgba(45,41,34,0.16)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(120,92,58,0.08)_1px,transparent_1px),linear-gradient(rgba(120,92,58,0.06)_1px,transparent_1px)] bg-[size:26px_26px]" />
          <div className="absolute -left-20 top-12 h-52 w-52 rounded-full bg-[#8b6f47]/10 blur-[70px]" />
          <div className="absolute right-8 top-8 rotate-[-12deg] rounded-md border-2 border-[#9b2f2f]/35 px-5 py-2 text-sm font-black tracking-[0.28em] text-[#9b2f2f]/35">
            CASE FILE
          </div>
        </div>

        <div className="relative mb-5 flex items-start justify-between gap-4 border-b border-[#cdbb9c] pb-4">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#c9b38e] bg-[#f8f1df] text-3xl shadow-sm">
              🔍
            </div>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#cbb894] bg-[#f8f1df]/80 px-3 py-1 text-[11px] font-black tracking-[0.28em] text-[#7a6a52]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7d8b6f]" />
                DETECTIVE DOSSIER
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-[0.08em] text-[#2f2a24]">
                任務一:探究調查
              </h2>
            </div>
          </div>
        </div>

        <div className="relative rounded-[30px] border border-[#c7b594] bg-[#d9c9a8] p-3 shadow-inner">
          <div className="absolute -top-3 left-10 z-10 rounded-t-2xl border-x border-t border-[#c7b594] bg-[#d9c9a8] px-8 py-2 text-xs font-black tracking-[0.22em] text-[#6d5e49] shadow-sm">
            INQUIRY BOOK
          </div>
          <div className="absolute left-4 top-16 z-10 h-20 w-3 rounded-full bg-[#9b2f2f]/65 shadow-sm" />
          <div className="absolute bottom-10 left-4 z-10 h-20 w-3 rounded-full bg-[#9b2f2f]/65 shadow-sm" />

          <div className="overflow-hidden rounded-[24px] border border-[#bba985] bg-[#fbf5e8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
            <motion.div
              key={reportPageIndex}
              className="cursor-grab active:cursor-grabbing"
              drag="x"
              dragElastic={0.12}
              dragMomentum={false}
              dragConstraints={{ left: 0, right: 0 }}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) goToReportPage(reportPageIndex + 1);
                if (info.offset.x > 80) goToReportPage(reportPageIndex - 1);
              }}
            >
              {reportPageIndex < finalSummaries.length ? (
                <ReportPage summary={finalSummaries[reportPageIndex]} index={reportPageIndex} />
              ) : (
                <div className="px-1">
                  <div className="group relative flex min-h-[450px] w-full flex-col items-center justify-center overflow-hidden rounded-[26px] bg-[#fffaf0] p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(92,67,41,0.06)_1px,transparent_1px)] bg-[size:100%_30px]" />
                    <div className="pointer-events-none absolute right-8 top-8 rotate-[-10deg] rounded-md border-2 border-[#9b2f2f]/25 px-4 py-2 text-xs font-black tracking-[0.26em] text-[#9b2f2f]/25">
                      NEW CASE
                    </div>
                    <button
                      type="button"
                      onClick={startNewExploration}
                      className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#b8a37d] bg-gradient-to-br from-[#fff8e8] to-[#e9dcc1] text-6xl font-semibold leading-none text-[#4f4333] shadow-[0_14px_30px_rgba(72,56,34,0.18)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(72,56,34,0.22)] active:translate-y-0"
                    >
                      +
                    </button>
                    <p className="relative font-serif text-2xl font-semibold tracking-[0.08em] text-[#332c24]">
                      建立新的探究調查書
                    </p>
                    <p className="relative mt-2 text-sm text-[#756957]">開啟一份新的案件紀錄</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full border border-[#c8b48f] bg-[#fffaf0]/80 px-3 py-2">
              {Array.from({ length: reportPageCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToReportPage(index)}
                  aria-label={`前往第 ${index + 1} 頁`}
                  className={`h-2.5 rounded-full transition ${
                    reportPageIndex === index
                      ? "w-8 bg-[#6d5e49]"
                      : "w-2.5 bg-[#c8b48f] hover:bg-[#a99572]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderMapSection() {
    return (
      <section className="relative overflow-hidden rounded-[34px] border border-[#c8c1ad] bg-[#e8e1d0]/82 p-5 shadow-[0_24px_70px_rgba(45,41,34,0.14)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 opacity-75">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(99,91,71,0.07)_1px,transparent_1px),linear-gradient(rgba(99,91,71,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.52),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(111,123,98,0.18),transparent_34%)]" />
        </div>

        <div className="relative mb-5 flex min-h-[72px] items-start justify-between gap-4 border-b border-[#c5bba3] pb-4">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#bdb294] bg-[#f7f1e3] text-3xl shadow-sm">
              🗺️
            </div>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#bbb296] bg-[#f7f1e3]/85 px-3 py-1 text-[11px] font-black tracking-[0.26em] text-[#68614f]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isMapTaskOpen ? "bg-[#77866b]" : "bg-stone-400"
                  }`}
                />
                TERRAIN SURVEY
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-[0.06em] text-[#2f2a24]">
                任務二：<br />
                繪製地圖
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={!isMapTaskOpen}
              onClick={() => goPage("map")}
              className={`${GAME_BTN} min-w-[136px] ${
                isMapTaskOpen
                  ? "border-[#a9b39a] bg-[#f4f7ef] text-[#46513e] hover:border-[#7d8b6f] hover:bg-[#edf3e6]"
                  : GAME_BTN_DISABLED
              }`}
            >
              {isMapTaskOpen ? "前往苗栗地圖" : "地圖任務未開啟"}
            </button>

            <button
              type="button"
              onClick={() => setIsMapTaskOpen((prev) => !prev)}
              className={`${GAME_BTN} min-w-[136px] ${
                isMapTaskOpen
                  ? "border-[#d7b8b1] bg-[#fbefed] text-[#8b4a43] hover:border-[#c98f85] hover:bg-[#f7e5e1]"
                  : "border-[#a9b39a] bg-[#f4f7ef] text-[#46513e] hover:border-[#7d8b6f] hover:bg-[#edf3e6]"
              }`}
            >
              {isMapTaskOpen ? "關閉地圖任務" : "開啟地圖任務"}
            </button>
          </div>
        </div>

        <div
          className={`relative min-h-[514px] overflow-hidden rounded-[30px] border transition ${
            isMapTaskOpen
              ? "border-[#aaa78f] bg-[#d9dbc4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]"
              : "border-stone-200 bg-stone-100"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 z-0 opacity-80">
            <div className="absolute inset-0 bg-[#d9dbc4]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(247,241,227,0.85),transparent_28%),radial-gradient(circle_at_72%_68%,rgba(122,137,103,0.22),transparent_35%),radial-gradient(circle_at_44%_82%,rgba(181,154,111,0.16),transparent_30%)]" />
            <div className="absolute inset-0 opacity-35 bg-[repeating-linear-gradient(25deg,transparent_0_11px,rgba(78,89,65,0.16)_12px,transparent_13px),repeating-linear-gradient(-18deg,transparent_0_18px,rgba(255,255,255,0.18)_19px,transparent_20px)]" />
            <div className="absolute inset-x-8 top-8 h-px bg-[#7f806b]/25" />
            <div className="absolute inset-x-8 bottom-12 h-px bg-[#7f806b]/25" />
          </div>

          {!isMapTaskOpen ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-900/20 backdrop-blur-sm">
              <div className="rounded-3xl border border-white/70 bg-[#fffaf0]/92 px-6 py-5 text-center shadow-xl">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[#c8b48f] bg-[#efe5d1] text-3xl">
                  🔒
                </div>
                <p className="text-lg font-semibold text-stone-700">苗栗地圖任務尚未開啟</p>
                <p className="mt-2 text-sm leading-6 text-stone-500">請等待教師開啟第二回合任務</p>
              </div>
            </div>
          ) : null}

          <div
            className={`relative z-10 flex h-[514px] w-full items-center justify-center overflow-hidden ${
              isMapTaskOpen ? "" : "pointer-events-none opacity-35 grayscale"
            }`}
          >
            <svg
              viewBox="0 60 380 300"
              className="h-full w-full drop-shadow-[0_14px_18px_rgba(62,55,41,0.18)]"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern id="map-paper-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path
                    d="M 16 0 L 0 0 0 16"
                    fill="none"
                    stroke="#8b8a73"
                    strokeWidth="0.35"
                    opacity="0.22"
                  />
                </pattern>
                <filter id="map-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#4b4637" floodOpacity="0.22" />
                </filter>
              </defs>

              <rect x="0" y="60" width="380" height="300" fill="url(#map-paper-grid)" opacity="0.45" />

              {regions.map((region) => {
                const state = mapState[region.name];
                const pos = labelPositions[region.name];

                return (
                  <g key={region.name} filter="url(#map-soft-shadow)">
                    <path
                      d={region.d}
                      fill={state === "保育" ? "#aebc9c" : state === "開發" ? "#c58f82" : "#f6f0df"}
                      stroke="#8f876f"
                      strokeWidth="1.8"
                    />
                    <path
                      d={region.d}
                      fill="url(#map-paper-grid)"
                      opacity="0.35"
                      stroke="#fff8e8"
                      strokeWidth="0.8"
                    />
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={pos.size}
                      fontWeight="800"
                      fill="#3f3a34"
                      stroke="#f8f1e3"
                      strokeWidth="2.8"
                      paintOrder="stroke"
                    >
                      {region.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="absolute left-5 top-5 z-10 rounded-2xl border border-[#8f876f]/35 bg-[#f7f1e3]/80 px-3 py-2 text-[10px] font-black tracking-[0.2em] text-[#68614f] shadow-sm backdrop-blur-sm">
            MIAOLI COUNTY
          </div>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-5 rounded-full border border-[#8f876f]/30 bg-[#f7f1e3]/82 px-5 py-2 text-xs font-semibold text-[#5f5a4a] shadow-sm backdrop-blur-sm">
            <Legend color="bg-[#f6f0df] border border-[#8f876f]" label="未標記" />
            <Legend color="bg-[#aebc9c] border border-[#7d8b6f]" label="保育" />
            <Legend color="bg-[#c58f82] border border-[#a66d64]" label="開發" />
          </div>
        </div>
      </section>
    );
  }

  function renderTitleCollectionSection() {
    const earnedTitleIds = new Set(earnedHomeTitles.map((title) => title.id));

    return (
      <section className="relative overflow-hidden rounded-[34px] border border-[#d8cbb3] bg-[#f7f1e6]/86 p-6 shadow-[0_22px_70px_rgba(45,41,34,0.11)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(120,92,58,0.055)_1px,transparent_1px),linear-gradient(rgba(120,92,58,0.045)_1px,transparent_1px)] bg-[size:30px_30px]" />
          <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#d7c49a]/25 blur-[90px]" />
          <div className="absolute bottom-[-120px] left-20 h-72 w-72 rounded-full bg-[#8b7a5c]/12 blur-[90px]" />
        </div>

        <div className="relative mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[#d6c7aa] pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#c9b793] bg-[#fff8e8] text-3xl shadow-sm">
              🎖️
            </div>
            <div>
              <p className="mb-2 text-xs font-black tracking-[0.3em] text-[#84745c]">
                HONOR MEDAL ARCHIVE
              </p>
              <h2 className="font-serif text-3xl font-semibold tracking-[0.06em] text-[#2f2a24]">
                學生蒐集的稱號
              </h2>
            </div>
          </div>

          <span className="rounded-full border border-[#cdbb9c] bg-[#fff8e8]/85 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#6d5e49] shadow-sm">
            {earnedHomeTitles.length} / {HOME_TITLE_REWARDS.length}
          </span>
        </div>

        <div className="relative grid min-h-[190px] grid-cols-2 gap-2.5 rounded-[30px] border border-[#d7c8ad] bg-[#fbf7ee]/88 p-3 shadow-inner shadow-white/70 md:grid-cols-3 lg:grid-cols-6">
          {HOME_TITLE_REWARDS.map((title) => {
            const earned = earnedTitleIds.has(title.id);
            const style = getMedalStyle(title);

            return (
              <motion.div
                key={title.id}
                initial={false}
                animate={earned ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.34, scale: 0.94, y: 4 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className={`group relative overflow-hidden rounded-[22px] border bg-[#fffaf0] px-2.5 py-2 text-left transition duration-200 ${
                  earned
                    ? `${style.border} ${style.glow} hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(45,41,34,0.16)]`
                    : "border-stone-200 grayscale"
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.9),transparent_42%)] opacity-70" />

                <div className="relative flex min-h-[104px] items-center gap-2.5">
                  <div className="flex w-[54px] shrink-0 flex-col items-center">
                    <div
                      className={`relative mb-[-6px] h-12 w-12 rounded-full border-[3px] ${
                        earned ? style.border : "border-stone-300"
                      } bg-gradient-to-br ${
                        earned ? style.metal : "from-stone-100 via-stone-200 to-stone-300"
                      } shadow-[inset_0_3px_8px_rgba(255,255,255,0.75),inset_0_-7px_10px_rgba(0,0,0,0.14),0_8px_14px_rgba(45,41,34,0.16)]`}
                    >
                      <div className="absolute inset-1.5 rounded-full border border-white/55 bg-white/10" />
                      <div
                        className={`absolute inset-[10px] rounded-full border ${
                          earned ? "border-white/70" : "border-stone-300"
                        } bg-gradient-to-br ${earned ? style.shine : "from-stone-50 via-stone-200 to-stone-400"}`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-lg drop-shadow-sm">
                        {earned ? "★" : "🔒"}
                      </div>
                    </div>

                    <div className="relative flex w-14 justify-center">
                      <div
                        className={`h-8 w-5 origin-top rotate-[8deg] bg-gradient-to-b ${
                          earned ? style.ribbon : "from-stone-300 to-stone-400"
                        } [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)] shadow-sm`}
                      />
                      <div
                        className={`-ml-1.5 h-8 w-5 origin-top rotate-[-8deg] bg-gradient-to-b ${
                          earned ? style.ribbon : "from-stone-300 to-stone-400"
                        } [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)] shadow-sm`}
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`relative mb-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black tracking-[0.13em] ${
                        earned
                          ? `${style.border} ${style.text} bg-white/55`
                          : "border-stone-300 bg-stone-100 text-stone-400"
                      }`}
                    >
                      {earned ? style.rank : "LOCKED"}
                    </div>

                    {earned ? (
                      <>
                        <p className="relative text-[13px] font-black leading-[1.28] text-[#332c24]">
                          {title.name}
                        </p>
                        <p className="relative mt-0.5 text-[11px] leading-[1.28] text-[#746855]">
                          {title.description}
                        </p>
                        <p className={`relative mt-1 text-[9px] font-black tracking-[0.18em] ${style.text}`}>
                          {style.star}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <>
      {page === "home" ? renderHomePage() : null}

      {page === "question1" ? (
        <QuestionPage
          title="你在想什麼？"
          value={studentThought}
          placeholder="請輸入你的想法..."
          onChange={setStudentThought}
          nextDisabled={!studentThought.trim()}
          onNext={() => goPage("question2")}
        />
      ) : null}

      {page === "question2" ? (
        <QuestionPage
          title="你對於你的想法有什麼規劃的解決方法嗎？"
          value={studentPlan}
          placeholder="請輸入你的解決方法..."
          onChange={setStudentPlan}
          nextDisabled={!studentPlan.trim()}
          onBack={() => goPage("question1")}
          onNext={() => goPage("ready")}
        />
      ) : null}

      {page === "ready" ? (
        <div className="flex min-h-screen items-center justify-center bg-[#f3efe6] p-6">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
            <h2 className="mb-4 text-2xl font-semibold">準備好開始當一位數據探究大師了嗎？</h2>
            <button
              type="button"
              onClick={() => goPage("cards")}
              className="mt-6 rounded-2xl bg-stone-700 px-8 py-4 font-semibold text-white transition hover:bg-stone-800"
            >
              準備好了
            </button>
          </div>
        </div>
      ) : null}

      {page === "cards" ? (
        <LockedFlipCardsPage
          studentThought={studentThought}
          studentPlan={studentPlan}
          onTitleRewardsChange={updateHomeTitles}
          onSubmitSummary={handleSubmitSummary}
        />
      ) : null}

      {page === "map" ? <MiaoliMapPage onBack={() => goPage("home")} /> : null}
    </>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: "blue" | "emerald" | "amber";
}) {
  const styles = {
    blue: "border-blue-100 bg-blue-50 text-stone-600",
    emerald: "border-[#cfd7c6] bg-[#f4f7ef]/85 text-stone-700",
    amber: "border-amber-100 bg-amber-50 text-stone-600",
  };

  return (
    <div className={`rounded-3xl border px-5 py-4 text-center ${styles[color]}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs font-bold">{label}</p>
    </div>
  );
}

function ReportPage({ summary, index }: { summary: FinalSummary; index: number }) {
  return (
    <div className="min-w-full shrink-0 px-1">
      <div className="relative min-h-[450px] overflow-hidden rounded-[26px] bg-[#fffaf0] p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(92,67,41,0.06)_1px,transparent_1px)] bg-[size:100%_30px]" />
        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-[#e5d3b2] to-transparent" />
        <div className="pointer-events-none absolute right-6 top-8 rotate-[-9deg] rounded-md border-2 border-[#9b2f2f]/35 px-4 py-2 text-xs font-black tracking-[0.26em] text-[#9b2f2f]/35">
          SOLVED
        </div>

        <div className="relative mb-5 flex items-start justify-between gap-3 border-b border-dashed border-[#c8b48f] pb-4">
          <div>
            <p className="text-[11px] font-black tracking-[0.28em] text-[#7a6a52]">INQUIRY REPORT</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold tracking-[0.08em] text-[#332c24]">
              調查報告書 #{index + 1}
            </h3>
          </div>
        </div>

        <div className="relative mb-4 grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
          <DetectiveEvidenceBox badge="QUESTIONING" title="案件想法" content={summary.studentThought} />
          <DetectiveEvidenceBox badge="EXPLORATION" title="行動規劃" content={summary.studentPlan} />
        </div>

        <div className="relative mb-4 rounded-2xl border border-[#d2bf99] bg-[#f7ecd5] p-4 shadow-sm">
          <div className="absolute -top-3 left-5 rotate-[-3deg] rounded-md bg-[#d8c29a] px-3 py-1 text-[10px] font-black tracking-[0.22em] text-[#5c503e] shadow-sm">
            EVIDENCE
          </div>
          <div className="mb-3 flex items-center justify-between pt-2">
            <p className="text-xs font-bold tracking-[0.18em] text-[#6d5e49]">線索卡片</p>
            <p className="text-xs font-bold text-[#6d5e49]">{summary.evidenceCards.length} 張</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {summary.evidenceCards.slice(0, 6).map((card) => (
              <div
                key={card.id}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                className="relative h-16 w-16 rotate-[-2deg] select-none rounded-xl border border-[#c8b48f] bg-[#fffaf0] p-1.5 shadow-sm odd:rotate-[2deg]"
              >
                <img
                  src={card.imageSrc}
                  alt={card.title}
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  className="pointer-events-none h-full w-full select-none object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        <DetectiveEvidenceBox
          badge="Conclusion"
          title="最終結論"
          content={summary.finalDiscovery}
          variant="green"
        />
      </div>
    </div>
  );
}

function DetectiveEvidenceBox({
  badge,
  title,
  content,
  variant = "paper",
}: {
  badge: string;
  title: string;
  content: string;
  variant?: "paper" | "green";
}) {
  const isGreen = variant === "green";

  return (
    <div
      className={`relative rounded-2xl border p-4 shadow-sm ${
        isGreen ? "border-[#c5cfba] bg-[#f2f5ec]" : "border-[#d2bf99] bg-[#f7ecd5]"
      }`}
    >
      <div
        className={`absolute -top-3 left-5 rotate-[-3deg] rounded-md px-3 py-1 text-[10px] font-black tracking-[0.22em] shadow-sm ${
          isGreen ? "bg-[#c9d6bd] text-[#54614c]" : "bg-[#d8c29a] text-[#5c503e]"
        }`}
      >
        {badge}
      </div>

      <div className="pt-2">
        <p className={`mb-2 text-xs font-bold tracking-[0.18em] ${isGreen ? "text-[#65715d]" : "text-[#6d5e49]"}`}>
          {title}
        </p>
        <div
          className={`rounded-xl border p-3 ${
            isGreen ? "border-[#d3ddc9] bg-[#fbfcf7]/80" : "border-[#e1d0ad] bg-[#fffaf0]/80"
          }`}
        >
          <p className={`line-clamp-5 text-xs leading-6 ${isGreen ? "text-[#3f4639]" : "text-[#4d4438]"}`}>
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${color}`} />
      {label}
    </div>
  );
}

function QuestionPage({
  title,
  value,
  placeholder,
  onChange,
  onNext,
  onBack,
  nextDisabled,
}: {
  title: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack?: () => void;
  nextDisabled: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3efe6] p-6">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl">
        <h2 className="mb-4 text-2xl font-semibold">{title}</h2>

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-40 w-full rounded-2xl border border-stone-300 p-4 text-base outline-none focus:border-stone-500"
        />

        <div className={`mt-6 flex ${onBack ? "justify-between" : "justify-end"}`}>
          {onBack ? (
            <button type="button" onClick={onBack} className="rounded-2xl bg-stone-200 px-6 py-3 font-semibold">
              上一步
            </button>
          ) : null}

          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className="rounded-2xl bg-stone-700 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  );
}
