"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const ADMIN_PASSWORD = "CSMK2026";

interface KidData {
  id?: string;
  name: string;
  age: number;
  gender: string;
  giftOne: string;
  giftTwo: string;
}

interface ApplicationData {
  id?: string;
  password: string;
  momName: string;
  phone: string;
  email?: string;
  address: string;
  referredBy: string;
  donorNotes?: string;
  kids: KidData[];
}

// Helper to generate a tracking/tag number
function generateTagNumber() {
  return "TAG-" + Math.floor(100000 + Math.random() * 900000);
}

// 1. Submit New Application
export async function submitChristmasApplication(data: ApplicationData) {
  if (data.password !== ADMIN_PASSWORD) {
    return { success: false, error: "Unauthorized: Incorrect password." };
  }

  try {
    const newApp = await prisma.christmasApplication.create({
      data: {
        momName: data.momName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        referredBy: data.referredBy,
        donorNotes: data.donorNotes,
        kids: {
          create: data.kids.map((k) => ({
            name: k.name,
            age: k.age,
            gender: k.gender,
            giftOne: k.giftOne,
            giftTwo: k.giftTwo,
            tagNumber: generateTagNumber(),
          })),
        },
      },
      include: { kids: true },
    });

    revalidatePath("/admin");
    return { success: true, data: newApp };
  } catch (error) {
    console.error("Failed to submit Christmas application:", error);
    return { success: false, error: "Database error while submitting application." };
  }
}

// 2. Fetch Application By ID (For Editing)
export async function getChristmasApplicationById(id: string) {
  try {
    const application = await prisma.christmasApplication.findUnique({
      where: { id },
      include: { kids: true },
    });

    if (!application) {
      return { success: false, error: "Application not found." };
    }

    return { success: true, data: application };
  } catch (error) {
    console.error("Failed to fetch Christmas application:", error);
    return { success: false, error: "Database error while fetching application." };
  }
}

// 3. Update Existing Application
export async function updateChristmasApplication(data: ApplicationData) {
  if (data.password !== ADMIN_PASSWORD) {
    return { success: false, error: "Unauthorized: Incorrect password." };
  }

  if (!data.id) {
    return { success: false, error: "Missing application ID for update." };
  }

  try {
    // Delete old kid records to cleanly replace them with updated list
    await prisma.christmasKid.deleteMany({
      where: { applicationId: data.id },
    });

    const updatedApp = await prisma.christmasApplication.update({
      where: { id: data.id },
      data: {
        momName: data.momName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        referredBy: data.referredBy,
        donorNotes: data.donorNotes,
        kids: {
          create: data.kids.map((k) => ({
            name: k.name,
            age: k.age,
            gender: k.gender,
            giftOne: k.giftOne,
            giftTwo: k.giftTwo,
            tagNumber: generateTagNumber(),
          })),
        },
      },
      include: { kids: true },
    });

    revalidatePath("/admin");
    return { success: true, data: updatedApp };
  } catch (error) {
    console.error("Failed to update Christmas application:", error);
    return { success: false, error: "Database error while updating application." };
  }
}