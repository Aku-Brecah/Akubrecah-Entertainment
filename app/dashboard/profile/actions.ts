"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(80).optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\+?[0-9\s\-()]{9,20}$/.test(v), "Invalid phone number format")
    .optional(),
  dob: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date format (YYYY-MM-DD)")
    .optional(),
  gender: z.enum(["", "Male", "Female", "Other", "Prefer not to say"]).optional(),
  nationality: z.string().trim().max(80).optional(),
});

export async function updateProfileDetails(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid profile details.");
  }

  const valid = parsed.data;
  const client = await clerkClient();

  // 1. Update standard fields on Clerk User if provided
  if (valid.firstName !== undefined || valid.lastName !== undefined) {
    await client.users.updateUser(userId, {
      ...(valid.firstName !== undefined && { firstName: valid.firstName }),
      ...(valid.lastName !== undefined && { lastName: valid.lastName }),
    });
  }

  // 2. Shallow-merge only profile fields into publicMetadata (never overwrite role/onboardingComplete)
  const metadataUpdate: Record<string, string> = {};
  if (valid.phone !== undefined) metadataUpdate.phoneNumber = valid.phone;
  if (valid.dob !== undefined) metadataUpdate.dob = valid.dob;
  if (valid.gender !== undefined) metadataUpdate.gender = valid.gender;
  if (valid.nationality !== undefined) metadataUpdate.nationality = valid.nationality;

  if (Object.keys(metadataUpdate).length > 0) {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: metadataUpdate,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  return { success: true };
}
