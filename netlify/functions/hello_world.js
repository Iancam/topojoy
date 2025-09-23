import { Pool } from "pg";

let pool;

function shouldUseSSL() {
  return process.env.NODE_ENV === "production";
}

function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  const ssl = shouldUseSSL();
  pool = new Pool(
    url
      ? {
          connectionString: url,
          ssl,
        }
      : {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl,
        }
  );
  console.log("Pool created");
  return pool;
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async () => {
  console.log("Hello World");

  try {
    const pool = getPool();
    const { rows } = await pool.query("SELECT * FROM users");
    return jsonResponse(200, {
      rows,
      env: {
        NODE_ENV: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, { error: "Internal Server Error" });
  }
};
