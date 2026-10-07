import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { listingId, targetUserId } = body;

    if (listingId) {
      // Toggle listing favorite
      const existingFavorite = await prisma.favorite.findUnique({
        where: {
          userId_listingId: { userId, listingId },
        },
      });

      if (existingFavorite) {
        await prisma.favorite.delete({
          where: { id: existingFavorite.id },
        });
        return NextResponse.json({ favorited: false });
      } else {
        await prisma.favorite.create({
          data: { userId, listingId },
        });
        return NextResponse.json({ favorited: true });
      }
    } else if (targetUserId) {
      // Toggle user favorite
      const existingUserFav = await prisma.favorite.findFirst({
        where: { userId, targetUserId },
      });

      if (existingUserFav) {
        await prisma.favorite.delete({
          where: { id: existingUserFav.id },
        });
        return NextResponse.json({ favorited: false });
      } else {
        await prisma.favorite.create({
          data: { userId, targetUserId },
        });
        return NextResponse.json({ favorited: true });
      }
    }

    return NextResponse.json({ error: "Listing ID or Target User ID is required" }, { status: 400 });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { listingId, targetUserId } = body;

    if (listingId) {
      await prisma.favorite.deleteMany({
        where: { userId, listingId },
      });
    } else if (targetUserId) {
      await prisma.favorite.deleteMany({
        where: { userId, targetUserId },
      });
    }

    return NextResponse.json({ favorited: false });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}