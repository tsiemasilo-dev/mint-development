import { supabase, supabaseAdmin, authenticateUser, getClient } from "../_lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const db = getClient(req);
  if (!db) return res.status(500).json({ error: "Database not connected" });

  const { user, error: authError } = await authenticateUser(req);
  if (!user) return res.status(401).json({ error: authError || "Unauthorized" });

  // ── GET — check all deletion blockers ────────────────────────────────────
  if (req.method === "GET") {
    const blockers = [];
    const children = [];

    try {
      // 1. Child accounts — must all be closed first
      const { data: familyMembers, error: famErr } = await db
        .from("family_members")
        .select("id, first_name, last_name, relationship, available_balance")
        .eq("primary_user_id", user.id)
        .eq("relationship", "child");

      if (!famErr) {
        for (const child of familyMembers || []) {
          const childBlockers = [];

          const { data: activeHoldings } = await db
            .from("stock_holdings_c")
            .select("id")
            .eq("family_member_id", child.id)
            .eq("Status", "active")
            .limit(1);

          if (activeHoldings?.length > 0) {
            childBlockers.push({
              type: "holdings",
              message: `${child.first_name} has active investments that must be sold first`,
            });
          }

          if ((child.available_balance || 0) > 0) {
            childBlockers.push({
              type: "balance",
              message: `${child.first_name} has a remaining balance that must be withdrawn first`,
            });
          }

          children.push({
            id: child.id,
            first_name: child.first_name,
            last_name: child.last_name || "",
            available_balance: child.available_balance || 0,
            blockers: childBlockers,
            canClose: childBlockers.length === 0,
          });
        }

        if (children.length > 0) {
          blockers.push({
            type: "children",
            message: `You have ${children.length} linked child account${children.length > 1 ? "s" : ""} that must be closed first`,
            children,
          });
        }
      }

      // 2. Wallet balance
      const { data: wallet } = await db
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const walletBalance = Number(wallet?.balance || 0);
      if (walletBalance > 0) {
        blockers.push({
          type: "wallet",
          message: `Your wallet has R${walletBalance.toFixed(2)} that must be withdrawn before closing your account`,
        });
      }

      // 3. Active holdings
      const { data: holdings } = await db
        .from("stock_holdings_c")
        .select("id, strategy_name_snapshot")
        .eq("user_id", user.id)
        .eq("Status", "active");

      if (holdings?.length > 0) {
        blockers.push({
          type: "holdings",
          message: `You have ${holdings.length} active investment${holdings.length > 1 ? "s" : ""} that must be sold before closing your account`,
        });
      }

      // 4. Pending transactions
      const { data: pendingTxns } = await db
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing"]);

      if (pendingTxns?.length > 0) {
        blockers.push({
          type: "pending_transactions",
          message: `You have ${pendingTxns.length} pending transaction${pendingTxns.length > 1 ? "s" : ""} — please wait for them to settle`,
        });
      }

      return res.json({
        canDelete: blockers.length === 0,
        blockers,
        children,
        email: user.email,
      });
    } catch (e) {
      console.error("[account/delete] GET error:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST — verify password and submit account closure ─────────────────────
  if (req.method === "POST") {
    const { password, reason, reason_other } = req.body || {};

    if (!password) return res.status(400).json({ error: "Password is required" });
    if (!reason) return res.status(400).json({ error: "Please select a reason for closing your account" });

    if (!supabase) return res.status(500).json({ error: "Auth service unavailable" });

    // Verify the user's password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (signInError || !signInData?.user) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    // Re-run blocker checks — nothing should have changed, but be safe
    const { data: wallet } = await db.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    if (Number(wallet?.balance || 0) > 0) {
      return res.status(400).json({ error: "Please withdraw your wallet balance before closing your account." });
    }

    const { data: holdings } = await db.from("stock_holdings_c").select("id").eq("user_id", user.id).eq("Status", "active");
    if (holdings?.length > 0) {
      return res.status(400).json({ error: "Please sell all investments before closing your account." });
    }

    const { data: childAccounts } = await db.from("family_members").select("id").eq("primary_user_id", user.id).eq("relationship", "child");
    if (childAccounts?.length > 0) {
      return res.status(400).json({ error: "Please close all linked child accounts before closing your account." });
    }

    // Log the closure request as a transaction record
    const closureNote = reason === "other" && reason_other
      ? `Account closure request — Other: ${reason_other.slice(0, 200)}`
      : `Account closure request — Reason: ${reason}`;

    try {
      await db.from("transactions").insert({
        user_id: user.id,
        name: "Account Closure Request",
        direction: "debit",
        amount: 0,
        description: closureNote,
        status: "closure_requested",
        currency: "ZAR",
        transaction_date: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[account/delete] Could not log closure transaction:", e.message);
    }

    console.log(`[account/delete] Account closure requested by user ${user.id} (${user.email}). Reason: ${reason}`);

    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
