"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateDisplayName(formData: FormData) {
  const name = String(formData.get("display_name") || "").trim();
  const next = String(formData.get("next") || "");
  const toSettings = next === "/settings";

  if (!name) {
    if (toSettings) {
      redirect(`/settings?error=${encodeURIComponent("Username required")}`);
    }
    throw new Error("Display name required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    if (toSettings) {
      redirect(`/settings?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/connect");
  revalidatePath("/settings");

  if (toSettings) {
    redirect(`/settings?success=${encodeURIComponent("Username updated")}`);
  }
}

export async function updateEmail(formData: FormData) {
  const email = String(
    formData.get("new_email") || formData.get("email") || "",
  )
    .trim()
    .toLowerCase();
  const password = String(
    formData.get("account_password") || formData.get("password") || "",
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!email || !email.includes("@")) {
    redirect(`/settings?error=${encodeURIComponent("Enter a valid email")}`);
  }

  if (email === user.email?.toLowerCase()) {
    redirect(
      `/settings?error=${encodeURIComponent("That’s already your email")}`,
    );
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });
  if (authError) {
    redirect(
      `/settings?error=${encodeURIComponent("Incorrect account password")}`,
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const { error } = await supabase.auth.updateUser(
    { email },
    appUrl
      ? { emailRedirectTo: `${appUrl}/auth/callback?next=/settings` }
      : undefined,
  );

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect(
    `/settings?success=${encodeURIComponent(
      "Check your inbox to confirm the new email",
    )}`,
  );
}

export async function deleteAccount(formData: FormData) {
  const password = String(
    formData.get("account_password") || formData.get("password") || "",
  );
  const confirm = String(formData.get("confirm") || "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (confirm !== "DELETE") {
    redirect(
      `/settings?error=${encodeURIComponent(
        "Enter DELETE (all caps) in the confirmation box, then your password",
      )}`,
    );
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });
  if (authError) {
    redirect(
      `/settings?error=${encodeURIComponent("Incorrect account password")}`,
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/");
}

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const isPrivate = formData.get("is_private") === "on";
  const password = String(formData.get("password") || "");

  if (!name) throw new Error("Group name required");
  if (isPrivate && password.length < 4) {
    throw new Error("Private groups need a password (4+ characters)");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const passwordHash = isPrivate ? await bcrypt.hash(password, 10) : null;

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      description,
      is_private: isPrivate,
      password_hash: passwordHash,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) throw memberError;

  revalidatePath("/groups");
  redirect(`/groups/${group.id}`);
}

export async function joinPublicGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("id, is_private")
    .eq("id", groupId)
    .single();

  if (!group || group.is_private) {
    throw new Error("Group is private — use the password join form");
  }

  // Use insert (not upsert): upsert needs an UPDATE RLS policy and can fail with
  // "new row violates row-level security policy" for first-time joiners.
  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
    role: "member",
  });

  // 23505 = already a member (unique on group_id, user_id)
  if (error && error.code !== "23505") throw error;
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function joinPrivateGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") || "");
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Need password_hash — use admin to read it without exposing via RLS broadly
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, is_private, password_hash")
    .eq("id", groupId)
    .maybeSingle();

  if (!group?.is_private || !group.password_hash) {
    redirect(`/groups?error=${encodeURIComponent("Not a private group")}`);
  }

  const ok = await bcrypt.compare(password, group.password_hash);
  if (!ok) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent("Incorrect password")}`);
  }

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
    role: "member",
  });

  if (error && error.code !== "23505") {
    redirect(`/groups/${groupId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function changeGroupPassword(formData: FormData) {
  const groupId = String(formData.get("group_id") || "");
  const accountPassword = String(formData.get("account_password") || "");
  const newPassword = String(formData.get("new_password") || "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, is_private, created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (!group || !group.is_private) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent("Not a private group")}`);
  }
  if (group.created_by !== user.id) {
    redirect(
      `/groups/${groupId}?error=${encodeURIComponent("Only the group owner can change the password")}`,
    );
  }

  // Re-authenticate: require the user's own account password
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: accountPassword,
  });
  if (authError) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent("Incorrect account password")}`);
  }

  if (newPassword.length < 4) {
    redirect(
      `/groups/${groupId}?error=${encodeURIComponent("New password must be at least 4 characters")}`,
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { error } = await admin
    .from("groups")
    .update({ password_hash: passwordHash })
    .eq("id", groupId);

  if (error) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}?success=${encodeURIComponent("Group password updated")}`);
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  revalidatePath("/groups");
  redirect("/groups");
}
