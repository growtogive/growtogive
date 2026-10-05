"use server";

import { prisma } from "@/lib/prisma";
import { resequencePendingApplications } from "@/utils/christmasTags";
import { cleanText } from "@/utils/textFormatter";

interface SubmitApplicationInput {
  password: string;
  momName: string;
  phone: string;
  email?: string;
  address: string;
  referredBy: string;
  donorNotes?: string;
  kids: Array<{
    name: string;
    age: number;
    gender: string;
    giftOne: string;
    giftTwo: string;
  }>;
}

export async function submitChristmasApplication(data: SubmitApplicationInput) {
  if (data.password !== "CSMK2026") {
    return { success: false, error: "Incorrect access password." };
  }

  if (!data.momName || !data.phone || !data.address || !data.referredBy || !data.kids || data.kids.length === 0) {
    return { success: false, error: "All parent fields including Address and Referred By are mandatory." };
  }

  for (const kid of data.kids) {
    if (!kid.name || !kid.age || !kid.gender || !kid.giftOne || !kid.giftTwo) {
      return { success: false, error: "All fields for every child (Name, Age, Gender, and both ~$25 gifts) are mandatory." };
    }
  }

  try {
    const application = await prisma.christmasApplication.create({
      data: {
        momName: cleanText(data.momName),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        address: cleanText(data.address),
        referredBy: cleanText(data.referredBy),
        donorNotes: data.donorNotes ? cleanText(data.donorNotes) : null,
        kids: {
          create: data.kids.map((kid, idx) => ({
            name: cleanText(kid.name),
            age: Number(kid.age),
            gender: kid.gender,
            giftOne: cleanText(kid.giftOne),
            giftTwo: cleanText(kid.giftTwo),
            wishlist: `1: ${cleanText(kid.giftOne)} | 2: ${cleanText(kid.giftTwo)}`,
            tagNumber: `TEMP-${idx}`,
            status: "PENDING",
          })),
        },
      },
    });

    await resequencePendingApplications();

    return { success: true, applicationId: application.id };
  } catch (error) {
    console.error("Error submitting Christmas application:", error);
    return { success: false, error: "Failed to submit application. Please try again." };
  }
}