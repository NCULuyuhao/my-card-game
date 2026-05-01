import { memo, useCallback, useEffect, useMemo, useState } from "react";

type RegionState = "保育" | "開發" | "我不知道" | "";
type FinalChoice = "保育" | "開發" | "我不知道";
type MapMode = "personal" | "group" | "class";

type RegionDecision = {
  result: RegionState;
  locked: boolean;
  isTie: boolean;
  conserveCount: number;
  developCount: number;
  finalChoice?: FinalChoice;
};

type PersonalDecisionMap = Record<string, RegionState>;
type RegionDecisionValue = RegionDecision | RegionState;
type RegionDecisionMap = Record<string, RegionDecision>;
type ExternalDecisionMap = Record<string, RegionDecisionValue>;

type Region = {
  name: string;
  d: string;
  originalFill?: string;
  cx?: number;
  cy?: number;
};

type LabelPosition = {
  x: number;
  y: number;
  size: number;
  z?: number;
  vertical?: boolean;
};

type GroupMember = {
  id?: number | string;
  username?: string;
  name?: string;
  email?: string;
  isGroupLeader?: boolean;
};

type MiaoliMapProps = {
  onBack?: () => void;

  /**
   * personal：個人自由決策
   * group：根據同組學生個人選擇統計，多數決鎖定，平手開放決策
   * class：根據六組小組結果統計，多數決鎖定，平手開放決策
   */
  mode?: MapMode;

  /** 小組模式使用：同一組內每位學生的個人地圖選擇 */
  personalData?: PersonalDecisionMap[];

  /** 全班模式使用：六個小組的小組地圖結果 */
  groupData?: ExternalDecisionMap[];

  /** 小組平手後存進資料庫的最終決策 */
  groupFinalChoices?: PersonalDecisionMap;

  /** 全班平手後存進資料庫的最終決策 */
  classFinalChoices?: PersonalDecisionMap;

  /** 外部傳入初始值，通常可接資料庫讀取結果 */
  initialState?: PersonalDecisionMap | RegionDecisionMap;

  /** 使用者切換個人 / 小組 / 全班地圖時回傳，方便 App.tsx 同步目前模式 */
  onModeChange?: (mode: MapMode) => void;

  /** 目前登入者的小組成員，通常由 /api/my-group 或 /api/me 取得 */
  groupMembers?: GroupMember[];

  /** 目前登入者的小組名稱，通常由 /api/my-group 或 /api/me 取得 */
  groupName?: string | null;

  /** 目前登入者是否為小組組長；只有組長可以決定小組平手地區 */
  isGroupLeader?: boolean;

  /** 目前登入者是否為教師；只有教師可以決定全班平手地區 */
  isTeacher?: boolean;

  /** 每次地圖結果改變時回傳，方便 App.tsx 或資料庫同步 */
  onDecisionsChange?: (payload: {
    mode: MapMode;
    personalState: PersonalDecisionMap;
    decisionState: RegionDecisionMap;
  }) => void;

  /** 小組/全班平手後，手動決策需要寫回資料庫 */
  onManualDecisionChange?: (payload: {
    mode: "group" | "class";
    districtName: string;
    choice: FinalChoice | "";
  }) => void;
};

