import { supabase } from '../lib/supabaseClient'

// ─────────────────────────────────────────────────────────────────────────────
// Fetch wallet by user_id (user's profile id)
// ─────────────────────────────────────────────────────────────────────────────
export async function getWalletByUserId(userId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return { data, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch wallet_transactions for a given wallet_id, newest first
// ─────────────────────────────────────────────────────────────────────────────
export async function getWalletTransactions(walletId, limit = 10) {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fund escrow for a trade — demo wallet deduction only, no real money moved.
//
// Steps (sequential, each returns its own error):
//  1. Guard checks (buyer only, status must be 'created')
//  2. Fetch buyer's wallet
//  3. Check available_balance >= trade.amount
//  4. Update wallet: available_balance -= amount, escrow_balance += amount
//  5. Update trade status → 'funds_locked'
//  6. Insert wallet_transaction (type = 'escrow_lock', status = 'completed')
//  7. Insert escrow_transaction  (status = 'held')
// ─────────────────────────────────────────────────────────────────────────────
export async function fundEscrow(trade, currentProfile) {
  // ── 1. Guards ─────────────────────────────────────────────────────────────
  if (!currentProfile?.id) {
    return { success: false, error: { message: 'You must be logged in.' } }
  }
  if (currentProfile.id !== trade.buyer_id) {
    return { success: false, error: { message: 'Only the buyer can fund escrow for this trade.' } }
  }
  if (trade.status !== 'created') {
    return {
      success: false,
      error: { message: `Trade cannot be funded. Current status: "${trade.status}".` },
    }
  }

  const amount = Number(trade.amount)

  // ── 2. Fetch buyer wallet ─────────────────────────────────────────────────
  const { data: wallet, error: walletFetchErr } = await getWalletByUserId(currentProfile.id)
  if (walletFetchErr) {
    return { success: false, error: { message: `Failed to fetch wallet: ${walletFetchErr.message}`, ...walletFetchErr } }
  }
  if (!wallet) {
    return { success: false, error: { message: 'Buyer wallet not found. Please contact support.' } }
  }

  // ── 3. Balance check ──────────────────────────────────────────────────────
  if (Number(wallet.available_balance) < amount) {
    return {
      success: false,
      error: {
        message: `Insufficient demo wallet balance. Available: ₦${Number(wallet.available_balance).toLocaleString()}, Required: ₦${amount.toLocaleString()}.`,
      },
      isInsufficientFunds: true,
    }
  }

  const newAvailable = parseFloat((Number(wallet.available_balance) - amount).toFixed(2))
  const newEscrow    = parseFloat((Number(wallet.escrow_balance)    + amount).toFixed(2))

  // ── 4. Update wallet ──────────────────────────────────────────────────────
  const { error: walletUpdateErr } = await supabase
    .from('wallets')
    .update({ available_balance: newAvailable, escrow_balance: newEscrow })
    .eq('id', wallet.id)

  if (walletUpdateErr) {
    return { success: false, error: { message: `Wallet update failed: ${walletUpdateErr.message}`, ...walletUpdateErr } }
  }

  // ── 5. Update trade status ────────────────────────────────────────────────
  const { error: tradeUpdateErr } = await supabase
    .from('trades')
    .update({ status: 'funds_locked' })
    .eq('id', trade.id)

  if (tradeUpdateErr) {
    return { success: false, error: { message: `Trade status update failed: ${tradeUpdateErr.message}`, ...tradeUpdateErr } }
  }

  // ── 6. Insert wallet_transaction ──────────────────────────────────────────
  const reference = `WT-${Date.now()}-${trade.id.slice(0, 8)}`
  const { error: wtxErr } = await supabase
    .from('wallet_transactions')
    .insert([{
      wallet_id:   wallet.id,
      trade_id:    trade.id,
      reference,
      type:        'escrow_lock',
      amount,
      status:      'completed',
      description: `Demo escrow funding for trade ${trade.id}`,
    }])

  if (wtxErr) {
    // Non-fatal: wallet and trade already updated — log but continue
    console.warn('[walletService] wallet_transaction insert failed:', wtxErr.message)
  }

  // ── 7. Insert escrow_transaction ──────────────────────────────────────────
  const { error: etxErr } = await supabase
    .from('escrow_transactions')
    .insert([{
      trade_id:  trade.id,
      buyer_id:  trade.buyer_id,
      seller_id: trade.seller_id,
      amount,
      fee:       Number(trade.platform_fee) || 0,
      status:    'held',
    }])

  if (etxErr) {
    console.warn('[walletService] escrow_transaction insert failed:', etxErr.message)
  }

  return {
    success: true,
    wtxError:  wtxErr  || null,
    etxError:  etxErr  || null,
    newAvailable,
    newEscrow,
    reference,
  }
}
