-- AlterEnum
ALTER TYPE "AbsenceType" ADD VALUE 'HOLIDAY';

-- CreateTable
CREATE TABLE "israeli_holidays" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "code" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,

    CONSTRAINT "israeli_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "israeli_holidays_year_code_key" ON "israeli_holidays"("year", "code");

-- CreateIndex
CREATE UNIQUE INDEX "israeli_holidays_year_date_key" ON "israeli_holidays"("year", "date");
