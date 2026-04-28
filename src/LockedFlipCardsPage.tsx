import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Lock,
  Unlock,
  Send,
  X,
  Trophy,
  ChevronDown,
  BookOpen,
  ChevronRight,
  Sparkles,
  Leaf,
  Waves,
  Mountain,
  PawPrint,
  MessageCircle,
  Crown,
  Stars,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CategoryKey = "water" | "land" | "leopard" | "rumor";
type TitleTier = "novice" | "advanced" | "master";
type TitleTheme = "water" | "land" | "leopard" | "rumor" | "cross";

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

type LockedFlipCardsPageProps = {
  studentThought: string;
  studentPlan: string;
  onSubmitSummary: (summary: FinalSummary) => void;
  onTitleRewardsChange?: (titles: TitleReward[]) => void;
  unlockedCardIds: Array<string | { id: string; content?: string; unlockedAt?: number | null }>;
  setUnlockedCardIds: React.Dispatch<
  React.SetStateAction<Array<string | { id: string; content?: string; unlockedAt?: number | null }>>
>;
};

type CollectionSortMode = "latest" | "water" | "land" | "leopard" | "rumor";

const CATEGORY_KEYS: CategoryKey[] = ["water", "land", "leopard", "rumor"];

const CATEGORY_TOTAL_COUNTS: Record<CategoryKey, number> = {
  water: 30,
  land: 30,
  leopard: 30,
  rumor: 21,
};

const CARD_GROUPS: Array<{
  category: CategoryKey;
  startImageId: number;
  count: number;
}> = [
  { category: "water", startImageId: 1, count: CATEGORY_TOTAL_COUNTS.water },
  { category: "land", startImageId: 31, count: CATEGORY_TOTAL_COUNTS.land },
  {
    category: "leopard",
    startImageId: 61,
    count: CATEGORY_TOTAL_COUNTS.leopard,
  },
  { category: "rumor", startImageId: 91, count: CATEGORY_TOTAL_COUNTS.rumor },
];

const COLLECTION_SORT_CATEGORY: Record<CollectionSortMode, CategoryKey | null> =
  {
    latest: null,
    water: "water",
    land: "land",
    leopard: "leopard",
    rumor: "rumor",
  };

const COLLECTION_SORT_OPTIONS: Array<{
  mode: CollectionSortMode;
  label: string;
}> = [
  { mode: "latest", label: "最新解鎖" },
  { mode: "water", label: "水資源優先" },
  { mode: "land", label: "土地資料優先" },
  { mode: "leopard", label: "石虎優先" },
  { mode: "rumor", label: "NPC謠言優先" },
];

type GameCard = {
  id: string;
  localId: number;
  category: CategoryKey;
  title: string;
  revealedTitle: string;
  content: string;
  unlocked: boolean;
  unlockedAt: number | null;
  imageSrc: string;
};

type TitleReward = {
  id: string;
  name: string;
  description: string;
};

type CategoryMeta = {
  key: CategoryKey;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
};

const categoryMetaMap: Record<CategoryKey, CategoryMeta> = {
  water: {
    key: "water",
    label: "水資源",
    subtitle: "河川、水庫、降雨、灌溉等資訊",
    icon: <Waves className="h-4 w-4" />,
  },
  land: {
    key: "land",
    label: "土地資料",
    subtitle: "地目、利用、坡度、分布等資料",
    icon: <Mountain className="h-4 w-4" />,
  },
  leopard: {
    key: "leopard",
    label: "石虎相關資訊",
    subtitle: "棲地、出沒、保育、監測等資訊",
    icon: <PawPrint className="h-4 w-4" />,
  },
  rumor: {
    key: "rumor",
    label: "其他NPC謠言",
    subtitle: "村民、NPC、地方傳聞與線索",
    icon: <MessageCircle className="h-4 w-4" />,
  },
};

const categoryTabThemeMap: Record<
  CategoryKey,
  {
    active: string;
    inactive: string;
    badge: string;
  }
> = {
  water: {
    active: "border-sky-300 bg-sky-50 text-sky-800",
    inactive: "border-sky-100 bg-white hover:bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
  },
  land: {
    active: "border-lime-300 bg-lime-50 text-lime-800",
    inactive: "border-lime-100 bg-white hover:bg-lime-50",
    badge: "bg-lime-100 text-lime-700",
  },
  leopard: {
    active: "border-orange-300 bg-orange-50 text-orange-800",
    inactive: "border-orange-100 bg-white hover:bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
  },
  rumor: {
    active: "border-violet-300 bg-violet-50 text-violet-800",
    inactive: "border-violet-100 bg-white hover:bg-violet-50",
    badge: "bg-violet-100 text-violet-700",
  },
};

const revealedTitlesByCategory: Record<CategoryKey, string[]> = {
  water: [
    "苗栗市降水量資訊",
    "頭份市水庫蓄水資料",
    "竹南鎮河川監測紀錄",
    "後龍鎮地下水位分析",
    "通霄鎮灌溉系統概況",
    "苑裡鎮用水分布地圖",
    "公館鄉水質檢測報告",
    "銅鑼鄉集水區觀測資料",
    "三義鄉雨量變化圖表",
    "頭屋鄉水資源調度資訊",
  ],
  land: [
    "苗栗市土地利用分區圖",
    "頭份市農地使用紀錄",
    "竹南鎮工業用地分布",
    "後龍鎮海岸地景資料",
    "通霄鎮坡地開發分析",
    "苑裡鎮耕地面積統計",
    "公館鄉地籍整理資料",
    "銅鑼鄉地貌觀測紀錄",
    "三義鄉山坡地利用圖",
    "頭屋鄉土地變遷資料",
  ],
  leopard: [
    "石虎出沒熱點紀錄",
    "石虎棲地範圍分析",
    "石虎足跡監測資料",
    "石虎食性調查筆記",
    "石虎路殺熱區地圖",
    "石虎夜間活動紀錄",
    "石虎保育區分布圖",
    "石虎相機陷阱照片索引",
    "石虎族群觀察報告",
    "石虎與聚落距離分析",
  ],
  rumor: [
    "村長口中的水圳傳聞",
    "老農提到的旱季異象",
    "巡山員留下的足跡耳語",
    "廟口婆婆的夜行傳說",
    "市場攤販聽來的消息",
    "河邊小孩的秘密目擊",
    "獵人筆記中的可疑線索",
    "旅人提過的荒地傳聞",
    "地方志未記載的故事",
    "NPC私下交換的耳語",
  ],
};

const titleRewardPool: Record<string, TitleReward> = {
  water_novice: {
    id: "water_novice",
    name: "水資源新手",
    description: "蒐集 3 張水資源卡牌",
  },
  water_advanced: {
    id: "water_advanced",
    name: "水資源老手",
    description: "蒐集 7 張水資源卡牌",
  },
  water_master: {
    id: "water_master",
    name: "水資源大師",
    description: "蒐集 10 張水資源卡牌",
  },

  land_novice: {
    id: "land_novice",
    name: "土地資料新手",
    description: "蒐集 3 張土地資料卡牌",
  },
  land_advanced: {
    id: "land_advanced",
    name: "土地資料老手",
    description: "蒐集 7 張土地資料卡牌",
  },
  land_master: {
    id: "land_master",
    name: "土地資料大師",
    description: "蒐集 10 張土地資料卡牌",
  },

  leopard_novice: {
    id: "leopard_novice",
    name: "石虎相關資料新手",
    description: "蒐集 3 張石虎相關資料卡牌",
  },
  leopard_advanced: {
    id: "leopard_advanced",
    name: "石虎相關資料老手",
    description: "蒐集 7 張石虎相關資料卡牌",
  },
  leopard_master: {
    id: "leopard_master",
    name: "石虎相關資料大師",
    description: "蒐集 10 張石虎相關資料卡牌",
  },

  rumor_novice: {
    id: "rumor_novice",
    name: "NPC謠言新手",
    description: "蒐集 3 張 NPC 謠言卡牌",
  },
  rumor_advanced: {
    id: "rumor_advanced",
    name: "NPC謠言老手",
    description: "蒐集 7 張 NPC 謠言卡牌",
  },
  rumor_master: {
    id: "rumor_master",
    name: "NPC謠言大師",
    description: "蒐集 10 張 NPC 謠言卡牌",
  },

  cross_novice: {
    id: "cross_novice",
    name: "跨領域新手",
    description: "每個分類都至少蒐集 2 張卡牌",
  },
  cross_advanced: {
    id: "cross_advanced",
    name: "跨領域老手",
    description: "每個分類都至少蒐集 4 張卡牌",
  },
  cross_master: {
    id: "cross_master",
    name: "跨領域大師",
    description: "每個分類都至少蒐集 6 張卡牌",
  },
};

const categoryBackgroundMap: Record<
  CategoryKey,
  {
    pageBg: string;
    wave1: string;
    wave2: string;
    wave3: string;
    wave4: string;
    lightBeam: string;
  }
> = {
  water: {
    pageBg:
      "bg-[radial-gradient(circle_at_top,_#f0f9ff_0%,_#e0f2fe_28%,_#f8fbff_62%,_#f8fafc_100%)]",
    wave1:
      "bg-[linear-gradient(90deg,rgba(14,165,233,0.03),rgba(56,189,248,0.06),rgba(14,165,233,0.03))]",
    wave2:
      "bg-[linear-gradient(90deg,rgba(2,132,199,0.025),rgba(125,211,252,0.05),rgba(2,132,199,0.025))]",
    wave3:
      "bg-[linear-gradient(90deg,rgba(56,189,248,0.02),rgba(186,230,253,0.045),rgba(56,189,248,0.02))]",
    wave4:
      "bg-[linear-gradient(90deg,rgba(14,165,233,0.025),rgba(224,242,254,0.05),rgba(14,165,233,0.025))]",
    lightBeam:
      "bg-gradient-to-r from-transparent via-sky-200/10 to-transparent",
  },
  land: {
    pageBg:
      "bg-[radial-gradient(circle_at_top,_#f7fee7_0%,_#ecfccb_28%,_#fffef7_62%,_#fafaf9_100%)]",
    wave1:
      "bg-[linear-gradient(90deg,rgba(132,204,22,0.03),rgba(190,242,100,0.06),rgba(132,204,22,0.03))]",
    wave2:
      "bg-[linear-gradient(90deg,rgba(101,163,13,0.025),rgba(217,249,157,0.05),rgba(101,163,13,0.025))]",
    wave3:
      "bg-[linear-gradient(90deg,rgba(163,230,53,0.02),rgba(254,240,138,0.045),rgba(163,230,53,0.02))]",
    wave4:
      "bg-[linear-gradient(90deg,rgba(132,204,22,0.025),rgba(254,252,232,0.05),rgba(132,204,22,0.025))]",
    lightBeam:
      "bg-gradient-to-r from-transparent via-lime-200/10 to-transparent",
  },
  leopard: {
    pageBg:
      "bg-[radial-gradient(circle_at_top,_#fff7ed_0%,_#ffedd5_26%,_#f7fee7_58%,_#fafaf9_100%)]",
    wave1:
      "bg-[linear-gradient(90deg,rgba(249,115,22,0.03),rgba(253,186,116,0.06),rgba(249,115,22,0.03))]",
    wave2:
      "bg-[linear-gradient(90deg,rgba(234,88,12,0.025),rgba(254,215,170,0.05),rgba(234,88,12,0.025))]",
    wave3:
      "bg-[linear-gradient(90deg,rgba(34,197,94,0.02),rgba(187,247,208,0.045),rgba(34,197,94,0.02))]",
    wave4:
      "bg-[linear-gradient(90deg,rgba(249,115,22,0.025),rgba(255,237,213,0.05),rgba(249,115,22,0.025))]",
    lightBeam:
      "bg-gradient-to-r from-transparent via-orange-200/10 to-transparent",
  },
  rumor: {
    pageBg:
      "bg-[radial-gradient(circle_at_top,_#faf5ff_0%,_#f3e8ff_28%,_#fdf8ff_62%,_#f8fafc_100%)]",
    wave1:
      "bg-[linear-gradient(90deg,rgba(168,85,247,0.03),rgba(216,180,254,0.06),rgba(168,85,247,0.03))]",
    wave2:
      "bg-[linear-gradient(90deg,rgba(147,51,234,0.025),rgba(233,213,255,0.05),rgba(147,51,234,0.025))]",
    wave3:
      "bg-[linear-gradient(90deg,rgba(192,132,252,0.02),rgba(244,114,182,0.04),rgba(192,132,252,0.02))]",
    wave4:
      "bg-[linear-gradient(90deg,rgba(168,85,247,0.025),rgba(250,245,255,0.05),rgba(168,85,247,0.025))]",
    lightBeam:
      "bg-gradient-to-r from-transparent via-fuchsia-200/10 to-transparent",
  },
};

