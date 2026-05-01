import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const COIN_REFRESH_MS = 3000;
const BARRAGE_POLL_MS = 1400;
const MAX_TEXT_LENGTH = 20;
const MAX_TRACKS = 3;
const MAX_VISIBLE_BARRAGES = 3;
const MAX_PENDING_BARRAGES = 8;
const SEND_COOLDOWN_MS = 2500;

type Barrage = {
  id: number;
  userId: number;
  username?: string | null;
  content: string;
  createdAt?: string;
};

type FlyingBarrage = Barrage & {
  track: number;
  localKey: string;
  duration: number;
};

type BarrageLayerProps = {
  token: string | null;
};

function getBarrageDuration(text: string) {
  // 教學系統使用：比一般直播彈幕慢，讓學生看得清楚。
  // 15 字最長大約 19 秒，短句也至少 12 秒。
  const baseSeconds = 12;
  const extraSecondsPerChar = 0.45;
  return Math.min(baseSeconds + text.length * extraSecondsPerChar, 19);
}

function pickAvailableTrack(trackBusyUntil: number[]) {
  const now = Date.now();
  let bestTrack = 0;
  let earliestAvailableTime = trackBusyUntil[0] || 0;

  for (let track = 0; track < MAX_TRACKS; track += 1) {
    const availableAt = trackBusyUntil[track] || 0;

    if (availableAt <= now) return track;

    if (availableAt < earliestAvailableTime) {
      bestTrack = track;
      earliestAvailableTime = availableAt;
    }
  }

  return earliestAvailableTime <= now ? bestTrack : null;
}

