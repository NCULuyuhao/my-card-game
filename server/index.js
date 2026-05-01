const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const GROUPS = {
  environment: { name: "🌿環境保育聯盟" },
  government: { name: "🚧地方政府局" },
  farming: { name: "🐄農牧產業協會" },
  animal: { name: "🐕動物保護團體" },
  greenEnergy: { name: "☀️綠能科技企業" },
  education: { name: "🎓教育推動單位" },
};

// ===== 地圖任務開關（全班共用） =====
async function ensureGameSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function getGameSetting(key, fallback) {
  await ensureGameSettingsTable();

  const [rows] = await pool.query(
    "SELECT setting_value FROM game_settings WHERE setting_key = ?",
    [key],
  );

  if (rows.length === 0) return fallback;
  return parseJSON(rows[0].setting_value, fallback);
}

async function setGameSetting(key, value) {
  await ensureGameSettingsTable();

  await pool.query(
    `
    INSERT INTO game_settings (setting_key, setting_value)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
      setting_value = VALUES(setting_value),
      updated_at = CURRENT_TIMESTAMP
    `,
    [key, JSON.stringify(value)],
  );
}


async function insertActivityLog({
  userId = null,
  username = null,
  role = null,
  groupId = null,
  eventType,
  eventLabel = null,
  targetType = null,
  targetId = null,
  previousValue = null,
  newValue = null,
  metadata = null,
}) {
  if (!eventType) return;

  // 只記錄學生的遊戲行為；教師行為請使用 insertTeacherActivityLog。
  if ((role || "student") === "teacher") return;

  try {
    await pool.query(
      `INSERT INTO activity_logs (
        user_id,
        username,
        role,
        group_id,
        event_type,
        event_label,
        target_type,
        target_id,
        previous_value,
        new_value,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        role || "student",
        groupId,
        eventType,
        eventLabel,
        targetType,
        targetId,
        previousValue == null ? null : JSON.stringify(previousValue),
        newValue == null ? null : JSON.stringify(newValue),
        metadata == null ? null : JSON.stringify(metadata),
      ],
    );
  } catch (error) {
    console.error("學生遊戲紀錄寫入失敗（不中斷主要流程）：", error);
  }
}

async function insertTeacherActivityLog({
  teacherId = null,
  teacherName = null,
  eventType,
  eventLabel = null,
  targetType = null,
  targetId = null,
  previousValue = null,
  newValue = null,
  metadata = null,
}) {
  if (!eventType) return;

  try {
    await pool.query(
      `INSERT INTO teacher_activity_logs (
        teacher_id,
        teacher_name,
        event_type,
        event_label,
        target_type,
        target_id,
        previous_value,
        new_value,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        teacherId,
        teacherName,
        eventType,
        eventLabel,
        targetType,
        targetId,
        previousValue == null ? null : JSON.stringify(previousValue),
        newValue == null ? null : JSON.stringify(newValue),
        metadata == null ? null : JSON.stringify(metadata),
      ],
    );
  } catch (error) {
    console.error("教師操作紀錄寫入失敗（不中斷主要流程）：", error);
  }
}

async function getRequestUserProfile(userId) {
  const [rows] = await pool.query(
    `SELECT id, username, role, group_id
     FROM users
     WHERE id = ?`,
    [userId],
  );

  return rows[0] || null;
}

function jsonText(value) {
  return JSON.stringify(value ?? null);
}

function parseJSON(data, fallback) {
  try {
    if (data == null) return fallback;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return fallback;
  }
}

const BARRAGE_MAX_LENGTH = 20;

const BAD_WORDS = [
  "幹", "靠", "操", "淦", "肏", "屌", "雞掰", "機掰", "靠北", "靠杯", "靠腰",
  "媽的", "他媽", "他媽的", "三小", "殺小", "白癡", "智障", "腦殘", "低能",
  "垃圾", "廢物", "去死", "王八蛋", "混蛋", "爛人", "醜八怪", "北七", "87",
  "哭爸", "哭夭", "賤", "賤人", "死胖子", "死矮子", "臭三八", "破麻",
  "fuck", "fuk", "fck", "shit", "bitch", "asshole", "idiot", "stupid", "damn",
  "trash", "loser", "kill yourself", "kys",
];

function normalizeBarrageText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[~!@#$%^&*()_+\-={}\[\]:";'<>?,.\/\\|，。！？、；：「」『』（）【】《》]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/@/g, "a");
}

function containsBadWords(text) {
  const normalized = normalizeBarrageText(text);
  return BAD_WORDS.some((word) => normalized.includes(normalizeBarrageText(word)));
}