export const regions: Region[] = [
  {
    name: "泰安鄉",
    d: "M355.9552220197802,255.3540125028485L355.2420663833691,262.89546436782257L348.00863064252917,265.79180198460926L347.80487188926054,274.1409640422007L341.352511369274,286.94986292430076L333.1682014465405,289.40182091729184L328.5836294981127,278.68042218890696L310.652859210968,293.10568736103596L307.8341964574938,300.2781372724694L293.537123936876,300.9040633287368L283.2812666893078,317.72383072677985L276.42138866277674,317.5413112560327L264.77317993457837,325.3370968738054L262.09035634994507,321.58270786915637L248.1668415436434,329.5605556848968L246.50281172532414,336.12989915376966L237.60534616616496,337.17259821609696L228.47016206153785,328.98701376372264L221.44048507396656,316.9937501275672L197.8384294876596,315.19459201683276L184.8657888632515,310.6313125459874L175.01744912219874,314.8034648670291L177.90403146010067,333.4448811450202L171.21395239462436,339.04941934737326L173.59113784936926,330.9422519724412L167.58025462811202,319.4968534570671L170.36495758937235,298.2438407771133L173.18362034283928,296.6528773572645L175.5608057975769,275.7845933855642L169.85556070621533,267.957457171191L173.0138213817845,256.24128240663777L168.19153088789608,250.08236390001548L177.6323531224116,230.3755645590245L177.22483561589615,221.96919591064943L192.26902356513892,215.54628791765754L200.7589716177681,215.52017738389623L218.1124254373426,218.3661706685889L225.34586117818253,213.0657455620767L233.08869380216493,223.58788858464504L256.96242772616097,220.27214092286886L270.6482239869947,221.44702934015368L284.4019398322489,213.4835270122785L295.67659084613115,212.38684561169248L308.5473520939122,217.81786865266076L326.4441625888576,212.0735050458661L334.05115604400635,211.15958738803783L334.6284725115911,220.35046740467806L343.0844607720137,226.45967451870092L348.2463491879971,236.7449646756504L357.8909301757885,245.41063549311184Z",
    originalFill: "#d97fa7",
    cx: 227.92680538618154,
    cy: 110.61670900597095,
  },
  {
    name: "苑裡鎮",
    d: "M85.80507498521183,274.74102346608015L76.63593108837085,290.6799367785843L73.07015290627169,304.137929720222L69.84397264628205,303.12084191531903L64.03684817827161,301.9472615787399L55.92045783996582,295.89650561890267L40.94418947512895,276.12375041414816L33.06551768229838,271.9233105477342L28.24322718840267,261.32982883162185L18.83636474609375,254.04918430619546L31.29960848735209,240.05996590835275L48.8228612679668,246.95051185428747L66.07443571090698,257.51997602044867L75.31149919216114,272.05376260878984Z",
    originalFill: "#972895",
    cx: 52.32071986565279,
    cy: 272.0989478142873,
  },
  {
    name: "通霄鎮",
    d: "M74.49646417910844,184.41590454864672L89.40481295952486,222.02141236262287L93.6837467780424,226.74684691072252L87.29930584246904,239.0680915139801L87.33326563469018,260.964509062509L85.80507498521183,274.74102346608015L75.31149919216114,272.05376260878984L66.07443571090698,257.51997602044867L48.8228612679668,246.95051185428747L31.29960848735209,240.05996590835275L41.86110386481596,228.8614452646616L43.49117389091407,219.43665322918605L52.0830013201703,206.90319170698967L62.57657711322099,176.94472623150796Z",
    originalFill: "#8c1b93",
    cx: 62.49167763269725,
    cy: 225.8428748490085,
  },
  {
    name: "竹南鎮",
    d: "M184.1526332268404,95.28649697099718L178.85490564199426,100.22937659031231L158.5809096923258,101.56311179994736L153.82653878285782,133.27786876050595L147.5439772239115,122.61196096149979L134.33361805402092,122.8733989860375L125.97950917023991,118.29809771047803L142.82356610664283,101.48465746634974L145.54034948349727,90.31712495198371L152.5360666788547,80.6127900842057L164.55783312136919,83.49022166376017L169.1084452775831,79.2263504373932L173.2854997194736,92.72338972187572Z",
    originalFill: "#992a95",
    cx: 155.06607119854016,
    cy: 106.25210959894957,
  },
  {
    name: "後龍鎮",
    d: "M134.33361805402092,122.8733989860375L123.16084641675843,138.08747205527652L134.12985930076684,159.25640215484418L136.2353664178081,169.0286215959095L116.91224465003324,161.7126448224808L112.7012304159216,168.00965457971506L104.65275966205081,168.14029217295683L101.66429794752185,179.00851983424764L96.74012807699182,171.98093276284635L83.52976890710852,173.6268596332411L74.49646417910844,184.41590454864672L62.57657711322099,176.94472623150796L68.55350054227165,160.58905473294544L89.77837067384098,142.8444841573455L90.69528506351344,136.9896558446817L107.06390490899503,122.14137014648259L125.97950917023991,118.29809771047803Z",
    originalFill: "#f2b9c6",
    cx: 99.40597176551455,
    cy: 151.35600112956237,
  },
  {
    name: "頭份市",
    d: "M184.76390948662447,95.60034061273109L194.98580694199336,100.38628788764436L205.07186522849952,96.01879668900256L200.0797757735636,112.46743897099077L206.76985483902536,118.27195230363031L192.77842044829595,115.21287472681797L187.07317535694892,127.68369074996008L181.36793026556552,124.67729571550262L171.62146990115434,129.90572888596034L172.7421430441027,136.8589623347052L164.21823519926693,146.34670083937453L154.53969441926893,141.48536958808654L153.82653878285782,133.27786876050595L158.5809096923258,101.56311179994736L178.85490564199426,100.22937659031231L184.1526332268404,95.28649697099718Z",
    originalFill: "#eba9bc",
    cx: 180.15420200567868,
    cy: 120.81659890518586,
  },
  {
    name: "獅潭鄉",
    d: "M205.4793827350295,170.90975404005803L195.83480174724536,189.45721134638188L191.92942564304394,202.35928091512142L200.7589716177681,215.52017738389623L192.26902356513892,215.54628791765754L177.22483561589615,221.96919591064943L177.6323531224116,230.3755645590245L168.19153088789608,250.08236390001548L158.95446740664192,250.8392080564845L152.33230792558606,244.15783083948554L147.34021847064287,240.08606768463324L151.721031665802,224.71050923738767L169.68576174516784,199.7477100003889L167.8519329658011,194.8899396336219L176.20604184956755,185.5913699195553L185.5110249152567,167.22582410171526L191.96338543525053,160.43227334235962Z",
    originalFill: "#eeafbf",
    cx: 176.4098006028357,
    cy: 205.63574069942206,
  },
  {
    name: "造橋鄉",
    d: "M153.82653878285782,133.27786876050595L154.53969441926893,141.48536958808654L164.21823519926693,146.34670083937453L171.72334927778138,144.59561357173698L176.10416247294052,160.48453384339336L180.99437255125667,156.61715546744017L191.96338543525053,160.43227334235962L185.5110249152567,167.22582410171526L168.5650886022122,164.16880466169823L161.77313016011612,159.1518793526775L139.97094356096204,161.163916944246L134.12985930076684,159.25640215484418L123.16084641675843,138.08747205527652L134.33361805402092,122.8733989860375L147.5439772239115,122.61196096149979Z",
    originalFill: "#fde2e4",
    cx: 157.56211592600755,
    cy: 144.91889253187637,
  },
  {
    name: "西湖鄉",
    d: "M101.66429794752185,179.00851983424764L108.93169348056836,192.35645801365354L104.21128236329969,199.61712900286693L106.48658844141755,208.0521818462621L93.6837467780424,226.74684691072252L89.40481295952486,222.02141236262287L74.49646417910844,184.41590454864672L83.52976890710852,173.6268596332411L96.74012807699182,171.98093276284635Z",
    originalFill: "#e396b2",
    cx: 91.7140788298384,
    cy: 199.36388983678444,
  },
  {
    name: "三義鄉",
    d: "M125.09655457276676,283.793498605688L110.66364288330806,302.7296505514005L101.32470002541231,306.38068900762846L100.37382584351872,312.7174182836061L101.29074023319117,323.59028691864296L94.29502303784102,320.5919343937803L73.07015290627169,304.137929720222L76.63593108837085,290.6799367785843L85.80507498521183,274.74102346608015L87.33326563469018,260.964509062509L99.15127332393604,255.30181982104295L106.28282968814892,257.38949810228223L105.67155342835031,266.15709770447756L113.95774272772542,272.18421443788793L120.10446511782357,283.58480857969334Z",
    originalFill: "#fee4e6",
    cx: 99.08335373951923,
    cy: 289.44605336984296,
  },
  {
    name: "頭屋鄉",
    d: "M185.5110249152567,167.22582410171526L176.20604184956755,185.5913699195553L167.8519329658011,194.8899396336219L145.0988721847607,196.40476292469248L135.08073348264588,184.10244391734523L136.2353664178081,169.0286215959095L134.12985930076684,159.25640215484418L139.97094356096204,161.163916944246L161.77313016011612,159.1518793526775L168.5650886022122,164.16880466169823Z",
    originalFill: "#932494",
    cx: 160.2953791990087,
    cy: 177.778321138685,
  },
  {
    name: "銅鑼鄉",
    d: "M119.86674657234107,203.69114612199883L119.79882698793517,234.16072572240773L136.81268288538558,250.31724740598293L136.91456226201262,256.89367989493076L134.6392561839093,273.8278876121931L125.09655457276676,283.793498605688L120.10446511782357,283.58480857969334L113.95774272772542,272.18421443788793L105.67155342835031,266.15709770447756L106.28282968814892,257.38949810228223L99.15127332393604,255.30181982104295L87.33326563469018,260.964509062509L87.29930584246904,239.0680915139801L93.6837467780424,226.74684691072252L106.48658844141755,208.0521818462621L118.20271675403637,199.7999423340152Z",
    originalFill: "#fcdde1",
    cx: 112.10693405224082,
    cy: 241.74672046985157,
  },
  {
    name: "公館鄉",
    d: "M167.8519329658011,194.8899396336219L169.68576174516784,199.7477100003889L151.721031665802,224.71050923738767L147.34021847064287,240.08606768463324L152.33230792558606,244.15783083948554L136.91456226201262,256.89367989493076L136.81268288538558,250.31724740598293L119.79882698793517,234.16072572240773L119.86674657234107,203.69114612199883L135.08073348264588,184.10244391734523L145.0988721847607,196.40476292469248Z",
    originalFill: "#c6629f",
    cx: 144.7422943665515,
    cy: 220.498061906138,
  },
  {
    name: "大湖鄉",
    d: "M168.19153088789608,250.08236390001548L173.0138213817845,256.24128240663777L169.85556070621533,267.957457171191L175.5608057975769,275.7845933855642L173.18362034283928,296.6528773572645L170.36495758937235,298.2438407771133L140.71805898960156,299.70436703857195L134.60529639171,308.4408378441585L100.37382584351872,312.7174182836061L101.32470002541231,306.38068900762846L110.66364288330806,302.7296505514005L125.09655457276676,283.793498605688L134.6392561839093,273.8278876121931L136.91456226201262,256.89367989493076L152.33230792558606,244.15783083948554L158.95446740664192,250.8392080564845Z",
    originalFill: "#e294b1",
    cx: 137.9673158205478,
    cy: 278.4376245618208,
  },
  {
    name: "卓蘭鎮",
    d: "M170.36495758937235,298.2438407771133L167.58025462811202,319.4968534570671L173.59113784936926,330.9422519724412L171.21395239462436,339.04941934737326L169.1084452775831,339.8314140448874L152.73982543211605,338.5020181218115L143.366922782021,341.8645614278412L130.86971924855607,341.0825883024554L115.99533026034624,326.27566421089796L101.29074023319117,323.59028691864296L100.37382584351872,312.7174182836061L134.60529639171,308.4408378441585L140.71805898960156,299.70436703857195Z",
    originalFill: "#ae4198",
    cx: 136.982481846444,
    cy: 320.78446423320656,
  },
  {
    name: "苗栗市",
    d: "M136.2353664178081,169.0286215959095L135.08073348264588,184.10244391734523L119.86674657234107,203.69114612199883L118.20271675403637,199.7999423340152L106.48658844141755,208.0521818462621L104.21128236329969,199.61712900286693L108.93169348056836,192.35645801365354L101.66429794752185,179.00851983424764L104.65275966205081,168.14029217295683L112.7012304159216,168.00965457971506L116.91224465003324,161.7126448224808Z",
    originalFill: "#e192b0",
    cx: 118.2233243905539,
    cy: 184.88241333437196,
  },
  {
    name: "南庄鄉",
    d: "M223.2743138533333,135.31676117737516L223.2743138533333,135.31676117737516L232.34157837353996,137.14648774658235L241.74844081585616,145.30128067457372L247.0801281929089,152.20077623798534L256.7926287650989,153.03703428778317L262.8714315707766,167.12131273422892L256.2832318819419,182.48287586230072L249.72899198532104,185.6436123853182L261.3772007135194,195.22947172524255L254.3814835181547,205.96309542397648L256.96242772616097,220.27214092286886L233.08869380216493,223.58788858464504L225.34586117818253,213.0657455620767L218.1124254373426,218.3661706685889L200.7589716177681,215.52017738389623L191.92942564304394,202.35928091512142L195.83480174724536,189.45721134638188L205.4793827350295,170.90975404005803L210.40355260555225,157.5840193171116L207.9244877741803,149.11699164055426L198.21198720199027,151.36450858074932L191.55586792872782,134.06206491812918L212.33926076156058,138.84547833840043Z",
    originalFill: "#f2bbc7",
    cx: 226.4661497492522,
    cy: 178.8249767513871,
  },
  {
    name: "三灣鄉",
    d: "M205.4793827350295,170.90975404005803L191.96338543525053,160.43227334235962L180.99437255125667,156.61715546744017L176.10416247294052,160.48453384339336L171.72334927778138,144.59561357173698L164.21823519926693,146.34670083937453L172.7421430441027,136.8589623347052L171.62146990115434,129.90572888596034L181.36793026556552,124.67729571550262L187.07317535694892,127.68369074996008L192.77842044829595,115.21287472681797L206.76985483902536,118.27195230363031L223.2403540611267,135.0815072780133L223.2403540611267,135.1076466377599L223.2403540611267,135.21220398275L223.2403540611267,135.26448259885547L223.2403540611267,135.31676117737516L223.2743138533333,135.31676117737516L212.33926076156058,138.84547833840043L191.55586792872782,134.06206491812918L198.21198720199027,151.36450858074932L207.9244877741803,149.11699164055426L210.40355260555225,157.5840193171116Z",
    originalFill: "#de89ac",
    cx: 193.74629452630012,
    cy: 143.06131438391648,
  },
];

