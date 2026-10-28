import { currentUser } from "@clerk/nextjs/server";
import ProfileClient from "@/components/profile-client";

export default async function MyProfileDashboard() {
  const user = await currentUser();
  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "";
  const email = user?.emailAddresses[0]?.emailAddress || null;

  const metadata = user?.publicMetadata || {};
  const phone = user?.phoneNumbers[0]?.phoneNumber || (metadata.phoneNumber as string) || null;
  // Honesty fix: never render fabricated personal data (fake DOB, gender,
  // avatar) as if it were the user's stored profile. Empty until the user
  // actually provides it.
  const dob = (metadata.dob as string) || "";
  const gender = (metadata.gender as string) || "";
  const nationality = (metadata.nationality as string) || "";

  const imageUrl = user?.imageUrl || "";

  return (
    <ProfileClient
      fullName={fullName}
      email={email}
      phone={phone}
      imageUrl={imageUrl}
      initialDob={dob}
      initialGender={gender}
      initialNationality={nationality}
    />
  );
}
