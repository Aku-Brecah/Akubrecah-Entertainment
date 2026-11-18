"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const OnboardingProfileSchema = z
  .object({
    fullName: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(24).optional(),
    dob: z.string().trim().max(20).optional(),
    gender: z.string().trim().max(32).optional(),
    nationality: z.string().trim().max(64).optional(),
  })
  .optional();

export async function completeOnboardingAction(profile?: {
  fullName?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const parsed = OnboardingProfileSchema.safeParse(profile);
  if (!parsed.success) {
    throw new Error("Invalid onboarding profile input.");
  }
  const safeProfile = parsed.data;

  const client = await clerkClient();

  const names = (safeProfile?.fullName || "").trim().split(/\s+/).filter(Boolean);
  if (names.length > 0) {
    await client.users
      .updateUser(userId, {
        ...(names.length > 1
          ? { firstName: names[0], lastName: names.slice(1).join(" ") }
          : { firstName: names[0] }),
      })
      .catch(() => undefined);
  }

  const metadataUpdate: Record<string, string | boolean> = {
    onboardingComplete: true,
  };
  if (safeProfile?.phone) metadataUpdate.phoneNumber = safeProfile.phone;
  if (safeProfile?.dob) metadataUpdate.dob = safeProfile.dob;
  if (safeProfile?.gender) metadataUpdate.gender = safeProfile.gender;
  if (safeProfile?.nationality) metadataUpdate.nationality = safeProfile.nationality;

  // Clerk updateUserMetadata performs a shallow merge so existing fields like `role` are preserved
  await client.users.updateUserMetadata(userId, {
    publicMetadata: metadataUpdate,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  return { success: true };
}