export const labelPositions: Record<string, LabelPosition> = {
  竹南鎮: { x: 153, y: 94, size: 9.0 },
  頭份市: { x: 183, y: 110, size: 8.9 },
  三灣鄉: { x: 209, y: 126, size: 8.9 },
  造橋鄉: { x: 153, y: 152, size: 9.2, z: 20 },
  後龍鎮: { x: 104, y: 152, size: 9.6 },
  苗栗市: { x: 121, y: 186, size: 9.4 },
  頭屋鄉: { x: 161, y: 181, size: 9.4 },
  南庄鄉: { x: 228, y: 187, size: 9.8 },
  西湖鄉: { x: 91, y: 192, size: 8.9, vertical: true },
  通霄鎮: { x: 71, y: 228, size: 9.6 },
  公館鄉: { x: 136, y: 222, size: 9.6 },
  獅潭鄉: { x: 176, y: 216, size: 8.9 },
  銅鑼鄉: { x: 108, y: 248, size: 9.4 },
  苑裡鎮: { x: 58, y: 278, size: 9.4 },
  三義鄉: { x: 97, y: 294, size: 8.9 },
  大湖鄉: { x: 149, y: 286, size: 10.0 },
  卓蘭鎮: { x: 142, y: 319, size: 9.2 },
  泰安鄉: { x: 253, y: 278, size: 10.2 },
};

