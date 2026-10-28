"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

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

  const client = await clerkClient();

  // Persist the collected profile data (previously the form values were read
  // and silently discarded). Standard fields go on the Clerk User; the rest
  // merge into publicMetadata, matching the dashboard profile action.
  const names = (profile?.fullName || '').trim().split(/\s+/).filter(Boolean);
  if (names.length > 0) {
    await client.users
      .updateUser(userId, {
        ...(names.length > 1
          ? { firstName: names[0], lastName: names.slice(1).join(' ') }
          : { firstName: names[0] }),
      })
      .catch(() => undefined);
  }

  const metadataUpdate: Record<string, string> = {};
  if (profile?.phone) metadataUpdate.phoneNumber = profile.phone;
  if (profile?.dob) metadataUpdate.dob = profile.dob;
  if (profile?.gender) metadataUpdate.gender = profile.gender;
  if (profile?.nationality) metadataUpdate.nationality = profile.nationality;

  const user = await client.users.getUser(userId);
  const existingMetadata = user.publicMetadata || {};

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...existingMetadata,
      ...metadataUpdate,
      onboardingComplete: true,
    },
  });

  return { success: true };
}
