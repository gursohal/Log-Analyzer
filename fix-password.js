const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "log_analyzer",
  user: "postgres",
  password: "postgres",
});

async function fixPassword() {
  try {
    // Generate new hash
    const hash = await bcrypt.hash("admin123", 10);
    console.log("Generated hash:", hash);

    // Update user
    await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [
      hash,
      "admin@example.com",
    ]);

    console.log("✅ Password updated successfully!");

    // Verify
    const result = await pool.query(
      "SELECT email, LEFT(password_hash, 10) as hash_start FROM users WHERE email = $1",
      ["admin@example.com"]
    );
    console.log("Verification:", result.rows[0]);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

fixPassword();