const styles = `
:root {
  --app-bg:#f3efe6;
  --paper:#ffffffb8;
  --paper-strong:#fffaf0;
  --panel:#ffffffb8;
  --text:#292524;
  --muted:#756957;
  --line:#d7c8ad;
  --grid:rgba(120,92,58,.07);
  --white:#ffffff;
  --idle:#fff8e8;
  --idle-stroke:#c9b995;
  --map-border:#8a7550;
  --map-border-strong:#5d4a2f;
  --hover:#9fba85;
  --conserve:#a9df8f;
  --conserve-dark:#4f8f45;
  --develop:#ffb08f;
  --develop-dark:#b45c46;
  --shadow:0 22px 70px rgba(45,41,34,.10);
  --piece-shadow:0 10px 24px rgba(45,41,34,.12);
  --unknown:#d5d8de;
  --unknown-dark:#7c8794;
  --tie:#c5b6ff;
  --tie-dark:#7565c8;
  --active-gold:#ffd45a;
}
* { box-sizing:border-box; }
.miaoli-page {
  margin:0;
  min-height:100vh;
  font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
  color:var(--text);
  background:
    radial-gradient(circle at top left, rgba(255,255,255,.9), transparent 35%),
    radial-gradient(circle at 85% 15%, rgba(173,163,138,.22), transparent 30%),
    linear-gradient(135deg, rgba(68,64,60,.06) 0 1px, transparent 1px 32px),
    var(--app-bg);
  overflow:hidden;
  position:relative;
}
.miaoli-page::before {
  content:"";
  pointer-events:none;
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 60px 60px, rgba(214,211,209,.22), transparent 260px),
    radial-gradient(circle at 100% 100%, rgba(182,193,173,.25), transparent 360px);
}
.back-btn {
  flex:0 0 auto;
  padding:10px 16px;
  border-radius:14px;
  border:1px solid #d6c8ae;
  background:rgba(255,250,240,.92);
  color:#4f4333;
  font-weight:900;
  letter-spacing:.08em;
  cursor:pointer;
  box-shadow:0 10px 24px rgba(45,41,34,.12);
  transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
}
.back-btn:hover {
  transform:translateY(-1px);
  background:#fffaf0;
  box-shadow:0 14px 30px rgba(45,41,34,.16);
}
.wrap {
  position:relative;
  z-index:1;
  max-width:1440px;
  margin:0 auto;
  padding:24px;
  display:grid;
  grid-template-columns:minmax(760px,1.25fr) minmax(320px,.75fr);
  gap:20px;
}
.panel {
  background:var(--panel);
  backdrop-filter: blur(18px);
  border:1px solid rgba(214,200,174,.9);
  border-radius:34px;
  box-shadow:var(--shadow);
  overflow:hidden;
}
.map-panel {
  padding:22px;
  position:relative;
}
.map-panel::before,
.side::before {
  content:"";
  pointer-events:none;
  position:absolute;
  inset:0;
  opacity:.7;
  background:
    linear-gradient(90deg, var(--grid) 1px, transparent 1px),
    linear-gradient(rgba(120,92,58,.05) 1px, transparent 1px);
  background-size:28px 28px;
}

.header {
  position:relative;
  z-index:1;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
  margin-bottom:16px;
  border-bottom:1px solid #c5bba3;
  padding-bottom:16px;
}
.title-row {
  display:flex;
  align-items:center;
  gap:14px;
  flex-wrap:wrap;
}
h1 {
  margin:0 0 8px 0;
  font-family:ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  font-size:34px;
  line-height:1.15;
  letter-spacing:.12em;
  font-weight:650;
  color:#292524;
}
.sub { margin:0; font-size:14px; line-height:1.8; color:var(--muted); }
.chips { display:flex; flex-wrap:wrap; gap:8px; }
.chip {
  background:rgba(255,250,240,.88);
  border:1px solid #c8b48f;
  border-radius:999px;
  padding:8px 12px;
  font-size:13px;
  font-weight:800;
  color:#6d5e49;
  white-space:nowrap;
}
.mode-switch {
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px;
  margin-bottom:16px;
  padding:10px;
  border:1px solid #d7c8ad;
  border-radius:22px;
  background:rgba(255,250,240,.72);
}
.mode-btn {
  appearance:none;
  border:1px solid #c8b48f;
  border-radius:16px;
  background:#fffdf6;
  color:#6d5e49;
  padding:12px 10px;
  font-size:14px;
  font-weight:900;
  letter-spacing:.04em;
  cursor:pointer;
  box-shadow:0 8px 18px rgba(45,41,34,.06);
  transition:transform .16s ease, box-shadow .16s ease, background .16s ease;
}
.mode-btn:hover {
  transform:translateY(-1px);
  box-shadow:0 12px 22px rgba(45,41,34,.1);
}
.mode-btn.active {
  background:#4f4333;
  border-color:#4f4333;
  color:#fffaf0;
}
.stage {
  position:relative;
  z-index:1;
  border:1px solid #c7b594;
  border-radius:30px;
  overflow:hidden;
  min-height:760px;
  background:
    radial-gradient(circle at 24% 18%, rgba(255,255,255,.55), transparent 32%),
    radial-gradient(circle at 82% 78%, rgba(111,123,98,.18), transparent 34%),
    linear-gradient(180deg, rgba(255,250,240,.92), rgba(232,225,208,.82));
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.55);
}
.stage svg {
  display:block;
  width:100%;
  height:100%;
}
.piece {
  cursor:pointer;
  transition:transform .18s ease, filter .18s ease;
}
.piece:hover {
  filter:drop-shadow(0 10px 18px rgba(79,67,51,.22));
  transform:translateY(-3px);
}
.piece.locked {
  cursor:not-allowed;
}
.piece.locked:hover {
  transform:none;
  filter:drop-shadow(0 4px 10px rgba(79,67,51,.12));
}
.piece.active {
  filter:
    drop-shadow(0 0 5px rgba(255, 212, 90, .72))
    drop-shadow(0 0 12px rgba(255, 212, 90, .38))
    drop-shadow(0 14px 24px rgba(79,67,51,.24));
}
.piece-shape {
  fill:var(--idle);
  stroke:var(--idle-stroke);
  stroke-width:2.4;
  stroke-linejoin:round;
  stroke-linecap:round;
  vector-effect:non-scaling-stroke;
  transition:fill .2s ease, stroke .2s ease, stroke-width .2s ease, filter .2s ease;
}

.piece.active .piece-shape {
  stroke:var(--active-gold);
  stroke-width:4.5;
  filter:drop-shadow(0 0 6px rgba(255,212,90,.34));
}

.piece.active .label {
  fill:#24301f;
  stroke:#fff7d6;
  stroke-width:4px;
}

.piece[data-state="保育"] .piece-shape {
  fill:var(--conserve);
  stroke:var(--conserve-dark);
  stroke-width:3.1;
  filter:drop-shadow(0 1px 0 rgba(255,255,255,.34));
  stroke-linejoin:round;
  stroke-linecap:round;
  vector-effect:non-scaling-stroke;
}

.piece[data-state="開發"] .piece-shape {
  fill:var(--develop);
  stroke:var(--develop-dark);
  stroke-width:3.1;
  filter:drop-shadow(0 1px 0 rgba(255,255,255,.30));
  stroke-linejoin:round;
  stroke-linecap:round;
  vector-effect:non-scaling-stroke;
}

.piece[data-state="我不知道"] .piece-shape {
  fill:var(--unknown);
  stroke:var(--unknown-dark);
  stroke-width:3.1;
  filter:drop-shadow(0 1px 0 rgba(255,255,255,.30));
  stroke-linejoin:round;
  stroke-linecap:round;
  vector-effect:non-scaling-stroke;
}

.piece.tie .piece-shape {
  fill:var(--tie);
  stroke:var(--tie-dark);
  stroke-width:3.2;
  filter:drop-shadow(0 1px 0 rgba(255,255,255,.30));
  stroke-linejoin:round;
  stroke-linecap:round;
  vector-effect:non-scaling-stroke;
}

.piece.active:not([data-state="保育"]):not([data-state="開發"]):not([data-state="我不知道"]) .piece-shape {
  fill:#fff0a8;
  stroke:var(--active-gold);
  stroke-width:4.2;
}
.piece.tie:not([data-state="保育"]):not([data-state="開發"]):not([data-state="我不知道"]) .piece-shape {
  fill:var(--tie);
  stroke:var(--tie-dark);
  stroke-width:3.2;
}
.piece.tie:not([data-state="保育"]):not([data-state="開發"]) .label {
  fill:#282052;
}
.label {
  pointer-events:none;
  text-anchor:middle;
  paint-order:stroke;
  stroke:rgba(255,255,255,.95);
  stroke-width:2.6px;
  stroke-linejoin:round;
  font-weight:900;
  fill:#20304a;
  letter-spacing:.03em;
}
.piece[data-state="保育"] .label,
.piece[data-state="開發"] .label,
.piece[data-state="我不知道"] .label {
  fill:#20304a;
  stroke:rgba(255,255,255,.95);
  stroke-width:2.6px;
}
.side {
  padding:20px;
  display:flex;
  flex-direction:column;
  gap:16px;
  position:relative;
}
.card {
  position:relative;
  z-index:1;
  background:rgba(255,250,240,.88);
  border:1px solid #d7c8ad;
  border-radius:24px;
  padding:18px;
  box-shadow:0 10px 24px rgba(45,41,34,.07);
}
.card h2,.card h3 {
  margin:0 0 12px 0;
  font-family:ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  font-size:22px;
  letter-spacing:.08em;
  color:#332c24;
}
.meta {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
}
.stat {
  border:1px solid #c8b48f;
  background:#fffdf6;
  border-radius:18px;
  padding:12px;
  color:#6d5e49;
}
.stat strong {
  display:block;
  font-size:28px;
  margin-top:4px;
  color:#2f2a24;
}
.legend {
  display:grid;
  gap:8px;
  color:var(--muted);
  font-size:14px;
}
.legend-item {
  display:flex;
  align-items:center;
  gap:10px;
}
.swatch {
  width:16px;
  height:16px;
  border-radius:5px;
  border:1px solid rgba(61,51,35,.32);
}
.member-list {
  display:grid;
  gap:8px;
}
.member-pill {
  border:1px solid #d8c7a6;
  background:#fffdf6;
  border-radius:14px;
  padding:9px 10px;
  font-size:13px;
  font-weight:800;
  color:#4f4638;
}
.member-pill small {
  display:block;
  margin-top:2px;
  font-size:11px;
  font-weight:700;
  color:#8a7a62;
}
.empty-members {
  border:1px dashed #cdbb9a;
  border-radius:16px;
  padding:12px;
  color:#8a7a62;
  font-size:13px;
  font-weight:800;
  background:#fffdf6;
}
.selected-name {
  font-family:ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  font-size:28px;
  margin:4px 0 2px;
  font-weight:700;
  color:#2f2a24;
}
.selected-state {
  font-size:14px;
  color:var(--muted);
  margin-bottom:12px;
}
.actions {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
}
.map-btn {
  appearance:none;
  border:1px solid transparent;
  cursor:pointer;
  border-radius:14px;
  padding:12px 14px;
  font-weight:900;
  font-size:14px;
  box-shadow:0 8px 18px rgba(45,41,34,.08);
  transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
}
.map-btn:hover {
  transform:translateY(-1px);
  box-shadow:0 12px 22px rgba(45,41,34,.12);
}
.map-btn:disabled {
  opacity:.45;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}
.btn-conserve {
  border-color:rgba(66,93,60,.28);
  background:rgba(111,143,101,.18);
  color:#425d3c;
}
.btn-develop {
  border-color:rgba(124,63,52,.25);
  background:rgba(185,106,85,.16);
  color:#7c3f34;
}
.btn-reset {
  border-color:#d7c8ad;
  background:#fffdf6;
  color:#6d5e49;
}
.btn-clearall {
  border-color:#c8b48f;
  background:#efe5d1;
  color:#4f4333;
}
.note {
  font-size:13px;
  color:var(--muted);
  line-height:1.75;
  margin:0;
}
.vote-box {
  margin:12px 0;
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
}
.vote-pill {
  border:1px solid #d7c8ad;
  background:#fffdf6;
  border-radius:16px;
  padding:10px 12px;
  font-size:13px;
  color:#6d5e49;
}
.vote-pill strong {
  display:block;
  font-size:22px;
  color:#2f2a24;
  margin-top:2px;
}
.lock-info {
  border-radius:16px;
  border:1px solid #d7c8ad;
  background:rgba(255,253,246,.76);
  padding:12px;
  font-size:13px;
  line-height:1.7;
  color:#6d5e49;
  margin-bottom:12px;
}

.compact-card {
  padding: 14px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.card-title-row h3 {
  margin: 0;
}

.group-name {
  font-size: 12px;
  font-weight: 800;
  color: #7a6a52;
  background: #fff7df;
  border: 1px solid #e2cfaa;
  border-radius: 999px;
  padding: 4px 8px;
  white-space: nowrap;
}

.btn-unknown {
  background:rgba(154,160,166,.18);
  border:2px solid rgba(95,102,109,.28);
  border-radius:16px;
  color:#5f666d;
  font-weight:900;
  padding: 14px 0;
  box-shadow: none;
  transition: all 0.15s ease;
}

.btn-unknown:hover:not(:disabled) {
  background:rgba(154,160,166,.28);
  transform: translateY(-1px);
}

.member-avatar-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #ddc9a7;
  background: #fffaf0;
  border-radius: 999px;
  padding: 4px 8px 4px 4px;
  max-width: 120px;
}

.avatar-circle {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #8fb66a;
  color: #fffdf6;
  font-size: 13px;
  font-weight: 900;
  flex: 0 0 auto;
}

.avatar-name {
  font-size: 12px;
  font-weight: 800;
  color: #4f4333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-avatar.leader {
  border-color: #f1b84b;
  background: #fff3cf;
}

.member-avatar.leader .avatar-circle {
  background: #d99122;
}

.leader-crown {
  font-size: 12px;
  line-height: 1;
}

.legend-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  overflow-x: visible;
  padding-bottom: 4px;
}

.legend-inline .legend-item {
  flex: 0 1 auto;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: break-word;
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 999px;
  background: #fffaf0;
  border: 1px solid #e2cfaa;
}

.legend-inline .swatch {
  width: 14px;
  height: 14px;
}

@media (max-width: 1120px) {
  .wrap {
    grid-template-columns:1fr;
  }

  .stage {
    min-height:auto;
  }
}
  
`;

