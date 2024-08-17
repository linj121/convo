import DB from "./index";
import type { Database } from "./index";
import type { Statement } from "better-sqlite3";


class LlmRepository {
  public static database: Database;
  public static statements: Record<string, Record<string, Statement>>;

  public static migrations: string[] = [
    `CREATE TABLE IF NOT EXISTS assistant (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL UNIQUE,
        assistant_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS thread (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        owner TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,      
  ];

  static create_tables(table_creation_sql: string[]): void {
    let create_table_stmts: Statement[];
    
    try {
      create_table_stmts = table_creation_sql.map<Statement>(sql => 
        this.database.prepare(sql)
      );
      create_table_stmts.forEach(stmt => stmt.run());
    } catch (error) {
      throw new Error("Failed to create tables from given sqls", {
        cause: error
       });      
    }
  }

  static init_statements() {
    this.statements["assistant"]["findOne"] = this.database.prepare(
    `SELECT id, name, assistant_id 
    FROM assistant
    WHERE name = @value;
    `);
    this.statements["assistant"]["updateOne"] = this.database.prepare(
    `UPDATE assistant 
    SET assistant_id = @value
    WHERE name = @condition;
    `);
    this.statements["assistant"]["insertOne"] = this.database.prepare(
    `INSERT INTO assistant (name, assistant_id)
    VALUES (@str_id, @actual_id);
    `);

    this.statements["thread"]["findOne"] = this.database.prepare(
    `SELECT id, owner, thread_id 
    FROM thread 
    WHERE owner = @value;
    `);
    this.statements["thread"]["updateOne"] = this.database.prepare(
    `UPDATE thread
    SET thread_id = @value
    WHERE owner = @condition;
    `);
    this.statements["thread"]["insertOne"] = this.database.prepare(
    `INSERT INTO thread (owner, thread_id)
    VALUES (@str_id, @actual_id);
    `);
  }

  static init_database() {
    this.database = DB.database;
  }

  /**
   * Call this before using this class :(
   */
  static initialize() {
    this.create_tables(this.migrations);
    this.init_statements();
    this.init_database();
  }

  static drop_tables(tables: string[]): void {
    throw new Error("Not implemented");
  }

  static findOne(
    tablename: string, 
    query: {
      value: string
    }
  ) {
    let result: unknown;
    try {
      result = this.statements[tablename]["findOne"].get({
        value: query.value
      });
    } catch (error) {
      throw new Error(`An error occured during findOne on table ${tablename} with the following query: ${JSON.stringify(query)}`, {
        cause: error
      });      
    }
    return result;
  }

  static insertOne(
    tablename: string, 
    value: {
      str_id: string,
      actual_id: string
    }
  ) {
    let result;
    try {
      result = this.statements[tablename]["insertOne"].run({
        str_id: value.str_id,
        actual_id: value.actual_id
      });
    } catch (error) {
      throw new Error(`An error occured during insertOne on table ${tablename} with the following value: ${JSON.stringify(value)}`, {
        cause: error
      });  
    }
    return result;
  }

  static updateOne(
    tablename: string,
    condition: string,
    value: string
  ) {
    let result;
    try {
      result = this.statements[tablename]["updateOne"].run({
        condition: condition,
        value: value
      });
    } catch (error) {
      throw new Error(`An error occured during updateOne on table ${tablename} with condition ${condition} and value ${value}`, {
        cause: error
      });  
    }
    return result;
  }

  static upsert() {
    const upsert_sql: string =
    `
    INSERT INTO table_name(column_list)
    VALUES(value_list)
    ON CONFLICT(conflict_column) 
    DO 
       UPDATE SET column_name = expression
       WHERE conflict_condition;
    `;

    const upsert_stmt = this.database.prepare(upsert_sql);
    throw new Error("Not implemented");
  }

  /**
   * TODO: should be combined with prepared statments and binding parameters
   */
  static generic_find(query: {
    columns: string[],
    distinct?: boolean,
    tablename: string,
    conditions?: string,
    orderby?: {
      key: string,
      order?: "DESC" | "ASC",
    },
    limit?: number,
    offset?: number,
    groupby?: string[],
    groupfilter?: string
  }) {
    const query_sql =
    `
    SELECT [DISTINCT] (columns) FROM (table_name)
    WHERE (conditions)
    ORDERBY (sort_key) [ASC|DESC]
    LIMIT (count)
    OFFSET (offset)
    GROUPBY (group column)
    HAVING (group filter)
    `;
    const distinct = query.distinct ? "DISTINCT" : "";
    const columns = query.columns.join(",");
    const where_clause = query.conditions ? `WHERE ${query.conditions}` : "";

    const order = query.orderby?.order ?? "";
    const orderby_clause = query.orderby ? `ORDERBY ${query.orderby.key} ${order}`.trim() : "";

    const limit_clause = query.limit ? `LIMIT ${query.limit}` : "";
    const offset_clause = query.offset ? `OFFSET ${query.offset}` : "";
    const groupby_clause = query.groupby ? `GROUPBY ${query.groupby.join(',')}` : "";
    const having_clause = query.groupfilter ? `HAVING ${query.groupfilter}` : "";

    const sql =
    `
    SELECT ${distinct} ${columns} FROM ${query.tablename}
    ${where_clause}
    ${orderby_clause}
    ${limit_clause}
    ${offset_clause}
    ${groupby_clause}
    ${having_clause}
    `.trim() + ";";
    const stmt: Statement = this.database.prepare(sql);
    throw new Error("Not implemented");
  }

  static delete() {
    throw new Error("Not implemented");
  }

}

export default LlmRepository;