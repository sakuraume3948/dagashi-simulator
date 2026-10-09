-- CreateTable
CREATE TABLE "Favorite" (
    "anonId" TEXT NOT NULL,
    "dagashiId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("anonId","dagashiId")
);

-- CreateIndex
CREATE INDEX "Favorite_dagashiId_idx" ON "Favorite"("dagashiId");