function isRegionDecision(value: unknown): value is RegionDecision {
  return Boolean(
    value &&
    typeof value === "object" &&
    "result" in value &&
    "locked" in value &&
    "isTie" in value,
  );
}

function normalizePersonalState(
  value?: PersonalDecisionMap | RegionDecisionMap,
) {
  if (!value) return {};

  return Object.fromEntries(
    Object.entries(value).map(([name, decision]) => [
      name,
      isRegionDecision(decision) ? decision.result : decision,
    ]),
  ) as PersonalDecisionMap;
}

function arePersonalStatesSame(
  a: PersonalDecisionMap,
  b: PersonalDecisionMap,
) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => a[key] === b[key]);
}

function areDecisionStatesSame(
  a: RegionDecisionMap,
  b: RegionDecisionMap,
) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => {
    const left = a[key];
    const right = b[key];

    return (
      left?.result === right?.result &&
      left?.locked === right?.locked &&
      left?.isTie === right?.isTie &&
      left?.conserveCount === right?.conserveCount &&
      left?.developCount === right?.developCount &&
      left?.finalChoice === right?.finalChoice
    );
  });
}

function createPersonalSignature(value?: PersonalDecisionMap | RegionDecisionMap) {
  if (!value) return "";

  return regions
    .map((region) => {
      const decision = value[region.name];
      const result = isRegionDecision(decision) ? decision.result : decision || "";

      return `${region.name}:${result}`;
    })
    .join("|");
}

