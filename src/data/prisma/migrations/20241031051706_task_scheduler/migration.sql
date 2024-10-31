-- CreateTable
CREATE TABLE "Task" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cron_time" TEXT NOT NULL,
    "timezone" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "target_type" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "template" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CustomMessageInput" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "location" TEXT,
    "filename" TEXT,
    CONSTRAINT "CustomMessageInput_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("task_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeatherInput" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "cities" TEXT NOT NULL,
    CONSTRAINT "WeatherInput_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("task_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsInput" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL DEFAULT 'default',
    CONSTRAINT "NewsInput_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("task_id") ON DELETE CASCADE ON UPDATE CASCADE
);