export default function BarrageLayer({ token }: BarrageLayerProps) {
  const [coins, setCoins] = useState(0);
  const [text, setText] = useState("");
  const [visibleBarrages, setVisibleBarrages] = useState<FlyingBarrage[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isBarrageReady, setIsBarrageReady] = useState(false);

  const lastIdRef = useRef(0);
  const sendCooldownRef = useRef(false);
  const pendingQueueRef = useRef<Barrage[]>([]);
  const visibleIdsRef = useRef<Set<number>>(new Set());
  const trackBusyUntilRef = useRef<number[]>(Array(MAX_TRACKS).fill(0));

  const canSend = useMemo(
    () => Boolean(token && text.trim() && coins > 0 && !isSending),
    [token, text, coins, isSending],
  );

  const resetBarrageState = useCallback(() => {
    lastIdRef.current = 0;
    pendingQueueRef.current = [];
    visibleIdsRef.current = new Set();
    trackBusyUntilRef.current = Array(MAX_TRACKS).fill(0);
    setVisibleBarrages([]);
    setIsBarrageReady(false);
  }, []);

  const removeBarrage = useCallback((localKey: string, id: number) => {
    visibleIdsRef.current.delete(id);
    setVisibleBarrages((prev) =>
      prev.filter((barrage) => barrage.localKey !== localKey),
    );
  }, []);

  const showOneBarrage = useCallback(
    (barrage: Barrage) => {
      if (visibleIdsRef.current.has(barrage.id)) return false;

      const track = pickAvailableTrack(trackBusyUntilRef.current);
      if (track === null) return false;

      const duration = getBarrageDuration(barrage.content);
      const flyingBarrage: FlyingBarrage = {
        ...barrage,
        track,
        duration,
        localKey: `${barrage.id}-${Date.now()}-${Math.random()}`,
      };

      visibleIdsRef.current.add(barrage.id);
      // 同一條軌道要等上一則彈幕完整跑完才可以再放下一則，避免重疊。
      trackBusyUntilRef.current[track] = Date.now() + (duration + 0.35) * 1000;

      setVisibleBarrages((prev) => {
        const next = [...prev, flyingBarrage];
        return next.slice(-MAX_VISIBLE_BARRAGES);
      });

      window.setTimeout(() => {
        removeBarrage(flyingBarrage.localKey, flyingBarrage.id);
      }, (duration + 0.5) * 1000);

      return true;
    },
    [removeBarrage],
  );

  const enqueueBarrages = useCallback((barrages: Barrage[]) => {
    if (barrages.length === 0) return;

    const queuedIds = new Set(pendingQueueRef.current.map((item) => item.id));
    const freshBarrages = barrages.filter(
      (item) => !queuedIds.has(item.id) && !visibleIdsRef.current.has(item.id),
    );

    pendingQueueRef.current = [
      ...pendingQueueRef.current,
      ...freshBarrages,
    ].slice(-MAX_PENDING_BARRAGES);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (pendingQueueRef.current.length === 0) return;

      const [next, ...rest] = pendingQueueRef.current;
      const didShow = showOneBarrage(next);

      if (didShow) {
        pendingQueueRef.current = rest;
      }
    }, 420);

    return () => window.clearInterval(timer);
  }, [showOneBarrage]);

  const loadCoins = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/barrage-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "讀取 coin 失敗");
      setCoins(Math.min(Number(data.coins) || 0, 10));
    } catch (error) {
      console.error(error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      resetBarrageState();
      return;
    }

    loadCoins();
    const timer = window.setInterval(loadCoins, COIN_REFRESH_MS);

    const handleFocus = () => {
      loadCoins();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [token, loadCoins, resetBarrageState]);

  useEffect(() => {
    if (!token) return;

    let ignore = false;
    resetBarrageState();

    async function initializeBarrageCursor() {
      try {
        const res = await fetch(`${API_BASE}/api/barrages/latest-id`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok || ignore) return;

        // 重要：登入時只記住目前最新彈幕 ID，不把歷史彈幕丟進畫面。
        lastIdRef.current = Number(data.latestId) || 0;
        setIsBarrageReady(true);
      } catch (error) {
        console.error(error);
        if (!ignore) setIsBarrageReady(true);
      }
    }

    initializeBarrageCursor();

    return () => {
      ignore = true;
    };
  }, [token, resetBarrageState]);

  useEffect(() => {
    if (!token || !isBarrageReady) return;

    let ignore = false;

    async function loadBarrages() {
      try {
        const res = await fetch(
          `${API_BASE}/api/barrages?afterId=${lastIdRef.current}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await res.json();
        if (!res.ok || ignore) return;

        const barrages = (data.barrages || []) as Barrage[];
        if (barrages.length === 0) return;

        lastIdRef.current = barrages[barrages.length - 1].id;
        enqueueBarrages(barrages);
      } catch (error) {
        console.error(error);
      }
    }

    const timer = window.setInterval(loadBarrages, BARRAGE_POLL_MS);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [token, isBarrageReady, enqueueBarrages]);

  async function sendBarrage() { 
    const content = text.trim();

    if (!token || !content || isSending) return;

    if (content.length > MAX_TEXT_LENGTH) {
      setStatusMessage("彈幕最多 20 個字");
      return;
    }

    if (sendCooldownRef.current) {
      setStatusMessage("請稍等一下再發射彈幕");
      return;
    }

    sendCooldownRef.current = true;
    window.setTimeout(() => {
      sendCooldownRef.current = false;
    }, SEND_COOLDOWN_MS);

    setIsSending(true);
    setStatusMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/barrages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage(data.message || "送出彈幕失敗");
        return;
      }

      setText("");
      setCoins(Math.min(Number(data.coins) || 0, 10));

      if (data.barrage) {
        lastIdRef.current = Math.max(lastIdRef.current, data.barrage.id);
        enqueueBarrages([data.barrage]);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("送出彈幕失敗，請稍後再試");
    } finally {
      setIsSending(false);
    }
  }

  if (!token) return null;

      return (
      <>
        {/* ===== 彈幕顯示區 ===== */}
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[90] h-[200px] overflow-hidden">
          <AnimatePresence>
            {visibleBarrages.map((item) => (
              <motion.div
                key={item.localKey}
                initial={{ x: "105vw" }}   // 一進來就在右邊
                animate={{ x: "-120vw" }}  // 平移到左邊
                transition={{
                  duration: getBarrageDuration(item.content),
                  ease: "linear",
                }}
                className="absolute whitespace-nowrap px-4 py-1 text-lg font-extrabold text-black"
                style={{
                  top: `${item.track * 40}px`,
                  textShadow: `
                    1px 1px 0 #fff,
                    -1px -1px 0 #fff,
                    1px -1px 0 #fff,
                    -1px 1px 0 #fff
                  `,
                }}
              >
                {item.content}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ===== 輸入區（你這段剛剛消失的）===== */}
        <div className="fixed bottom-4 left-1/2 z-[95] w-[min(92vw,560px)] -translate-x-1/2">
          {statusMessage && (
            <div className="mb-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-600">
              {statusMessage}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border-2 border-stone-700 bg-[#fffaf0] p-2 shadow">
            <span className="rounded bg-amber-100 px-3 py-2 text-xs font-black">
              🪙 {coins}
            </span>

            <input
              value={text}
              maxLength={20}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendBarrage();
              }}
              placeholder={coins > 0 ? "輸入你想說的話（最多20字）" : "完成調查書可獲得 coin，最多只能累積10個coin"}
              className="flex-1 rounded border px-3 py-2 text-sm font-bold outline-none"
            />
            <span className="text-xs font-bold text-stone-400">
              {text.length}/20
            </span>
            <button
              onClick={sendBarrage}
              disabled={!text.trim() || coins <= 0}
              className="rounded bg-stone-700 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              發射
            </button>
          </div>
        </div>
      </>
    );
}