function createGroupDataSignature(value?: PersonalDecisionMap[]) {
  if (!value?.length) return "";

  return value.map((item) => createPersonalSignature(item)).join("||");
}

function createExternalDataSignature(value?: ExternalDecisionMap[]) {
  if (!value?.length) return "";

  return value
    .map((item) =>
      regions
        .map((region) => `${region.name}:${getDecisionResult(item[region.name])}`)
        .join("|"),
    )
    .join("||");
}

function normalizeDecisionState(
  value?: PersonalDecisionMap | RegionDecisionMap,
) {
  if (!value) return {};

  return Object.fromEntries(
    Object.entries(value).map(([name, decision]) => {
      if (isRegionDecision(decision)) return [name, decision];

      return [
        name,
        {
          result: decision,
          locked: false,
          isTie: false,
          conserveCount: decision === "保育" ? 1 : 0,
          developCount: decision === "開發" ? 1 : 0,
        },
      ];
    }),
  ) as RegionDecisionMap;
}

function resolveVote(choices: RegionState[]): RegionDecision {
  const conserveCount = choices.filter((choice) => choice === "保育").length;
  const developCount = choices.filter((choice) => choice === "開發").length;
  const unknownCount = choices.filter((choice) => choice === "我不知道").length;
  const knownVotes = conserveCount + developCount;

  if (conserveCount > developCount) {
    return {
      result: "保育",
      locked: true,
      isTie: false,
      conserveCount,
      developCount,
    };
  }

  if (developCount > conserveCount) {
    return {
      result: "開發",
      locked: true,
      isTie: false,
      conserveCount,
      developCount,
    };
  }

  if (knownVotes === 0 && unknownCount === choices.length && choices.length > 0) {
    return {
      result: "我不知道",
      locked: true,
      isTie: false,
      conserveCount,
      developCount,
    };
  }

  return {
    result: "",
    locked: false,
    isTie: knownVotes > 0 && conserveCount === developCount,
    conserveCount,
    developCount,
  };
}

function getDecisionResult(decision?: RegionDecision | RegionState): RegionState {
  if (
    decision === "保育" ||
    decision === "開發" ||
    decision === "我不知道" ||
    decision === ""
  ) {
    return decision;
  }

  return decision?.finalChoice || decision?.result || "";
}

function buildGroupState(
  personalData: PersonalDecisionMap[] | undefined,
  manualState: RegionDecisionMap,
) {
  const next: RegionDecisionMap = {};

  regions.forEach((region) => {
    const votes =
      personalData?.map((student) => student[region.name] || "") || [];
    const resolved = resolveVote(votes);
    const manualChoice =
      manualState[region.name]?.finalChoice || manualState[region.name]?.result;

    next[region.name] =
      resolved.isTie && manualChoice
        ? { ...resolved, result: manualChoice, finalChoice: manualChoice }
        : resolved;
  });

  return next;
}

function buildClassState(
  groupData: ExternalDecisionMap[] | undefined,
  manualState: RegionDecisionMap,
) {
  const next: RegionDecisionMap = {};

  regions.forEach((region) => {
    const votes =
      groupData?.map((group) => getDecisionResult(group[region.name])) || [];
    const resolved = resolveVote(votes);
    const manualChoice =
      manualState[region.name]?.finalChoice || manualState[region.name]?.result;

    next[region.name] =
      resolved.isTie && manualChoice
        ? { ...resolved, result: manualChoice, finalChoice: manualChoice }
        : resolved;
  });

  return next;
}

function choicesToManualDecisionState(
  choices?: PersonalDecisionMap,
): RegionDecisionMap {
  const next: RegionDecisionMap = {};

  Object.entries(choices || {}).forEach(([name, choice]) => {
    if (choice !== "保育" && choice !== "開發") return;

    next[name] = {
      result: choice,
      locked: false,
      isTie: true,
      conserveCount: 0,
      developCount: 0,
      finalChoice: choice,
    };
  });

  return next;
}

function getModeText(mode: MapMode) {
  if (mode === "group") return "繪製小組地圖";
  if (mode === "class") return "繪製全班地圖";
  return "繪製個人地圖";
}

type MapBoardProps = {
  activeMode: MapMode;
  visibleState: PersonalDecisionMap;
  decisionState: RegionDecisionMap;
  selectedName: string;
  isGroupLeader: boolean;
  isTeacher: boolean;
  onSelect: (name: string) => void;
};

