const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("./db");

const app = express(); 
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3001;

const GROUPS = {
  environment: { name: "🌿環境保育聯盟" },
  government: { name: "🚧地方政府局" },
  farming: { name: "🐄農牧產業協會" },
  animal: { name: "🐕動物保護團體" },
  greenEnergy: { name: "☀️綠能科技企業" },
  education: { name: "🎓教育推動單位" },
};

const VALID_MAP_CHOICES = ["保育", "開發", "我不知道"];
const VALID_FINAL_CHOICES = ["保育", "開發"];
const BARRAGE_MAX_LENGTH = 20;
const MAX_BARRAGE_COINS = 10;

const BAD_WORDS = [
  "幹", "靠", "操", "淦", "肏", "屌", "雞掰", "機掰", "靠北", "靠杯", "靠腰",
  "媽的", "他媽", "他媽的", "三小", "殺小", "白癡", "智障", "腦殘", "低能",
  "垃圾", "廢物", "去死", "王八蛋", "混蛋", "爛人", "醜八怪", "北七", "87",
  "哭爸", "哭夭", "賤", "賤人", "死胖子", "死矮子", "臭三八", "破麻",
  "fuck", "fuk", "fck", "shit", "bitch", "asshole", "idiot", "stupid", "damn",
  "trash", "loser", "kill yourself", "kys",
];

function parseJSON(data, fallback) {
  try {
    if (data == null) return fallback;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return fallback;
  }
}

function stringify(value) {
  return JSON.stringify(value ?? null);
}

function normalizeGroupId(groupId) {
  return !groupId || groupId === "unassigned" ? null : String(groupId);
}

function mapGroupName(groupId) {
  return groupId ? GROUPS[groupId]?.name || groupId : null;
}

function objectFromChoiceRows(rows) {
  const result = {};
  rows.forEach((row) => {
    result[row.district_name || row.districtName] = row.choice;
  });
  return result;
}

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

async function ensureUserProfile(userId) {
  await pool.query(
    `INSERT IGNORE INTO student_profiles (user_id, barrage_coins)
     VALUES (?, 0)`,
    [userId],
  );
}

async function getRequestUserProfile(userId) {
  const [rows] = await pool.query(
    `SELECT id, username, email, role, group_id, is_group_leader
     FROM users
     WHERE id = ?`,
    [userId],
  );
  return rows[0] || null;
}

async function getGameSetting(key, fallback) {
  const [rows] = await pool.query(
    "SELECT setting_value FROM game_settings WHERE setting_key = ?",
    [key],
  );
  if (rows.length === 0) return fallback;
  return parseJSON(rows[0].setting_value, fallback);
}

