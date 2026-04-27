import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type CollectionSortMode =
  | "latest"
  | "water"
  | "land"
  | "leopard"
  | "rumor";

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
  { category: "leopard", startImageId: 61, count: CATEGORY_TOTAL_COUNTS.leopard },
  { category: "rumor", startImageId: 91, count: CATEGORY_TOTAL_COUNTS.rumor },
];

const COLLECTION_SORT_CATEGORY: Record<CollectionSortMode, CategoryKey | null> = {
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
    lightBeam: "bg-gradient-to-r from-transparent via-sky-200/10 to-transparent",
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
    lightBeam: "bg-gradient-to-r from-transparent via-lime-200/10 to-transparent",
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
    lightBeam: "bg-gradient-to-r from-transparent via-orange-200/10 to-transparent",
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
    lightBeam: "bg-gradient-to-r from-transparent via-fuchsia-200/10 to-transparent",
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
    lockedFace: "bg-white/55 border border-sky-100/70",
    unlockedFace: "bg-white/55 border border-sky-200/70",
    lockedAccent: "text-sky-500",
    previewShell: "bg-white border border-sky-200",
  },
  land: {
    lockedFace: "bg-white/55 border border-lime-100/70",
    unlockedFace: "bg-white/55 border border-lime-200/70",
    lockedAccent: "text-lime-600",
    previewShell: "bg-white border border-lime-200",
  },
  leopard: {
    lockedFace: "bg-white/55 border border-orange-100/70",
    unlockedFace: "bg-white/55 border border-orange-200/70",
    lockedAccent: "text-orange-500",
    previewShell: "bg-white border border-orange-200",
  },
  rumor: {
    lockedFace: "bg-white/55 border border-violet-100/70",
    unlockedFace: "bg-white/55 border border-violet-200/70",
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
      "border border-sky-200/70 bg-[linear-gradient(180deg,rgba(240,249,255,0.58)_0%,rgba(224,242,254,0.48)_100%)]",
    iconBg: "border border-sky-200 bg-sky-100/80",
    iconText: "text-sky-500",
    hintText: "text-sky-600",
    badge: "rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700",
    hoverGlow: "",
    previewBox: "border border-sky-200 bg-sky-50/80",
    collectionItem: "border border-sky-200 bg-sky-50 hover:bg-sky-100/70",
    collectionLabel: "bg-sky-100 text-sky-700",
    collectionHint: "text-sky-600",
    collectionArrow: "text-sky-500",
  },
  land: {
    shell:
      "border border-lime-200/70 bg-[linear-gradient(180deg,rgba(247,254,231,0.58)_0%,rgba(236,252,203,0.48)_100%)]",
    iconBg: "border border-lime-200 bg-lime-100/80",
    iconText: "text-lime-600",
    hintText: "text-lime-700",
    badge: "rounded-full border border-lime-200 bg-lime-100 px-3 py-1 text-xs font-medium text-lime-700",
    hoverGlow: "",
    previewBox: "border border-lime-200 bg-lime-50/80",
    collectionItem: "border border-lime-200 bg-lime-50 hover:bg-lime-100/70",
    collectionLabel: "bg-lime-100 text-lime-700",
    collectionHint: "text-lime-700",
    collectionArrow: "text-lime-600",
  },
  leopard: {
    shell:
      "border border-orange-200/70 bg-[linear-gradient(180deg,rgba(255,247,237,0.58)_0%,rgba(255,237,213,0.48)_100%)]",
    iconBg: "border border-orange-200 bg-orange-100/80",
    iconText: "text-orange-500",
    hintText: "text-orange-700",
    badge: "rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700",
    hoverGlow: "",
    previewBox: "border border-orange-200 bg-orange-50/80",
    collectionItem: "border border-orange-200 bg-orange-50 hover:bg-orange-100/70",
    collectionLabel: "bg-orange-100 text-orange-700",
    collectionHint: "text-orange-700",
    collectionArrow: "text-orange-500",
  },
  rumor: {
    shell:
      "border border-violet-200/70 bg-[linear-gradient(180deg,rgba(250,245,255,0.58)_0%,rgba(243,232,255,0.48)_100%)]",
    iconBg: "border border-violet-200 bg-violet-100/80",
    iconText: "text-violet-500",
    hintText: "text-violet-700",
    badge: "rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700",
    hoverGlow: "",
    previewBox: "border border-violet-200 bg-violet-50/80",
    collectionItem: "border border-violet-200 bg-violet-50 hover:bg-violet-100/70",
    collectionLabel: "bg-violet-100 text-violet-700",
    collectionHint: "text-violet-700",
    collectionArrow: "text-violet-500",
  },
};

