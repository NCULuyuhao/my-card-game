const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   測試 API
========================= */
app.get("/", (req, res) => {
  res.send("CityAuncel backend is running");
});

/* =========================
   註冊
========================= */
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "請填寫完整資料" });
    }

    // 加密密碼
    const passwordHash = await bcrypt.hash(password, 10);

    // 新增使用者
    const [result] = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, passwordHash]
    );

    // 初始化遊戲資料
    await pool.query(
      `INSERT INTO user_game_data
      (user_id, student_thought, student_plan, final_summaries, earned_titles, unlocked_cards, map_state)
      VALUES (?, '', '', JSON_ARRAY(), JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT())`,
      [result.insertId]
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

/* =========================
   登入
========================= */
app.post("/api/login", async (req, res) => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res.status(400).json({ message: "請輸入帳號與密碼" });
    }

    // 找使用者（支援 username 或 email 登入）
    const [users] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [account, account]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    const user = users[0];

    // 驗證密碼
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    // 產生 token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "登入成功",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

/* =========================
   驗證 Token Middleware
========================= */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "未登入" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    if (error) {
      return res.status(403).json({ message: "登入已過期，請重新登入" });
    }

    req.user = user;
    next();
  });
}

/* =========================
   取得使用者遊戲資料
========================= */
app.get("/api/user-data", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        student_thought,
        student_plan,
        final_summaries,
        earned_titles,
        unlocked_cards,
        map_state
      FROM user_game_data
      WHERE user_id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
  return res.json({
    studentThought: "",
    studentPlan: "",
    finalSummaries: [],
    earnedTitles: [],
    unlockedCards: [],
    mapState: {},
  });
}

    res.json({
      studentThought: rows[0].student_thought || "",
      studentPlan: rows[0].student_plan || "",
      finalSummaries: rows[0].final_summaries || [],
      earnedTitles: rows[0].earned_titles || [],
      unlockedCards: rows[0].unlocked_cards || [],
      mapState: rows[0].map_state || {},
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

/* =========================
   更新使用者遊戲資料
========================= */
app.put("/api/user-data", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      studentThought,
      studentPlan,
      finalSummaries,
      earnedTitles,
      unlockedCards,
      mapState,
    } = req.body;

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
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        student_thought = VALUES(student_thought),
        student_plan = VALUES(student_plan),
        final_summaries = VALUES(final_summaries),
        earned_titles = VALUES(earned_titles),
        unlocked_cards = VALUES(unlocked_cards),
        map_state = VALUES(map_state),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        userId,
        studentThought || "",
        studentPlan || "",
        JSON.stringify(finalSummaries || []),
        JSON.stringify(earnedTitles || []),
        JSON.stringify(unlockedCards || []),
        JSON.stringify(mapState || {}),
      ],
    );

    res.json({ message: "儲存成功" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

/* =========================
   啟動伺服器
========================= */
app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});