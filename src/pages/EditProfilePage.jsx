import React, { useRef, useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";

const EditProfilePage = ({ onNavigate }) => {
  const { profile, setProfile } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Your Name";
  const displayUsername =
    profile.email ? `@${profile.email.split("@")[0]}` : "@username";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const fieldValue = (value) => value || "—";

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !supabase) return;

    setIsUploading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("Unable to load user");
      }

      const userId = userData.user.id;
      const safeFileName = file.name
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");
      const filePath = `${userId}/${Date.now()}-${safeFileName || "profile-image"}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);
      const avatarUrl = publicUrlData?.publicUrl;

      if (avatarUrl) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", userId);
        if (updateError) {
          throw updateError;
        }
        setProfile((prev) => ({ ...prev, avatarUrl }));
      }
    } catch (error) {
      console.error("Failed to upload avatar", error);
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 pb-10 pt-10">
      <header className="relative mb-8 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onNavigate?.("more")}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Edit Profile</h1>
      </header>

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-600">
              {initials || "ME"}
            </div>
          )}
          <button
            type="button"
            onClick={handleAvatarSelect}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition active:scale-95"
            aria-label="Upload profile photo"
            disabled={isUploading}
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">{displayName}</h2>
        <p className="mt-1 text-sm text-slate-500">{displayUsername}</p>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">First name</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.firstName)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Last name</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.lastName)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.email)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Username</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(displayUsername)}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="mt-10 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:scale-95"
      >
        Save
      </button>
    </div>
  );
};

export default EditProfilePage;