function createCardsByCategory(
  category: CategoryKey,
  startImageId: number,
  count: number
): GameCard[] {
  return Array.from({ length: count }, (_, i) => {
    const globalImageId = startImageId + i;

    return {
      id: `${category}-${i + 1}`,
      localId: i + 1,
      category,
      title: `${categoryMetaMap[category].label}卡 ${i + 1}`,
      revealedTitle:
        revealedTitlesByCategory[category][i] ?? `${categoryMetaMap[category].label}資料卡 ${i + 1}`,
      content: "",
      unlocked: false,
      unlockedAt: null,
      imageSrc: `/card/image${globalImageId}.PNG`,
    };
  });
}

function createAllCards(): GameCard[] {
  return CARD_GROUPS.flatMap(({ category, startImageId, count }) =>
    createCardsByCategory(category, startImageId, count)
  );
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

function TitleEmblem({
  tier,
  theme,
}: {
  tier: TitleTier;
  theme: TitleTheme;
}) {
  const themeStyle = getTitleThemeClasses(theme);
  const tierStyle = getTitleTierCardClasses(tier);

  if (tier === "master") {
    return (
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-[40%_60%_55%_45%/45%_40%_60%_55%] ${tierStyle.emblem}`}
      >
        <div className={`absolute inset-0 rounded-[inherit] ${themeStyle.glow}`} />
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
      <div className={`relative h-full rounded-[23px] px-4 py-4 ${tierClasses.inner}`}>
        <div className="absolute inset-0 opacity-20">
          <div className={`absolute -left-6 top-2 h-20 w-20 rounded-full ${themeClasses.glow}`} />
          <div className={`absolute right-0 top-10 h-16 w-16 rounded-full ${themeClasses.glow}`} />
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
                {tier === "novice" ? "新手" : tier === "advanced" ? "老手" : "大師"}
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

            <p className={`text-sm font-bold tracking-wide ${tierClasses.name}`}>{title.name}</p>
            <p className={`mt-1 text-xs leading-5 ${tierClasses.desc}`}>{title.description}</p>
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
  const total = Math.max(1, developmentScore + conservationScore);
  const conservationPercent = Math.round((conservationScore / total) * 100);
  const developmentPercent = 100 - conservationPercent;

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-0 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 px-4">
      <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>保育 {conservationScore}</span>
          <span>開發 {developmentScore}</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-emerald-300" style={{ width: `${conservationPercent}%` }} />
          <div className="bg-orange-300" style={{ width: `${developmentPercent}%` }} />
        </div>
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
}: {
  activeCategory: CategoryKey;
  onChange: (category: CategoryKey) => void;
  unlockedCountByCategory: Record<CategoryKey, number>;
  totalUnlockedCount: number;
  totalCardCount: number;
}) {

  return (
    <div className="relative mb-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white/75 p-5 shadow-sm">
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <div className="absolute left-[8%] top-2 h-24 w-24 rounded-full bg-emerald-200/30" />
        <div className="absolute right-[12%] top-8 h-20 w-20 rounded-full bg-lime-200/25" />
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <div className="flex items-center gap-3">
    <div className="rounded-full bg-emerald-50 p-2">
      <Leaf className="h-5 w-5 text-emerald-600" />
    </div>
    <div>
      <p className="text-2xl font-bold tracking-[0.2em] text-slate-600"> 數據探究選單  </p>
    </div>
  </div>

  <div className="flex w-fit items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
    <BookOpen className="h-4 w-4 text-emerald-600" />
    總體已解鎖：
    <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 font-semibold text-emerald-700">
      {totalUnlockedCount} / {totalCardCount}
    </span>
  </div>
</div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {CATEGORY_KEYS.map((key) => {
          const item = categoryMetaMap[key];
          const active = activeCategory === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={[
                "relative overflow-hidden rounded-[26px] border px-4 py-4 text-left transition",
                active
                  ? "border-slate-300 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-full bg-slate-100 p-2 text-slate-600">{item.icon}</div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {unlockedCountByCategory[key]} / {CATEGORY_TOTAL_COUNTS[key]}
                  </span>
                  {active ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      目前分類
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-lg font-bold text-slate-800">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.subtitle}</p>
              </div>
            </button>
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
  const contentWidth = columnCount * cardWidth + Math.max(0, columnCount - 1) * columnGap;
  const desiredPanelWidth = Math.max(minPanelWidth, contentWidth + panelPaddingX);

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
            className="rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-lg"
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
                <p className="text-lg uppercase tracking-[0.28em] text-amber-600">稱號收藏</p>
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

      <button
        type="button"
        
        onClick={handleTogglePanel}
        className="relative flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-gradient-to-br from-amber-100 to-yellow-200 text-amber-800"
      >
        {hasNewTitle && !open ? (
          <motion.span
            className="absolute right-2 top-2 h-3 w-3 rounded-full bg-amber-500"
          />
        ) : null}

        {open ? <ChevronDown className="h-6 w-6" /> : <Trophy className="h-7 w-7" />}
      </button>
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
            className="max-h-[460px] w-[380px] overflow-hidden rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-full bg-sky-50 p-2">
                <BookOpen className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-[0.2em] text-sky-700">  數據卡牌收藏 </p>
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
                            <span className={`text-xs ${theme.collectionHint}`}>排序優先</span>
                          ) : null}
                        </div>
                        <div className="truncate text-sm font-semibold text-slate-800">
                          {card.revealedTitle}
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 ${theme.collectionArrow}`} />
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

      <button
        type="button"
        
        onClick={handleTogglePanel}
        className="relative flex h-16 w-16 items-center justify-center rounded-full border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-100 text-sky-700"
      >
        {hasNewContent && !open ? (
          <motion.span
            className="absolute right-2 top-2 h-3 w-3 rounded-full bg-sky-500"
          />
        ) : null}
        {open ? <ChevronDown className="h-6 w-6" /> : <BookOpen className="h-7 w-7" />}
      </button>
    </div>
  );
}

function TitleRewardCelebration({
  reward,
  onClose,
}: {
  reward: TitleReward | null;
  onClose: () => void;
}) {
  if (!reward) return null;

  const tier = getTitleTier(reward.id);
  const theme = getTitleTheme(reward.id);
  const themeClasses = getTitleThemeClasses(theme);
  const tierClasses = getTitleTierCardClasses(tier);

  return (
    <AnimatePresence>
      {reward ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 16, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative w-full max-w-md"
          >
            <motion.div
              animate={{ rotate: 10, opacity: 1, scale: 1.08 }}
              initial={{ rotate: 0, opacity: 0.5, scale: 0.9 }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
              className={`absolute -left-6 top-8 ${themeClasses.accent}`}
            >
              <Sparkles className="h-8 w-8" />
            </motion.div>

            <motion.div
              animate={{ rotate: -12, opacity: 1, scale: 1.12 }}
              initial={{ rotate: 0, opacity: 0.45, scale: 0.9 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className={`absolute -right-4 top-10 ${themeClasses.accent}`}
            >
              {tier === "master" ? <Crown className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
            </motion.div>

            <motion.div
              animate={{ y: -6, opacity: 1 }}
              initial={{ y: 0, opacity: 0.55 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              className={`absolute left-1/2 top-[-18px] -translate-x-1/2 ${themeClasses.accent}`}
            >
              {tier === "advanced" ? <Stars className="h-9 w-9" /> : <Sparkles className="h-9 w-9" />}
            </motion.div>

            <div className={`relative overflow-hidden rounded-[32px] p-[1px] ${tierClasses.shell}`}>
              <div className="relative overflow-hidden rounded-[31px] bg-white/10 px-7 py-8">
                <div className="absolute inset-0 opacity-20">
                  <div className={`absolute left-1/2 top-4 h-40 w-40 -translate-x-1/2 rounded-full ${themeClasses.glow}`} />
                </div>

                <div className="relative flex flex-col items-center text-center">
                  <TitleEmblem tier={tier} theme={theme} />

                  <div className="mb-2 mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${themeClasses.chip}`}>
                      {tier === "novice" ? "新手稱號" : tier === "advanced" ? "老手稱號" : "大師稱號"}
                    </span>
                  </div>

                  <h2 className={`mt-2 text-3xl font-bold ${tierClasses.name}`}>{reward.name}</h2>
                  <p className={`mt-3 text-sm leading-6 ${tierClasses.desc}`}>{reward.description}</p>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/90">
                    已加入右下角稱號收藏
                  </div>

                  <Button
                    type="button"
                    onClick={onClose}
                    className="mt-6 rounded-2xl bg-white/90 px-5 py-6 text-slate-950 hover:bg-white"
                  >
                    收進稱號收藏
                  </Button>
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
          className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/25 p-4"
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
            className={`relative w-full max-w-3xl rounded-[32px] p-[1px] shadow-lg ${
              cardTheme?.previewShell ?? "bg-white border border-slate-200"
            }`}
          >
            <div className="rounded-[31px] bg-white/95 p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mt-3 flex items-start gap-3">
                    <span className={`mt-1 h-7 w-7 shrink-0 ${writtenTheme?.iconText ?? "text-slate-600"}`}>
                    {categoryMetaMap[card.category].icon}
                    </span>
                    <div>
                      <div className="mb-2">
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${writtenTheme?.badge ?? "border border-slate-200 bg-slate-50 text-slate-700"}`}>
                          {categoryMetaMap[card.category].label}
                        </span>
                      </div>
                      <h3 className="text-3xl font-bold text-slate-800">{card.revealedTitle}</h3>
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
                    writtenTheme?.previewBox ?? "border border-slate-200 bg-slate-50"
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
                    <p className={`text-sm font-semibold ${writtenTheme?.hintText ?? "text-slate-500"}`}>
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
}: {
  categoryCards: GameCard[];
  activeId: string | null;
  activeCategoryMeta: CategoryMeta;
  onOpenCard: (card: GameCard) => void;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}
    >
      {categoryCards.map((card, index) => {
        const isOpened = activeId === card.id;
        const displayTitle = getDisplayTitle(card);
        const cardTheme = categoryCardThemeMap[card.category];
        const isWritten = card.unlocked;
        const writtenTheme = writtenCardStateMap[card.category];

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onOpenCard(card)}
            className="group relative aspect-[6/5] rounded-[28px] text-left transition-transform duration-150 active:scale-[0.99] [contain:layout_paint_style]"
          >
            <div
              className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border shadow-sm ${
                isWritten ? writtenTheme.shell : cardTheme.lockedFace
              }`}
            >
              <div className="flex items-center justify-between px-4 py-2 text-xs tracking-[0.25em] text-slate-500">
                <span>{activeCategoryMeta.label.toUpperCase()}</span>
                <span>#{String(index + 1).padStart(2, "0")}</span>
              </div>

              <div className="relative flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-4">
                {isWritten ? (
                  <>
                    <img
                      src={card.imageSrc}
                      alt={displayTitle}
                      loading="lazy"
                      decoding="async"
                      className="h-24 object-contain"
                    />
                    <p className="line-clamp-2 text-center text-sm font-bold leading-5 text-slate-800">
                      {displayTitle}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full border border-slate-200 bg-white p-6 shadow-sm">
                      <Lock className={`h-10 w-10 ${cardTheme.lockedAccent}`} />
                    </div>
                    <p className="text-center text-sm font-bold text-slate-700">{card.title}</p>
                    <p className="text-xs tracking-wide text-slate-400">輸入文字後解鎖</p>
                  </>
                )}
              </div>
            </div>

            {isOpened ? (
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-2 ring-violet-300/60" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
});

function WaterBackground({ category }: { category: CategoryKey }) {
  const bg = categoryBackgroundMap[category];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(to_top,rgba(255,255,255,0.03),rgba(255,255,255,0.01),transparent)]" />
      <div className={`absolute bottom-28 left-[-20%] h-16 w-[160%] rounded-[100%] ${bg.wave1}`} />
      <div className={`absolute bottom-20 left-[-18%] h-20 w-[155%] rounded-[100%] ${bg.wave2}`} />
      <div className={`absolute bottom-12 left-[-22%] h-24 w-[165%] rounded-[100%] ${bg.wave3}`} />
      <div className={`absolute bottom-4 left-[-16%] h-28 w-[150%] rounded-[100%] ${bg.wave4}`} />
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
      (category) => unlockedCountByCategory[category] >= threshold
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

export default function LockedFlipCardsPage() {
  const [cards, setCards] = useState<GameCard[]>(createAllCards);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("water");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalReady, setIsModalReady] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [newInputValue, setNewInputValue] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const [developmentScore, setDevelopmentScore] = useState(0);
  const [conservationScore, setConservationScore] = useState(0);

  const [earnedTitles, setEarnedTitles] = useState<TitleReward[]>([]);
  const [pendingReward, setPendingReward] = useState<TitleReward | null>(null);
  const [previewCard, setPreviewCard] = useState<GameCard | null>(null);
  const [hasNewCollectedContent, setHasNewCollectedContent] = useState(false);
  const [hasNewTitleReward, setHasNewTitleReward] = useState(false);

  const rewardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryCards = useMemo(
    () => cards.filter((card) => card.category === activeCategory),
    [cards, activeCategory]
  );

  const activeCard = useMemo(
    () => cards.find((card) => card.id === activeId) ?? null,
    [cards, activeId]
  );

  const unlockedCountByCategory = useMemo(
    () =>
      CATEGORY_KEYS.reduce((counts, category) => {
        counts[category] = cards.filter(
          (card) => card.category === category && card.unlocked
        ).length;
        return counts;
      }, {} as Record<CategoryKey, number>),
    [cards]
  );

  const activeCategoryMeta = categoryMetaMap[activeCategory];
  const activeBackground = categoryBackgroundMap[activeCategory];
  const totalUnlockedCount = useMemo(
    () => CATEGORY_KEYS.reduce((sum, category) => sum + unlockedCountByCategory[category], 0),
    [unlockedCountByCategory]
  );
  const totalCardCount = cards.length;
  const isUpdateMode = activeCard?.unlocked === true;

  useEffect(() => {
    // 預先載入目前分類前幾張卡片圖片，減少第一次開卡或切換分類時的卡頓。
    categoryCards.slice(0, 12).forEach((card) => {
      const image = new Image();
      image.src = card.imageSrc;
    });
  }, [categoryCards]);

  useEffect(() => {
    const rewardChecks = getRewardChecks(unlockedCountByCategory);
    const newlyEarned = rewardChecks.filter(({ reward, isUnlocked }) => {
      const alreadyHas = earnedTitles.some((title) => title.id === reward.id);
      return isUnlocked && !alreadyHas;
    });

    if (newlyEarned.length === 0) return;

    const rewards = newlyEarned.map((item) => item.reward);
    setEarnedTitles((prev) => [...prev, ...rewards]);
    setPendingReward(rewards[0]);
    setHasNewTitleReward(true);
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

  const closeRewardCard = useCallback(() => {
    if (rewardTimerRef.current) {
      clearTimeout(rewardTimerRef.current);
      rewardTimerRef.current = null;
    }
    setPendingReward(null);
  }, []);

  const openCollectedPreview = useCallback((card: GameCard) => {
    setPreviewCard(card);
  }, []);

  const closeCollectedPreview = useCallback(() => {
    setPreviewCard(null);
  }, []);

  const openCard = useCallback((card: GameCard) => {
    setActiveId(card.id);
    setInputValue(card.content || "");
    setNewInputValue("");
    setIsUnlocking(false);

    // 讓彈窗先掛載，下一幀再顯示內容，避免圖片載入時造成版面跳動。
    setIsModalReady(false);
    requestAnimationFrame(() => setIsModalReady(true));
  }, []);

  const resetModalState = useCallback(() => {
    setActiveId(null);
    setIsModalReady(false);
    setInputValue("");
    setNewInputValue("");
    setIsUnlocking(false);
  }, []);

  const closeCard = useCallback(() => {
    if (isUnlocking) return;
    resetModalState();
  }, [isUnlocking, resetModalState]);

  const handleOpenCollectedPanel = useCallback(() => {
    setHasNewCollectedContent(false);
  }, []);

  const handleOpenTrophyPanel = useCallback(() => {
    setHasNewTitleReward(false);
  }, []);

  const updateCardContent = useCallback((cardId: string, content: string) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? {
              ...card,
              content,
              unlocked: true,
              unlockedAt: card.unlockedAt ?? Date.now(),
            }
          : card
      )
    );
  }, []);

  const unlockCard = useCallback((targetCard: GameCard, content: string) => {
    updateCardContent(targetCard.id, content);

    const effect = getBalanceEffect(targetCard.category);
    setDevelopmentScore((prev) => prev + effect.development);
    setConservationScore((prev) => prev + effect.conservation);
    setHasNewCollectedContent(true);
  }, [updateCardContent]);

  const appendCardContent = useCallback((targetCard: GameCard, addedText: string) => {
    const trimmedText = addedText.trim();
    if (!trimmedText) return;

    const nextContent = `${targetCard.content}\n—— 更新內容 ——\n${trimmedText}`;

    updateCardContent(targetCard.id, nextContent);
    setInputValue(nextContent);
    setNewInputValue("");
    setHasNewCollectedContent(true);
  }, [updateCardContent]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!activeCard || isUnlocking) return;

      const latestCard = cards.find((card) => card.id === activeCard.id);
      if (!latestCard) return;

      if (latestCard.unlocked) {
        appendCardContent(latestCard, newInputValue);
        return;
      }

      const content = inputValue.trim();
      if (!content) return;

      setIsUnlocking(true);

      // 保留「送出並解鎖」的短動畫；只有解鎖流程會在動畫後關閉彈窗。
      await new Promise((resolve) => setTimeout(resolve, 650));

      unlockCard(latestCard, content);
      resetModalState();
    },
    [
      activeCard,
      appendCardContent,
      cards,
      inputValue,
      isUnlocking,
      newInputValue,
      resetModalState,
      unlockCard,
    ]
  );

  const showMainPage = !activeCard;

  return (
    <div
      className={`relative min-h-screen overflow-hidden text-slate-800 transition-colors duration-700 ${activeBackground.pageBg}`}
    >
      <MemoizedBalanceScaleBackground
        developmentScore={developmentScore}
        conservationScore={conservationScore}
      />
      <MemoizedWaterBackground category={activeCategory} />

      {showMainPage ? (
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

      <div
        aria-hidden={activeCard ? true : undefined}
        className={`relative z-10 mx-auto max-w-7xl px-6 pb-12 pt-10 transition-[filter,opacity,transform] duration-200 ${
          activeCard ? "pointer-events-none opacity-95" : ""
        }`}
      >
        <MemoizedCategoryTabs
          activeCategory={activeCategory}
          onChange={setActiveCategory}
          unlockedCountByCategory={unlockedCountByCategory}
          totalUnlockedCount={totalUnlockedCount}
          totalCardCount={totalCardCount}
        />

        <div className="mb-6" />

        <GameCardGrid
          categoryCards={categoryCards}
          activeId={activeId}
          activeCategoryMeta={activeCategoryMeta}
          onOpenCard={openCard}
        />
      </div>

      <MemoizedTitleRewardCelebration reward={pendingReward} onClose={closeRewardCard} />
      <MemoizedCollectedCardPreview card={previewCard} onClose={closeCollectedPreview} />

      <AnimatePresence>
        {activeCard ? (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/30 p-4"
            onClick={closeCard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative mx-auto my-8 w-full max-w-5xl"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {isModalReady ? (
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-lg">
                    <div className="flex max-h-full max-w-full items-center justify-center">
                      <img
                        src={activeCard.imageSrc}
                        alt={activeCard.title}
                        loading="eager"
                        decoding="async"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <AnimatePresence>
                      {!isUpdateMode || isUnlocking ? (
                        <motion.div className="absolute inset-0 z-10">
                          <motion.div
                            className="absolute inset-0"
                            animate={
                              isUnlocking
                                ? {
                                    background: [
                                      "rgba(255,255,255,0)",
                                      "rgba(255,255,255,0.85)",
                                      "rgba(255,255,255,0)",
                                    ],
                                  }
                                : {}
                            }
                            transition={{ duration: 0.6 }}
                          />

                          <div className="absolute left-1/2 top-[3%] flex -translate-x-1/2 items-center justify-center">
                            <motion.div
                              initial={{ scale: 1, rotate: 0, opacity: 1 }}
                              animate={
                                isUnlocking
                                  ? {
                                      scale: [1, 1.6],
                                      rotate: [0, 0],
                                      opacity: [1, 0],
                                    }
                                  : {}
                              }
                              transition={{ duration: 0.9 }}
                              className={`flex h-20 w-20 items-center justify-center rounded-full shadow-[0_0_30px_rgba(56,189,248,0.35)] ${
                                writtenCardStateMap[activeCard.category].iconBg
                              }`}
                            >
                              {isUnlocking ? (
                                <Unlock
                                  className={`h-10 w-10 ${
                                    writtenCardStateMap[activeCard.category].iconText
                                  }`}
                                />
                              ) : (
                                <Lock
                                  className={`h-10 w-10 ${
                                    writtenCardStateMap[activeCard.category].iconText
                                  }`}
                                />
                              )}
                            </motion.div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <Card className="border-slate-200 bg-white/92 text-slate-800 shadow-lg">
                    <CardContent className="p-6 md:p-7">
                      <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                          <h1 className="mt-2 text-2xl font-bold">輸入卡牌資料</h1>
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
                        onClick={(event) => event.stopPropagation()}
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

                          {isUpdateMode ? (
                            <div className="mt-2 space-y-4">
                              <textarea
                                value={inputValue}
                                readOnly
                                rows={6}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4 text-base text-slate-700 outline-none"
                              />

                              <textarea
                                value={newInputValue}
                                onChange={(event) => setNewInputValue(event.target.value)}
                                placeholder="請輸入要新增的內容..."
                                rows={5}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300"
                              />
                            </div>
                          ) : (
                            <textarea
                              value={inputValue}
                              onChange={(event) => setInputValue(event.target.value)}
                              placeholder="請輸入這張卡牌要顯示的內容..."
                              rows={10}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300"
                            />
                          )}
                        </div>

                        <div className="mt-auto flex justify-end gap-3">
                          <Button
                            type="submit"
                            disabled={
                              isUnlocking ||
                              (isUpdateMode
                                ? !newInputValue.trim()
                                : !inputValue.trim())
                            }
                            className="rounded-2xl bg-sky-500 px-5 py-6 text-white hover:bg-sky-400"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {isUnlocking
                              ? "解鎖中..."
                              : isUpdateMode
                              ? "更新內容"
                              : "送出並解鎖"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex h-[520px] items-center justify-center rounded-[32px] bg-white shadow-lg">
                  <div className="text-sm font-medium text-slate-500">載入卡牌中...</div>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