async function insertMapActionLog({
  userId,
  username,
  mode,
  groupId = null,
  districtName,
  previousChoice = null,
  newChoice = null,
  actionType,
}) {
  await pool.query(
    `INSERT INTO map_action_logs (
      user_id,
      username,
      mode,
      group_id,
      district_name,
      previous_choice,
      new_choice,
      action_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      username,
      mode,
      groupId,
      districtName,
      previousChoice,
      newChoice,
      actionType,
    ],
  );

  if (mode !== "class") {
    await insertActivityLog({
      userId,
      username,
      eventType: `map_${actionType}`,
      eventLabel: "地圖決策操作",
      targetType: mode,
      targetId: districtName,
      groupId,
      previousValue: previousChoice,
      newValue: newChoice,
      metadata: { mode, districtName, actionType },
    });
  }
}

function resolveVoteFromMaps(maps) {
  const result = {};

  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([district, choice]) => {
      if (!result[district]) {
        result[district] = { 保育: 0, 開發: 0, 我不知道: 0 };
      }

      if (choice === "保育") result[district].保育++;
      if (choice === "開發") result[district].開發++;
      if (choice === "我不知道") result[district].我不知道++;
    });
  });

  const final = {};

  Object.entries(result).forEach(([district, count]) => {
    const knownVotes = count.保育 + count.開發;

    if (knownVotes === 0 && count.我不知道 === maps.length && maps.length > 0) {
      final[district] = "我不知道";
    } else if (count.保育 > count.開發) {
      final[district] = "保育";
    } else if (count.開發 > count.保育) {
      final[district] = "開發";
    } else {
      final[district] = null;
    }
  });

  return final;
}

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "未登入" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "登入過期" });

    req.user = user;
    next();
  });
}

function requireTeacher(req, res, next) {
  if (req.user?.role !== "teacher") {
    return res.status(403).json({ message: "需要教師權限" });
  }

  next();
}

app.get("/", (req, res) => {
  res.send("CityAuncel backend is running");
});

app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "請填寫完整資料" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, group_id, is_group_leader)
       VALUES (?, ?, ?, 'student', NULL, 0)`,
      [username, email, passwordHash],
    );

    await pool.query(
      `INSERT INTO user_game_data (
        user_id,
        student_thought,
        student_plan,
        final_summaries,
        earned_titles,
        unlocked_cards,
        map_state
      )
      VALUES (?, '', '', JSON_ARRAY(), JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT())`,
      [result.insertId],
    );

    res.json({ message: "註冊成功" });
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "帳號或 Email 已被使用" });
    }

    res.status(500).json({ message: "伺服器錯誤" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res.status(400).json({ message: "請輸入帳號與密碼" });
    }

    const [users] = await pool.query(
      `SELECT id, username, email, password_hash, role, group_id, is_group_leader
       FROM users
       WHERE username = ? OR email = ?`,
      [account, account],
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    const role = user.role || "student";

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    if (role === "teacher") {
      await insertTeacherActivityLog({
        teacherId: user.id,
        teacherName: user.username,
        eventType: "teacher_login",
        eventLabel: "教師登入",
        metadata: { account },
      });
    } else {
      await insertActivityLog({
        userId: user.id,
        username: user.username,
        role,
        groupId: user.group_id || null,
        eventType: "login",
        eventLabel: "學生登入",
        metadata: { account },
      });
    }

    res.json({
      message: "登入成功",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
        groupId: user.group_id || null,
        groupName: user.group_id
          ? GROUPS[user.group_id]?.name || user.group_id
          : null,
        isGroupLeader: Boolean(user.is_group_leader),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const [userRows] = await pool.query(
      `SELECT id, username, email, role, group_id, is_group_leader
       FROM users
       WHERE id = ?`,
      [req.user.id],
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "找不到使用者" });
    }

    const user = userRows[0];
    const groupId = user.group_id || null;

    let groupMembers = [];

    if (groupId) {
      const [memberRows] = await pool.query(
        `SELECT id, username, email, is_group_leader
         FROM users
         WHERE group_id = ?
         AND COALESCE(role, 'student') = 'student'
         ORDER BY is_group_leader DESC, id ASC`,
        [groupId],
      );

      groupMembers = memberRows.map((member) => ({
        id: member.id,
        username: member.username,
        name: member.username,
        email: member.email,
        isGroupLeader: Boolean(member.is_group_leader),
      }));
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || "student",
        groupId,
        groupName: groupId ? GROUPS[groupId]?.name || groupId : null,
        isGroupLeader: Boolean(user.is_group_leader),
        groupMembers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "同步使用者資料失敗" });
  }
});

