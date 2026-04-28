import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import LockedFlipCardsPage from "./LockedFlipCardsPage";
import MiaoliMapPage, { regions, labelPositions } from "./MiaoliMapPage";

type Page = "home" | "question1" | "question2" | "ready" | "cards" | "map";

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

type MapState = Record<string, "保育" | "開發">;

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [studentThought, setStudentThought] = useState("");
  const [studentPlan, setStudentPlan] = useState("");
  const [finalSummaries, setFinalSummaries] = useState<FinalSummary[]>([]);
  const [isMapTaskOpen, setIsMapTaskOpen] = useState(false);
  const [reportPageIndex, setReportPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mapState = useMemo(() => {
    return JSON.parse(localStorage.getItem("miaoli-puzzle-map-v1") || "{}") as MapState;
  }, [page]);

  const markedMapCount = Object.values(mapState).filter(
    (value) => value === "保育" || value === "開發"
  ).length;

  const reportPageCount = finalSummaries.length + 1;

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
    setReportPageIndex(Math.max(0, Math.min(reportPageCount - 1, nextIndex)));
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

  function renderHomePage() {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f8fafc_45%,#eef2ff_100%)] p-6 text-slate-800">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 rounded-[34px] border border-white/80 bg-white/85 p-7 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-sm font-bold tracking-[0.35em] text-blue-600">
                  PERSONAL EXPLORATION RECORD
                </p>

                <h1 className="text-4xl font-black tracking-wide text-slate-800">
                  石虎數據探究歷程
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  這裡會記錄你在系統中的探究歷程：完成的調查書、苗栗地圖成果，以及蒐集到的稱號。
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-700"
                >
                  {isFullscreen ? "離開全螢幕" : "進入全螢幕"}
                </button>

                <div className="grid grid-cols-3 gap-3">
                  <StatCard value={finalSummaries.length} label="調查書" color="blue" />
                  <StatCard value={markedMapCount} label="地圖標記" color="emerald" />
                  <StatCard value={0} label="稱號" color="amber" />
                </div>
              </div>
            </div>
          </header>

          <main className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
            {renderReportSection()}

            <div className="grid gap-6">
              {renderMapSection()}
              {renderTitleCollectionSection()}
            </div>
          </main>
        </div>
      </div>
    );
  }

  function renderReportSection() {
    return (
      <section className="rounded-[34px] border border-slate-200 bg-white/90 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">學生完成的調查書</h2>
            <p className="mt-1 text-sm text-slate-500">
              一份調查書就是一頁，可左右拖曳翻頁查看自己的探究歷程。
            </p>
          </div>

          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            {finalSummaries.length} 份紀錄
          </span>
        </div>

        <div className="relative rounded-[30px] border border-slate-200 bg-slate-50 p-4">
          <div className="overflow-hidden rounded-[24px]">
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
                if (info.offset.x < -80) {
                  goToReportPage(reportPageIndex + 1);
                }

                if (info.offset.x > 80) {
                  goToReportPage(reportPageIndex - 1);
                }
              }}
            >
              {reportPageIndex < finalSummaries.length ? (
                <ReportPage
                  summary={finalSummaries[reportPageIndex]}
                  index={reportPageIndex}
                />
              ) : (
                <div className="px-1">
                  <div className="group relative flex min-h-[450px] w-full flex-col items-center justify-center overflow-hidden rounded-[32px] border border-dashed border-blue-200 bg-white p-6 shadow-sm">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#dbeafe_0%,transparent_45%)] opacity-80" />

                    <button
                      type="button"
                      onClick={startNewExploration}
                      className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-[30px] bg-gradient-to-br from-blue-500 to-indigo-600 text-6xl font-black leading-none text-white shadow-xl transition hover:scale-105"
                    >
                      +
                    </button>

                    <p className="relative text-2xl font-black text-slate-800">
                      建立新的探究調查書
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2">
              {Array.from({ length: reportPageCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToReportPage(index)}
                  aria-label={`前往第 ${index + 1} 頁`}
                  className={`h-2.5 rounded-full transition ${
                    reportPageIndex === index
                      ? "w-8 bg-blue-600"
                      : "w-2.5 bg-slate-300 hover:bg-slate-400"
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
      <section className="rounded-[34px] border border-slate-200 bg-white/90 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-800">第二回合任務：苗栗地圖</h2>
            <p className="mt-1 text-sm text-slate-500">教師端可控制是否開啟苗栗地圖任務</p>
          </div>

          <button
            type="button"
            onClick={() => setIsMapTaskOpen((prev) => !prev)}
            className={`rounded-2xl px-4 py-2 text-sm font-bold text-white transition ${
              isMapTaskOpen ? "bg-rose-500 hover:bg-rose-400" : "bg-emerald-500 hover:bg-emerald-400"
            }`}
          >
            {isMapTaskOpen ? "關閉地圖任務" : "開啟地圖任務"}
          </button>
        </div>

        <div
          className={`relative overflow-hidden rounded-3xl border p-4 transition ${
            isMapTaskOpen ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-100"
          }`}
        >
          {!isMapTaskOpen && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm">
              <div className="rounded-3xl border border-white/60 bg-white/90 px-6 py-5 text-center shadow-xl">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-3xl">
                  🔒
                </div>

                <p className="text-lg font-black text-slate-700">苗栗地圖任務尚未開啟</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">請等待教師開啟第二回合任務</p>
              </div>
            </div>
          )}

          <div className={isMapTaskOpen ? "" : "pointer-events-none opacity-35 grayscale"}>
            <svg viewBox="0 -50 450 400" className="h-[280px] w-full">
              {regions.map((region) => {
                const state = mapState[region.name];
                const pos = labelPositions[region.name];

                return (
                  <g key={region.name}>
                    <path
                      d={region.d}
                      fill={state === "保育" ? "#A8C686" : state === "開發" ? "#e2574c" : "#ffffff"}
                      stroke="#cfd9ea"
                      strokeWidth="2.2"
                    />

                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={pos.size}
                      fontWeight="800"
                      fill="#20304a"
                      stroke="white"
                      strokeWidth="2.6"
                      paintOrder="stroke"
                    >
                      {region.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="mt-3 flex justify-center gap-4 text-xs font-bold">
              <Legend color="bg-white border border-slate-300" label="未標記" />
              <Legend color="bg-[#A8C686]" label="保育" />
              <Legend color="bg-[#e2574c]" label="開發" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!isMapTaskOpen}
            onClick={() => goPage("map")}
            className={`rounded-2xl px-5 py-3 text-sm font-bold text-white transition ${
              isMapTaskOpen ? "bg-emerald-500 hover:bg-emerald-400" : "cursor-not-allowed bg-slate-300"
            }`}
          >
            {isMapTaskOpen ? "前往苗栗地圖" : "地圖任務未開啟"}
          </button>
        </div>
      </section>
    );
  }

  function renderTitleCollectionSection() {
    return (
      <section className="rounded-[34px] border border-slate-200 bg-white/90 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800">學生蒐集的稱號</h2>
            <p className="mt-1 text-sm text-slate-500">探究過程中獲得的成就紀錄</p>
          </div>

          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            稱號收藏
          </span>
        </div>

        <div className="flex min-h-[220px] items-center justify-center rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/70 text-center">
          <div>
            <p className="text-lg font-black text-amber-700">稱號收藏區</p>
            <p className="mt-2 text-sm leading-6 text-amber-700/70">
              之後會顯示學生在探究過程中獲得的稱號
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {page === "home" && renderHomePage()}

      {page === "question1" && (
        <QuestionPage
          title="你在想什麼？"
          value={studentThought}
          placeholder="請輸入你的想法..."
          onChange={setStudentThought}
          nextDisabled={!studentThought.trim()}
          onNext={() => goPage("question2")}
        />
      )}

      {page === "question2" && (
        <QuestionPage
          title="你對於你的想法有什麼規劃的解決方法嗎？"
          value={studentPlan}
          placeholder="請輸入你的解決方法..."
          onChange={setStudentPlan}
          nextDisabled={!studentPlan.trim()}
          onBack={() => goPage("question1")}
          onNext={() => goPage("ready")}
        />
      )}

      {page === "ready" && (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
            <h2 className="mb-4 text-2xl font-black">準備好開始當一位數據探究大師了嗎？</h2>

            <button
              type="button"
              onClick={() => goPage("cards")}
              className="mt-6 rounded-2xl bg-emerald-600 px-8 py-4 font-black text-white transition hover:bg-emerald-700"
            >
              準備好了
            </button>
          </div>
        </div>
      )}

      {page === "cards" && (
        <LockedFlipCardsPage
          studentThought={studentThought}
          studentPlan={studentPlan}
          onSubmitSummary={(summary) => {
            setFinalSummaries((prev) => [...prev, summary]);
            setReportPageIndex(finalSummaries.length);
            goPage("home");
          }}
        />
      )}

      {page === "map" && <MiaoliMapPage onBack={() => goPage("home")} />}
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
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-3xl border px-5 py-4 text-center ${styles[color]}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold">{label}</p>
    </div>
  );
}

function ReportPage({ summary, index }: { summary: FinalSummary; index: number }) {
  return (
    <div className="min-w-full shrink-0 px-1">
      <div className="relative min-h-[450px] overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-slate-100/80 to-transparent" />

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-blue-600">完成調查書 #{index + 1}</p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            第 {index + 1} 頁
          </span>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
          <InfoBox title="想法" content={summary.studentThought} />
          <InfoBox title="規劃" content={summary.studentPlan} />
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500">證據</p>
            <p className="text-xs font-bold text-slate-500">{summary.evidenceCards.length} 張</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {summary.evidenceCards.slice(0, 6).map((card) => (
              <div
                key={card.id}
                className="h-16 w-16 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
              >
                <img src={card.imageSrc} alt={card.title} className="h-full w-full object-contain" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="mb-2 text-xs font-bold text-emerald-700">發現</p>
          <p className="line-clamp-5 text-xs leading-6 text-slate-700">{summary.finalDiscovery}</p>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="mb-2 font-bold text-slate-500">{title}</p>
      <p className="line-clamp-4 leading-6 text-slate-700">{content}</p>
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl">
        <h2 className="mb-4 text-2xl font-black">{title}</h2>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-40 w-full rounded-2xl border border-slate-300 p-4 text-base outline-none focus:border-blue-500"
        />

        <div className={`mt-6 flex ${onBack ? "justify-between" : "justify-end"}`}>
          {onBack && (
            <button type="button" onClick={onBack} className="rounded-2xl bg-slate-200 px-6 py-3 font-black">
              上一步
            </button>
          )}

          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  );
}