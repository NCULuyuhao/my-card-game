const bcrypt = require("bcrypt");
const pool = require("./db");

async function main() {
  const username = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];

  if (!username || !email || !password) {
    console.log("用法：node create_teacher.js <帳號> <Email> <密碼>");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES (?, ?, ?, 'teacher')
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       role = 'teacher',
       updated_at = CURRENT_TIMESTAMP`,
    [username, email, passwordHash],
  );

  console.log(`教師帳號已建立/更新：${username}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
