import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Converts an index (0, 1, 2...) into an Excel-style column letter sequence:
 * 0 -> A, 25 -> Z, 26 -> AA, 27 -> AB, etc.
 */
function getFamilyLetter(index: number): string {
  let letter = "";
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Extracts the letter prefix from a tag number (e.g., "ZA1" -> "ZA", "B2" -> "B").
 */
function extractLetterPart(tagNumber: string): string {
  const match = tagNumber.match(/^[A-Z]+/);
  return match ? match[0] : "A";
}

/**
 * Converts a letter prefix back to a numerical index (e.g., "A" -> 0, "Z" -> 25, "AA" -> 26).
 */
function letterToIndex(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
}

/**
 * Recalculates and re-indexes tag numbers for all PENDING (un-located) applications.
 * Locked/Placed applications (those with a location assigned) keep their immutable tag numbers.
 * Pending tags will fill in the available sequence gaps starting right after the last locked letter.
 */
export async function resequencePendingApplications() {
  try {
    // 1. Find the highest family letter currently used by LOCKED (located) applications
    const lockedKids = await prisma.christmasKid.findMany({
      where: { locationId: { not: null } },
      select: { tagNumber: true },
    });

    let highestLockedIndex = -1;
    for (const kid of lockedKids) {
      const letterPart = extractLetterPart(kid.tagNumber);
      const idx = letterToIndex(letterPart);
      if (idx > highestLockedIndex) {
        highestLockedIndex = idx;
      }
    }

    // Pending applications start filling right after the highest locked letter
    // If no locked tags exist yet, pending starts at index 0 ('A').
    let nextAvailableIndex = highestLockedIndex + 1;

    // 2. Fetch all applications that DO NOT have a location yet (PENDING/unlocated)
    const pendingApps = await prisma.christmasApplication.findMany({
      where: {
        deletedAt: null,
        kids: {
          every: { locationId: null },
        },
      },
      include: { kids: true },
      orderBy: { createdAt: "asc" },
    });

    // 3. Update each pending application's kids with sequential shifting tags
    for (let i = 0; i < pendingApps.length; i++) {
      const app = pendingApps[i];
      const familyLetter = getFamilyLetter(nextAvailableIndex + i);

      for (let kidIndex = 0; kidIndex < app.kids.length; kidIndex++) {
        const kid = app.kids[kidIndex];
        const newTagNumber = `${familyLetter}${kidIndex + 1}`;

        await prisma.christmasKid.update({
          where: { id: kid.id },
          data: { tagNumber: newTagNumber },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error resequencing pending applications:", error);
    return { success: false, error };
  }
}