app.get("/api/map-task-status", authenticateToken, async (req, res) => {
  try {
    const status = await getGameSetting("map_task_status", { isOpen: false });

    res.json({
      isOpen: Boolean(status.isOpen),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取地圖任務狀態失敗" });
  }
});

app.put(
  "/api/map-task-status",
  authenticateToken,
  requireTeacher,
  async (req, res) => {
    try {
      const isOpen = Boolean(req.body?.isOpen);

      await setGameSetting("map_task_status", { isOpen });

      await insertTeacherActivityLog({
        teacherId: req.user.id,
        teacherName: req.user.username || null,
        eventType: "toggle_map_task",
        eventLabel: isOpen ? "教師開啟地圖任務" : "教師關閉地圖任務",
        targetType: "map_task_status",
        newValue: { isOpen },
      });

      res.json({
        message: isOpen ? "地圖任務已開啟" : "地圖任務已關閉",
        isOpen,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "更新地圖任務狀態失敗" });
    }
  },
);

app.get("/api/user-data", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        student_thought,
        student_plan,
        final_summaries,
        earned_titles,
        unlocked_cards,
        map_state,
        barrage_coins
      FROM user_game_data
      WHERE user_id = ?`,
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.json({
        studentThought: "",
        studentPlan: "",
        finalSummaries: [],
        earnedTitles: [],
        unlockedCards: [],
        mapState: {},
        barrageCoins: 0,
      });
    }

    res.json({
      studentThought: rows[0].student_thought || "",
      studentPlan: rows[0].student_plan || "",
      finalSummaries: parseJSON(rows[0].final_summaries, []),
      earnedTitles: parseJSON(rows[0].earned_titles, []),
      unlockedCards: parseJSON(rows[0].unlocked_cards, []),
      mapState: parseJSON(rows[0].map_state, {}),
      barrageCoins: rows[0].barrage_coins || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

app.put("/api/user-data", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      studentThought,
      studentPlan,
      finalSummaries,
      earnedTitles,
      unlockedCards,
    } = req.body;

    const [oldRows] = await pool.query(
      `SELECT u.username, u.role, u.group_id,
              g.student_thought, g.student_plan, g.final_summaries,
              g.earned_titles, g.unlocked_cards
       FROM users u
       LEFT JOIN user_game_data g ON u.id = g.user_id
       WHERE u.id = ?`,
      [userId],
    );

    const oldData = oldRows[0] || {};
    const nextStudentThought = studentThought || "";
    const nextStudentPlan = studentPlan || "";
    const nextFinalSummaries = finalSummaries || [];
    const nextEarnedTitles = earnedTitles || [];
    const nextUnlockedCards = unlockedCards || [];

    const oldFinalSummaries = parseJSON(oldData.final_summaries, []);
    const oldEarnedTitles = parseJSON(oldData.earned_titles, []);
    const oldUnlockedCards = parseJSON(oldData.unlocked_cards, []);

    await pool.query(
      `
      INSERT INTO user_game_data (
        user_id,
        student_thought,
        student_plan,
        final_summaries,
        earned_titles,
        unlocked_cards,
        map_state
      )
      VALUES (?, ?, ?, ?, ?, ?, JSON_OBJECT())
      ON DUPLICATE KEY UPDATE
        student_thought = VALUES(student_thought),
        student_plan = VALUES(student_plan),
        final_summaries = VALUES(final_summaries),
        earned_titles = VALUES(earned_titles),
        unlocked_cards = VALUES(unlocked_cards),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        userId,
        nextStudentThought,
        nextStudentPlan,
        JSON.stringify(nextFinalSummaries),
        JSON.stringify(nextEarnedTitles),
        JSON.stringify(nextUnlockedCards),
      ],
    );

    const actor = {
      userId,
      username: oldData.username || req.user.username || null,
      role: oldData.role || req.user.role || null,
      groupId: oldData.group_id || null,
    };

    const finalSummarySubmitted = oldFinalSummaries.length !== nextFinalSummaries.length;
    const unlockedCardsChanged = jsonText(oldUnlockedCards) !== jsonText(nextUnlockedCards);
    const earnedTitlesChanged = jsonText(oldEarnedTitles) !== jsonText(nextEarnedTitles);

    // 重要：不要在 /api/user-data 自動儲存時記錄 studentThought/studentPlan，
    // 否則 textarea 每打一個字都會產生一筆「學生打字」紀錄。
    // 文字歷程改由前端在學生按「下一步／完成」時呼叫 /api/activity-log 記一筆完整內容。
    if (finalSummarySubmitted) {
      await pool.query(
        "UPDATE user_game_data SET barrage_coins = LEAST(COALESCE(barrage_coins, 0) + 3, 10) WHERE user_id = ?",
        [userId],
      );

      await insertActivityLog({
        ...actor,
        eventType: "coin_reward",
        eventLabel: "完成探究調查書獲得 3 coin",
        targetType: "barrage_coin",
        newValue: { amount: 3 },
      });

      await insertActivityLog({
        ...actor,
        eventType: "final_summary_submit",
        eventLabel: "送出數據探究總結",
        targetType: "summary",
        targetId: String(nextFinalSummaries.length),
        previousValue: { summaryCount: oldFinalSummaries.length },
        newValue: {
          summaryCount: nextFinalSummaries.length,
          latestSummary: nextFinalSummaries.at(-1) || null,
        },
      });
    }

    // 卡牌只記解鎖結果，不記開啟卡牌或切換分類。
    if (unlockedCardsChanged) {
      await insertActivityLog({
        ...actor,
        eventType: "card_unlock",
        eventLabel: "卡牌解鎖更新",
        targetType: "cards",
        previousValue: { count: oldUnlockedCards.length },
        newValue: { count: nextUnlockedCards.length },
        metadata: { unlockedCards: nextUnlockedCards },
      });
    }

    // 稱號屬於遊戲結果，保留但只在實際變化時記錄。
    if (earnedTitlesChanged) {
      await insertActivityLog({
        ...actor,
        eventType: "title_reward",
        eventLabel: "稱號獲得更新",
        targetType: "titles",
        previousValue: oldEarnedTitles,
        newValue: nextEarnedTitles,
      });
    }

    const [coinRows] = await pool.query(
      "SELECT barrage_coins FROM user_game_data WHERE user_id = ?",
      [userId],
    );

    res.json({
      message: "儲存成功",
      barrageCoins: coinRows[0]?.barrage_coins || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

app.get("/api/user-map", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT map_state FROM user_game_data WHERE user_id = ?",
      [req.user.id],
    );

    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO user_game_data (user_id, map_state)
         VALUES (?, JSON_OBJECT())`,
        [req.user.id],
      );

      return res.json({ mapState: {} });
    }

    res.json({
      mapState: parseJSON(rows[0].map_state, {}),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取個人地圖失敗" });
  }
});

app.put("/api/user-map", authenticateToken, async (req, res) => {
  try {
    const { mapState } = req.body;
    const nextMapState = mapState || {};

    const [oldRows] = await pool.query(
      `SELECT u.username, g.map_state
       FROM users u
       LEFT JOIN user_game_data g ON u.id = g.user_id
       WHERE u.id = ?`,
      [req.user.id],
    );

    const username = oldRows[0]?.username || req.user.username || null;
    const oldMapState = parseJSON(oldRows[0]?.map_state, {});

    const allDistricts = new Set([
      ...Object.keys(oldMapState || {}),
      ...Object.keys(nextMapState || {}),
    ]);

    for (const districtName of allDistricts) {
      const previousChoice = oldMapState[districtName] || null;
      const newChoice = nextMapState[districtName] || null;

      if (previousChoice !== newChoice) {
        await insertMapActionLog({
          userId: req.user.id,
          username,
          mode: "personal",
          districtName,
          previousChoice,
          newChoice,
          actionType: previousChoice ? "change_choice" : "set_choice",
        });
      }
    }

    await pool.query(
      `
      INSERT INTO user_game_data (user_id, map_state)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        map_state = VALUES(map_state),
        updated_at = CURRENT_TIMESTAMP
      `,
      [req.user.id, JSON.stringify(nextMapState)],
    );

    res.json({ message: "個人地圖已儲存" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "儲存個人地圖失敗" });
  }
});

app.get("/api/group-personal-maps", authenticateToken, async (req, res) => {
  try {
    const [userRows] = await pool.query(
      "SELECT group_id FROM users WHERE id = ?",
      [req.user.id],
    );

    const groupId = userRows[0]?.group_id || null;

    if (!groupId) {
      return res.json({
        groupId: null,
        groupName: null,
        members: [],
        personalData: [],
        groupFinalDecisions: {},
      });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.is_group_leader, g.map_state
       FROM users u
       LEFT JOIN user_game_data g ON u.id = g.user_id
       WHERE u.group_id = ?
       AND COALESCE(u.role, 'student') = 'student'
       ORDER BY u.is_group_leader DESC, u.id ASC`,
      [groupId],
    );

    const [finalRows] = await pool.query(
      `SELECT district_name, choice
       FROM map_final_decisions
       WHERE scope = 'group'
       AND group_id = ?`,
      [groupId],
    );

    const groupFinalDecisions = {};
    finalRows.forEach((row) => {
      groupFinalDecisions[row.district_name] = row.choice;
    });

    res.json({
      groupId,
      groupName: GROUPS[groupId]?.name || groupId,
      members: rows.map((row) => ({
        id: row.id,
        username: row.username,
        name: row.username,
        email: row.email,
        isGroupLeader: Boolean(row.is_group_leader),
      })),
      personalData: rows.map((row) => parseJSON(row.map_state, {})),
      groupFinalDecisions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取小組地圖失敗" });
  }
});

app.put("/api/group-final-decision", authenticateToken, async (req, res) => {
  try {
    const { districtName, choice } = req.body;

    if (!districtName) {
      return res.status(400).json({ message: "缺少地區名稱" });
    }

    if (choice && choice !== "保育" && choice !== "開發") {
      return res.status(400).json({ message: "決策只能是保育或開發" });
    }

    const [userRows] = await pool.query(
      "SELECT username, group_id, is_group_leader FROM users WHERE id = ?",
      [req.user.id],
    );

    const user = userRows[0];

    if (!user?.group_id) {
      return res.status(400).json({ message: "尚未分配小組" });
    }

    if (!user?.is_group_leader) {
      return res.status(403).json({ message: "只有組長可以決定小組平手地區" });
    }

    const [oldRows] = await pool.query(
      `SELECT choice
       FROM map_final_decisions
       WHERE scope = 'group'
       AND group_id = ?
       AND district_name = ?`,
      [user.group_id, districtName],
    );

    const previousChoice = oldRows[0]?.choice || null;
    const newChoice = choice || null;

    if (previousChoice !== newChoice) {
      await insertMapActionLog({
        userId: req.user.id,
        username: user.username || req.user.username || null,
        mode: "group",
        groupId: user.group_id,
        districtName,
        previousChoice,
        newChoice,
        actionType: previousChoice ? "change_group_final" : "set_group_final",
      });
    }

    if (!choice) {
      await pool.query(
        `DELETE FROM map_final_decisions
         WHERE scope = 'group'
         AND group_id = ?
         AND district_name = ?`,
        [user.group_id, districtName],
      );

      return res.json({ message: "已清除小組決策" });
    }

    await pool.query(
      `INSERT INTO map_final_decisions (scope, group_id, district_name, choice)
       VALUES ('group', ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         choice = VALUES(choice),
         updated_at = CURRENT_TIMESTAMP`,
      [user.group_id, districtName, choice],
    );

    res.json({ message: "已儲存小組決策" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "儲存小組決策失敗" });
  }
});

app.get("/api/group-final-decisions", authenticateToken, async (req, res) => {
  try {
    const [userRows] = await pool.query(
      "SELECT group_id FROM users WHERE id = ?",
      [req.user.id],
    );

    const groupId = userRows[0]?.group_id || null;

    if (!groupId) return res.json({});

    const [rows] = await pool.query(
      `SELECT district_name, choice
       FROM map_final_decisions
       WHERE scope = 'group'
       AND group_id = ?`,
      [groupId],
    );

    const result = {};
    rows.forEach((row) => {
      result[row.district_name] = row.choice;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取小組決策失敗" });
  }
});

app.get("/api/class-group-decisions", authenticateToken, async (req, res) => {
  try {
    const groupResults = [];

    // 固定回傳六個小組，避免尚未有人分配到某組時，全班地圖少算該組。
    for (const [groupId, groupInfo] of Object.entries(GROUPS)) {
      const [studentRows] = await pool.query(
        `SELECT g.map_state
         FROM users u
         LEFT JOIN user_game_data g ON u.id = g.user_id
         WHERE u.group_id = ?
         AND COALESCE(u.role, 'student') = 'student'
         ORDER BY u.id ASC`,
        [groupId],
      );

      const personalMaps = studentRows.map((row) =>
        parseJSON(row.map_state, {}),
      );

      const autoGroupResult = resolveVoteFromMaps(personalMaps);

      const [finalRows] = await pool.query(
        `SELECT district_name, choice
         FROM map_final_decisions
         WHERE scope = 'group'
         AND group_id = ?`,
        [groupId],
      );

      const finalDecisionMap = {};
      finalRows.forEach((row) => {
        finalDecisionMap[row.district_name] = row.choice;
      });

      groupResults.push({
        groupId,
        groupName: groupInfo.name,
        decisions: {
          ...autoGroupResult,
          ...finalDecisionMap,
        },
      });
    }

    const [classRows] = await pool.query(
      `SELECT district_name, choice
       FROM map_final_decisions
       WHERE scope = 'class'
       AND group_id IS NULL`,
    );

    const classFinalChoices = {};
    classRows.forEach((row) => {
      classFinalChoices[row.district_name] = row.choice;
    });

    res.json({ groupResults, classFinalChoices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取全班地圖失敗" });
  }
});

app.post(
  "/api/class-final-decision",
  authenticateToken,
  requireTeacher,
  async (req, res) => {
    try {
      const { district, districtName, choice } = req.body;

      const targetDistrict = district || districtName;

      if (!targetDistrict) {
        return res.status(400).json({ message: "缺少地區名稱" });
      }

      if (choice && choice !== "保育" && choice !== "開發") {
        return res.status(400).json({ message: "決策只能是保育或開發" });
      }

      const [oldRows] = await pool.query(
        `SELECT choice
         FROM map_final_decisions
         WHERE scope = 'class'
         AND group_id IS NULL
         AND district_name = ?`,
        [targetDistrict],
      );

      const previousChoice = oldRows[0]?.choice || null;
      const newChoice = choice || null;

      if (previousChoice !== newChoice) {
        await insertMapActionLog({
          userId: req.user.id,
          username: req.user.username || null,
          mode: "class",
          groupId: null,
          districtName: targetDistrict,
          previousChoice,
          newChoice,
          actionType: previousChoice ? "change_class_final" : "set_class_final",
        });

        await insertTeacherActivityLog({
          teacherId: req.user.id,
          teacherName: req.user.username || null,
          eventType: previousChoice ? "change_class_final" : "set_class_final",
          eventLabel: "教師全班地圖最終決策",
          targetType: "class_map_district",
          targetId: targetDistrict,
          previousValue: previousChoice,
          newValue: newChoice,
        });
      }

      if (!choice) {
        await pool.query(
          `DELETE FROM map_final_decisions
           WHERE scope = 'class'
           AND group_id IS NULL
           AND district_name = ?`,
          [targetDistrict],
        );

        return res.json({ message: "已清除全班決策" });
      }

      await pool.query(
        `INSERT INTO map_final_decisions (scope, group_id, district_name, choice)
         VALUES ('class', NULL, ?, ?)
         ON DUPLICATE KEY UPDATE
           choice = VALUES(choice),
           updated_at = CURRENT_TIMESTAMP`,
        [targetDistrict, choice],
      );

      res.json({ message: "已儲存全班決策" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "儲存全班決策失敗" });
    }
  },
);

app.get("/api/class-final-decisions", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT district_name, choice
       FROM map_final_decisions
       WHERE scope = 'class'
       AND group_id IS NULL`,
    );

    const result = {};
    rows.forEach((row) => {
      result[row.district_name] = row.choice;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取全班決策失敗" });
  }
});

app.get(
  "/api/teacher/players",
  authenticateToken,
  requireTeacher,
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, username, email, role, group_id, is_group_leader
       FROM users
       WHERE COALESCE(role, 'student') = 'student'
       ORDER BY group_id ASC, is_group_leader DESC, id ASC`,
      );

      res.json({
        groups: Object.entries(GROUPS).map(([id, group]) => ({
          id,
          name: group.name,
        })),
        players: rows.map((row) => ({
          id: row.id,
          name: row.username,
          username: row.username,
          email: row.email,
          role: row.role || "student",
          groupId: row.group_id || "unassigned",
          isGroupLeader: Boolean(row.is_group_leader),
        })),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "讀取學生失敗" });
    }
  },
);

app.put(
  "/api/teacher/players/groups",
  authenticateToken,
  requireTeacher,
  async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { assignments } = req.body;

      if (!Array.isArray(assignments)) {
        return res.status(400).json({ message: "assignments 必須是陣列" });
      }

      await connection.beginTransaction();

      const affectedGroupIds = new Set();

      for (const item of assignments) {
        const userId = Number(item.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
          await connection.rollback();
          return res.status(400).json({ message: "學生 ID 格式錯誤" });
        }

        const [oldUserRows] = await connection.query(
          `SELECT group_id FROM users WHERE id = ?`,
          [userId],
        );

        const oldGroupId = oldUserRows[0]?.group_id || null;
        if (oldGroupId) affectedGroupIds.add(oldGroupId);

        const newGroupId =
          !item.groupId || item.groupId === "unassigned" ? null : item.groupId;

        if (newGroupId) affectedGroupIds.add(newGroupId);
      }

      for (const item of assignments) {
        const userId = Number(item.userId);
        const groupId =
          !item.groupId || item.groupId === "unassigned" ? null : item.groupId;
        const isGroupLeader = item.isGroupLeader ? 1 : 0;

        await connection.query(
          `UPDATE users
           SET group_id = ?, is_group_leader = ?
           WHERE id = ?
           AND COALESCE(role, 'student') = 'student'`,
          [groupId, groupId ? isGroupLeader : 0, userId],
        );
      }

      const [groupIds] = await connection.query(
        `SELECT DISTINCT group_id
         FROM users
         WHERE group_id IS NOT NULL
         AND COALESCE(role, 'student') = 'student'`,
      );

      for (const row of groupIds) {
        const [leaders] = await connection.query(
          `SELECT id
           FROM users
           WHERE group_id = ?
           AND is_group_leader = 1
           AND COALESCE(role, 'student') = 'student'
           ORDER BY id ASC`,
          [row.group_id],
        );

        if (leaders.length > 1) {
          const keepId = leaders[0].id;

          await connection.query(
            `UPDATE users
             SET is_group_leader = 0
             WHERE group_id = ?
             AND id <> ?
             AND COALESCE(role, 'student') = 'student'`,
            [row.group_id, keepId],
          );
        }
      }

      if (affectedGroupIds.size > 0) {
        await connection.query(
          `DELETE FROM map_final_decisions
           WHERE scope = 'group'
           AND group_id IN (?)`,
          [[...affectedGroupIds]],
        );
      }

      await connection.query(
        `DELETE FROM map_final_decisions
         WHERE scope = 'class'
         AND group_id IS NULL`,
      );

      await insertTeacherActivityLog({
        teacherId: req.user.id,
        teacherName: req.user.username || null,
        eventType: "update_student_groups",
        eventLabel: "教師更新學生分組與組長",
        targetType: "group_assignment",
        metadata: {
          assignmentCount: assignments.length,
          affectedGroupIds: [...affectedGroupIds],
        },
      });

      await connection.commit();

      res.json({
        message: "分組與組長儲存成功，地圖決策已重新整理",
      });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ message: "儲存分組失敗" });
    } finally {
      connection.release();
    }
  },
);

