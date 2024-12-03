const sql = require("mssql/msnodesqlv8");
const config = require("../config");

async function connectDb() {
  try {
    await sql.connect(config);
    console.log("Connected to the database!");
  } catch (err) {
    console.error("Database connection error:", err.message);
  }
}

connectDb();

module.exports = sql;
