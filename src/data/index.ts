import BetterSqlite3 from "better-sqlite3";
import logger from "@logger";

type Database = BetterSqlite3.Database;

class DatabaseSetup {
  static _database?: Database;

  static get database(): Database {
    if (this._database === undefined) {
      throw new Error("Please setup DB before using it");
    }
    return this._database;
  }

  /**
   * Call before accessing the database
   * @returns The database that has been set up
   */
  public static setupDB(db_path: string): Database {
    if (!db_path) throw new Error("Empty db_path is not accepted!");
    let db: Database;
    try {
      db = new BetterSqlite3(db_path, { verbose: logger.debug });
      this._database = db;
    } catch (error) {
      throw new Error("Failed to setup db");    
    }
    return db;
  }
}


export default DatabaseSetup;
export type { Database };