const MapBoard = memo(function MapBoard({
  activeMode,
  visibleState,
  decisionState,
  selectedName,
  isGroupLeader,
  isTeacher,
  onSelect,
}: MapBoardProps) {
  return (
    <svg viewBox="0 60 380 300" aria-label="苗栗拼圖按鈕地圖">
      {regions.map((region) => {
        const currentState = visibleState[region.name] || "";
        const decision = decisionState[region.name];
        const label = labelPositions[region.name];
        const isActive = selectedName === region.name;
        const isTieArea = Boolean(decision?.isTie && !currentState);
        const canEdit =
          activeMode === "personal" ||
          (activeMode === "group" &&
            isGroupLeader &&
            Boolean(decision?.isTie && !decision?.locked)) ||
          (activeMode === "class" &&
            isTeacher &&
            Boolean(decision?.isTie && !decision?.locked));

        return (
          <g
            key={region.name}
            className={`piece ${isActive ? "active" : ""} ${!canEdit ? "locked" : ""} ${isTieArea ? "tie" : ""}`}
            data-name={region.name}
            data-state={currentState}
            data-tie={isTieArea ? "true" : "false"}
            onClick={() => onSelect(region.name)}
          >
            <path className="piece-shape" d={region.d} />
            <text
              className="label"
              x={label.x}
              y={label.y}
              fontSize={label.size}
              dominantBaseline="middle"
              textAnchor="middle"
              writingMode={label.vertical ? "vertical-rl" : undefined}
            >
              {region.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
});

export default function MiaoliMap({
  onBack,
  mode = "personal",
  personalData,
  groupData,
  groupFinalChoices = {},
  classFinalChoices = {},
  initialState,
  onModeChange,
  onDecisionsChange,
  onManualDecisionChange,
  groupMembers = [],
  groupName,
  isGroupLeader = false,
  isTeacher = false,
}: MiaoliMapProps) {
  const [activeMode, setActiveMode] = useState<MapMode>(mode);
  const [selectedName, setSelectedName] = useState("");
  const [personalState, setPersonalState] = useState<PersonalDecisionMap>(() =>
    normalizePersonalState(initialState),
  );
  const [manualDecisionState, setManualDecisionState] =
    useState<RegionDecisionMap>({});

  const initialStateSignature = useMemo(
    () => createPersonalSignature(initialState),
    [initialState],
  );
  const groupFinalChoicesSignature = useMemo(
    () => createPersonalSignature(groupFinalChoices),
    [groupFinalChoices],
  );
  const classFinalChoicesSignature = useMemo(
    () => createPersonalSignature(classFinalChoices),
    [classFinalChoices],
  );
  const personalDataSignature = useMemo(
    () => createGroupDataSignature(personalData),
    [personalData],
  );
  const groupDataSignature = useMemo(
    () => createExternalDataSignature(groupData),
    [groupData],
  );

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  useEffect(() => {
    setSelectedName("");
  }, [activeMode]);

  useEffect(() => {
    const nextManualState =
      activeMode === "group"
        ? choicesToManualDecisionState(groupFinalChoices)
        : activeMode === "class"
          ? choicesToManualDecisionState(classFinalChoices)
          : {};

    setManualDecisionState((prev) =>
      areDecisionStatesSame(prev, nextManualState) ? prev : nextManualState,
    );
  }, [activeMode, classFinalChoicesSignature, groupFinalChoicesSignature]);

  useEffect(() => {
    const nextPersonalState = normalizePersonalState(initialState);

    setPersonalState((prev) =>
      arePersonalStatesSame(prev, nextPersonalState) ? prev : nextPersonalState,
    );
  }, [initialStateSignature]);

  const decisionState = useMemo<RegionDecisionMap>(() => {
    if (activeMode === "group")
      return buildGroupState(personalData, manualDecisionState);
    if (activeMode === "class")
      return buildClassState(groupData, manualDecisionState);

    return normalizeDecisionState(personalState);
  }, [
    activeMode,
    groupDataSignature,
    manualDecisionState,
    personalDataSignature,
    personalState,
  ]);

  const visibleState = useMemo<PersonalDecisionMap>(() => {
    if (activeMode === "personal") return personalState;

    return Object.fromEntries(
      Object.entries(decisionState).map(([name, decision]) => [
        name,
        getDecisionResult(decision),
      ]),
    ) as PersonalDecisionMap;
  }, [activeMode, decisionState, personalState]);

  const counts = useMemo(() => {
    const values = Object.values(visibleState).filter(Boolean);
    const locked = Object.values(decisionState).filter(
      (value) => value.locked,
    ).length;
    const tie = Object.values(decisionState).filter(
      (value) => value.isTie,
    ).length;

    return {
      total: regions.length,
      marked: values.length,
      conserve: values.filter((value) => value === "保育").length,
      develop: values.filter((value) => value === "開發").length,
      unknown: values.filter((value) => value === "我不知道").length,
      locked,
      tie,
    };
  }, [decisionState, visibleState]);

  const selectedDecision = selectedName
    ? decisionState[selectedName]
    : undefined;
  const selectedState = selectedName ? visibleState[selectedName] || "" : "";
  const selectedCanEdit =
    Boolean(selectedName) &&
    (activeMode === "personal" ||
      (activeMode === "group" &&
        isGroupLeader &&
        Boolean(
          selectedDecision &&
          !selectedDecision.locked &&
          selectedDecision.isTie,
        )) ||
      (activeMode === "class" &&
        isTeacher &&
        Boolean(
          selectedDecision &&
          !selectedDecision.locked &&
          selectedDecision.isTie,
        )));

  function notifyChange(nextPersonalState: PersonalDecisionMap) {
    onDecisionsChange?.({
      mode: activeMode,
      personalState: nextPersonalState,
      decisionState,
    });
  }

  function applyState(name: string, nextState: RegionState) {
    if (!name || !selectedCanEdit) return;

    if (activeMode === "personal") {
      const copy = { ...personalState };

      if (!nextState) delete copy[name];
      else copy[name] = nextState;

      if (arePersonalStatesSame(personalState, copy)) return;

      setPersonalState(copy);
      notifyChange(copy);
      return;
    }

    setManualDecisionState((prev) => {
      const copy = { ...prev };
      const base = decisionState[name] || resolveVote([]);

      if (!nextState) {
        delete copy[name];
      } else {
        copy[name] = {
          ...base,
          result: nextState,
          locked: false,
          isTie: true,
          finalChoice: nextState,
        };
      }

      return copy;
    });

    onManualDecisionChange?.({
      mode: activeMode,
      districtName: name,
      choice: nextState,
    });
  }



  function changeMode(nextMode: MapMode) {
    setActiveMode(nextMode);
    onModeChange?.(nextMode);
  }

  const handleSelectRegion = useCallback((name: string) => {
    setSelectedName(name);
  }, []);

  return (
    <div className="miaoli-page">
      <div className="wrap">
        <section className="panel map-panel">
          <div className="header">
            <div>
              <div className="title-row">
                <h1>{getModeText(activeMode)}</h1>
                {onBack && (
                  <button className="back-btn" type="button" onClick={onBack}>
                    回到首頁
                  </button>
                )}
              </div>
              <p className="sub">
                {activeMode === "personal" &&
                  "點擊任一鄉鎮區塊後，將該地區標記為保育、開發或我不知道。"}
                {activeMode === "group" &&
                  "系統會根據同組學生個人選擇進行統計，多數決自動鎖定，平手地區開放小組討論後決定。"}
                {activeMode === "class" &&
                  (isTeacher
                    ? "系統會根據六組小組結果進行統計，多數決自動鎖定，平手地區由教師帳號決定。"
                    : "系統會根據六組小組結果進行統計；學生只能閱覽全班地圖，不能進行選擇。")}
              </p>
            </div>
            <div className="chips">
              <div className="chip">18 個鄉鎮市</div>
              <div className="chip">{getModeText(activeMode)}</div>
            </div>
          </div>

          <div className="mode-switch" aria-label="地圖模式切換">
            <button
              className={`mode-btn ${activeMode === "personal" ? "active" : ""}`}
              type="button"
              onClick={() => changeMode("personal")}
            >
              個人地圖
            </button>
            <button
              className={`mode-btn ${activeMode === "group" ? "active" : ""}`}
              type="button"
              onClick={() => changeMode("group")}
            >
              小組地圖
            </button>
            <button
              className={`mode-btn ${activeMode === "class" ? "active" : ""}`}
              type="button"
              onClick={() => changeMode("class")}
            >
              全班地圖
            </button>
          </div>

          <div className="stage">
            <MapBoard
              activeMode={activeMode}
              visibleState={visibleState}
              decisionState={decisionState}
              selectedName={selectedName}
              isGroupLeader={isGroupLeader}
              isTeacher={isTeacher}
              onSelect={handleSelectRegion}
            />
          </div>
        </section>

        <aside className="panel side">
          <section className="card">
            <h2>整體統計</h2>
            <div className="meta">
              <div className="stat">
                <span>保育區</span>
                <strong>{counts.conserve}</strong>
              </div>
              <div className="stat">
                <span>開發區</span>
                <strong>{counts.develop}</strong>
              </div>
            </div>
          </section>

          {activeMode !== "personal" && (
            <section className="card">
              <h3>決策狀態</h3>
              <div className="meta">
                <div className="stat">
                  <span>小組共識區</span>
                  <strong>{counts.locked}</strong>
                </div>
                <div className="stat">
                  <span>爭議地區</span>
                  <strong>{counts.tie}</strong>
                </div>
              </div>
              <p className="note">
                多數決地區不可修改；平手地區可由小組或全班討論後手動選擇。
              </p>
            </section>
          )}

          <section className="card compact-card">
            <div className="card-title-row">
              <h3>目前組員</h3>
              <span className="group-name">{groupName || "尚未取得小組"}</span>
            </div>

            <div className="member-avatar-list">
              {groupMembers.length === 0 ? (
                <div className="empty-members">尚未分配小組</div>
              ) : (
                groupMembers.map((member, index) => {
                  const displayName =
                    member.name || member.username || `組員${index + 1}`;

                  return (
                    <div
                      key={member.id ?? `${displayName}-${index}`}
                      className={`member-avatar ${member.isGroupLeader ? "leader" : ""}`}
                      title={displayName}
                    >
                      <span className="avatar-circle">
                        {displayName.slice(0, 1)}
                      </span>
                      <span className="avatar-name">{displayName}</span>
                      {member.isGroupLeader ? (
                        <span className="leader-crown">👑</span>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="card">
            <h3>圖例與區塊設定</h3>
            <div className="legend legend-inline">
              <div className="legend-item">
                <span className="swatch" style={{ background: "#ffffff" }} />
                未標記
              </div>
              <div className="legend-item">
                <span
                  className="swatch"
                  style={{ background: "var(--conserve)" }}
                />
                保育
              </div>
              <div className="legend-item">
                <span
                  className="swatch"
                  style={{ background: "var(--develop)" }}
                />
                開發
              </div>
              <div className="legend-item">
                <span className="swatch" style={{ background: "#c7b7ff" }} />
                {activeMode === "class" ? "平手待教師決定" : "平手待組長決定"}
              </div>
              <div className="legend-item">
                <span
                  className="swatch"
                  style={{ background: "var(--unknown)" }}
                />
                我不知道
              </div>
            </div>

            <div className="selected-name">
              {selectedName || "請先點選鄉鎮"}
            </div>
            <div className="selected-state">
              {selectedName
                ? `目前狀態：${selectedState || "未標記"}`
                : "目前尚未選取區塊"}
            </div>

            {activeMode !== "personal" && selectedName && selectedDecision && (
              <>
                <div className="vote-box">
                  <div className="vote-pill">
                    保育票數
                    <strong>{selectedDecision.conserveCount}</strong>
                  </div>
                  <div className="vote-pill">
                    開發票數
                    <strong>{selectedDecision.developCount}</strong>
                  </div>
                </div>
                <div className="lock-info">
                  {selectedDecision.locked
                    ? "此區域已有多數決結果，系統已自動鎖定，不能手動調整。"
                    : selectedDecision.isTie
                      ? activeMode === "group"
                        ? isGroupLeader
                          ? "此區域目前平手，請組長代表小組選擇保育或開發。"
                          : "此區域目前平手，只有組長可以代表小組做最後選擇。"
                        : isTeacher
                          ? "此區域目前平手，請教師帳號選擇保育或開發。"
                          : "此區域目前平手，學生只能閱覽，請等待教師帳號做最後選擇。"
                      : "此區域尚未有足夠票數，可等待成員完成選擇。"}
                </div>
              </>
            )}

            <div className="actions">
              <button
                className="map-btn btn-conserve"
                type="button"
                disabled={!selectedCanEdit}
                onClick={() => applyState(selectedName, "保育")}
              >
                設為保育
              </button>
              <button
                className="map-btn btn-develop"
                type="button"
                disabled={!selectedCanEdit}
                onClick={() => applyState(selectedName, "開發")}
              >
                設為開發
              </button>
              <button
                className="map-btn btn-unknown"
                type="button"
                disabled={!selectedCanEdit || activeMode !== "personal"}
                onClick={() => applyState(selectedName, "我不知道")}
              >
                我不知道
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