async function setGameSetting(key, value) {
  await pool.query(
    `INSERT INTO game_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value)],
  );
}

async function insertStudentActivityLog({
  userId = null,
  username = null,
  role = "student",
  groupId = null,
  eventType,
  eventLabel = null,
  targetType = null,
  targetId = null,
  previousValue = null,
  newValue = null,
  metadata = null,
}) {
  if (!eventType || role === "teacher") return;

  try {
    await pool.query(
      `INSERT INTO student_activity_logs (
        user_id, username, role, group_id, event_type, event_label,
        target_type, target_id, previous_value, new_value, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        teacher_id, teacher_name, event_type, event_label, target_type,
        target_id, previous_value, new_value, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

async function getActor(userId, tokenUser = {}) {
  const user = await getRequestUserProfile(userId);
  return {
    userId,
    username: user?.username || tokenUser.username || null,
    role: user?.role || tokenUser.role || "student",
    groupId: user?.group_id || null,
  };
}

async function readUserData(userId) {
  await ensureUserProfile(userId);

  const [[profile]] = await pool.query(
    `SELECT student_thought, student_plan, barrage_coins
     FROM student_profiles
     WHERE user_id = ?`,
    [userId],
  );

  const [plans] = await pool.query(
    `SELECT plan_data
     FROM inquiry_plans
     WHERE user_id = ?
     ORDER BY plan_order ASC, id ASC`,
    [userId],
  );

  const [summaries] = await pool.query(
    `SELECT summary_data
     FROM final_summaries
     WHERE user_id = ?
     ORDER BY summary_order ASC, id ASC`,
    [userId],
  );

  const [titles] = await pool.query(
    `SELECT title_key
     FROM user_titles
     WHERE user_id = ?
     ORDER BY earned_at ASC, title_key ASC`,
    [userId],
  );

  const [cards] = await pool.query(
    `SELECT card_key, card_data
     FROM user_cards
     WHERE user_id = ?
     ORDER BY unlocked_at ASC, card_key ASC`,
    [userId],
  );

  const [mapRows] = await pool.query(
    `SELECT district_name, choice
     FROM user_map_choices
     WHERE user_id = ?`,
    [userId],
  );

  return {
    studentThought: profile?.student_thought || "",
    studentPlan: profile?.student_plan || "",
    inquiryPlans: plans.map((row) => parseJSON(row.plan_data, null)).filter(Boolean),
    finalSummaries: summaries.map((row) => parseJSON(row.summary_data, null)).filter(Boolean),
    earnedTitles: titles.map((row) => row.title_key),
    unlockedCards: cards.map((row) => parseJSON(row.card_data, row.card_key)),
    mapState: objectFromChoiceRows(mapRows),
    barrageCoins: Number(profile?.barrage_coins) || 0,
  };
}

async function replaceOrderedJsonRows(connection, tableName, userId, orderColumn, dataColumn, items) {
  await connection.query(`DELETE FROM ${tableName} WHERE user_id = ?`, [userId]);
  for (const [index, item] of items.entries()) {
    await connection.query(
      `INSERT INTO ${tableName} (user_id, ${orderColumn}, ${dataColumn}) VALUES (?, ?, ?)`,
      [userId, index + 1, JSON.stringify(item)],
    );
  }
}

async function replaceTitles(connection, userId, titles) {
  await connection.query("DELETE FROM user_titles WHERE user_id = ?", [userId]);
  for (const title of titles) {
    await connection.query(
      `INSERT IGNORE INTO user_titles (user_id, title_key) VALUES (?, ?)`,
      [userId, String(title)],
    );
  }
}

async function replaceCards(connection, userId, cards) {
  await connection.query("DELETE FROM user_cards WHERE user_id = ?", [userId]);
  for (const card of cards) {
    const cardKey = typeof card === "string" ? card : String(card?.id || card?.cardId || JSON.stringify(card));
    await connection.query(
      `INSERT INTO user_cards (user_id, card_key, card_data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE card_data = VALUES(card_data)`,
      [userId, cardKey, JSON.stringify(card)],
    );
  }
}

async function replaceMapChoices(connection, userId, nextMapState) {
  const [oldRows] = await connection.query(
    `SELECT district_name, choice FROM user_map_choices WHERE user_id = ?`,
    [userId],
  );
  const oldMapState = objectFromChoiceRows(oldRows);

  const allDistricts = new Set([
    ...Object.keys(oldMapState || {}),
    ...Object.keys(nextMapState || {}),
  ]);

  for (const districtName of allDistricts) {
    const previousChoice = oldMapState[districtName] || null;
    const newChoice = nextMapState[districtName] || null;

    if (newChoice && !VALID_MAP_CHOICES.includes(newChoice)) continue;

    if (!newChoice) {
      await connection.query(
        "DELETE FROM user_map_choices WHERE user_id = ? AND district_name = ?",
        [userId, districtName],
      );
    } else {
      await connection.query(
        `INSERT INTO user_map_choices (user_id, district_name, choice)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE choice = VALUES(choice), updated_at = CURRENT_TIMESTAMP`,
        [userId, districtName, newChoice],
      );
    }

    if (previousChoice !== newChoice) {
      await connection.query(
        `INSERT INTO map_action_logs (
          user_id, username, mode, group_id, district_name,
          previous_choice, new_choice, action_type
        ) VALUES (?, ?, 'personal', NULL, ?, ?, ?, ?)`,
        [
          userId,
          null,
          districtName,
          previousChoice,
          newChoice,
          previousChoice ? "change_choice" : "set_choice",
        ],
      );
    }
  }

  return oldMapState;
}

function resolveVoteFromMaps(maps) {
  const result = {};
  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([district, choice]) => {
      if (!result[district]) result[district] = { 保育: 0, 開發: 0, 我不知道: 0 };
      if (choice === "保育") result[district].保育 += 1;
      if (choice === "開發") result[district].開發 += 1;
      if (choice === "我不知道") result[district].我不知道 += 1;
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

async function buildSuspectVotingPayload(userId = null) {
  const status = await getGameSetting("suspect_voting_status", {
    isOpen: false,
    isFinalized: false,
  });

  const [totalRows] = await pool.query(
    `SELECT group_id AS groupId, COUNT(*) AS count
     FROM suspect_votes
     GROUP BY group_id`,
  );

  const totals = {};
  totalRows.forEach((row) => {
    totals[row.groupId] = Number(row.count) || 0;
  });

  const [[voterRow]] = await pool.query(
    "SELECT COUNT(DISTINCT user_id) AS totalVoters FROM suspect_votes",
  );

  const [[eligibleRow]] = await pool.query(
    `SELECT COUNT(*) AS totalEligibleVoters
     FROM users
     WHERE COALESCE(role, 'student') = 'student'`,
  );

  let myVotes = [];
  if (userId) {
    const [myRows] = await pool.query(
      `SELECT group_id AS groupId
       FROM suspect_votes
       WHERE user_id = ?
       ORDER BY group_id ASC`,
      [userId],
    );
    myVotes = myRows.map((row) => row.groupId);
  }

  return {
    isOpen: Boolean(status.isOpen),
    isFinalized: Boolean(status.isFinalized),
    totals,
    totalVoters: Number(voterRow?.totalVoters) || 0,
    totalEligibleVoters: Number(eligibleRow?.totalEligibleVoters) || 0,
    myVotes,
  };
}

app.get("/", (req, res) => {
  res.send("CityAuncel backend is running with the clean database schema");
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

    await ensureUserProfile(result.insertId);
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

    if (users.length === 0) return res.status(401).json({ message: "帳號或密碼錯誤" });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: "帳號或密碼錯誤" });

    const role = user.role || "student";
    if (role !== "teacher") await ensureUserProfile(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    if (role === "teacher") {
      insertTeacherActivityLog({
        teacherId: user.id,
        teacherName: user.username,
        eventType: "teacher_login",
        eventLabel: "教師登入",
        metadata: { account },
      });
    } else {
      insertStudentActivityLog({
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
        groupName: mapGroupName(user.group_id),
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
    const user = await getRequestUserProfile(req.user.id);
    if (!user) return res.status(404).json({ message: "找不到使用者" });

    const groupId = user.group_id || null;
    let groupMembers = [];
    if (groupId) {
      const [memberRows] = await pool.query(
        `SELECT id, username, email, is_group_leader
         FROM users
         WHERE group_id = ? AND COALESCE(role, 'student') = 'student'
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
        groupName: mapGroupName(groupId),
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
    res.json({ isOpen: Boolean(status.isOpen) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取地圖任務狀態失敗" });
  }
});

app.put("/api/map-task-status", authenticateToken, requireTeacher, async (req, res) => {
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
    res.json({ message: isOpen ? "地圖任務已開啟" : "地圖任務已關閉", isOpen });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "更新地圖任務狀態失敗" });
  }
});

app.get("/api/inquiry-task-status", authenticateToken, async (req, res) => {
  try {
    const status = await getGameSetting("inquiry_task_status", { isOpen: true });
    res.json({ isOpen: status.isOpen !== false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取探究調查狀態失敗" });
  }
});

app.put("/api/inquiry-task-status", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const isOpen = Boolean(req.body?.isOpen);
    await setGameSetting("inquiry_task_status", { isOpen });
    await insertTeacherActivityLog({
      teacherId: req.user.id,
      teacherName: req.user.username || null,
      eventType: "toggle_inquiry_task",
      eventLabel: isOpen ? "教師開啟探究調查" : "教師關閉探究調查",
      targetType: "inquiry_task_status",
      newValue: { isOpen },
    });
    res.json({ message: isOpen ? "探究調查已開啟" : "探究調查已關閉", isOpen });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "更新探究調查狀態失敗" });
  }
});

app.get("/api/suspect-voting-status", authenticateToken, async (req, res) => {
  try {
    res.json(await buildSuspectVotingPayload(req.user.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取嫌犯投票狀態失敗" });
  }
});

app.put("/api/suspect-voting-status", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const isOpen = Boolean(req.body?.isOpen);
    const previousStatus = await getGameSetting("suspect_voting_status", { isOpen: false, isFinalized: false });
    const nextStatus = { isOpen, isFinalized: isOpen ? false : Boolean(previousStatus.isFinalized) };
    await setGameSetting("suspect_voting_status", nextStatus);
    await insertTeacherActivityLog({
      teacherId: req.user.id,
      teacherName: req.user.username || null,
      eventType: "toggle_suspect_voting",
      eventLabel: isOpen ? "教師開啟嫌犯投票" : "教師關閉嫌犯投票",
      targetType: "suspect_voting_status",
      previousValue: previousStatus,
      newValue: nextStatus,
    });
    res.json(await buildSuspectVotingPayload(req.user.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "更新嫌犯投票狀態失敗" });
  }
});

app.post("/api/suspect-votes", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const status = await getGameSetting("suspect_voting_status", { isOpen: false, isFinalized: false });
    if (!status.isOpen || status.isFinalized) return res.status(403).json({ message: "目前未開放嫌犯投票" });

    const actor = await getActor(req.user.id, req.user);
    if (actor.role === "teacher") return res.status(403).json({ message: "教師不能送出學生投票" });

    const groupIds = Array.from(new Set(req.body?.groupIds || []))
      .map(String)
      .filter((groupId) => GROUPS[groupId]);
    if (groupIds.length === 0) return res.status(400).json({ message: "請至少選擇一個嫌犯小組" });

    await connection.beginTransaction();
    await connection.query("DELETE FROM suspect_votes WHERE user_id = ?", [req.user.id]);
    for (const groupId of groupIds) {
      await connection.query("INSERT INTO suspect_votes (user_id, group_id) VALUES (?, ?)", [req.user.id, groupId]);
    }
    await connection.commit();

    await insertStudentActivityLog({
      ...actor,
      eventType: "suspect_vote_submit",
      eventLabel: "送出嫌犯投票",
      targetType: "suspect_voting",
      newValue: { groupIds },
    });

    res.json(await buildSuspectVotingPayload(req.user.id));
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "送出嫌犯投票失敗" });
  } finally {
    connection.release();
  }
});

app.post("/api/suspect-voting-finish", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const previousStatus = await getGameSetting("suspect_voting_status", { isOpen: false, isFinalized: false });
    const nextStatus = { isOpen: false, isFinalized: true };
    await setGameSetting("suspect_voting_status", nextStatus);
    await insertTeacherActivityLog({
      teacherId: req.user.id,
      teacherName: req.user.username || null,
      eventType: "finish_suspect_voting",
      eventLabel: "教師結束嫌犯投票並公布結果",
      targetType: "suspect_voting_status",
      previousValue: previousStatus,
      newValue: nextStatus,
    });
    res.json(await buildSuspectVotingPayload(req.user.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "結束嫌犯投票失敗" });
  }
});

app.get("/api/user-data", authenticateToken, async (req, res) => {
  try {
    res.json(await readUserData(req.user.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

app.put("/api/user-data", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const oldData = await readUserData(userId);

    const nextStudentThought = req.body.studentThought || "";
    const nextStudentPlan = req.body.studentPlan || "";
    const nextInquiryPlans = Array.isArray(req.body.inquiryPlans) ? req.body.inquiryPlans : [];
    const nextFinalSummaries = Array.isArray(req.body.finalSummaries) ? req.body.finalSummaries : [];
    const nextEarnedTitles = Array.isArray(req.body.earnedTitles) ? req.body.earnedTitles : [];
    const nextUnlockedCards = Array.isArray(req.body.unlockedCards) ? req.body.unlockedCards : [];

    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO student_profiles (user_id, student_thought, student_plan, barrage_coins)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         student_thought = VALUES(student_thought),
         student_plan = VALUES(student_plan),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, nextStudentThought, nextStudentPlan],
    );
    await replaceOrderedJsonRows(connection, "inquiry_plans", userId, "plan_order", "plan_data", nextInquiryPlans);
    await replaceOrderedJsonRows(connection, "final_summaries", userId, "summary_order", "summary_data", nextFinalSummaries);
    await replaceTitles(connection, userId, nextEarnedTitles);
    await replaceCards(connection, userId, nextUnlockedCards);

    const finalSummarySubmitted = oldData.finalSummaries.length !== nextFinalSummaries.length;
    if (finalSummarySubmitted) {
      await connection.query(
        `UPDATE student_profiles
         SET barrage_coins = LEAST(COALESCE(barrage_coins, 0) + 3, ?)
         WHERE user_id = ?`,
        [MAX_BARRAGE_COINS, userId],
      );
    }
    await connection.commit();

    const actor = await getActor(userId, req.user);
    if (finalSummarySubmitted) {
      await insertStudentActivityLog({
        ...actor,
        eventType: "coin_reward",
        eventLabel: "完成探究調查書獲得 3 coin",
        targetType: "barrage_coin",
        newValue: { amount: 3 },
      });
      await insertStudentActivityLog({
        ...actor,
        eventType: "final_summary_submit",
        eventLabel: "送出數據探究總結",
        targetType: "summary",
        targetId: String(nextFinalSummaries.length),
        previousValue: { summaryCount: oldData.finalSummaries.length },
        newValue: { summaryCount: nextFinalSummaries.length, latestSummary: nextFinalSummaries.at(-1) || null },
      });
    }

    if (stringify(oldData.unlockedCards) !== stringify(nextUnlockedCards)) {
      await insertStudentActivityLog({
        ...actor,
        eventType: "card_unlock",
        eventLabel: "卡牌解鎖更新",
        targetType: "cards",
        previousValue: { count: oldData.unlockedCards.length },
        newValue: { count: nextUnlockedCards.length },
        metadata: { unlockedCards: nextUnlockedCards },
      });
    }

    if (stringify(oldData.earnedTitles) !== stringify(nextEarnedTitles)) {
      await insertStudentActivityLog({
        ...actor,
        eventType: "title_reward",
        eventLabel: "稱號獲得更新",
        targetType: "titles",
        previousValue: oldData.earnedTitles,
        newValue: nextEarnedTitles,
      });
    }

    const [[coinRow]] = await pool.query("SELECT barrage_coins FROM student_profiles WHERE user_id = ?", [userId]);
    res.json({ message: "儲存成功", barrageCoins: Number(coinRow?.barrage_coins) || 0 });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  } finally {
    connection.release();
  }
});

app.get("/api/user-map", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT district_name, choice FROM user_map_choices WHERE user_id = ?",
      [req.user.id],
    );
    res.json({ mapState: objectFromChoiceRows(rows) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取個人地圖失敗" });
  }
});

app.put("/api/user-map", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const nextMapState = req.body?.mapState || {};
    const actor = await getActor(req.user.id, req.user);

    await connection.beginTransaction();
    const oldMapState = await replaceMapChoices(connection, req.user.id, nextMapState);
    await connection.commit();

    const allDistricts = new Set([...Object.keys(oldMapState), ...Object.keys(nextMapState)]);
    for (const districtName of allDistricts) {
      const previousChoice = oldMapState[districtName] || null;
      const newChoice = nextMapState[districtName] || null;
      if (previousChoice !== newChoice) {
        await insertStudentActivityLog({
          ...actor,
          eventType: `map_${previousChoice ? "change_choice" : "set_choice"}`,
          eventLabel: "地圖決策操作",
          targetType: "personal",
          targetId: districtName,
          previousValue: previousChoice,
          newValue: newChoice,
          metadata: { mode: "personal", districtName, actionType: previousChoice ? "change_choice" : "set_choice" },
        });
      }
    }

    res.json({ message: "個人地圖已儲存" });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "儲存個人地圖失敗" });
  } finally {
    connection.release();
  }
});

app.get("/api/group-personal-maps", authenticateToken, async (req, res) => {
  try {
    const user = await getRequestUserProfile(req.user.id);
    const groupId = user?.group_id || null;
    if (!groupId) {
      return res.json({ groupId: null, groupName: null, members: [], personalData: [], groupFinalDecisions: {} });
    }

    const [members] = await pool.query(
      `SELECT id, username, email, is_group_leader
       FROM users
       WHERE group_id = ? AND COALESCE(role, 'student') = 'student'
       ORDER BY is_group_leader DESC, id ASC`,
      [groupId],
    );

    const personalData = [];
    for (const member of members) {
      const [choices] = await pool.query(
        "SELECT district_name, choice FROM user_map_choices WHERE user_id = ?",
        [member.id],
      );
      personalData.push(objectFromChoiceRows(choices));
    }

    const [finalRows] = await pool.query(
      `SELECT district_name, choice
       FROM map_final_decisions
       WHERE scope = 'group' AND group_id = ?`,
      [groupId],
    );

    res.json({
      groupId,
      groupName: mapGroupName(groupId),
      members: members.map((member) => ({
        id: member.id,
        username: member.username,
        name: member.username,
        email: member.email,
        isGroupLeader: Boolean(member.is_group_leader),
      })),
      personalData,
      groupFinalDecisions: objectFromChoiceRows(finalRows),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取小組地圖失敗" });
  }
});

app.put("/api/group-final-decision", authenticateToken, async (req, res) => {
  try {
    const { districtName, choice } = req.body;
    if (!districtName) return res.status(400).json({ message: "缺少地區名稱" });
    if (choice && !VALID_FINAL_CHOICES.includes(choice)) return res.status(400).json({ message: "決策只能是保育或開發" });

    const user = await getRequestUserProfile(req.user.id);
    if (!user?.group_id) return res.status(400).json({ message: "尚未分配小組" });
    if (!user?.is_group_leader) return res.status(403).json({ message: "只有組長可以決定小組平手地區" });

    const [[oldRow]] = await pool.query(
      `SELECT choice FROM map_final_decisions
       WHERE scope = 'group' AND group_id = ? AND district_name = ?`,
      [user.group_id, districtName],
    );
    const previousChoice = oldRow?.choice || null;
    const newChoice = choice || null;

    if (!choice) {
      await pool.query(
        `DELETE FROM map_final_decisions
         WHERE scope = 'group' AND group_id = ? AND district_name = ?`,
        [user.group_id, districtName],
      );
    } else {
      await pool.query(
        `INSERT INTO map_final_decisions (scope, group_id, district_name, choice)
         VALUES ('group', ?, ?, ?)
         ON DUPLICATE KEY UPDATE choice = VALUES(choice), updated_at = CURRENT_TIMESTAMP`,
        [user.group_id, districtName, choice],
      );
    }

    if (previousChoice !== newChoice) {
      await pool.query(
        `INSERT INTO map_action_logs (user_id, username, mode, group_id, district_name, previous_choice, new_choice, action_type)
         VALUES (?, ?, 'group', ?, ?, ?, ?, ?)`,
        [req.user.id, user.username, user.group_id, districtName, previousChoice, newChoice, previousChoice ? "change_group_final" : "set_group_final"],
      );
      await insertStudentActivityLog({
        userId: req.user.id,
        username: user.username,
        role: user.role || "student",
        groupId: user.group_id,
        eventType: previousChoice ? "map_change_group_final" : "map_set_group_final",
        eventLabel: "小組地圖最終決策",
        targetType: "group",
        targetId: districtName,
        previousValue: previousChoice,
        newValue: newChoice,
      });
    }

    res.json({ message: choice ? "已儲存小組決策" : "已清除小組決策" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "儲存小組決策失敗" });
  }
});

app.get("/api/group-final-decisions", authenticateToken, async (req, res) => {
  try {
    const user = await getRequestUserProfile(req.user.id);
    if (!user?.group_id) return res.json({});
    const [rows] = await pool.query(
      `SELECT district_name, choice FROM map_final_decisions WHERE scope = 'group' AND group_id = ?`,
      [user.group_id],
    );
    res.json(objectFromChoiceRows(rows));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取小組決策失敗" });
  }
});

app.get("/api/class-group-decisions", authenticateToken, async (req, res) => {
  try {
    const groupResults = [];
    for (const [groupId, groupInfo] of Object.entries(GROUPS)) {
      const [members] = await pool.query(
        `SELECT id FROM users WHERE group_id = ? AND COALESCE(role, 'student') = 'student' ORDER BY id ASC`,
        [groupId],
      );

      const personalMaps = [];
      for (const member of members) {
        const [choices] = await pool.query(
          "SELECT district_name, choice FROM user_map_choices WHERE user_id = ?",
          [member.id],
        );
        personalMaps.push(objectFromChoiceRows(choices));
      }

      const [finalRows] = await pool.query(
        `SELECT district_name, choice FROM map_final_decisions WHERE scope = 'group' AND group_id = ?`,
        [groupId],
      );

      groupResults.push({
        groupId,
        groupName: groupInfo.name,
        decisions: { ...resolveVoteFromMaps(personalMaps), ...objectFromChoiceRows(finalRows) },
      });
    }

    const [classRows] = await pool.query(
      `SELECT district_name, choice FROM map_final_decisions WHERE scope = 'class' AND group_id IS NULL`,
    );
    res.json({ groupResults, classFinalChoices: objectFromChoiceRows(classRows) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取全班地圖失敗" });
  }
});

app.post("/api/class-final-decision", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const targetDistrict = req.body?.district || req.body?.districtName;
    const choice = req.body?.choice || null;
    if (!targetDistrict) return res.status(400).json({ message: "缺少地區名稱" });
    if (choice && !VALID_FINAL_CHOICES.includes(choice)) return res.status(400).json({ message: "決策只能是保育或開發" });

    const [[oldRow]] = await pool.query(
      `SELECT choice FROM map_final_decisions
       WHERE scope = 'class' AND group_id IS NULL AND district_name = ?`,
      [targetDistrict],
    );
    const previousChoice = oldRow?.choice || null;

    if (!choice) {
      await pool.query(
        `DELETE FROM map_final_decisions
         WHERE scope = 'class' AND group_id IS NULL AND district_name = ?`,
        [targetDistrict],
      );
    } else {
      await pool.query(
        `INSERT INTO map_final_decisions (scope, group_id, district_name, choice)
         VALUES ('class', NULL, ?, ?)
         ON DUPLICATE KEY UPDATE choice = VALUES(choice), updated_at = CURRENT_TIMESTAMP`,
        [targetDistrict, choice],
      );
    }

    if (previousChoice !== choice) {
      await pool.query(
        `INSERT INTO map_action_logs (user_id, username, mode, group_id, district_name, previous_choice, new_choice, action_type)
         VALUES (?, ?, 'class', NULL, ?, ?, ?, ?)`,
        [req.user.id, req.user.username || null, targetDistrict, previousChoice, choice, previousChoice ? "change_class_final" : "set_class_final"],
      );
      await insertTeacherActivityLog({
        teacherId: req.user.id,
        teacherName: req.user.username || null,
        eventType: previousChoice ? "change_class_final" : "set_class_final",
        eventLabel: "教師全班地圖最終決策",
        targetType: "class_map_district",
        targetId: targetDistrict,
        previousValue: previousChoice,
        newValue: choice,
      });
    }

    res.json({ message: choice ? "已儲存全班決策" : "已清除全班決策" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "儲存全班決策失敗" });
  }
});

app.get("/api/class-final-decisions", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT district_name, choice FROM map_final_decisions WHERE scope = 'class' AND group_id IS NULL`,
    );
    res.json(objectFromChoiceRows(rows));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取全班決策失敗" });
  }
});

app.get("/api/teacher/players", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, role, group_id, is_group_leader
       FROM users
       WHERE COALESCE(role, 'student') = 'student'
       ORDER BY group_id ASC, is_group_leader DESC, id ASC`,
    );
    res.json({
      groups: Object.entries(GROUPS).map(([id, group]) => ({ id, name: group.name })),
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
});

async function saveTeacherGroupAssignments({ req, res, successMessage }) {
  const connection = await pool.getConnection();
  try {
    const { assignments } = req.body;
    if (!Array.isArray(assignments)) return res.status(400).json({ message: "assignments 必須是陣列" });

    await connection.beginTransaction();
    const affectedGroupIds = new Set();

    for (const item of assignments) {
      const userId = Number(item.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        throw Object.assign(new Error("學生 ID 格式錯誤"), { statusCode: 400 });
      }

      const [[oldUser]] = await connection.query("SELECT group_id FROM users WHERE id = ?", [userId]);
      const oldGroupId = oldUser?.group_id || null;
      const groupId = normalizeGroupId(item.groupId);
      const isGroupLeader = groupId && item.isGroupLeader ? 1 : 0;
      if (oldGroupId) affectedGroupIds.add(oldGroupId);
      if (groupId) affectedGroupIds.add(groupId);

      await connection.query(
        `UPDATE users SET group_id = ?, is_group_leader = ?
         WHERE id = ? AND COALESCE(role, 'student') = 'student'`,
        [groupId, isGroupLeader, userId],
      );
    }

    const [groupIds] = await connection.query(
      `SELECT DISTINCT group_id FROM users WHERE group_id IS NOT NULL AND COALESCE(role, 'student') = 'student'`,
    );
    for (const row of groupIds) {
      const [leaders] = await connection.query(
        `SELECT id FROM users
         WHERE group_id = ? AND is_group_leader = 1 AND COALESCE(role, 'student') = 'student'
         ORDER BY id ASC`,
        [row.group_id],
      );
      if (leaders.length > 1) {
        await connection.query(
          `UPDATE users SET is_group_leader = 0
           WHERE group_id = ? AND id <> ? AND COALESCE(role, 'student') = 'student'`,
          [row.group_id, leaders[0].id],
        );
      }
    }

    if (affectedGroupIds.size > 0) {
      await connection.query(
        `DELETE FROM map_final_decisions WHERE scope = 'group' AND group_id IN (?)`,
        [[...affectedGroupIds]],
      );
    }
    await connection.query("DELETE FROM map_final_decisions WHERE scope = 'class' AND group_id IS NULL");
    await connection.commit();

    await insertTeacherActivityLog({
      teacherId: req.user.id,
      teacherName: req.user.username || null,
      eventType: "update_student_groups",
      eventLabel: "教師更新學生分組與組長",
      targetType: "group_assignment",
      metadata: { assignmentCount: assignments.length, affectedGroupIds: [...affectedGroupIds] },
    });

    res.json({ message: successMessage });
  } catch (error) {
    await connection.rollback();
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: "儲存分組失敗" });
  } finally {
    connection.release();
  }
}

app.put("/api/teacher/players/groups", authenticateToken, requireTeacher, async (req, res) => {
  await saveTeacherGroupAssignments({ req, res, successMessage: "分組與組長儲存成功，地圖決策已重新整理" });
});

app.put("/api/teacher/groups", authenticateToken, requireTeacher, async (req, res) => {
  await saveTeacherGroupAssignments({ req, res, successMessage: "分組完成，地圖決策已重新整理" });
});

app.get("/api/barrage-status", authenticateToken, async (req, res) => {
  try {
    await ensureUserProfile(req.user.id);
    await pool.query(
      "UPDATE student_profiles SET barrage_coins = LEAST(COALESCE(barrage_coins, 0), ?) WHERE user_id = ?",
      [MAX_BARRAGE_COINS, req.user.id],
    );
    const [[row]] = await pool.query("SELECT barrage_coins FROM student_profiles WHERE user_id = ?", [req.user.id]);
    res.json({ coins: Number(row?.barrage_coins) || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取彈幕 coin 失敗" });
  }
});

app.get("/api/barrages/latest-id", authenticateToken, async (req, res) => {
  try {
    const [[row]] = await pool.query("SELECT COALESCE(MAX(id), 0) AS latestId FROM barrages");
    res.json({ latestId: Number(row?.latestId) || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "讀取最新彈幕 ID 失敗" });
  }
});

app.get("/api/barrages", authenticateToken, async (req, res) => {
  try {
    const afterId = Math.max(Number(req.query.afterId) || 0, 0);
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, username, content, created_at AS createdAt
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
    if (!content) return res.status(400).json({ message: "請輸入彈幕內容" });
    if (content.length > BARRAGE_MAX_LENGTH) return res.status(400).json({ message: "彈幕最多 20 個字" });
    if (containsBadWords(content)) return res.status(400).json({ message: "彈幕內容包含不適當字詞，請重新輸入" });

    await connection.beginTransaction();
    const [[user]] = await connection.query(
      `SELECT u.username, u.role, u.group_id, sp.barrage_coins
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.id = ?
       FOR UPDATE`,
      [req.user.id],
    );

    const role = user?.role || req.user.role || "student";
    if (role === "teacher") {
      await connection.rollback();
      return res.status(403).json({ message: "教師不能使用學生彈幕 coin" });
    }

    const coins = Number(user?.barrage_coins) || 0;
    if (coins < 1) {
      await connection.rollback();
      return res.status(400).json({ message: "coin 不足，完成探究調查書可以獲得 3 coin" });
    }

    await connection.query("UPDATE student_profiles SET barrage_coins = barrage_coins - 1 WHERE user_id = ?", [req.user.id]);
    const [result] = await connection.query(
      "INSERT INTO barrages (user_id, username, content) VALUES (?, ?, ?)",
      [req.user.id, user?.username || req.user.username || null, content],
    );
    await connection.commit();

    await insertStudentActivityLog({
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
    const { eventType, eventLabel, targetType, targetId, previousValue, newValue, metadata } = req.body || {};
    if (!eventType) return res.status(400).json({ message: "缺少 eventType" });

    const actor = await getActor(req.user.id, req.user);
    if (actor.role === "teacher") {
      await insertTeacherActivityLog({
        teacherId: req.user.id,
        teacherName: actor.username,
        eventType,
        eventLabel,
        targetType,
        targetId,
        previousValue,
        newValue,
        metadata,
      });
    } else {
      await insertStudentActivityLog({
        ...actor,
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

app.get("/api/teacher/activity-logs", authenticateToken, requireTeacher, async (req, res) => {
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
       FROM student_activity_logs a
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
});

app.get("/api/teacher/teacher-activity-logs", authenticateToken, requireTeacher, async (req, res) => {
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
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