app.put(
  "/api/teacher/groups",
  authenticateToken,
  requireTeacher,
  async (req, res) => {
    const { assignments } = req.body;

    try {
      const affectedGroupIds = new Set();

      for (const item of assignments || []) {
        const [oldUserRows] = await pool.query(
          `SELECT group_id FROM users WHERE id = ?`,
          [item.userId],
        );

        const oldGroupId = oldUserRows[0]?.group_id || null;
        if (oldGroupId) affectedGroupIds.add(oldGroupId);

        const newGroupId =
          !item.groupId || item.groupId === "unassigned" ? null : item.groupId;

        if (newGroupId) affectedGroupIds.add(newGroupId);
      }

      for (const item of assignments || []) {
        const groupId =
          !item.groupId || item.groupId === "unassigned" ? null : item.groupId;
        const isGroupLeader = item.isGroupLeader ? 1 : 0;

        await pool.query(
          `UPDATE users
           SET group_id = ?, is_group_leader = ?
           WHERE id = ?
           AND COALESCE(role, 'student') = 'student'`,
          [groupId, groupId ? isGroupLeader : 0, item.userId],
        );
      }

      if (affectedGroupIds.size > 0) {
        await pool.query(
          `DELETE FROM map_final_decisions
           WHERE scope = 'group'
           AND group_id IN (?)`,
          [[...affectedGroupIds]],
        );
      }

      await pool.query(
        `DELETE FROM map_final_decisions
         WHERE scope = 'class'
         AND group_id IS NULL`,
      );

      await insertTeacherActivityLog({
        teacherId: req.user.id,
        teacherName: req.user.username || null,
        eventType: "update_student_groups",
        eventLabel: "教師更新學生分組與組長",
        targetType: "group_assignment",
        metadata: {
          assignmentCount: (assignments || []).length,
          affectedGroupIds: [...affectedGroupIds],
        },
      });

      res.json({
        message: "分組完成，地圖決策已重新整理",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "分組失敗" });
    }
  },
);

