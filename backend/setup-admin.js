/**
 * Secure Admin Setup Script
 * Creates an admin user with a strong password
 * Run this script ONLY ONCE after initial deployment
 */

const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const readline = require("readline");

// Read database config from environment or defaults
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "log_analyzer",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  return null;
}

async function setupAdmin() {
  console.log("\n===========================================");
  console.log("  Claude Log Analyzer - Admin Setup");
  console.log("===========================================\n");

  try {
    // Check database connection
    await pool.query("SELECT 1");
    console.log("✅ Database connection successful\n");

    // Check if any users exist
    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log("⚠️  WARNING: Users already exist in the database!");
      const proceed = await question(
        "Do you want to create another admin user? (yes/no): "
      );
      if (proceed.toLowerCase() !== "yes") {
        console.log("Setup cancelled.");
        rl.close();
        await pool.end();
        process.exit(0);
      }
    }

    // Get admin email
    let email;
    while (true) {
      email = await question("Enter admin email: ");
      if (!validateEmail(email)) {
        console.log("❌ Invalid email format. Please try again.\n");
        continue;
      }

      // Check if email already exists
      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (existing.rows.length > 0) {
        console.log(
          "❌ This email is already registered. Please use a different email.\n"
        );
        continue;
      }

      break;
    }

    // Get admin name
    const name = await question("Enter admin name (optional): ");

    // Get password
    let password;
    while (true) {
      password = await question(
        "Enter admin password (min 8 chars, 1 uppercase, 1 lowercase, 1 number): "
      );
      const error = validatePassword(password);
      if (error) {
        console.log(`❌ ${error}\n`);
        continue;
      }
      break;
    }

    // Confirm password
    const confirmPassword = await question("Confirm password: ");
    if (password !== confirmPassword) {
      console.log("❌ Passwords do not match!");
      rl.close();
      await pool.end();
      process.exit(1);
    }

    // Hash password
    console.log("\n🔐 Hashing password...");
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, passwordHash, name || null]
    );

    console.log("\n✅ Admin user created successfully!");
    console.log("\nUser Details:");
    console.log("  ID:", result.rows[0].id);
    console.log("  Email:", result.rows[0].email);
    console.log("  Name:", result.rows[0].name || "(not provided)");
    console.log("\n⚠️  IMPORTANT: Keep these credentials secure!");
    console.log("You can now log in at: http://localhost:3000/login\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

setupAdmin();
