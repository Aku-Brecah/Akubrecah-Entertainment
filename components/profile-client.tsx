"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  Camera,
  CheckCircle2,
  ShieldCheck,
  User,
  Pencil,
  AtSign,
  Smartphone,
  Shield,
  Key,
  Lock,
  History,
  AlertTriangle,
  X,
  Save,
} from "lucide-react";
import { updateProfileDetails } from "@/app/dashboard/profile/actions";

interface ProfileClientProps {
  fullName: string;
  email: string | null;
  phone: string | null;
  imageUrl: string;
  initialDob?: string;
  initialGender?: string;
  initialNationality?: string;
}

const NATIONALITIES = [
  "Kenyan","Ugandan","Tanzanian","Rwandan","Ethiopian","Somali",
  "South Sudanese","Burundian","Congolese","Afghan","Albanian","Algerian",
  "American","Angolan","Argentine","Australian","Austrian","Bangladeshi",
  "Belgian","Brazilian","British","Bulgarian","Cambodian","Cameroonian",
  "Canadian","Chilean","Chinese","Colombian","Croatian","Czech","Danish",
  "Dutch","Egyptian","Finnish","French","Ghanaian","Greek","Hungarian",
  "Indian","Indonesian","Iranian","Iraqi","Irish","Israeli","Italian",
  "Japanese","Jordanian","Korean","Lebanese","Libyan","Malaysian","Mexican",
  "Moroccan","Mozambican","Namibian","New Zealander","Nigerian","Norwegian",
  "Pakistani","Palestinian","Peruvian","Philippine","Polish","Portuguese",
  "Romanian","Russian","Saudi","Senegalese","Serbian","Singaporean",
  "South African","Spanish","Sri Lankan","Sudanese","Swedish","Swiss",
  "Syrian","Thai","Tunisian","Turkish","Ukrainian","Emirati","Venezuelan",
  "Vietnamese","Zambian","Zimbabwean","Other",
];

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
          <h2 className="font-bold text-on-surface text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Toast({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) {
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-surface-container-lowest border rounded-xl shadow-lg px-5 py-3 animate-in slide-in-from-bottom-4 ${
        type === "error" ? "border-red-500/50" : "border-outline-variant"
      }`}
    >
      {type === "error" ? (
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
      )}
      <span className="font-medium text-on-surface text-sm">{message}</span>
      <button
        type="button"
        aria-label="Close notification"
        onClick={onClose}
        className="ml-2 text-on-surface-variant hover:text-on-surface"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ProfileClient({
  fullName: initialFullName,
  email: initialEmail,
  phone: initialPhone,
  imageUrl,
  initialDob = "",
  initialGender = "",
  initialNationality = "",
}: ProfileClientProps) {
  const { openUserProfile } = useClerk();
  const { user: clerkUser } = useUser();

  // State
  const [fullName, setFullName] = useState(initialFullName);
  const [email] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [dob, setDob] = useState(initialDob);
  const [gender, setGender] = useState(initialGender);
  const [nationality, setNationality] = useState(initialNationality);
  const [toastState, setToastState] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal state
  const [modal, setModal] = useState<
    "personal" | "contact" | "loginActivity" | null
  >(null);

  // Form temp values
  const [tempFirstName, setTempFirstName] = useState("");
  const [tempLastName, setTempLastName] = useState("");
  const [tempDob, setTempDob] = useState("");
  const [tempGender, setTempGender] = useState("");
  const [tempNationality, setTempNationality] = useState("");
  const [tempPhone, setTempPhone] = useState("");

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastState({ message: msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastState(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("message") === "incomplete_profile") {
        const t = setTimeout(() => {
          showToast("Please update your full name and phone number to unlock services.", "error");
        }, 100);
        return () => clearTimeout(t);
      }
    }
  }, []);

  const openPersonalModal = () => {
    const [first, ...rest] = fullName.split(" ");
    setTempFirstName(first || "");
    setTempLastName(rest.join(" ") || "");
    setTempDob(dob);
    setTempGender(gender);
    setTempNationality(nationality);
    setModal("personal");
  };

  const savePersonal = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await updateProfileDetails({
        firstName: tempFirstName,
        lastName: tempLastName,
        dob: tempDob,
        gender: tempGender,
        nationality: tempNationality,
      });
      if (res.success) {
        setFullName(`${tempFirstName} ${tempLastName}`.trim());
        setDob(tempDob);
        setGender(tempGender);
        setNationality(tempNationality);
        setModal(null);
        await clerkUser?.reload().catch(() => {});
        showToast("Personal information updated successfully.");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update personal information.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const openContactModal = () => {
    setTempPhone(phone || "");
    setModal("contact");
  };

  const saveContact = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await updateProfileDetails({
        phone: tempPhone,
      });
      if (res.success) {
        setPhone(tempPhone || null);
        setModal(null);
        await clerkUser?.reload().catch(() => {});
        showToast("Phone number updated successfully.");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update contact information.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const missingPhone = !phone;
  const missingEmail = !email;

  const hasName = fullName.trim().length > 0;
  const hasPhone = !missingPhone;
  let completeness = 0;
  if (hasName) completeness += 50;
  if (hasPhone) completeness += 50;

  const inputCls =
    "w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm";

  return (
    <div className="px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 w-full max-w-[1360px] mx-auto">
      {/* Profile Header */}
      <section className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative border border-outline-variant">
        <div className="relative">
          {imageUrl ? (
            <Image
              className="w-24 h-24 rounded-xl object-cover border border-outline-variant"
              alt={fullName || "Taxpayer Profile"}
              width={96}
              height={96}
              src={imageUrl}
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border border-outline-variant">
              {(fullName || email || "TX")
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => openUserProfile()}
            title="Change photo"
            aria-label="Change profile photo"
            className="absolute -bottom-1.5 -right-1.5 bg-primary text-white p-1.5 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-on-surface">{fullName || "Registered Taxpayer"}</h2>
          <p className="text-on-surface-variant text-xs sm:text-sm mt-1">
            {email ?? "No email on file"}
          </p>
          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2.5">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-md text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active Account
            </span>
            {completeness === 100 && (
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant border border-outline-variant rounded-md text-xs font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Profile Complete
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Profile Completeness Status */}
      <section className="bg-surface-container-lowest rounded-xl p-6 mb-6 border border-outline-variant">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="font-bold text-on-surface text-lg">Profile Completeness</h3>
            <p className="text-on-surface-variant text-xs mt-0.5">
              {completeness === 100 
                ? "Your profile is fully complete. All services unlocked!" 
                : "Complete your profile details to unlock all portal services."}
            </p>
          </div>
          <span className={`px-3 py-1 text-xs font-bold rounded-full h-max ${
            completeness === 100 
              ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300" 
              : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
          }`}>
            {completeness}% Complete
          </span>
        </div>
        <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              completeness === 100 ? "bg-green-600" : "bg-amber-500"
            }`} 
            style={{ width: `${completeness}%` }}
          />
        </div>
      </section>

      {/* Missing Info Banners */}
      {(missingPhone || missingEmail) && (
        <div className="space-y-3 mb-6">
          {missingEmail && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">Email address missing</p>
                <p className="text-amber-700 dark:text-amber-300 text-sm mt-0.5">
                  Add an email to unlock full functionality and notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUserProfile()}
                className="text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-400 rounded-lg px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors whitespace-nowrap"
              >
                Manage in Account Settings
              </button>
            </div>
          )}
          {missingPhone && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">Phone number missing</p>
                <p className="text-amber-700 dark:text-amber-300 text-sm mt-0.5">
                  Required for certificate downloads and two-factor authentication.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUserProfile()}
                className="text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-400 rounded-lg px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors whitespace-nowrap"
              >
                Manage in Account Settings
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-bold text-on-surface flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-primary" /> Personal Information
            </h3>
            <button
              onClick={openPersonalModal}
              className="text-primary text-xs font-semibold flex items-center gap-1 hover:underline"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Full Name</span>
              <span className="text-on-surface font-medium text-sm mt-0.5">{fullName || "Not provided"}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Date of Birth</span>
                <span className="text-on-surface font-medium text-sm mt-0.5">
                  {dob && !Number.isNaN(new Date(dob).getTime())
                    ? new Date(dob).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "Not provided"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Gender</span>
                <span className="text-on-surface font-medium text-sm mt-0.5">{gender || "Not provided"}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nationality</span>
              <span className="text-on-surface font-medium text-sm mt-0.5">{nationality || "Not provided"}</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-bold text-on-surface flex items-center gap-2 text-sm">
              <AtSign className="w-4 h-4 text-primary" /> Contact Information
            </h3>
            <button
              onClick={openContactModal}
              className="text-primary text-xs font-semibold flex items-center gap-1 hover:underline"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AtSign className="w-4 h-4 text-primary mt-1" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Email Address</span>
                {email
                  ? <span className="text-on-surface font-medium text-sm mt-0.5">{email}</span>
                  : <span className="text-amber-600 dark:text-amber-400 font-medium text-xs flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3.5 h-3.5" /> Not provided</span>
                }
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Smartphone className="w-4 h-4 text-primary mt-1" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Phone Number</span>
                {phone
                  ? <span className="text-on-surface font-medium text-sm mt-0.5">{phone}</span>
                  : <span className="text-amber-600 dark:text-amber-400 font-medium text-xs flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3.5 h-3.5" /> Not provided</span>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden sm:col-span-2">
          <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Account Security
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Password */}
            <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant/50">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-bold text-on-surface text-sm">Password</p>
                  <p className="text-xs text-on-surface-variant">Managed via Clerk Security</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openUserProfile()}
                className="px-3 py-1.5 border border-outline-variant text-on-surface text-sm font-bold rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
              >
                Manage
              </button>
            </div>
            {/* 2FA */}
            <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant/50">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-bold text-on-surface text-sm">Two-Factor Auth</p>
                  <p className={`text-xs font-medium ${clerkUser?.twoFactorEnabled ? "text-green-600 dark:text-green-400" : "text-on-surface-variant"}`}>
                    {clerkUser?.twoFactorEnabled ? "Enabled on account" : "Configure in Clerk"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openUserProfile()}
                className="px-3 py-1.5 border border-outline-variant text-on-surface text-sm font-bold rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
              >
                Security
              </button>
            </div>
            {/* Login Activity */}
            <button
              type="button"
              onClick={() => setModal("loginActivity")}
              className="flex items-center justify-center gap-2 p-4 text-primary font-bold text-sm hover:bg-primary/5 rounded-xl transition-colors border border-dashed border-primary/40 cursor-pointer"
            >
              <History className="w-5 h-5" /> View Login Activity
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Edit Personal Information */}
      {modal === "personal" && (
        <Modal title="Edit Personal Information" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-primary uppercase tracking-wider">First Name</label>
                <input value={tempFirstName} onChange={e => setTempFirstName(e.target.value)} className={inputCls} placeholder="First name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-primary uppercase tracking-wider">Last Name</label>
                <input value={tempLastName} onChange={e => setTempLastName(e.target.value)} className={inputCls} placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Date of Birth</label>
              <input type="date" value={tempDob} onChange={e => setTempDob(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Gender</label>
              <select value={tempGender} onChange={e => setTempGender(e.target.value)} className={inputCls}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Nationality</label>
              <select value={tempNationality} onChange={e => setTempNationality(e.target.value)} className={inputCls}>
                <option value="">Not specified</option>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} disabled={isSaving} className="flex-1 py-2.5 border border-outline-variant rounded-xl text-on-surface font-bold hover:bg-surface-container transition-colors text-sm disabled:opacity-50">Cancel</button>
              <button type="button" onClick={savePersonal} disabled={isSaving} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Contact Information */}
      {modal === "contact" && (
        <Modal title="Edit Contact Information" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Primary Email Address</label>
              <input type="email" value={email || ""} readOnly disabled className={inputCls + " opacity-70 cursor-not-allowed"} placeholder="No verified email on file" />
              <p className="text-[11px] text-on-surface-variant">
                Primary email is managed via your verified authentication account.{" "}
                <button type="button" onClick={() => { setModal(null); openUserProfile(); }} className="text-primary font-bold hover:underline cursor-pointer">
                  Update email in Clerk
                </button>
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">Phone Number</label>
              <input type="tel" value={tempPhone} onChange={e => setTempPhone(e.target.value)} className={inputCls} placeholder="+254 700 000 000" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} disabled={isSaving} className="flex-1 py-2.5 border border-outline-variant rounded-xl text-on-surface font-bold hover:bg-surface-container transition-colors text-sm disabled:opacity-50">Cancel</button>
              <button type="button" onClick={saveContact} disabled={isSaving} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Login Activity */}
      {modal === "loginActivity" && (
        <Modal title="Login Activity" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant bg-surface">
              <div>
                <p className="font-medium text-on-surface text-sm">Current Authenticated Session</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Last sign-in:{" "}
                  {clerkUser?.lastSignInAt
                    ? new Date(clerkUser.lastSignInAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                    : "Active Now"}
                </p>
              </div>
              <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2.5 py-1 rounded-full">
                Current
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              View all signed-in browsers, active security sessions, and connected devices directly inside Clerk Security Settings.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-outline-variant rounded-xl text-on-surface font-bold hover:bg-surface-container transition-colors text-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  openUserProfile();
                }}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors text-sm cursor-pointer"
              >
                Manage Active Devices
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toastState && (
        <Toast
          message={toastState.message}
          type={toastState.type}
          onClose={() => setToastState(null)}
        />
      )}
    </div>
  );
}