const categoryCardThemeMap: Record<
  CategoryKey,
  {
    lockedFace: string;
    unlockedFace: string;
    lockedAccent: string;
    previewShell: string;
  }
> = {
  water: {
    lockedFace: "bg-white/55 backdrop-blur-sm border border-sky-100/70",
    unlockedFace: "bg-white/55 backdrop-blur-sm border border-sky-200/70",
    lockedAccent: "text-sky-500",
    previewShell: "bg-white border border-sky-200",
  },
  land: {
    lockedFace: "bg-white/55 backdrop-blur-sm border border-lime-100/70",
    unlockedFace: "bg-white/55 backdrop-blur-sm border border-lime-200/70",
    lockedAccent: "text-lime-600",
    previewShell: "bg-white border border-lime-200",
  },
  leopard: {
    lockedFace: "bg-white/55 backdrop-blur-sm border border-orange-100/70",
    unlockedFace: "bg-white/55 backdrop-blur-sm border border-orange-200/70",
    lockedAccent: "text-orange-500",
    previewShell: "bg-white border border-orange-200",
  },
  rumor: {
    lockedFace: "bg-white/55 backdrop-blur-sm border border-violet-100/70",
    unlockedFace: "bg-white/55 backdrop-blur-sm border border-violet-200/70",
    lockedAccent: "text-violet-500",
    previewShell: "bg-white border border-violet-200",
  },
};

const writtenCardStateMap: Record<
  CategoryKey,
  {
    shell: string;
    iconBg: string;
    iconText: string;
    hintText: string;
    badge: string;
    hoverGlow: string;
    previewBox: string;
    collectionItem: string;
    collectionLabel: string;
    collectionHint: string;
    collectionArrow: string;
  }
> = {
  water: {
    shell:
      "border border-sky-200/70 bg-[linear-gradient(180deg,rgba(240,249,255,0.58)_0%,rgba(224,242,254,0.48)_100%)] backdrop-blur-sm",
    iconBg: "border border-sky-200 bg-sky-100/80",
    iconText: "text-sky-500",
    hintText: "text-sky-600",
    badge:
      "rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700",
    hoverGlow: "group-hover:shadow-[0_12px_28px_rgba(14,165,233,0.18)]",
    previewBox: "border border-sky-200 bg-sky-50/80",
    collectionItem: "border border-sky-200 bg-sky-50 hover:bg-sky-100/70",
    collectionLabel: "bg-sky-100 text-sky-700",
    collectionHint: "text-sky-600",
    collectionArrow: "text-sky-500",
  },
  land: {
    shell:
      "border border-lime-200/70 bg-[linear-gradient(180deg,rgba(247,254,231,0.58)_0%,rgba(236,252,203,0.48)_100%)] backdrop-blur-sm",
    iconBg: "border border-lime-200 bg-lime-100/80",
    iconText: "text-lime-600",
    hintText: "text-lime-700",
    badge:
      "rounded-full border border-lime-200 bg-lime-100 px-3 py-1 text-xs font-medium text-lime-700",
    hoverGlow: "group-hover:shadow-[0_12px_28px_rgba(132,204,22,0.18)]",
    previewBox: "border border-lime-200 bg-lime-50/80",
    collectionItem: "border border-lime-200 bg-lime-50 hover:bg-lime-100/70",
    collectionLabel: "bg-lime-100 text-lime-700",
    collectionHint: "text-lime-700",
    collectionArrow: "text-lime-600",
  },
  leopard: {
    shell:
      "border border-orange-200/70 bg-[linear-gradient(180deg,rgba(255,247,237,0.58)_0%,rgba(255,237,213,0.48)_100%)] backdrop-blur-sm",
    iconBg: "border border-orange-200 bg-orange-100/80",
    iconText: "text-orange-500",
    hintText: "text-orange-700",
    badge:
      "rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700",
    hoverGlow: "group-hover:shadow-[0_12px_28px_rgba(249,115,22,0.18)]",
    previewBox: "border border-orange-200 bg-orange-50/80",
    collectionItem:
      "border border-orange-200 bg-orange-50 hover:bg-orange-100/70",
    collectionLabel: "bg-orange-100 text-orange-700",
    collectionHint: "text-orange-700",
    collectionArrow: "text-orange-500",
  },
  rumor: {
    shell:
      "border border-violet-200/70 bg-[linear-gradient(180deg,rgba(250,245,255,0.58)_0%,rgba(243,232,255,0.48)_100%)] backdrop-blur-sm",
    iconBg: "border border-violet-200 bg-violet-100/80",
    iconText: "text-violet-500",
    hintText: "text-violet-700",
    badge:
      "rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700",
    hoverGlow: "group-hover:shadow-[0_12px_28px_rgba(139,92,246,0.18)]",
    previewBox: "border border-violet-200 bg-violet-50/80",
    collectionItem:
      "border border-violet-200 bg-violet-50 hover:bg-violet-100/70",
    collectionLabel: "bg-violet-100 text-violet-700",
    collectionHint: "text-violet-700",
    collectionArrow: "text-violet-500",
  },
};

function createCardsByCategory(
  category: CategoryKey,
  startImageId: number,
  count: number,
): GameCard[] {
  return Array.from({ length: count }, (_, i) => {
    const globalImageId = startImageId + i;

    return {
      id: `${category}-${i + 1}`,
      localId: i + 1,
      category,
      title: `${categoryMetaMap[category].label}卡 ${i + 1}`,
      revealedTitle:
        revealedTitlesByCategory[category][i] ??
        `${categoryMetaMap[category].label}資料卡 ${i + 1}`,
      content: "",
      unlocked: false,
      unlockedAt: null,
      imageSrc: `/card/image${globalImageId}.PNG`,
    };
  });
}