app.get("/api/barrage-status", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO user_game_data (user_id, barrage_coins, map_state)
       VALUES (?, 0, JSON_OBJECT())
       ON DUPLICATE KEY UPDATE barrage_coins = LEAST(COALESCE(barrage_coins, 0), 10)`,
      [req.user.id],
    );

    const [rows] = await pool.query(
      "SELECT barrage_coins FROM user_game_data WHERE user_id = ?",
      [req.user.id],
    );

    res.json({ coins: rows[0]?.barrage_coins || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取彈幕 coin 失敗" });
  }
});

app.get("/api/barrages/latest-id", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT COALESCE(MAX(id), 0) AS latestId FROM barrages",
    );

    res.json({ latestId: Number(rows[0]?.latestId) || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取最新彈幕 ID 失敗" });
  }
});

app.get("/api/barrages", authenticateToken, async (req, res) => {
  try {
    const afterId = Math.max(Number(req.query.afterId) || 0, 0);

    const [rows] = await pool.query(
      `SELECT
         id,
         user_id AS userId,
         username,
         content,
         created_at AS createdAt
       FROM barrages
       WHERE id > ?
       ORDER BY id ASC
       LIMIT 20`,
      [afterId],
    );

    res.json({ barrages: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取彈幕失敗" });
  }
});

app.post("/api/barrages", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const content = String(req.body?.content || "").trim();

    if (!content) {
      return res.status(400).json({ message: "請輸入彈幕內容" });
    }

    if (content.length > BARRAGE_MAX_LENGTH) {
      return res.status(400).json({ message: "彈幕最多 20 個字" });
    }

    if (containsBadWords(content)) {
      return res.status(400).json({
        message: "彈幕內容包含不適當字詞，請重新輸入",
      });
    }

    await connection.beginTransaction();

    const [userRows] = await connection.query(
      `SELECT u.username, u.role, u.group_id, g.barrage_coins
       FROM users u
       LEFT JOIN user_game_data g ON u.id = g.user_id
       WHERE u.id = ?
       FOR UPDATE`,
      [req.user.id],
    );

    const user = userRows[0];
    const role = user?.role || req.user.role || "student";

    if (role === "teacher") {
      await connection.rollback();
      return res.status(403).json({ message: "教師不能使用學生彈幕 coin" });
    }

    const coins = user?.barrage_coins || 0;

    if (coins < 1) {
      await connection.rollback();
      return res.status(400).json({
        message: "coin 不足，完成探究調查書可以獲得 3 coin",
      });
    }

    await connection.query(
      "UPDATE user_game_data SET barrage_coins = barrage_coins - 1 WHERE user_id = ?",
      [req.user.id],
    );

    const [result] = await connection.query(
      "INSERT INTO barrages (user_id, username, content) VALUES (?, ?, ?)",
      [req.user.id, user?.username || req.user.username || null, content],
    );

    await insertActivityLog({
      userId: req.user.id,
      username: user?.username || req.user.username || null,
      role,
      groupId: user?.group_id || null,
      eventType: "barrage_send",
      eventLabel: "送出彈幕",
      targetType: "barrage",
      targetId: String(result.insertId),
      newValue: { content, cost: 1, coinsAfter: coins - 1 },
    });

    await connection.commit();

    res.json({
      message: "彈幕已送出",
      coins: coins - 1,
      barrage: {
        id: result.insertId,
        userId: req.user.id,
        username: user?.username || req.user.username || null,
        content,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "送出彈幕失敗" });
  } finally {
    connection.release();
  }
});

app.post("/api/activity-log", authenticateToken, async (req, res) => {
  try {
    const {
      eventType,
      eventLabel,
      targetType,
      targetId,
      previousValue,
      newValue,
      metadata,
    } = req.body || {};

    if (!eventType) {
      return res.status(400).json({ message: "缺少 eventType" });
    }

    const user = await getRequestUserProfile(req.user.id);

    const role = user?.role || req.user.role || null;

    if (role === "teacher") {
      await insertTeacherActivityLog({
        teacherId: req.user.id,
        teacherName: user?.username || req.user.username || null,
        eventType,
        eventLabel,
        targetType,
        targetId,
        previousValue,
        newValue,
        metadata,
      });
    } else {
      await insertActivityLog({
        userId: req.user.id,
        username: user?.username || req.user.username || null,
        role,
        groupId: user?.group_id || null,
        eventType,
        eventLabel,
        targetType,
        targetId,
        previousValue,
        newValue,
        metadata,
      });
    }

    res.json({ message: "活動紀錄已儲存" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "儲存活動紀錄失敗" });
  }
});

app.get(
  "/api/teacher/activity-logs",
  authenticateToken,
  requireTeacher,
  async (req, res) => {
    try {
          const userId = req.query.userId ? Number(req.query.userId) : null;
      const eventType = req.query.eventType ? String(req.query.eventType) : null;
      const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);

      const where = [];
      const params = [];

      if (userId) {
        where.push("a.user_id = ?");
        params.push(userId);
      }

      if (eventType) {
        where.push("a.event_type = ?");
        params.push(eventType);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT
           a.id,
           a.user_id AS userId,
           COALESCE(u.username, a.username) AS username,
           COALESCE(u.role, a.role) AS role,
           COALESCE(u.group_id, a.group_id) AS groupId,
           a.event_type AS eventType,
           a.event_label AS eventLabel,
           a.target_type AS targetType,
           a.target_id AS targetId,
           a.previous_value AS previousValue,
           a.new_value AS newValue,
           a.metadata,
           a.created_at AS createdAt
         FROM activity_logs a
         LEFT JOIN users u ON u.id = a.user_id
         ${whereSql}
         ORDER BY a.created_at ASC, a.id ASC
         LIMIT ?`,
        [...params, limit],
      );

      res.json({
        logs: rows.map((row) => ({
          ...row,
          previousValue: parseJSON(row.previousValue, row.previousValue),
          newValue: parseJSON(row.newValue, row.newValue),
          metadata: parseJSON(row.metadata, row.metadata),
        })),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "讀取活動紀錄失敗" });
    }
  },
);


app.get(
  "/api/teacher/teacher-activity-logs",
  authenticateToken,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.query.teacherId ? Number(req.query.teacherId) : null;
      const eventType = req.query.eventType ? String(req.query.eventType) : null;
      const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);

      const where = [];
      const params = [];

      if (teacherId) {
        where.push("teacher_id = ?");
        params.push(teacherId);
      }

      if (eventType) {
        where.push("event_type = ?");
        params.push(eventType);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT
           id,
           teacher_id AS teacherId,
           teacher_name AS teacherName,
           event_type AS eventType,
           event_label AS eventLabel,
           target_type AS targetType,
           target_id AS targetId,
           previous_value AS previousValue,
           new_value AS newValue,
           metadata,
           created_at AS createdAt
         FROM teacher_activity_logs
         ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [...params, limit],
      );

      res.json({
        logs: rows.map((row) => ({
          ...row,
          previousValue: parseJSON(row.previousValue, row.previousValue),
          newValue: parseJSON(row.newValue, row.newValue),
          metadata: parseJSON(row.metadata, row.metadata),
        })),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "讀取教師活動紀錄失敗" });
    }
  },
);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});