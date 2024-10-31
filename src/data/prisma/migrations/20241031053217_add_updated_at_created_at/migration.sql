/*
  Warnings:

  - Added the required column `updated_at` to the `CustomMessageInput` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `NewsInput` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `WeatherInput` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomMessageInput" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "location" TEXT,
    "filename" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "CustomMessageInput_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("task_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomMessageInput" ("filename", "location", "task_id", "text", "type") SELECT "filename", "location", "task_id", "text", "type" FROM "CustomMessageInput";
DROP TABLE "CustomMessageInput";
ALTER TABLE "new_CustomMessageInput" RENAME TO "CustomMessageInput";
CREATE TABLE "new_NewsInput" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL DEFAULT 'default',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "NewsInput_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("task_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NewsInput" ("task_id", "topic") SELECT "task_id", "topic" FROM "NewsInput";
DROP TABLE "NewsInput";
ALTER TABLE "new_NewsInput" RENAME TO "NewsInput";
CREATE TABLE "new_Task" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cron_time" TEXT NOT NULL,
    "timezone" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "target_type" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Task" ("cron_time", "enabled", "name", "target_name", "target_type", "task_id", "template", "timezone") SELECT "cron_time", "enabled", "name", "target_name", "target_type", "task_id", "template", "timezone" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE TABLE "new_WeatherInput" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "cities" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "WeatherInput_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("task_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WeatherInput" ("cities", "task_id") SELECT "cities", "task_id" FROM "WeatherInput";
DROP TABLE "WeatherInput";
ALTER TABLE "new_WeatherInput" RENAME TO "WeatherInput";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
