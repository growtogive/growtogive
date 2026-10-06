"use server";

import { prisma } from "@/lib/prisma";
import { resequencePendingApplications } from "@/utils/christmasTags";

// Fetch all locations alphabetized
export async function getLocations() {
  return await prisma.location.findMany({
    orderBy: { name: "asc" },
  });
}

// Add a new location dynamically
export async function createLocation(name: string) {
  if (!name || name.trim() === "") {
    return { success: false, error: "Location name cannot be empty." };
  }

  try {
    const location = await prisma.location.create({
      data: { name: name.trim() },
    });
    return { success: true, location };
  } catch (error) {
    return { success: false, error: "Location already exists or failed to create." };
  }
}

// ==========================================
// ADMIN CHRISTMAS ACTIONS
// ==========================================

// Fetch all active (non-deleted) applications and their kids
export async function getAdminChristmasData() {
  return await prisma.christmasApplication.findMany({
    where: { deletedAt: null },
    include: {
      kids: {
        include: { location: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Update a kid's status or location, and trigger resequencing if location is removed
export async function updateKidStatusAndLocation(kidId: string, status: string, locationId: string | null) {
  try {
    await prisma.christmasKid.update({
      where: { id: kidId },
      data: {
        status: status as any,
        locationId: locationId || null,
      },
    });

    // If location is removed, resequence pending tags
    if (!locationId) {
      await resequencePendingApplications();
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update tag status." };
  }
}

// Update a kid/tag's details (name, age, gender, gifts, tag number)
export async function updateKidDetails(
  kidId: string, 
  data: { 
    name: string; 
    age: number | string; 
    gender: string; 
    giftOne: string; 
    giftTwo: string; 
    tagNumber: number | string; 
  }
) {
  try {
    await prisma.christmasKid.update({
      where: { id: kidId },
      data: {
        name: data.name.trim(),
        age: Number(data.age),
        gender: data.gender,
        giftOne: data.giftOne.trim(),
        giftTwo: data.giftTwo.trim(),
        tagNumber: String(data.tagNumber),
      },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update tag details. Tag number may already be in use." };
  }
}

// Soft delete application and automatically resequence remaining pending tags
export async function deleteChristmasApplication(applicationId: string) {
  try {
    await prisma.christmasApplication.update({
      where: { id: applicationId },
      data: { deletedAt: new Date() },
    });

    await resequencePendingApplications();

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete application." };
  }
}