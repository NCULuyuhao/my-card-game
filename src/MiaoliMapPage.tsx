import { useEffect, useMemo, useState } from "react";

type RegionState = "保育" | "開發" | "";

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

type MiaoliMapPageProps = {
  onBack?: () => void;
};

const STORAGE_KEY = "miaoli-puzzle-map-v1";

export const regions: Region[] = [
  {
    "name": "泰安鄉",
    "d": "M355.9552220197802,255.3540125028485L355.2420663833691,262.89546436782257L348.00863064252917,265.79180198460926L347.80487188926054,274.1409640422007L341.352511369274,286.94986292430076L333.1682014465405,289.40182091729184L328.5836294981127,278.68042218890696L310.652859210968,293.10568736103596L307.8341964574938,300.2781372724694L293.537123936876,300.9040633287368L283.2812666893078,317.72383072677985L276.42138866277674,317.5413112560327L264.77317993457837,325.3370968738054L262.09035634994507,321.58270786915637L248.1668415436434,329.5605556848968L246.50281172532414,336.12989915376966L237.60534616616496,337.17259821609696L228.47016206153785,328.98701376372264L221.44048507396656,316.9937501275672L197.8384294876596,315.19459201683276L184.8657888632515,310.6313125459874L175.01744912219874,314.8034648670291L177.90403146010067,333.4448811450202L171.21395239462436,339.04941934737326L173.59113784936926,330.9422519724412L167.58025462811202,319.4968534570671L170.36495758937235,298.2438407771133L173.18362034283928,296.6528773572645L175.5608057975769,275.7845933855642L169.85556070621533,267.957457171191L173.0138213817845,256.24128240663777L168.19153088789608,250.08236390001548L177.6323531224116,230.3755645590245L177.22483561589615,221.96919591064943L192.26902356513892,215.54628791765754L200.7589716177681,215.52017738389623L218.1124254373426,218.3661706685889L225.34586117818253,213.0657455620767L233.08869380216493,223.58788858464504L256.96242772616097,220.27214092286886L270.6482239869947,221.44702934015368L284.4019398322489,213.4835270122785L295.67659084613115,212.38684561169248L308.5473520939122,217.81786865266076L326.4441625888576,212.0735050458661L334.05115604400635,211.15958738803783L334.6284725115911,220.35046740467806L343.0844607720137,226.45967451870092L348.2463491879971,236.7449646756504L357.8909301757885,245.41063549311184Z",
    "originalFill": "#d97fa7",
    "cx": 227.92680538618154,
    "cy": 110.61670900597095
  },
  {
    "name": "苑裡鎮",
    "d": "M85.80507498521183,274.74102346608015L76.63593108837085,290.6799367785843L73.07015290627169,304.137929720222L69.84397264628205,303.12084191531903L64.03684817827161,301.9472615787399L55.92045783996582,295.89650561890267L40.94418947512895,276.12375041414816L33.06551768229838,271.9233105477342L28.24322718840267,261.32982883162185L18.83636474609375,254.04918430619546L31.29960848735209,240.05996590835275L48.8228612679668,246.95051185428747L66.07443571090698,257.51997602044867L75.31149919216114,272.05376260878984Z",
    "originalFill": "#972895",
    "cx": 52.32071986565279,
    "cy": 272.0989478142873
  },
  {
    "name": "通霄鎮",
    "d": "M74.49646417910844,184.41590454864672L89.40481295952486,222.02141236262287L93.6837467780424,226.74684691072252L87.29930584246904,239.0680915139801L87.33326563469018,260.964509062509L85.80507498521183,274.74102346608015L75.31149919216114,272.05376260878984L66.07443571090698,257.51997602044867L48.8228612679668,246.95051185428747L31.29960848735209,240.05996590835275L41.86110386481596,228.8614452646616L43.49117389091407,219.43665322918605L52.0830013201703,206.90319170698967L62.57657711322099,176.94472623150796Z",
    "originalFill": "#8c1b93",
    "cx": 62.49167763269725,
    "cy": 225.8428748490085
  },
  {
    "name": "竹南鎮",
    "d": "M184.1526332268404,95.28649697099718L178.85490564199426,100.22937659031231L158.5809096923258,101.56311179994736L153.82653878285782,133.27786876050595L147.5439772239115,122.61196096149979L134.33361805402092,122.8733989860375L125.97950917023991,118.29809771047803L142.82356610664283,101.48465746634974L145.54034948349727,90.31712495198371L152.5360666788547,80.6127900842057L164.55783312136919,83.49022166376017L169.1084452775831,79.2263504373932L173.2854997194736,92.72338972187572Z",
    "originalFill": "#992a95",
    "cx": 155.06607119854016,
    "cy": 106.25210959894957
  },
  {
    "name": "後龍鎮",
    "d": "M134.33361805402092,122.8733989860375L123.16084641675843,138.08747205527652L134.12985930076684,159.25640215484418L136.2353664178081,169.0286215959095L116.91224465003324,161.7126448224808L112.7012304159216,168.00965457971506L104.65275966205081,168.14029217295683L101.66429794752185,179.00851983424764L96.74012807699182,171.98093276284635L83.52976890710852,173.6268596332411L74.49646417910844,184.41590454864672L62.57657711322099,176.94472623150796L68.55350054227165,160.58905473294544L89.77837067384098,142.8444841573455L90.69528506351344,136.9896558446817L107.06390490899503,122.14137014648259L125.97950917023991,118.29809771047803Z",
    "originalFill": "#f2b9c6",
    "cx": 99.40597176551455,
    "cy": 151.35600112956237
  },
  {
    "name": "頭份市",
    "d": "M184.76390948662447,95.60034061273109L194.98580694199336,100.38628788764436L205.07186522849952,96.01879668900256L200.0797757735636,112.46743897099077L206.76985483902536,118.27195230363031L192.77842044829595,115.21287472681797L187.07317535694892,127.68369074996008L181.36793026556552,124.67729571550262L171.62146990115434,129.90572888596034L172.7421430441027,136.8589623347052L164.21823519926693,146.34670083937453L154.53969441926893,141.48536958808654L153.82653878285782,133.27786876050595L158.5809096923258,101.56311179994736L178.85490564199426,100.22937659031231L184.1526332268404,95.28649697099718Z",
    "originalFill": "#eba9bc",
    "cx": 180.15420200567868,
    "cy": 120.81659890518586
  },
  {
    "name": "獅潭鄉",
    "d": "M205.4793827350295,170.90975404005803L195.83480174724536,189.45721134638188L191.92942564304394,202.35928091512142L200.7589716177681,215.52017738389623L192.26902356513892,215.54628791765754L177.22483561589615,221.96919591064943L177.6323531224116,230.3755645590245L168.19153088789608,250.08236390001548L158.95446740664192,250.8392080564845L152.33230792558606,244.15783083948554L147.34021847064287,240.08606768463324L151.721031665802,224.71050923738767L169.68576174516784,199.7477100003889L167.8519329658011,194.8899396336219L176.20604184956755,185.5913699195553L185.5110249152567,167.22582410171526L191.96338543525053,160.43227334235962Z",
    "originalFill": "#eeafbf",
    "cx": 176.4098006028357,
    "cy": 205.63574069942206
  },
  {
    "name": "造橋鄉",
    "d": "M153.82653878285782,133.27786876050595L154.53969441926893,141.48536958808654L164.21823519926693,146.34670083937453L171.72334927778138,144.59561357173698L176.10416247294052,160.48453384339336L180.99437255125667,156.61715546744017L191.96338543525053,160.43227334235962L185.5110249152567,167.22582410171526L168.5650886022122,164.16880466169823L161.77313016011612,159.1518793526775L139.97094356096204,161.163916944246L134.12985930076684,159.25640215484418L123.16084641675843,138.08747205527652L134.33361805402092,122.8733989860375L147.5439772239115,122.61196096149979Z",
    "originalFill": "#fde2e4",
    "cx": 157.56211592600755,
    "cy": 144.91889253187637
  },
  {
    "name": "西湖鄉",
    "d": "M101.66429794752185,179.00851983424764L108.93169348056836,192.35645801365354L104.21128236329969,199.61712900286693L106.48658844141755,208.0521818462621L93.6837467780424,226.74684691072252L89.40481295952486,222.02141236262287L74.49646417910844,184.41590454864672L83.52976890710852,173.6268596332411L96.74012807699182,171.98093276284635Z",
    "originalFill": "#e396b2",
    "cx": 91.7140788298384,
    "cy": 199.36388983678444
  },
  {
    "name": "三義鄉",
    "d": "M125.09655457276676,283.793498605688L110.66364288330806,302.7296505514005L101.32470002541231,306.38068900762846L100.37382584351872,312.7174182836061L101.29074023319117,323.59028691864296L94.29502303784102,320.5919343937803L73.07015290627169,304.137929720222L76.63593108837085,290.6799367785843L85.80507498521183,274.74102346608015L87.33326563469018,260.964509062509L99.15127332393604,255.30181982104295L106.28282968814892,257.38949810228223L105.67155342835031,266.15709770447756L113.95774272772542,272.18421443788793L120.10446511782357,283.58480857969334Z",
    "originalFill": "#fee4e6",
    "cx": 99.08335373951923,
    "cy": 289.44605336984296
  },
  {
    "name": "頭屋鄉",
    "d": "M185.5110249152567,167.22582410171526L176.20604184956755,185.5913699195553L167.8519329658011,194.8899396336219L145.0988721847607,196.40476292469248L135.08073348264588,184.10244391734523L136.2353664178081,169.0286215959095L134.12985930076684,159.25640215484418L139.97094356096204,161.163916944246L161.77313016011612,159.1518793526775L168.5650886022122,164.16880466169823Z",
    "originalFill": "#932494",
    "cx": 160.2953791990087,
    "cy": 177.778321138685
  },
  {
    "name": "銅鑼鄉",
    "d": "M119.86674657234107,203.69114612199883L119.79882698793517,234.16072572240773L136.81268288538558,250.31724740598293L136.91456226201262,256.89367989493076L134.6392561839093,273.8278876121931L125.09655457276676,283.793498605688L120.10446511782357,283.58480857969334L113.95774272772542,272.18421443788793L105.67155342835031,266.15709770447756L106.28282968814892,257.38949810228223L99.15127332393604,255.30181982104295L87.33326563469018,260.964509062509L87.29930584246904,239.0680915139801L93.6837467780424,226.74684691072252L106.48658844141755,208.0521818462621L118.20271675403637,199.7999423340152Z",
    "originalFill": "#fcdde1",
    "cx": 112.10693405224082,
    "cy": 241.74672046985157
  },
  {
    "name": "公館鄉",
    "d": "M167.8519329658011,194.8899396336219L169.68576174516784,199.7477100003889L151.721031665802,224.71050923738767L147.34021847064287,240.08606768463324L152.33230792558606,244.15783083948554L136.91456226201262,256.89367989493076L136.81268288538558,250.31724740598293L119.79882698793517,234.16072572240773L119.86674657234107,203.69114612199883L135.08073348264588,184.10244391734523L145.0988721847607,196.40476292469248Z",
    "originalFill": "#c6629f",
    "cx": 144.7422943665515,
    "cy": 220.498061906138
  },
  {
    "name": "大湖鄉",
    "d": "M168.19153088789608,250.08236390001548L173.0138213817845,256.24128240663777L169.85556070621533,267.957457171191L175.5608057975769,275.7845933855642L173.18362034283928,296.6528773572645L170.36495758937235,298.2438407771133L140.71805898960156,299.70436703857195L134.60529639171,308.4408378441585L100.37382584351872,312.7174182836061L101.32470002541231,306.38068900762846L110.66364288330806,302.7296505514005L125.09655457276676,283.793498605688L134.6392561839093,273.8278876121931L136.91456226201262,256.89367989493076L152.33230792558606,244.15783083948554L158.95446740664192,250.8392080564845Z",
    "originalFill": "#e294b1",
    "cx": 137.9673158205478,
    "cy": 278.4376245618208
  },
  {
    "name": "卓蘭鎮",
    "d": "M170.36495758937235,298.2438407771133L167.58025462811202,319.4968534570671L173.59113784936926,330.9422519724412L171.21395239462436,339.04941934737326L169.1084452775831,339.8314140448874L152.73982543211605,338.5020181218115L143.366922782021,341.8645614278412L130.86971924855607,341.0825883024554L115.99533026034624,326.27566421089796L101.29074023319117,323.59028691864296L100.37382584351872,312.7174182836061L134.60529639171,308.4408378441585L140.71805898960156,299.70436703857195Z",
    "originalFill": "#ae4198",
    "cx": 136.982481846444,
    "cy": 320.78446423320656
  },
  {
    "name": "苗栗市",
    "d": "M136.2353664178081,169.0286215959095L135.08073348264588,184.10244391734523L119.86674657234107,203.69114612199883L118.20271675403637,199.7999423340152L106.48658844141755,208.0521818462621L104.21128236329969,199.61712900286693L108.93169348056836,192.35645801365354L101.66429794752185,179.00851983424764L104.65275966205081,168.14029217295683L112.7012304159216,168.00965457971506L116.91224465003324,161.7126448224808Z",
    "originalFill": "#e192b0",
    "cx": 118.2233243905539,
    "cy": 184.88241333437196
  },
  {
    "name": "南庄鄉",
    "d": "M223.2743138533333,135.31676117737516L223.2743138533333,135.31676117737516L232.34157837353996,137.14648774658235L241.74844081585616,145.30128067457372L247.0801281929089,152.20077623798534L256.7926287650989,153.03703428778317L262.8714315707766,167.12131273422892L256.2832318819419,182.48287586230072L249.72899198532104,185.6436123853182L261.3772007135194,195.22947172524255L254.3814835181547,205.96309542397648L256.96242772616097,220.27214092286886L233.08869380216493,223.58788858464504L225.34586117818253,213.0657455620767L218.1124254373426,218.3661706685889L200.7589716177681,215.52017738389623L191.92942564304394,202.35928091512142L195.83480174724536,189.45721134638188L205.4793827350295,170.90975404005803L210.40355260555225,157.5840193171116L207.9244877741803,149.11699164055426L198.21198720199027,151.36450858074932L191.55586792872782,134.06206491812918L212.33926076156058,138.84547833840043Z",
    "originalFill": "#f2bbc7",
    "cx": 226.4661497492522,
    "cy": 178.8249767513871
  },
  {
    "name": "三灣鄉",
    "d": "M205.4793827350295,170.90975404005803L191.96338543525053,160.43227334235962L180.99437255125667,156.61715546744017L176.10416247294052,160.48453384339336L171.72334927778138,144.59561357173698L164.21823519926693,146.34670083937453L172.7421430441027,136.8589623347052L171.62146990115434,129.90572888596034L181.36793026556552,124.67729571550262L187.07317535694892,127.68369074996008L192.77842044829595,115.21287472681797L206.76985483902536,118.27195230363031L223.2403540611267,135.0815072780133L223.2403540611267,135.1076466377599L223.2403540611267,135.21220398275L223.2403540611267,135.26448259885547L223.2403540611267,135.31676117737516L223.2743138533333,135.31676117737516L212.33926076156058,138.84547833840043L191.55586792872782,134.06206491812918L198.21198720199027,151.36450858074932L207.9244877741803,149.11699164055426L210.40355260555225,157.5840193171116Z",
    "originalFill": "#de89ac",
    "cx": 193.74629452630012,
    "cy": 143.06131438391648
  }
];