function createAllCards(): GameCard[] {
  return CARD_GROUPS.flatMap(({ category, startImageId, count }) =>
    createCardsByCategory(category, startImageId, count),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDisplayTitle(card: GameCard) {
  return card.unlocked ? card.revealedTitle : card.title;
}

function getTitleTier(titleId: string): TitleTier {
  if (titleId.includes("master")) return "master";
  if (titleId.includes("advanced")) return "advanced";
  return "novice";
}

function getTitleTheme(titleId: string): TitleTheme {
  if (titleId.includes("water")) return "water";
  if (titleId.includes("land")) return "land";
  if (titleId.includes("leopard")) return "leopard";
  if (titleId.includes("rumor")) return "rumor";
  return "cross";
}

function getTitleThemeClasses(theme: TitleTheme) {
  switch (theme) {
    case "water":
      return {
        chip: "bg-cyan-200/20 text-cyan-50 border-cyan-100/30",
        accent: "text-cyan-50",
        glow: "bg-cyan-300/35",
      };
    case "land":
      return {
        chip: "bg-lime-200/20 text-lime-50 border-lime-100/30",
        accent: "text-lime-50",
        glow: "bg-lime-300/35",
      };
    case "leopard":
      return {
        chip: "bg-orange-200/20 text-orange-50 border-orange-100/30",
        accent: "text-orange-50",
        glow: "bg-orange-300/35",
      };
    case "rumor":
      return {
        chip: "bg-fuchsia-200/20 text-fuchsia-50 border-fuchsia-100/30",
        accent: "text-fuchsia-50",
        glow: "bg-fuchsia-300/35",
      };
    case "cross":
      return {
        chip: "bg-violet-200/20 text-violet-50 border-violet-100/30",
        accent: "text-violet-50",
        glow: "bg-violet-300/35",
      };
  }
}

function getTitleTierCardClasses(tier: TitleTier) {
  switch (tier) {
    case "novice":
      return {
        shell:
          "border border-[#d6a46a] bg-gradient-to-br from-[#b87333] via-[#8c5523] to-[#5c3415] shadow-[0_14px_30px_rgba(92,52,21,0.35)]",
        inner:
          "bg-gradient-to-br from-[#d89a5b]/95 via-[#a8642b]/94 to-[#6b3b17]/96",
        emblem:
          "bg-gradient-to-br from-[#f6d2a2] via-[#d6934e] to-[#9a5a23] border border-[#f2c38d]/60",
        name: "text-[#fff6ec]",
        desc: "text-[#ffe8d1]",
        deco: "opacity-90",
      };
    case "advanced":
      return {
        shell:
          "border border-[#cfd8e3] bg-gradient-to-br from-[#c8d2df] via-[#8ea0b5] to-[#58697d] shadow-[0_14px_30px_rgba(88,105,125,0.35)]",
        inner:
          "bg-gradient-to-br from-[#dbe3ec]/95 via-[#93a7bd]/94 to-[#617389]/96",
        emblem:
          "bg-gradient-to-br from-[#f5f8fb] via-[#c4d0dc] to-[#7f94aa] border border-[#eef3f8]/60",
        name: "text-white",
        desc: "text-[#eef4fb]",
        deco: "opacity-95",
      };
    case "master":
      return {
        shell:
          "border border-[#ffe27a] bg-gradient-to-br from-[#ffe57a] via-[#f4b400] to-[#9a6a00] shadow-[0_0_28px_rgba(255,215,64,0.42),0_14px_34px_rgba(154,106,0,0.30)]",
        inner:
          "bg-gradient-to-br from-[#fff3b0]/95 via-[#f2c21b]/93 to-[#a86f00]/96",
        emblem:
          "bg-gradient-to-br from-[#fff9d6] via-[#ffd95e] to-[#d49800] border border-[#fff0a6]/70",
        name: "text-[#fffdf3]",
        desc: "text-[#fff4c8]",
        deco: "opacity-100",
      };
  }
}

function TitleEmblem({ tier, theme }: { tier: TitleTier; theme: TitleTheme }) {
  const themeStyle = getTitleThemeClasses(theme);
  const tierStyle = getTitleTierCardClasses(tier);

  if (tier === "master") {
    return (
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-[40%_60%_55%_45%/45%_40%_60%_55%] ${tierStyle.emblem}`}
      >
        <div
          className={`absolute inset-0 rounded-[inherit] blur-xl ${themeStyle.glow}`}
        />
        <Crown className={`relative z-10 h-8 w-8 ${themeStyle.accent}`} />
      </div>
    );
  }

  if (tier === "advanced") {
    return (
      <div
        className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${tierStyle.emblem}`}
      >
        <Stars className={`relative z-10 h-7 w-7 ${themeStyle.accent}`} />
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${tierStyle.emblem}`}
    >
      <Sparkles className={`relative z-10 h-6 w-6 ${themeStyle.accent}`} />
    </div>
  );
}

function TitleBadgeCard({ title }: { title: TitleReward }) {
  const tier = getTitleTier(title.id);
  const theme = getTitleTheme(title.id);
  const themeClasses = getTitleThemeClasses(theme);
  const tierClasses = getTitleTierCardClasses(tier);

  return (
    <div
      className={`relative min-w-[260px] max-w-[260px] overflow-hidden rounded-[24px] p-[1px] ${tierClasses.shell}`}
    >
      <div
        className={`relative h-full rounded-[23px] px-4 py-4 backdrop-blur-xl ${tierClasses.inner}`}
      >
        <div className="absolute inset-0 opacity-20">
          <div
            className={`absolute -left-6 top-2 h-20 w-20 rounded-full blur-2xl ${themeClasses.glow}`}
          />
          <div
            className={`absolute right-0 top-10 h-16 w-16 rounded-full blur-2xl ${themeClasses.glow}`}
          />
        </div>

        <div className={`absolute right-3 top-3 ${tierClasses.deco}`}>
          {tier === "master" ? (
            <Crown className={`h-4 w-4 ${themeClasses.accent}`} />
          ) : tier === "advanced" ? (
            <Stars className={`h-4 w-4 ${themeClasses.accent}`} />
          ) : (
            <Sparkles className={`h-4 w-4 ${themeClasses.accent}`} />
          )}
        </div>

        <div className="relative flex h-full items-start gap-3">
          <TitleEmblem tier={tier} theme={theme} />

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${themeClasses.chip}`}
              >
                {tier === "novice"
                  ? "新手"
                  : tier === "advanced"
                    ? "老手"
                    : "大師"}
              </span>
              <span className="text-xs text-white/75">
                {theme === "water"
                  ? "水資源"
                  : theme === "land"
                    ? "土地資料"
                    : theme === "leopard"
                      ? "石虎相關"
                      : theme === "rumor"
                        ? "NPC謠言"
                        : "跨領域"}
              </span>
            </div>

            <p
              className={`text-sm font-bold tracking-wide ${tierClasses.name}`}
            >
              {title.name}
            </p>
            <p className={`mt-1 text-xs leading-5 ${tierClasses.desc}`}>
              {title.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getBalanceEffect(category: CategoryKey) {
  switch (category) {
    case "land":
      return { development: 1, conservation: 0 };

    case "leopard":
      return { development: 0, conservation: 1 };

    case "water":
    case "rumor":
      return { development: 1, conservation: 1 };
  }
}

function BalanceScaleBackground({
  developmentScore,
  conservationScore,
}: {
  developmentScore: number;
  conservationScore: number;
}) {
  const difference = developmentScore - conservationScore;
  const rotate = clamp(difference * 4, -14, 14);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute left-[-14%] top-[6%] h-[560px] w-[560px] rounded-full bg-emerald-200/18 blur-[100px]" />
      <div className="absolute right-[-14%] top-[8%] h-[600px] w-[600px] rounded-full bg-orange-200/18 blur-[100px]" />
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/24 blur-[120px]" />

      <div className="absolute left-1/2 top-1/2 h-[700px] w-[1160px] origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.42] opacity-[0.23] sm:scale-[0.55] md:scale-[0.72] lg:scale-[0.88] xl:scale-100">
        <div className="absolute bottom-[22px] left-1/2 h-20 w-[620px] -translate-x-1/2 rounded-full bg-amber-950/18 blur-2xl" />

        <div className="absolute bottom-[96px] left-1/2 h-12 w-[330px] -translate-x-1/2 rounded-[50%] bg-[linear-gradient(180deg,#fde68a,#d97706,#78350f)] shadow-[0_14px_30px_rgba(120,53,15,0.28)]" />
        <div className="absolute bottom-[128px] left-1/2 h-8 w-[210px] -translate-x-1/2 rounded-[50%] bg-[linear-gradient(180deg,#fff7c2,#f59e0b,#92400e)] shadow-[0_10px_24px_rgba(120,53,15,0.22)]" />

        <div className="absolute left-1/2 top-[250px] h-[300px] w-12 -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,#451a03_0%,#92400e_12%,#fbbf24_28%,#fff7c2_45%,#d97706_62%,#78350f_82%,#451a03_100%)] shadow-[0_22px_55px_rgba(120,53,15,0.3)]">
          <div className="absolute left-3 top-8 h-[235px] w-2 rounded-full bg-white/50 blur-[1px]" />
          <div className="absolute right-2 top-8 h-[245px] w-1 rounded-full bg-amber-950/35" />
        </div>

        <div className="absolute left-1/2 top-[150px] h-36 w-36 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_34%_28%,#fffbe6_0%,#facc15_24%,#b45309_58%,#451a03_100%)] shadow-[0_20px_48px_rgba(120,53,15,0.35)]">
          <div className="absolute inset-[15px] rounded-full border border-amber-100/80 bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.86),rgba(255,255,255,0.22)_46%,rgba(120,53,15,0.2)_100%)]" />
          <div className="absolute left-9 top-8 h-6 w-6 rounded-full bg-white/80 blur-[1px]" />
          <div className="absolute bottom-5 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-amber-950/20" />
        </div>

        <motion.div
          animate={{ rotate }}
          transition={{ type: "spring", stiffness: 95, damping: 16 }}
          className="absolute left-1/2 top-[194px] h-[330px] w-[920px] -translate-x-1/2 transform-gpu will-change-transform"
          style={{ transformOrigin: "50% 26px" }}
        >
          <motion.div
            className="absolute inset-0 transform-gpu will-change-transform"
            animate={{
              rotate: [-0.7, -0.35, 0.3, 0.7, 0.35, -0.3, -0.7],
            }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "50% 26px" }}
          >
            <div className="absolute left-0 top-0 h-10 w-full rounded-full bg-[linear-gradient(180deg,#fff7c2_0%,#facc15_18%,#d97706_44%,#92400e_75%,#451a03_100%)] shadow-[0_22px_55px_rgba(120,53,15,0.3)]">
              <div className="absolute left-12 right-12 top-1.5 h-2 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.9),rgba(255,255,255,0))]" />
              <div className="absolute bottom-1 left-10 right-10 h-1 rounded-full bg-amber-950/35" />
            </div>

            <div className="absolute -left-8 top-[-10px] h-16 w-16 rounded-full bg-[radial-gradient(circle_at_32%_28%,#fffbe6,#fbbf24_34%,#92400e_74%,#451a03)] shadow-[0_14px_32px_rgba(120,53,15,0.32)]" />
            <div className="absolute -right-8 top-[-10px] h-16 w-16 rounded-full bg-[radial-gradient(circle_at_32%_28%,#fffbe6,#fbbf24_34%,#92400e_74%,#451a03)] shadow-[0_14px_32px_rgba(120,53,15,0.32)]" />

            <div className="absolute left-1/2 top-[-22px] h-24 w-24 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fffbe6,#facc15_34%,#92400e_78%,#451a03)] shadow-[0_18px_40px_rgba(120,53,15,0.34)]">
              <div className="absolute inset-[16px] rounded-full border border-amber-100/80 bg-white/20" />
              <div className="absolute left-7 top-6 h-5 w-5 rounded-full bg-white/70 blur-[1px]" />
            </div>

            <div className="absolute left-[220px] top-[30px] h-[184px] w-[3px] origin-top -translate-x-1/2 -rotate-[34deg] rounded-full bg-[linear-gradient(180deg,#fff7c2,#d97706,#78350f)] shadow-[0_0_8px_rgba(251,191,36,0.35)]" />
            <div className="absolute left-[220px] top-[30px] h-[184px] w-[3px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#fffbe6,#f59e0b,#78350f)] shadow-[0_0_8px_rgba(251,191,36,0.35)]" />
            <div className="absolute left-[220px] top-[30px] h-[184px] w-[3px] origin-top -translate-x-1/2 rotate-[34deg] rounded-full bg-[linear-gradient(180deg,#fff7c2,#d97706,#78350f)] shadow-[0_0_8px_rgba(251,191,36,0.35)]" />

            <div className="absolute left-[700px] top-[30px] h-[184px] w-[3px] origin-top -translate-x-1/2 -rotate-[34deg] rounded-full bg-[linear-gradient(180deg,#fff7c2,#d97706,#78350f)] shadow-[0_0_8px_rgba(251,191,36,0.35)]" />
            <div className="absolute left-[700px] top-[30px] h-[184px] w-[3px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#fffbe6,#f59e0b,#78350f)] shadow-[0_0_8px_rgba(251,191,36,0.35)]" />
            <div className="absolute left-[700px] top-[30px] h-[184px] w-[3px] origin-top -translate-x-1/2 rotate-[34deg] rounded-full bg-[linear-gradient(180deg,#fff7c2,#d97706,#78350f)] shadow-[0_0_8px_rgba(251,191,36,0.35)]" />

            <div className="absolute left-[70px] top-[176px] flex w-[300px] flex-col items-center">
              <div className="relative h-[72px] w-[286px]">
                <div className="absolute left-1/2 top-0 h-14 w-[286px] -translate-x-1/2 rounded-[50%] bg-[linear-gradient(180deg,#fffbe6_0%,#facc15_24%,#b45309_62%,#451a03_100%)] shadow-[0_16px_34px_rgba(120,53,15,0.28)]">
                  <div className="absolute left-1/2 top-1 h-6 w-[246px] -translate-x-1/2 rounded-[50%] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.22))]" />
                  <div className="absolute bottom-1 left-1/2 h-3 w-[230px] -translate-x-1/2 rounded-[50%] bg-amber-950/25" />
                </div>

                <div className="absolute left-1/2 top-[9px] h-9 w-[242px] -translate-x-1/2 rounded-[50%] border border-emerald-300/70 bg-[radial-gradient(ellipse_at_center,rgba(236,253,245,0.96)_0%,rgba(110,231,183,0.62)_52%,rgba(6,95,70,0.42)_100%)] shadow-inner" />
                <div className="absolute left-1/2 top-[16px] z-10 -translate-x-1/2 text-3xl font-black tracking-[0.18em] text-emerald-800 drop-shadow-[0_2px_3px_rgba(255,255,255,0.75)]">
                  保育
                </div>

                <div className="absolute left-1/2 top-[14px] h-2 w-[170px] -translate-x-1/2 rounded-full bg-white/75 blur-[1px]" />
                <div className="absolute left-[72px] top-[22px] h-5 w-14 rounded-full bg-white/20 blur-md" />

                <div className="absolute left-1/2 top-[41px] h-4 w-[232px] -translate-x-1/2 rounded-[50%] bg-[linear-gradient(180deg,#b45309_0%,#78350f_72%,#451a03_100%)] opacity-80 shadow-[0_10px_20px_rgba(120,53,15,0.22)]" />
              </div>
            </div>

            <div className="absolute right-[70px] top-[176px] flex w-[300px] flex-col items-center">
              <div className="relative h-[72px] w-[286px]">
                <div className="absolute left-1/2 top-0 h-14 w-[286px] -translate-x-1/2 rounded-[50%] bg-[linear-gradient(180deg,#fffbe6_0%,#facc15_24%,#b45309_62%,#451a03_100%)] shadow-[0_16px_34px_rgba(120,53,15,0.28)]">
                  <div className="absolute left-1/2 top-1 h-6 w-[246px] -translate-x-1/2 rounded-[50%] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.22))]" />
                  <div className="absolute bottom-1 left-1/2 h-3 w-[230px] -translate-x-1/2 rounded-[50%] bg-amber-950/25" />
                </div>

                <div className="absolute left-1/2 top-[9px] h-9 w-[242px] -translate-x-1/2 rounded-[50%] border border-orange-300/70 bg-[radial-gradient(ellipse_at_center,rgba(255,247,237,0.96)_0%,rgba(253,186,116,0.62)_52%,rgba(194,65,12,0.42)_100%)] shadow-inner" />

                <div className="absolute left-1/2 top-[16px] z-10 -translate-x-1/2 text-3xl font-black tracking-[0.18em] text-orange-800 drop-shadow-[0_2px_3px_rgba(255,255,255,0.75)]">
                  開發
                </div>

                <div className="absolute left-1/2 top-[14px] h-2 w-[170px] -translate-x-1/2 rounded-full bg-white/75 blur-[1px]" />
                <div className="absolute left-[72px] top-[22px] h-5 w-14 rounded-full bg-white/20 blur-md" />

                <div className="absolute left-1/2 top-[41px] h-4 w-[232px] -translate-x-1/2 rounded-[50%] bg-[linear-gradient(180deg,#b45309_0%,#78350f_72%,#451a03_100%)] opacity-80 shadow-[0_10px_20px_rgba(120,53,15,0.22)]" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function CategoryTabs({
  activeCategory,
  onChange,
  unlockedCountByCategory,
  totalUnlockedCount,
  totalCardCount,
  onRequestFinish,
}: {
  activeCategory: CategoryKey | null;
  onChange: (category: CategoryKey) => void;
  unlockedCountByCategory: Record<CategoryKey, number>;
  totalUnlockedCount: number;
  totalCardCount: number;
  onRequestFinish: () => void;
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-[34px] border border-stone-200/90 bg-white/72 p-6 shadow-[0_22px_70px_rgba(45,41,34,0.10)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(120,92,58,0.07)_1px,transparent_1px),linear-gradient(rgba(120,92,58,0.05)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute -left-16 top-8 h-52 w-52 rounded-full bg-[#8b6f47]/10 blur-[70px]" />
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#bdb294] bg-[#f7f1e3] shadow-sm">
            <Leaf className="h-6 w-6 text-[#6f7d5f]" />
          </div>
          <div>
            <p className="font-serif text-3xl font-semibold tracking-[0.12em] text-stone-800">
              數據探究清單
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={onRequestFinish}
            className="rounded-xl border border-[#8f2f2f] bg-[#7f2f2f] px-5 py-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#9b3b3b] active:translate-y-0"
          >
            結束數據探究
          </Button>

          <div className="flex w-fit items-center gap-3 rounded-2xl border border-[#c8b48f] bg-[#fffaf0]/80 px-4 py-3 text-sm text-[#5f5545] shadow-sm">
            <BookOpen className="h-4 w-4 text-[#6f7d5f]" />
            總體已解鎖：
            <span className="rounded-full border border-[#c8b48f] bg-white px-3 py-1 font-semibold text-[#6f7d5f]">
              {totalUnlockedCount} / {totalCardCount}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {CATEGORY_KEYS.map((key) => {
          const item = categoryMetaMap[key];
          const active = activeCategory === key;
          const theme = categoryTabThemeMap[key];
          return (
            <motion.button
              key={key}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(key)}
              className={[
                "relative overflow-hidden rounded-[26px] border px-4 py-4 text-left shadow-sm transition hover:shadow-md",
                active ? theme.active : theme.inactive,
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-full border border-stone-200 bg-white/80 p-2 text-stone-600 shadow-sm">
                  {item.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${theme.badge}`}
                  >
                    {unlockedCountByCategory[key]} /{" "}
                    {CATEGORY_TOTAL_COUNTS[key]}
                  </span>
                  {active ? (
                    <span className="rounded-full border border-[#c8b48f] bg-[#fffaf0] px-3 py-1 text-xs font-medium text-[#6d5e49]">
                      目前分類
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <p className="font-serif text-xl font-semibold tracking-[0.06em] text-stone-800">
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {item.subtitle}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function TrophyPanel({
  titles,
  hasNewTitle,
  onOpenPanel,
}: {
  titles: TitleReward[];
  hasNewTitle: boolean;
  onOpenPanel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleTogglePanel = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) onOpenPanel();
      return next;
    });
  };

  const rowsPerColumn = 3;
  const cardWidth = 260;
  const columnGap = 12;
  const panelPaddingX = 32;
  const minPanelWidth = 360;

  const columnCount = Math.max(1, Math.ceil(titles.length / rowsPerColumn));
  const contentWidth =
    columnCount * cardWidth + Math.max(0, columnCount - 1) * columnGap;
  const desiredPanelWidth = Math.max(
    minPanelWidth,
    contentWidth + panelPaddingX,
  );

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6"
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl"
            style={{
              width: `min(calc(100vw - 40px), ${desiredPanelWidth}px)`,
              maxWidth: "calc(100vw - 40px)",
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-full bg-amber-50 p-2">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-lg uppercase tracking-[0.28em] text-amber-600">
                  稱號收藏
                </p>
              </div>
            </div>

            {titles.length > 0 ? (
              <div className="max-h-[420px] overflow-x-auto overflow-y-hidden pb-2">
                <div
                  className="grid grid-flow-col grid-rows-3 gap-3"
                  style={{
                    gridAutoColumns: `${cardWidth}px`,
                    width: "max-content",
                  }}
                >
                  {titles.map((title) => (
                    <TitleBadgeCard key={title.id} title={title} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                尚未獲得稱號
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        animate={
          hasNewTitle && !open
            ? {
                scale: [1, 1.06, 1],
                boxShadow: [
                  "0 10px 24px rgba(15,23,42,0.14)",
                  "0 0 0 6px rgba(251,191,36,0.12), 0 0 20px rgba(251,191,36,0.18)",
                  "0 10px 24px rgba(15,23,42,0.14)",
                ],
              }
            : {
                scale: 1,
                boxShadow: "0 10px 24px rgba(15,23,42,0.14)",
              }
        }
        transition={
          hasNewTitle && !open
            ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
        onClick={handleTogglePanel}
        className="relative flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-gradient-to-br from-amber-100 to-yellow-200 text-amber-800"
      >
        {hasNewTitle && !open ? (
          <motion.span
            className="absolute right-2 top-2 h-3 w-3 rounded-full bg-amber-500"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.2, 0.9] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        {open ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <Trophy className="h-7 w-7" />
        )}
      </motion.button>
    </div>
  );
}

function CollectedCardsPanel({
  cards,
  onOpenCard,
  hasNewContent,
  onOpenPanel,
}: {
  cards: GameCard[];
  onOpenCard: (card: GameCard) => void;
  hasNewContent: boolean;
  onOpenPanel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sortMode, setSortMode] = useState<CollectionSortMode>("latest");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const collectedCards = useMemo(() => {
    const base = cards.filter((card) => card.unlocked && card.content.trim());
    const preferredCategory = COLLECTION_SORT_CATEGORY[sortMode];

    return [...base].sort((a, b) => {
      if (sortMode === "latest") {
        const aTime = a.unlockedAt ?? 0;
        const bTime = b.unlockedAt ?? 0;

        if (aTime !== bTime) {
          return bTime - aTime;
        }

        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }

        return a.localId - b.localId;
      }

      const aPriority = a.category === preferredCategory ? 0 : 1;
      const bPriority = b.category === preferredCategory ? 0 : 1;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }

      return a.localId - b.localId;
    });
  }, [cards, sortMode]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleOpenCollectedCard = (card: GameCard) => {
    setOpen(false);
    onOpenCard(card);
  };

  const handleTogglePanel = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) onOpenPanel();
      return next;
    });
  };
  const isPriorityCard = (card: GameCard) => {
    const preferredCategory = COLLECTION_SORT_CATEGORY[sortMode];
    return preferredCategory !== null && card.category === preferredCategory;
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3 md:bottom-28 md:right-6"
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="max-h-[460px] w-[380px] overflow-hidden rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-full bg-sky-50 p-2">
                <BookOpen className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-[0.2em] text-sky-700">
                  數據卡牌收藏
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {COLLECTION_SORT_OPTIONS.map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortMode(mode)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    sortMode === mode
                      ? "border border-sky-200 bg-sky-50 text-sky-700"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {collectedCards.length > 0 ? (
                collectedCards.map((card) => {
                  const theme = writtenCardStateMap[card.category];
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleOpenCollectedCard(card)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${theme.collectionItem}`}
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${theme.collectionLabel}`}
                          >
                            {categoryMetaMap[card.category].label}
                          </span>
                          {isPriorityCard(card) ? (
                            <span className={`text-xs ${theme.collectionHint}`}>
                              排序優先
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-sm font-semibold text-slate-800">
                          {card.revealedTitle}
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${theme.collectionArrow}`}
                      />
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  尚未蒐集到卡牌內容
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        animate={
          hasNewContent && !open
            ? {
                scale: [1, 1.06, 1],
                boxShadow: [
                  "0 10px 24px rgba(15,23,42,0.14)",
                  "0 0 0 6px rgba(14,165,233,0.10), 0 0 20px rgba(14,165,233,0.16)",
                  "0 10px 24px rgba(15,23,42,0.14)",
                ],
              }
            : {
                scale: 1,
                boxShadow: "0 10px 24px rgba(15,23,42,0.14)",
              }
        }
        transition={
          hasNewContent && !open
            ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
        onClick={handleTogglePanel}
        className="relative flex h-16 w-16 items-center justify-center rounded-full border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-100 text-sky-700"
      >
        {hasNewContent && !open ? (
          <motion.span
            className="absolute right-2 top-2 h-3 w-3 rounded-full bg-sky-500"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.2, 0.9] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
        {open ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <BookOpen className="h-7 w-7" />
        )}
      </motion.button>
    </div>
  );
}

function TitleRewardCelebration({ reward }: { reward: TitleReward | null }) {
  const tier = reward ? getTitleTier(reward.id) : "novice";
  const theme = reward ? getTitleTheme(reward.id) : "cross";
  const themeClasses = getTitleThemeClasses(theme);
  const tierClasses = getTitleTierCardClasses(tier);

  return (
    <AnimatePresence>
      {reward ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/10 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0.55 }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{
              scale: 0.08,
              x: "42vw",
              y: "38vh",
              opacity: 0,
            }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative w-full max-w-md origin-center"
          >
            <motion.div
              animate={{ rotate: 10, opacity: 1, scale: 1.08 }}
              initial={{ rotate: 0, opacity: 0.5, scale: 0.9 }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              className={`absolute -left-6 top-8 ${themeClasses.accent}`}
            >
              <Sparkles className="h-8 w-8" />
            </motion.div>

            <motion.div
              animate={{ rotate: -12, opacity: 1, scale: 1.12 }}
              initial={{ rotate: 0, opacity: 0.45, scale: 0.9 }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              className={`absolute -right-4 top-10 ${themeClasses.accent}`}
            >
              {tier === "master" ? (
                <Crown className="h-7 w-7" />
              ) : (
                <Sparkles className="h-7 w-7" />
              )}
            </motion.div>

            <motion.div
              animate={{ y: -6, opacity: 1 }}
              initial={{ y: 0, opacity: 0.55 }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              className={`absolute left-1/2 top-[-18px] -translate-x-1/2 ${themeClasses.accent}`}
            >
              {tier === "advanced" ? (
                <Stars className="h-9 w-9" />
              ) : (
                <Sparkles className="h-9 w-9" />
              )}
            </motion.div>

            <div
              className={`relative overflow-hidden rounded-[32px] p-[1px] ${tierClasses.shell}`}
            >
              <div className="relative overflow-hidden rounded-[31px] bg-white/10 px-7 py-8 backdrop-blur-xl">
                <div className="absolute inset-0 opacity-20">
                  <div
                    className={`absolute left-1/2 top-4 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl ${themeClasses.glow}`}
                  />
                </div>

                <div className="relative flex flex-col items-center text-center">
                  <TitleEmblem tier={tier} theme={theme} />

                  <div className="mb-2 mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${themeClasses.chip}`}
                    >
                      {tier === "novice"
                        ? "新手稱號"
                        : tier === "advanced"
                          ? "老手稱號"
                          : "大師稱號"}
                    </span>
                  </div>

                  <h2 className={`mt-2 text-3xl font-bold ${tierClasses.name}`}>
                    {reward.name}
                  </h2>
                  <p className={`mt-3 text-sm leading-6 ${tierClasses.desc}`}>
                    {reward.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CollectedCardPreview({
  card,
  onClose,
}: {
  card: GameCard | null;
  onClose: () => void;
}) {
  const cardTheme = card ? categoryCardThemeMap[card.category] : null;
  const writtenTheme = card ? writtenCardStateMap[card.category] : null;

  return (
    <AnimatePresence>
      {card ? (
        <motion.div
          className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-3xl rounded-[32px] p-[1px] shadow-[0_30px_100px_rgba(15,23,42,0.18)] ${
              cardTheme?.previewShell ?? "bg-white border border-slate-200"
            }`}
          >
            <div className="rounded-[31px] bg-white/95 p-8 backdrop-blur-xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mt-3 flex items-start gap-3">
                    <span
                      className={`mt-1 h-7 w-7 shrink-0 ${writtenTheme?.iconText ?? "text-slate-600"}`}
                    >
                      {categoryMetaMap[card.category].icon}
                    </span>
                    <div>
                      <div className="mb-2">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-medium ${writtenTheme?.badge ?? "border border-slate-200 bg-slate-50 text-slate-700"}`}
                        >
                          {categoryMetaMap[card.category].label}
                        </span>
                      </div>
                      <h3 className="text-3xl font-bold text-slate-800">
                        {card.revealedTitle}
                      </h3>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="h-5 w-5 text-black" />
                </Button>
              </div>

              <div
                className={`rounded-[24px] p-6 shadow-sm ${
                  writtenTheme?.previewBox ??
                  "border border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="flex shrink-0 justify-center md:w-[280px]">
                    <img
                      src={card.imageSrc}
                      alt={card.revealedTitle}
                      className="max-h-[260px] w-full object-contain rounded-2xl bg-white"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold ${writtenTheme?.hintText ?? "text-slate-500"}`}
                    >
                      卡牌完整內容
                    </p>

                    <div className="mt-4 max-h-[360px] overflow-y-auto pr-2">
                      <p className="whitespace-pre-wrap break-words break-all text-lg leading-8 text-slate-700">
                        {card.content || "尚未輸入內容"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const GameCardGrid = memo(function GameCardGrid({
  categoryCards,
  activeId,
  activeCategoryMeta,
  onOpenCard,
  justUnlockedId,
  categoryFlipKey,
}: {
  categoryCards: GameCard[];
  activeId: string | null;
  activeCategoryMeta: CategoryMeta;
  onOpenCard: (card: GameCard) => void;
  justUnlockedId: string | null;
  categoryFlipKey: CategoryKey | null;
}) {
  return (
    <motion.div
      key={activeCategoryMeta.key}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.12,
          },
        },
      }}
      className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {categoryCards.map((card, index) => {
        const isOpened = activeId === card.id;
        const displayTitle = getDisplayTitle(card);
        const cardTheme = categoryCardThemeMap[card.category];
        const isWritten = card.unlocked;
        const writtenTheme = writtenCardStateMap[card.category];

        return (
          <motion.button
            key={card.id}
            variants={{
              hidden: {
                opacity: 0,
                y: -28,
                scale: 0.96,
              },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}
            onClick={() => onOpenCard(card)}
            className="group relative aspect-[6/5] text-left"
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className={`absolute -inset-1 rounded-[32px] opacity-0 transition duration-300 group-hover:opacity-100 ${
                isWritten
                  ? writtenTheme.hoverGlow
                  : "group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.10)]"
              }`}
            />

            <div className="relative h-full [perspective:1200px]">
              <motion.div
                initial={{
                  rotateY:
                    card.unlocked &&
                    card.id !== justUnlockedId &&
                    card.category !== categoryFlipKey
                      ? 180
                      : 0,
                }}
                animate={{ rotateY: card.unlocked ? 180 : 0 }}
                transition={{
                  duration:
                    card.id === justUnlockedId ||
                    card.category === categoryFlipKey
                      ? 0.8
                      : 0,
                }}
                className="relative h-full w-full rounded-[28px] transform-gpu will-change-transform"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className={`absolute inset-0 rounded-[28px] shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${
                    isWritten ? writtenTheme.shell : cardTheme.lockedFace
                  }`}
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="flex h-full flex-col overflow-hidden rounded-[28px]">
                    <div className="flex items-center justify-between px-4 py-1 text-xs tracking-[0.25em] text-slate-500">
                      <span>{activeCategoryMeta.label.toUpperCase()}</span>
                      <span>#{String(index + 1).padStart(2, "0")}</span>
                    </div>

                    <div className="relative flex flex-1 items-start justify-center overflow-hidden pt-0">
                      <img
                        src={card.imageSrc}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-90 w-90 -translate-x-1/2 -translate-y-1/2 object-contain opacity-20 transform-gpu"
                      />

                      <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <div
                          className={`rounded-full p-6 shadow-md ${
                            isWritten
                              ? writtenTheme.iconBg
                              : "border border-slate-200 bg-white"
                          }`}
                        >
                          <Lock
                            className={`h-10 w-10 ${
                              isWritten
                                ? writtenTheme.iconText
                                : cardTheme.lockedAccent
                            }`}
                          />
                        </div>
                      </div>

                      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs tracking-wide text-slate-400">
                        輸入文字後解鎖
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute inset-0 rounded-[28px] shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${
                    isWritten ? writtenTheme.shell : cardTheme.unlockedFace
                  }`}
                  style={{
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
                    <img
                      src={card.imageSrc}
                      alt={displayTitle}
                      loading="lazy"
                      decoding="async"
                      className="h-24 object-contain"
                    />

                    <p className="text-center text-sm font-bold leading-5 text-slate-800">
                      {displayTitle}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {isOpened ? (
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-2 ring-violet-300/60" />
            ) : null}
          </motion.button>
        );
      })}
    </motion.div>
  );
});

function WaterBackground({ category }: { category: CategoryKey }) {
  const bg = categoryBackgroundMap[category];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(to_top,rgba(255,255,255,0.03),rgba(255,255,255,0.01),transparent)]" />

      <motion.div
        animate={{ x: 160 }}
        initial={{ x: 0 }}
        transition={{
          duration: 9,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        className={`absolute bottom-28 left-[-20%] h-16 w-[160%] rounded-[100%] ${bg.wave1}`}
      />

      <motion.div
        animate={{ x: -140 }}
        initial={{ x: 0 }}
        transition={{
          duration: 11,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        className={`absolute bottom-20 left-[-18%] h-20 w-[155%] rounded-[100%] ${bg.wave2}`}
      />

      <motion.div
        animate={{ x: 180 }}
        initial={{ x: 0 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        className={`absolute bottom-12 left-[-22%] h-24 w-[165%] rounded-[100%] ${bg.wave3}`}
      />

      <motion.div
        animate={{ x: -120 }}
        initial={{ x: 0 }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        className={`absolute bottom-4 left-[-16%] h-28 w-[150%] rounded-[100%] ${bg.wave4}`}
      />

      <motion.div
        animate={{ x: 260, opacity: 0.12 }}
        initial={{ x: 0, opacity: 0.05 }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        }}
        className={`absolute bottom-0 left-[-10%] h-[34%] w-[60%] skew-x-[-18deg] blur-xl ${bg.lightBeam}`}
      />
    </div>
  );
}
function getRewardChecks(unlockedCountByCategory: Record<CategoryKey, number>) {
  const categoryChecks = CATEGORY_KEYS.flatMap((category) => [
    {
      reward: titleRewardPool[`${category}_novice`],
      isUnlocked: unlockedCountByCategory[category] >= 3,
    },
    {
      reward: titleRewardPool[`${category}_advanced`],
      isUnlocked: unlockedCountByCategory[category] >= 7,
    },
    {
      reward: titleRewardPool[`${category}_master`],
      isUnlocked: unlockedCountByCategory[category] >= 10,
    },
  ]);

  const crossChecks = [
    { reward: titleRewardPool.cross_novice, threshold: 2 },
    { reward: titleRewardPool.cross_advanced, threshold: 4 },
    { reward: titleRewardPool.cross_master, threshold: 6 },
  ].map(({ reward, threshold }) => ({
    reward,
    isUnlocked: CATEGORY_KEYS.every(
      (category) => unlockedCountByCategory[category] >= threshold,
    ),
  }));

  return [...categoryChecks, ...crossChecks];
}

const MemoizedBalanceScaleBackground = memo(BalanceScaleBackground);
const MemoizedWaterBackground = memo(WaterBackground);
const MemoizedCategoryTabs = memo(CategoryTabs);
const MemoizedCollectedCardsPanel = memo(CollectedCardsPanel);
const MemoizedTrophyPanel = memo(TrophyPanel);
const MemoizedTitleRewardCelebration = memo(TitleRewardCelebration);
const MemoizedCollectedCardPreview = memo(CollectedCardPreview);

export default function LockedFlipCardsPage({
  studentThought,
  studentPlan,
  onSubmitSummary,
  onTitleRewardsChange,
  unlockedCardIds,
  setUnlockedCardIds,
}: LockedFlipCardsPageProps){
  const [isFinished, setIsFinished] = useState(false);
  const [finalDiscovery, setFinalDiscovery] = useState("");
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [flippedEvidenceIds, setFlippedEvidenceIds] = useState<string[]>([]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [confirmedEvidenceIds, setConfirmedEvidenceIds] = useState<string[]>(
    [],
  );
  const [currentRoundCardIds, setCurrentRoundCardIds] = useState<string[]>([]);
  const [cards, setCards] = useState<GameCard[]>(createAllCards);
 useEffect(() => {
  if (unlockedCardIds.length === 0) return;

  setCards((prev) =>
    prev.map((card) => {
      const savedCard = unlockedCardIds.find((item) =>
        typeof item === "string" ? item === card.id : item.id === card.id,
      );

      if (!savedCard) return card;

      return {
        ...card,
        unlocked: true,
        content:
          typeof savedCard === "string"
            ? card.content
            : savedCard.content ?? card.content,
        unlockedAt:
          typeof savedCard === "string"
            ? card.unlockedAt ?? Date.now()
            : savedCard.unlockedAt ?? card.unlockedAt ?? Date.now(),
      };
    }),
  );
}, [unlockedCardIds]);

  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(
    null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalReady, setIsModalReady] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [newInputValue, setNewInputValue] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [justUnlockedId, setJustUnlockedId] = useState<string | null>(null);
  const [categoryFlipKey, setCategoryFlipKey] = useState<CategoryKey | null>(
    null,
  );
  const [developmentScore, setDevelopmentScore] = useState(0);
  const [conservationScore, setConservationScore] = useState(0);
  const [earnedTitles, setEarnedTitles] = useState<TitleReward[]>([]);
  const [pendingReward, setPendingReward] = useState<TitleReward | null>(null);
  const [previewCard, setPreviewCard] = useState<GameCard | null>(null);
  const [hasNewCollectedContent, setHasNewCollectedContent] = useState(false);
  const [hasNewTitleReward, setHasNewTitleReward] = useState(false);
  const hasInitializedTitleRewardsRef = useRef(false);
  const shouldShowTitleRewardAnimationRef = useRef(false);
  const rewardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFallingLock, setShowFallingLock] = useState(false);
  const [showUnlockBurst, setShowUnlockBurst] = useState(false);
  const pendingCardUpdateRef = useRef<null | {
    targetCard: GameCard;
    content: string;
    wasUnlocked: boolean;
  }>(null);

  const categoryCards = useMemo(
    () =>
      activeCategory
        ? cards.filter((card) => card.category === activeCategory)
        : [],
    [cards, activeCategory],
  );

  const activeCard = useMemo(
    () => cards.find((card) => card.id === activeId) ?? null,
    [cards, activeId],
  );
  const unlockedCountByCategory = useMemo(
    () =>
      CATEGORY_KEYS.reduce(
        (counts, category) => {
          counts[category] = cards.filter(
            (card) => card.category === category && card.unlocked,
          ).length;
          return counts;
        },
        {} as Record<CategoryKey, number>,
      ),
    [cards],
  );

  const activeCategoryMeta = activeCategory
    ? categoryMetaMap[activeCategory]
    : null;

  const totalUnlockedCount = cards.filter((card) => card.unlocked).length;
  const totalCardCount = cards.length;

  useEffect(() => {
  onTitleRewardsChange?.(earnedTitles);
}, [earnedTitles, onTitleRewardsChange]);

  useEffect(() => {
  const rewardChecks = getRewardChecks(unlockedCountByCategory);

  const newlyEarned = rewardChecks.filter(({ reward, isUnlocked }) => {
    const alreadyHas = earnedTitles.some((title) => title.id === reward.id);
    return isUnlocked && !alreadyHas;
  });

  if (newlyEarned.length === 0) return;

  setEarnedTitles((prev) => [
    ...prev,
    ...newlyEarned.map((item) => item.reward),
  ]);

  if (shouldShowTitleRewardAnimationRef.current) {
    setPendingReward(newlyEarned[0].reward);
    setHasNewTitleReward(true);
    shouldShowTitleRewardAnimationRef.current = false;
  }
}, [earnedTitles, unlockedCountByCategory]);

  useEffect(() => {
    if (!pendingReward) return;

    if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);

    rewardTimerRef.current = setTimeout(() => {
      setPendingReward(null);
      rewardTimerRef.current = null;
    }, 3000);

    return () => {
      if (rewardTimerRef.current) {
        clearTimeout(rewardTimerRef.current);
        rewardTimerRef.current = null;
      }
    };
  }, [pendingReward]);

  const openCollectedPreview = useCallback((card: GameCard) => {
    setPreviewCard(card);
  }, []);

  const closeCollectedPreview = useCallback(() => {
    setPreviewCard(null);
  }, []);

  const handleChangeCategory = useCallback(
    (category: CategoryKey) => {
      if (category === activeCategory) return;

      setActiveCategory(category);
      setCategoryFlipKey(category);

      window.setTimeout(() => {
        setCategoryFlipKey(null);
      }, 900);
    },
    [activeCategory],
  );

  const openCard = useCallback((card: GameCard) => {
    setIsModalReady(false);
    setActiveId(card.id);
    setIsUnlocking(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setInputValue(card.content || "");
        setNewInputValue("");
        setIsModalReady(true);
      });
    });
  }, []);

  const closeCard = useCallback(() => {
    if (isUnlocking) return;
    setActiveId(null);
    setInputValue("");
    setNewInputValue("");
  }, [isUnlocking]);

  const handleOpenCollectedPanel = useCallback(() => {
    setHasNewCollectedContent(false);
  }, []);

  const handleOpenTrophyPanel = useCallback(() => {
    setHasNewTitleReward(false);
  }, []);

  const applyPendingCardUpdate = useCallback(() => {
    const pending = pendingCardUpdateRef.current;
    if (!pending) return;

    pendingCardUpdateRef.current = null;

    const { targetCard, content, wasUnlocked } = pending;

    if (!wasUnlocked) {
      setJustUnlockedId(targetCard.id);

      window.setTimeout(() => {
        setJustUnlockedId(null);
      }, 900);
    }

    setCards((prev) =>
      prev.map((card) =>
        card.id === targetCard.id
          ? {
              ...card,
              content,
              unlocked: true,
              unlockedAt: wasUnlocked ? card.unlockedAt : Date.now(),
            }
          : card,
      ),
    );
    setUnlockedCardIds((prev) => {
    const next = prev.filter((item) =>
      typeof item === "string" ? item !== targetCard.id : item.id !== targetCard.id,
    );

    return [
      ...next,
      {
        id: targetCard.id,
        content,
        unlockedAt: wasUnlocked ? targetCard.unlockedAt ?? Date.now() : Date.now(),
      },
    ];
  });

    if (!wasUnlocked) {
      shouldShowTitleRewardAnimationRef.current = true;

      const effect = getBalanceEffect(targetCard.category);
      setDevelopmentScore((prev) => prev + effect.development);
      setConservationScore((prev) => prev + effect.conservation);
    }

    setCurrentRoundCardIds((prev) =>
      prev.includes(targetCard.id) ? prev : [...prev, targetCard.id],
    );

    setHasNewCollectedContent(true);
  }, [setUnlockedCardIds]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCard) return;

    const latestCard = cards.find((card) => card.id === activeCard.id);
    if (!latestCard) return;
    if (latestCard.unlocked) {
      if (!newInputValue.trim()) return;

      const content = `${latestCard.content}\n—— 更新內容 ——\n${newInputValue.trim()}`;

      setCards((prev) =>
        prev.map((card) =>
          card.id === latestCard.id
            ? {
                ...card,
                content,
                unlocked: true,
                unlockedAt: card.unlockedAt,
              }
            : card,
        ),
      );

      setInputValue(content);
      setNewInputValue("");
      setIsUnlocking(false);
      setCurrentRoundCardIds((prev) =>
        prev.includes(latestCard.id) ? prev : [...prev, latestCard.id],
      );
      setHasNewCollectedContent(true);
      setUnlockedCardIds((prev) => {
      const next = prev.filter((item) =>
        typeof item === "string" ? item !== latestCard.id : item.id !== latestCard.id,
      );

      return [
        ...next,
        {
          id: latestCard.id,
          content,
          unlockedAt: latestCard.unlockedAt ?? Date.now(),
        },
      ];
    });
      return;
    }
    if (!inputValue.trim()) return;

    const targetCard = latestCard;
    const content = inputValue.trim();

    setIsUnlocking(true);
    setShowFallingLock(true);
    setShowUnlockBurst(false);
    await new Promise((resolve) => setTimeout(resolve, 750));
    setShowFallingLock(false);
    setShowUnlockBurst(true);

    await new Promise((resolve) => setTimeout(resolve, 650));

    await new Promise((resolve) => setTimeout(resolve, 650));

    pendingCardUpdateRef.current = {
      targetCard,
      content,
      wasUnlocked: false,
    };

    setShowFallingLock(false);
    setShowUnlockBurst(false);
    setIsUnlocking(false);
    setActiveId(null);
    setInputValue("");
    setNewInputValue("");
  };

  const unlockedCards = cards.filter((card) => card.unlocked);
  const unlockedCardsWithContent = unlockedCards.filter(
  (card) => card.content.trim() && currentRoundCardIds.includes(card.id),
  );

  const confirmedEvidenceCards = unlockedCardsWithContent.filter((card) =>
    confirmedEvidenceIds.includes(card.id),
  );

  const isFinalDiscoveryLocked = confirmedEvidenceCards.length === 0;

  function toggleEvidenceCard(cardId: string) {
    setSelectedEvidenceIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  }

  function confirmEvidenceCards() {
    setConfirmedEvidenceIds(selectedEvidenceIds);
  }
  function toggleEvidenceFlip(cardId: string) {
    setFlippedEvidenceIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  }

  function submitFinalSummary() {
    if (!finalDiscovery.trim()) return;
    if (confirmedEvidenceCards.length === 0) return;

    onSubmitSummary({
      studentThought,
      studentPlan,
      evidenceCards: confirmedEvidenceCards.map((card) => ({
        id: card.id,
        title: card.revealedTitle,
        imageSrc: card.imageSrc,
        content: card.content,
      })),
      finalDiscovery: finalDiscovery.trim(),
    });
  }

  if (isFinished) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f3efe6] px-4 py-6 text-stone-800 md:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(173,163,138,0.22),transparent_30%),linear-gradient(135deg,rgba(68,64,60,0.06)_0_1px,transparent_1px_32px)]" />
          <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-stone-300/20 blur-[90px]" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#b6c1ad]/25 blur-[110px]" />
        </div>
        <AnimatePresence>
          {showSubmitConfirm ? (
            <motion.div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.92, y: 18, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.96, y: 10, opacity: 0 }}
                className="w-full max-w-md overflow-hidden rounded-[34px] border border-[#d8cbb3] bg-[#fffaf0] p-6 shadow-[0_24px_70px_rgba(45,41,34,0.18)]"
              >
                <h2 className="font-serif text-2xl font-semibold tracking-[0.08em] text-[#332c24]">
                  確認送出數據探究總結？
                </h2>

                <p className="mt-3 text-sm font-medium leading-7 text-stone-600">
                  送出後，這份數據探究總結會存到首頁的調查書紀錄中。
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    type="button"
                    onClick={() => setShowSubmitConfirm(false)}
                    className="rounded-xl border border-[#8f2f2f] bg-[#7f2f2f] px-5 py-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#9b3b3b] active:translate-y-0"
                  >
                    取消
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setShowSubmitConfirm(false);
                      submitFinalSummary();
                    }}
                  className="rounded-xl border border-[#8f2f2f] bg-[#7f2f2f] px-5 py-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#9b3b3b] active:translate-y-0"
                  >
                    確認送出
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="relative z-10 mx-auto max-w-5xl overflow-hidden rounded-[34px] border border-[#d8cbb3] bg-[#f7f1e6]/86 p-8 shadow-[0_22px_70px_rgba(45,41,34,0.11)] backdrop-blur-md">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#d8cbb3]/80 pb-6">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-[#d8cbb3] bg-[#fffaf0] px-4 py-1 text-xs font-black tracking-[0.18em] text-[#7b5b37]">
                INQUIRY CONCLUSION
              </p>
              <h1 className="font-serif text-4xl font-semibold tracking-[0.12em] text-[#332c24]">
                數據探究總結
              </h1>
            </div>
            <div className="rounded-2xl border border-[#d8cbb3] bg-white/62 px-4 py-3 text-sm font-black text-stone-600">
              已選證據：{confirmedEvidenceCards.length} 張
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-[28px] border border-[#d8cbb3] bg-[#fffaf0]/86 p-6 shadow-[0_14px_36px_rgba(45,41,34,0.08)]">
                <h2 className="mb-3 font-serif text-xl font-semibold tracking-[0.06em] text-[#332c24]">
                  1. 你在想什麼？
                </h2>

                <div className="relative min-h-[68px] overflow-hidden rounded-2xl border-2 border-dashed border-[#b8aa94] bg-[repeating-linear-gradient(-45deg,rgba(120,113,108,0.10)_0_10px,rgba(255,250,240,0.82)_10px_20px)] p-4 pr-24 font-medium leading-7 text-stone-600 shadow-inner">
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#a99373] bg-[#4a382b] px-2.5 py-1 text-[11px] font-black tracking-[0.12em] text-[#fffaf0] shadow-sm">
                    <Lock className="h-3 w-3" />
                    已鎖定
                  </span>
                  {studentThought || "尚未填寫"}
                </div>
              </section>
              <section className="rounded-[28px] border border-[#d8cbb3] bg-[#fffaf0]/86 p-6 shadow-[0_14px_36px_rgba(45,41,34,0.08)]">
                <h2 className="mb-3 font-serif text-xl font-semibold tracking-[0.06em] text-[#332c24]">
                  2. 有規劃數據探究的方向嗎？
                </h2>

                <div className="relative min-h-[68px] overflow-hidden rounded-2xl border-2 border-dashed border-[#b8aa94] bg-[repeating-linear-gradient(-45deg,rgba(120,113,108,0.10)_0_10px,rgba(255,250,240,0.82)_10px_20px)] p-4 pr-24 font-medium leading-7 text-stone-600 shadow-inner">
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#a99373] bg-[#4a382b] px-2.5 py-1 text-[11px] font-black tracking-[0.12em] text-[#fffaf0] shadow-sm">
                    <Lock className="h-3 w-3" />
                    已鎖定
                  </span>
                  {studentPlan || "尚未填寫"}
                </div>
              </section>
            </div>

            <section className="rounded-[28px] border border-[#d8cbb3] bg-[#fffaf0]/86 p-6 shadow-[0_14px_36px_rgba(45,41,34,0.08)]">
              <h2 className="mb-4 font-serif text-xl font-semibold tracking-[0.06em] text-[#332c24]">
                3. 探究並解鎖的卡牌(選取卡牌作為證據)
              </h2>

              {unlockedCardsWithContent.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {unlockedCardsWithContent.map((card) => {
                    const isSelected = selectedEvidenceIds.includes(card.id);

                    return (
                      <button
                        key={card.id}
                        type="button"
                        disabled={confirmedEvidenceIds.length > 0}
                        onClick={() => toggleEvidenceCard(card.id)}
                        className={`relative w-[320px] rounded-[24px] border-2 p-3 text-left transition ${
                          isSelected
                            ? "scale-[1.015] border-[#4a382b] bg-[#fff4d8] shadow-[0_0_0_5px_rgba(216,203,179,0.78),0_18px_38px_rgba(74,56,43,0.20)] ring-2 ring-[#7b5b37] ring-offset-2 ring-offset-[#fffaf0]"
                            : "border-[#e2d4bd] bg-white/78 shadow-[0_12px_28px_rgba(45,41,34,0.07)] hover:border-[#b49a78] hover:bg-[#fffaf0]"
                        }`}
                      >
                        {isSelected ? (
                          <span className="absolute -right-2 -top-2 z-10 rounded-full border-2 border-[#fffaf0] bg-[#4a382b] px-3 py-1 text-xs font-black tracking-[0.12em] text-[#fffaf0] shadow-[0_8px_18px_rgba(74,56,43,0.28)]">
                            已選取
                          </span>
                        ) : null}
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${categoryTabThemeMap[card.category].badge}`}
                          >
                            {categoryMetaMap[card.category].label}
                          </span>

                          <h3 className="text-sm font-black text-[#332c24]">
                            {card.revealedTitle}
                          </h3>
                        </div>

                        <div className="flex items-start gap-3">
                          <img
                            src={card.imageSrc}
                            alt={card.revealedTitle}
                            className="h-24 w-24 flex-shrink-0 rounded-xl border border-[#eadfcf] bg-[#fffaf0] object-contain"
                          />

                          <p className="line-clamp-3 whitespace-pre-wrap text-xs font-medium leading-5 text-stone-600">
                            {card.content}
                          </p>
                        </div>

                        <div
                          className={`mt-3 rounded-full px-3 py-1 text-center text-xs font-black tracking-[0.08em] ${
                            isSelected
                              ? "bg-[#4a382b] text-[#fffaf0]"
                              : "bg-[#fffaf0] text-[#7b5b37]"
                          }`}
                        >
                          {isSelected ? "目前已選取這張卡牌" : "選擇此卡牌"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#e2d4bd] bg-white/70 p-4 font-medium text-stone-500">
                  尚未解鎖任何卡牌
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  onClick={confirmEvidenceCards}
                  disabled={
                    selectedEvidenceIds.length === 0 ||
                    confirmedEvidenceIds.length > 0
                  }
                  className="rounded-2xl border border-[#7d6a51] bg-[#8a765c] px-5 py-3 font-black text-[#fffaf0] shadow-[0_7px_0_rgba(74,56,43,0.18)] hover:bg-[#9a8365] disabled:opacity-40"
                >
                  {confirmedEvidenceIds.length > 0 ? "已鎖定選擇" : "鎖定選取"}
                </Button>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#d8cbb3] bg-[#fffaf0]/86 p-6 shadow-[0_14px_36px_rgba(45,41,34,0.08)]">
              <h2 className="mb-4 font-serif text-xl font-semibold tracking-[0.06em] text-[#332c24]">
                4. 你選定的證據
              </h2>

              {confirmedEvidenceCards.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {confirmedEvidenceCards.map((card) => {
                    const isFlipped = flippedEvidenceIds.includes(card.id);

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => toggleEvidenceFlip(card.id)}
                        className="h-[210px] w-[220px] rounded-[24px] text-left [perspective:1000px]"
                      >
                        <motion.div
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.45 }}
                          className="relative h-full w-full rounded-[24px] transform-gpu"
                          style={{ transformStyle: "preserve-3d" }}
                        >
                          <div
                            className="absolute inset-0 rounded-[24px] border border-[#e2d4bd] bg-white/82 p-3 shadow-[0_12px_30px_rgba(45,41,34,0.08)]"
                            style={{ backfaceVisibility: "hidden" }}
                          >
                            <img
                              src={card.imageSrc}
                              alt={card.revealedTitle}
                              className="mb-3 h-28 w-full rounded-xl border border-[#eadfcf] bg-[#fffaf0] object-contain"
                            />

                            <h3 className="w-full text-center text-sm font-black text-[#332c24]">
                              {card.revealedTitle}
                            </h3>

                            <p className="mt-2 text-center text-xs font-bold text-stone-400">
                              點擊查看內容
                            </p>
                          </div>
                          <div
                            className="absolute inset-0 rounded-[24px] border border-[#e2d4bd] bg-[#fffaf0] p-4 shadow-[0_12px_30px_rgba(45,41,34,0.08)]"
                            style={{
                              transform: "rotateY(180deg)",
                              backfaceVisibility: "hidden",
                            }}
                          >
                            <p className="mb-2 text-center text-xs font-black text-[#7b5b37]">
                              內容
                            </p>

                            <div className="h-[145px] overflow-y-auto rounded-xl border border-[#eadfcf] bg-white/78 p-3">
                              <p className="whitespace-pre-wrap break-words text-xs font-medium leading-5 text-stone-700">
                                {card.content || "尚未輸入內容"}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#e2d4bd] bg-white/70 p-4 font-medium text-stone-500">
                  尚未選定證據
                </div>
              )}
            </section>

            <section
              className={`rounded-[28px] border p-6 shadow-[0_14px_36px_rgba(45,41,34,0.08)] ${
                isFinalDiscoveryLocked
                  ? "border-[#b8aa94] bg-[#eee5d6]/88"
                  : "border-[#d8cbb3] bg-[#fffaf0]/86"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-semibold tracking-[0.06em] text-[#332c24]">
                  5. 所以你發現了什麼？
                </h2>
                {isFinalDiscoveryLocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#a99373] bg-[#4a382b] px-3 py-1 text-xs font-black tracking-[0.12em] text-[#fffaf0] shadow-sm">
                    <Lock className="h-3.5 w-3.5" />
                    先選定證據才可撰寫
                  </span>
                ) : null}
              </div>

              {isFinalDiscoveryLocked ? (
                <p className="mb-3 rounded-2xl border border-dashed border-[#b8aa94] bg-[#fffaf0]/72 px-4 py-3 text-sm font-black text-stone-600">
                  目前此區塊已鎖定，請先在第 3 題選取卡牌並按下「確定選擇」。
                </p>
              ) : null}

              <textarea
                value={finalDiscovery}
                onChange={(e) => setFinalDiscovery(e.target.value)}
                placeholder={
                  isFinalDiscoveryLocked
                    ? "此區塊尚未開放撰寫"
                    : "請輸入你的最後發現..."
                }
                rows={8}
                disabled={isFinalDiscoveryLocked}
                className={`w-full rounded-2xl border p-4 text-base font-medium leading-7 outline-none transition ${
                  isFinalDiscoveryLocked
                    ? "cursor-not-allowed border-dashed border-[#b8aa94] bg-[repeating-linear-gradient(-45deg,rgba(120,113,108,0.10)_0_10px,rgba(255,250,240,0.78)_10px_20px)] text-stone-500 shadow-inner placeholder:text-stone-500"
                    : "border-[#d8cbb3] bg-white/78 text-stone-800 focus:border-[#9b7b55] focus:ring-4 focus:ring-[#d8cbb3]/35"
                }`}
              />
            </section>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                disabled={
                  !finalDiscovery.trim() || confirmedEvidenceCards.length === 0
                }
                className="rounded-2xl border border-[#63513f] bg-[#4a382b] px-6 py-4 font-black text-[#fffaf0] shadow-[0_8px_0_rgba(74,56,43,0.22)] hover:bg-[#5b4635] disabled:opacity-40"
              >
                送出數據探究總結
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3efe6] text-stone-800 transition-colors duration-700">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(173,163,138,0.22),transparent_30%),linear-gradient(135deg,rgba(68,64,60,0.06)_0_1px,transparent_1px_32px)]" />
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-stone-300/20 blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#b6c1ad]/25 blur-[110px]" />
      </div>
      {!activeCard ? (
        <>
          <MemoizedBalanceScaleBackground
            developmentScore={developmentScore}
            conservationScore={conservationScore}
          />

          {activeCategory ? (
            <MemoizedWaterBackground category={activeCategory} />
          ) : null}
        </>
      ) : null}

      {!activeCard ? (
        <>
          <MemoizedCollectedCardsPanel
            cards={cards}
            onOpenCard={openCollectedPreview}
            hasNewContent={hasNewCollectedContent}
            onOpenPanel={handleOpenCollectedPanel}
          />

          <MemoizedTrophyPanel
            titles={earnedTitles}
            hasNewTitle={hasNewTitleReward}
            onOpenPanel={handleOpenTrophyPanel}
          />
        </>
      ) : null}

      <MemoizedTitleRewardCelebration reward={pendingReward} />

      <MemoizedCollectedCardPreview
        card={previewCard}
        onClose={closeCollectedPreview}
      />
      <AnimatePresence>
        {showFinishConfirm ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-[34px] border border-[#d8cbb3] bg-[#fffaf0] p-6 shadow-[0_24px_70px_rgba(45,41,34,0.18)]"
            >
              <h2 className="font-serif text-2xl font-semibold tracking-[0.08em] text-[#332c24]">
                確認結束數據探究？
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-stone-600">
                結束後會進入「數據探究總結」畫面，請確認您已完成目前想解鎖與蒐集的數據卡牌。
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={() => setShowFinishConfirm(false)}
                  className="rounded-xl border border-[#8f2f2f] bg-[#7f2f2f] px-5 py-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#9b3b3b] active:translate-y-0"
          >
                繼續探究
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setShowFinishConfirm(false);
                    setIsFinished(true);
                  }}
                  className="rounded-xl border border-[#8f2f2f] bg-[#7f2f2f] px-5 py-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#9b3b3b] active:translate-y-0"
          >
                  確認結束
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <motion.div
        layout
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-12 pt-10 ${
          activeCard ? "pointer-events-none" : ""
        } ${!activeCategory ? "justify-center" : "justify-start"}`}
      >
        <motion.div
          layout
          animate={{ scale: activeCategory ? 0.98 : 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <MemoizedCategoryTabs
            activeCategory={activeCategory}
            onChange={handleChangeCategory}
            unlockedCountByCategory={unlockedCountByCategory}
            totalUnlockedCount={totalUnlockedCount}
            totalCardCount={totalCardCount}
            onRequestFinish={() => setShowFinishConfirm(true)}
          />
        </motion.div>

        <div className="mb-6" />

        {activeCategory && activeCategoryMeta ? (
          <GameCardGrid
            categoryCards={categoryCards}
            activeId={activeId}
            activeCategoryMeta={activeCategoryMeta}
            onOpenCard={openCard}
            justUnlockedId={justUnlockedId}
            categoryFlipKey={categoryFlipKey}
          />
        ) : null}
      </motion.div>

      <AnimatePresence
        onExitComplete={() => {
          setIsModalReady(false);
          applyPendingCardUpdate();
        }}
      >
        {activeCard ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/30 p-4"
            onClick={closeCard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-5xl transform-gpu will-change-transform"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {isModalReady ? (
                <div className="grid max-h-[calc(100vh-2rem)] gap-6 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                    <div className="flex max-h-full max-w-full items-center justify-center">
                      <img
                        src={activeCard.imageSrc}
                        alt={activeCard.title}
                        loading="eager"
                        decoding="sync"
                        className="max-h-full max-w-full object-contain transform-gpu will-change-transform"
                      />
                    </div>

                    <AnimatePresence>
                      {showFallingLock && !showUnlockBurst ? (
                        <motion.div
                          className="absolute left-1/2 top-[3%] z-20 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border border-sky-200 bg-sky-100 shadow-[0_0_34px_rgba(56,189,248,0.45)]"
                          initial={{ y: 0, scale: 1, rotate: -8, opacity: 1 }}
                          animate={{
                            y: 205,
                            scale: 1.25,
                            rotate: 0,
                            opacity: 1,
                          }}
                          exit={{ opacity: 0, scale: 1.45 }}
                          transition={{
                            duration: 0.75,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <Lock
                            className={`h-12 w-12 ${writtenCardStateMap[activeCard.category].iconText}`}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <AnimatePresence>
                      {showUnlockBurst ? (
                        <motion.div
                          className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                          initial={{ opacity: 0, scale: 0.75 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.25 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        >
                          <motion.div
                            className={`flex h-28 w-28 items-center justify-center rounded-full border shadow-[0_0_48px_rgba(56,189,248,0.55)] ${writtenCardStateMap[activeCard.category].iconBg}`}
                            animate={{
                              scale: [1, 1.18, 1],
                              rotate: [0, -8, 8, 0],
                            }}
                            transition={{ duration: 0.65, ease: "easeOut" }}
                          >
                            <Unlock
                              className={`h-14 w-14 ${writtenCardStateMap[activeCard.category].iconText}`}
                            />
                          </motion.div>

                          <motion.div
                            className="absolute h-40 w-40 rounded-full border-4 border-sky-200/70"
                            initial={{ scale: 0.5, opacity: 0.9 }}
                            animate={{ scale: 1.45, opacity: 0 }}
                            transition={{ duration: 0.65, ease: "easeOut" }}
                          />

                          <motion.div
                            className="absolute h-56 w-56 rounded-full bg-sky-200/20 blur-2xl"
                            initial={{ scale: 0.4, opacity: 0.8 }}
                            animate={{ scale: 1.4, opacity: 0 }}
                            transition={{ duration: 0.65, ease: "easeOut" }}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <Card className="border-slate-200 bg-white/92 text-slate-800 shadow-2xl backdrop-blur-xl">
                    <CardContent className="p-6 md:p-7">
                      <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                          <h1 className="mt-2 text-2xl font-bold">
                            輸入卡牌資料
                          </h1>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={closeCard}
                          disabled={isUnlocking}
                          className="rounded-full text-black hover:bg-slate-100 hover:text-black"
                        >
                          <X className="h-5 w-5 text-black" />
                        </Button>
                      </div>

                      <form
                        onSubmit={handleSubmit}
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-full flex-col space-y-5"
                      >
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            卡牌分類
                          </label>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {categoryMetaMap[activeCard.category].label}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            卡牌標題
                          </label>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {activeCard.unlocked
                              ? activeCard.revealedTitle
                              : activeCard.title}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-500">
                            內容輸入
                          </label>

                          {activeCard.unlocked ? (
                            <div className="mt-2 space-y-4">
                              <textarea
                                value={inputValue}
                                readOnly
                                rows={6}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4 text-base text-slate-700 outline-none"
                              />

                              <textarea
                                value={newInputValue}
                                onChange={(e) =>
                                  setNewInputValue(e.target.value)
                                }
                                placeholder="請輸入你/妳的新看法..."
                                rows={5}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300"
                              />
                            </div>
                          ) : (
                            <textarea
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              placeholder="請告訴我，你/妳看到了甚麼..."
                              rows={10}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300"
                            />
                          )}
                        </div>

                        <div className="mt-auto flex justify-end gap-3">
                          <Button
                            type="submit"
                            onClick={(e) => e.stopPropagation()}
                            disabled={
                              isUnlocking ||
                              (activeCard.unlocked
                                ? !newInputValue.trim()
                                : !inputValue.trim())
                            }
                            className="rounded-2xl bg-sky-500 px-5 py-6 text-white hover:bg-sky-400"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {isUnlocking
                              ? activeCard.unlocked
                                ? "更新中..."
                                : "解鎖中..."
                              : activeCard.unlocked
                                ? "更新內容"
                                : "送出並解鎖"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex h-[520px] items-center justify-center rounded-[32px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                  <div className="text-sm font-medium text-slate-500">
                    載入卡牌中...
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
