// utils/tagGenerator.ts

export function getNextFamilyLetter(lastLetter: string | null): string {
  if (!lastLetter) return "A";
  
  // Handle Excel-style column increments (A -> Z -> AA -> AB -> ZZ...)
  let charArray = lastLetter.toUpperCase().split("");
  let i = charArray.length - 1;
  
  while (i >= 0) {
    if (charArray[i] !== "Z") {
      charArray[i] = String.fromCharCode(charArray[i].charCodeAt(0) + 1);
      return charArray.join("");
    }
    charArray[i] = "A";
    i--;
  }
  
  return "A" + charArray.join("");
}

// In your Server Action when a Mom submits her form:
export async function generateTagsForNewApplication(kidsData: Array<{name: string; age: number; wishlist: string}>) {
  // Find the last created kid or track the highest assigned family letter
  // For simplicity, query the database for the kid with the highest createdAt or sort by tagNumber
  // Let's assume you fetch the latest assigned tag number (e.g., "Z5" -> letter is "Z")
  
  // Pseudo-code for getting the last letter:
  // const lastKid = await prisma.christmasKid.findFirst({ orderBy: { createdAt: 'desc' } });
  // Extract letter part using regex: e.g. "ZA1" -> letter = "ZA", number = 1
  
  let nextLetter = "A"; // Default if database is empty for the year
  // ... increment logic based on last assigned family letter ...

  // Create kids with tags: Child 1 gets `${nextLetter}1`, Child 2 gets `${nextLetter}2`, etc.
}