export const labelPositions: Record<string, LabelPosition> = {
  "竹南鎮": {x: 153, y: 94, size: 9.0},
  "頭份市": {x: 183, y: 110, size: 8.9},
  "三灣鄉": {x: 209, y: 126, size: 8.9},
  "造橋鄉": {x: 153, y: 152, size: 9.2, z: 20},
  "後龍鎮": {x: 104, y: 152, size: 9.6},
  "苗栗市": {x: 121, y: 186, size: 9.4},
  "頭屋鄉": {x: 161, y: 181, size: 9.4},
  "南庄鄉": {x: 228, y: 187, size: 9.8},
  "西湖鄉": {x: 91, y: 192, size: 8.9, vertical: true},
  "通霄鎮": {x: 71, y: 228, size: 9.6},
  "公館鄉": {x: 136, y: 222, size: 9.6},
  "獅潭鄉": {x: 176, y: 216, size: 8.9},
  "銅鑼鄉": {x: 108, y: 248, size: 9.4},
  "苑裡鎮": {x: 58, y: 278, size: 9.4},
  "三義鄉": {x: 97, y: 294, size: 8.9},
  "大湖鄉": {x: 149, y: 286, size: 10.0},
  "卓蘭鎮": {x: 142, y: 319, size: 9.2},
  "泰安鄉": {x: 253, y: 278, size: 10.2},
};


