import path from "node:path";
import fs from "node:fs";
import { expect } from "chai";
import { describe, it, before, beforeEach, afterEach } from "mocha";
import { parseConfig } from "../src/config";
import DB from "../src/data";
import LlmRepository from "../src/data/llm.repository";


const _TEST_DB_PATH = path.join(__dirname, "test.db");

describe("LlmRepository Tests", function () {
  before(function () {
    const config = parseConfig();
    DB.setupDB(_TEST_DB_PATH);
    LlmRepository.init_database();
  });

  beforeEach(function () {
    LlmRepository.statements = {
      "assistant": {},
      "thread": {}
    };
  });

  after(function () {
    if (fs.existsSync(_TEST_DB_PATH)) {
      fs.unlinkSync(_TEST_DB_PATH);
    };
  });

  afterEach(function () {
    LlmRepository.database.exec("DELETE FROM assistant;");
    LlmRepository.database.exec("DELETE FROM thread;");
  })

  it("should create tables successfully", function () {
    const migrations = LlmRepository.migrations;
    LlmRepository.create_tables(migrations);
  
    const assistantTable = LlmRepository.database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assistant';")
      .get();
    const threadTable = LlmRepository.database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='thread';")
      .get();
  
    expect(assistantTable).to.not.be.undefined;
    expect(threadTable).to.not.be.undefined;
  });

  it("should throw an error when failing to create tables", function () {
    const invalidMigrations = [
      `CREATE TABLE IF NOT EXISTS invalid_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          invalid_column INVALID_TYPE NOT NULL foobar
      );`,
    ];
  
    expect(() => LlmRepository.create_tables(invalidMigrations)).to.throw(
      "Failed to create tables from given sqls"
    );
  });

  it("should initialize statements correctly", function () {
    LlmRepository.init_statements();
    expect(LlmRepository.statements["assistant"]).to.have.property("findOne");
    expect(LlmRepository.statements["assistant"]).to.have.property("updateOne");
    expect(LlmRepository.statements["assistant"]).to.have.property("insertOne");
    expect(LlmRepository.statements["thread"]).to.have.property("findOne");
    expect(LlmRepository.statements["thread"]).to.have.property("updateOne");
    expect(LlmRepository.statements["thread"]).to.have.property("insertOne");
  });

  it("should initialize the repository without throwing any errors", function () {
    expect(() => LlmRepository.initialize()).to.not.throw();
  });

  it("should insert data into the assistant table", function () {
    LlmRepository.init_statements();
    const result = LlmRepository.insertOne("assistant", {
      str_id: "test_name",
      actual_id: "test_assistant_id",
    });
  
    expect(result.changes).to.equal(1);
  
    const insertedRow = LlmRepository.findOne("assistant", {
      value: "test_name",
    });
  
    expect(insertedRow).to.include({
      name: "test_name",
      assistant_id: "test_assistant_id",
    });
  });

  it("should update data in the assistant table", function () {
    LlmRepository.init_statements();
    LlmRepository.insertOne("assistant", {
      str_id: "test_name",
      actual_id: "test_assistant_id",
    });
  
    const updateResult = LlmRepository.updateOne(
      "assistant",
      "test_name",
      "new_assistant_id"
    );
  
    expect(updateResult.changes).to.equal(1);
  
    const updatedRow = LlmRepository.findOne("assistant", {
      value: "test_name",
    });
  
    expect(updatedRow).to.include({
      name: "test_name",
      assistant_id: "new_assistant_id",
    });
  });

  it("should return undefined when target value is not found in the assistant table", function () {
    LlmRepository.init_statements();
    const emptyResult = LlmRepository.findOne("assistant", {
      value: "non_existent_value"
    });

    expect(emptyResult).to.equal(undefined);
  });

  it("should insert data into the thread table", function () {
    LlmRepository.init_statements();
    const result = LlmRepository.insertOne("thread", {
      str_id: "test_owner",
      actual_id: "test_thread_id",
    });
  
    expect(result.changes).to.equal(1);
  
    const insertedRow = LlmRepository.findOne("thread", {
      value: "test_owner",
    });
  
    expect(insertedRow).to.include({
      owner: "test_owner",
      thread_id: "test_thread_id",
    });
  });

  it("should update data in the thread table", function () {
    LlmRepository.init_statements();
    LlmRepository.insertOne("thread", {
      str_id: "test_owner",
      actual_id: "test_thread_id",
    });
  
    const updateResult = LlmRepository.updateOne(
      "thread",
      "test_owner",
      "new_thread_id"
    );
  
    expect(updateResult.changes).to.equal(1);
  
    const updatedRow = LlmRepository.findOne("thread", {
      value: "test_owner",
    });
  
    expect(updatedRow).to.include({
      owner: "test_owner",
      thread_id: "new_thread_id",
    });
  });

  it("should throw an error if findOne query fails", function () {
    LlmRepository.init_statements();
    expect(() =>
      LlmRepository.findOne("nonexistent_table", {
        value: "value",
      })
    ).to.throw(
      "An error occured during findOne on table nonexistent_table with the following query: {\"value\":\"value\"}"
    );
  });

  it("should throw an error if insertOne fails", function () {
    LlmRepository.init_statements();
    expect(() =>
      LlmRepository.insertOne("nonexistent_table", {
        str_id: "test_str_id",
        actual_id: "test_actual_id",
      })
    ).to.throw(
      "An error occured during insertOne on table nonexistent_table with the following value: {\"str_id\":\"test_str_id\",\"actual_id\":\"test_actual_id\"}"
    );
  });

  it("should throw an error if updateOne fails", function () {
    LlmRepository.init_statements();
    expect(() =>
      LlmRepository.updateOne("nonexistent_table", "test_condition", "test_value")
    ).to.throw(
      "An error occured during updateOne on table nonexistent_table with condition test_condition and value test_value"
    );
  });

  it("should return undefined when findOne does not find a matching row", function () {
    LlmRepository.init_statements();

    LlmRepository.insertOne("assistant", {
      str_id: "habit_tracker",
      actual_id: "a_real_assistant_id",
    });

    const result = LlmRepository.findOne("assistant", {
      value: "not_a_real_assistant_id",
    });

    expect(result).to.be.undefined;
  });

});
