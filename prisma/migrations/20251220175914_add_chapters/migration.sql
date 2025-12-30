/*
  Warnings:

  - You are about to drop the column `module_id` on the `lessons` table. All the data in the column will be lost.
  - Added the required column `chapter_id` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable chapters first
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for chapters
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create a default chapter for each module that has lessons
INSERT INTO "chapters" ("id", "module_id", "title", "order", "created_at", "updated_at")
SELECT 
    gen_random_uuid()::TEXT,
    m."module_id",
    'Chapter 1: Introduction',
    0,
    NOW(),
    NOW()
FROM (SELECT DISTINCT "module_id" FROM "lessons") m;

-- Add chapter_id column to lessons (nullable first)
ALTER TABLE "lessons" ADD COLUMN "chapter_id" TEXT;
ALTER TABLE "lessons" ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER';

-- Update existing lessons to point to their module's default chapter
UPDATE "lessons" l
SET "chapter_id" = c."id"
FROM "chapters" c
WHERE l."module_id" = c."module_id";

-- Make chapter_id required
ALTER TABLE "lessons" ALTER COLUMN "chapter_id" SET NOT NULL;

-- DropForeignKey for old lessons->modules relation
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_module_id_fkey";

-- Drop the module_id column from lessons
ALTER TABLE "lessons" DROP COLUMN "module_id";

-- AddForeignKey for lessons->chapters
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