const styles = `
:root {
  --bg1:#f5f8ff;
  --bg2:#edf3ff;
  --panel:#ffffffd9;
  --text:#20304a;
  --muted:#64748b;
  --line:#dbe4f2;
  --white:#ffffff;
  --idle:#fdfefe;
  --idle-stroke:#cfd9ea;
  --hover:#5b8def;
  --conserve:#A8C686;
  --develop:#e2574c;
  --shadow:0 20px 40px rgba(24,39,75,.12);
  --piece-shadow:0 8px 18px rgba(36,54,92,.14);
}
* { box-sizing:border-box; }
.miaoli-page {
  margin:0;
  min-height:100vh;
  font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
  color:var(--text);
  background:
    radial-gradient(circle at 15% 10%, rgba(91,141,239,.12), transparent 22%),
    radial-gradient(circle at 90% 20%, rgba(52,168,83,.08), transparent 20%),
    linear-gradient(180deg, var(--bg1), var(--bg2));
}
.back-btn {
  position:fixed;
  top:16px;
  left:16px;
  z-index:9999;
  padding:10px 16px;
  border-radius:14px;
  border:1px solid var(--line);
  background:#fff;
  color:var(--text);
  font-weight:900;
  cursor:pointer;
  box-shadow:0 8px 18px rgba(25,44,91,.08);
}
.wrap {
  max-width:1440px;
  margin:0 auto;
  padding:24px;
  display:grid;
  grid-template-columns:minmax(760px,1.25fr) minmax(320px,.75fr);
  gap:20px;
}
.panel {
  background:var(--panel);
  backdrop-filter: blur(10px);
  border:1px solid rgba(255,255,255,.85);
  border-radius:28px;
  box-shadow:var(--shadow);
  overflow:hidden;
}
.map-panel { padding:18px; }
.header {
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
  margin-bottom:14px;
}
h1 { margin:0 0 6px 0; font-size:30px; line-height:1.15; }
.sub { margin:0; font-size:14px; line-height:1.7; color:var(--muted); }
.chips { display:flex; flex-wrap:wrap; gap:8px; }
.chip {
  background:#fff;
  border:1px solid var(--line);
  border-radius:999px;
  padding:8px 12px;
  font-size:13px;
  color:var(--muted);
  white-space:nowrap;
}
.stage {
  border:1px solid var(--line);
  border-radius:22px;
  overflow:hidden;
  min-height:760px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.88), rgba(247,250,255,.95)),
    repeating-linear-gradient(135deg, rgba(91,141,239,.03) 0 14px, rgba(91,141,239,.00) 14px 28px);
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
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
  filter:drop-shadow(0 10px 18px rgba(91,141,239,.25));
  transform:translateY(-3px);
}
.piece.active {
  filter:drop-shadow(0 12px 22px rgba(48,78,132,.24));
}
.piece-shape {
  fill:var(--idle);
  stroke:var(--idle-stroke);
  stroke-width:2.2;
  vector-effect:non-scaling-stroke;
}
.piece[data-state="保育"] .piece-shape {
  fill:var(--conserve);
  stroke:var(--idle-stroke);
  stroke-width:2.2;
}
.piece[data-state="開發"] .piece-shape {
  fill:var(--develop);
  stroke:var(--idle-stroke);
  stroke-width:2.2;
}
.piece.active:not([data-state="保育"]):not([data-state="開發"]) .piece-shape {
  fill:#F4EFC1;
  stroke:var(--idle-stroke);
  stroke-width:2.2;
}
.label {
  pointer-events:none;
  text-anchor:middle;
  paint-order:stroke;
  stroke:rgba(255,255,255,.95);
  stroke-width:2.6px;
  stroke-linejoin:round;
  font-weight:800;
  fill:#20304a;
  letter-spacing:.03em;
}
.piece[data-state="保育"] .label,
.piece[data-state="開發"] .label {
  fill:#20304a;
  stroke:rgba(255,255,255,.95);
  stroke-width:2.6px;
}
.side {
  padding:20px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.card {
  background:#fff;
  border:1px solid var(--line);
  border-radius:18px;
  padding:16px;
}
.card h2,.card h3 { margin:0 0 10px 0; }
.meta {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
}
.stat {
  border:1px solid var(--line);
  background:#f8fbff;
  border-radius:14px;
  padding:12px;
}
.stat strong {
  display:block;
  font-size:24px;
  margin-top:4px;
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
  border:1px solid rgba(0,0,0,.08);
}
.selected-name {
  font-size:26px;
  margin:4px 0 2px;
  font-weight:800;
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
  border:none;
  cursor:pointer;
  border-radius:14px;
  padding:12px 14px;
  font-weight:800;
  font-size:14px;
  box-shadow:0 8px 18px rgba(25,44,91,.08);
  transition:transform .15s ease, box-shadow .15s ease;
}
.map-btn:hover { transform:translateY(-1px); }
.btn-conserve { background:rgba(52,168,83,.12); color:var(--conserve); }
.btn-develop { background:rgba(226,87,76,.12); color:var(--develop); }
.btn-reset { background:#f1f5fb; color:#51607a; }
.btn-clearall { background:rgba(91,141,239,.10); color:#3d6fe0; }
.note {
  font-size:13px;
  color:var(--muted);
  line-height:1.75;
  margin:0;
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


function loadSavedState(): Record<string, RegionState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Record<string, RegionState>) : {};
  } catch {
    return {};
  }
}

export default function MiaoliMapPage({ onBack }: MiaoliMapPageProps) {
  const [selectedName, setSelectedName] = useState("");
  const [stateMap, setStateMap] = useState<Record<string, RegionState>>(
    loadSavedState,
  );

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  const counts = useMemo(() => {
    const values = Object.values(stateMap).filter(Boolean);

    return {
      total: regions.length,
      marked: values.length,
      conserve: values.filter((value) => value === "保育").length,
      develop: values.filter((value) => value === "開發").length,
    };
  }, [stateMap]);

  function saveNextState(next: Record<string, RegionState>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function applyState(name: string, nextState: RegionState) {
    if (!name) return;

    setStateMap((prev) => {
      const copy = { ...prev };

      if (!nextState) {
        delete copy[name];
      } else {
        copy[name] = nextState;
      }

      saveNextState(copy);
      return copy;
    });
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    setStateMap({});
  }

  return (
    <div className="miaoli-page">
      {onBack && (
        <button className="back-btn" type="button" onClick={onBack}>
          回到卡牌頁面
        </button>
      )}

      <div className="wrap">
        <section className="panel map-panel">
          <div className="header">
            <div>
              <h1>苗栗拼圖按鈕地圖</h1>
              <p className="sub">
                點擊任一鄉鎮區塊後，將該地區標記為保育或開發。
              </p>
            </div>
            <div className="chips">
              <div className="chip">18 個鄉鎮市</div>
            </div>
          </div>

          <div className="stage">
            <svg viewBox="0 60 380 300" aria-label="苗栗拼圖按鈕地圖">
              {regions.map((region) => {
                const currentState = stateMap[region.name] || "";
                const label = labelPositions[region.name];
                const isActive = selectedName === region.name;

                return (
                  <g
                    key={region.name}
                    className={`piece ${isActive ? "active" : ""}`}
                    data-name={region.name}
                    data-state={currentState}
                    onClick={() => setSelectedName(region.name)}
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
          </div>
        </section>

        <aside className="panel side">
          <section className="card">
            <h2>整體統計</h2>
            <div className="meta">
              <div className="stat">
                <span>總區域</span>
                <strong>{counts.total}</strong>
              </div>
              <div className="stat">
                <span>已標記</span>
                <strong>{counts.marked}</strong>
              </div>
              <div className="stat">
                <span>保育</span>
                <strong>{counts.conserve}</strong>
              </div>
              <div className="stat">
                <span>開發</span>
                <strong>{counts.develop}</strong>
              </div>
            </div>
          </section>

          <section className="card">
            <h3>圖例</h3>
            <div className="legend">
              <div className="legend-item">
                <span className="swatch" style={{ background: "#ffffff" }} />
                未標記拼圖塊
              </div>
              <div className="legend-item">
                <span className="swatch" style={{ background: "var(--conserve)" }} />
                保育
              </div>
              <div className="legend-item">
                <span className="swatch" style={{ background: "var(--develop)" }} />
                開發
              </div>
            </div>
          </section>

          <section className="card">
            <h3>區塊設定</h3>
            <div className="selected-name">{selectedName || "請先點選鄉鎮"}</div>
            <div className="selected-state">
              {selectedName
                ? `目前狀態：${stateMap[selectedName] || "未標記"}`
                : "目前尚未選取區塊"}
            </div>
            <div className="actions">
              <button
                className="map-btn btn-conserve"
                type="button"
                onClick={() => applyState(selectedName, "保育")}
              >
                設為保育
              </button>
              <button
                className="map-btn btn-develop"
                type="button"
                onClick={() => applyState(selectedName, "開發")}
              >
                設為開發
              </button>
              <button
                className="map-btn btn-reset"
                type="button"
                onClick={() => applyState(selectedName, "")}
              >
                清除標記
              </button>
              <button
                className="map-btn btn-clearall"
                type="button"
                onClick={clearAll}
              >
                全部清除
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
