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

  const { data: wallet, error: walletFetchErr } = await getWalletByUserId(currentProfile.id)

  if (walletFetchErr) {
    return {
      success: false,
      error: { message: `Failed to fetch wallet: ${walletFetchErr.message}`, ...walletFetchErr },
    }
  }

  if (!wallet) {
    return { success: false, error: { message: 'Buyer wallet not found. Please contact support.' } }
  }

  if (Number(wallet.available_balance) < amount) {
    return {
      success: false,
      error: {
        message: `Insufficient demo wallet balance. Available: ₦${Number(wallet.available_balance).toLocaleString()}, Required: ₦${amount.toLocaleString()}.`,
      },
      isInsufficientFunds: true,
    }
  }

  const newAvailable = Number((Number(wallet.available_balance) - amount).toFixed(2))
  const newEscrow = Number((Number(wallet.escrow_balance) + amount).toFixed(2))

  // 1. Update buyer wallet
  const { data: updatedWallet, error: walletUpdateErr } = await supabase
    .from('wallets')
    .update({
      available_balance: newAvailable,
      escrow_balance: newEscrow,
    })
    .eq('id', wallet.id)
    .select()
    .single()

  if (walletUpdateErr) {
    return {
      success: false,
      error: { message: `Wallet update failed: ${walletUpdateErr.message}`, ...walletUpdateErr },
    }
  }

  // 2. Update trade status
  const { data: updatedTrade, error: tradeUpdateErr } = await supabase
    .from('trades')
    .update({ status: 'funded' })
    .eq('id', trade.id)
    .select()
    .single()

  if (tradeUpdateErr) {
    return {
      success: false,
      error: { message: `Trade status update failed: ${tradeUpdateErr.message}`, ...tradeUpdateErr },
    }
  }

    // ── 6. Insert wallet_transaction ──────────────────────────────────────────
  const reference = `WT-${Date.now()}-${trade.id.slice(0, 8)}`

  const walletTransactionPayload = {
    wallet_id: wallet.id,
    trade_id: trade.id,
    reference,
    type: 'escrow_lock',
    amount,
    status: 'completed',
    description: `Demo escrow funding for trade ${trade.id}`,
  }

  const { data: walletTransaction, error: wtxErr } = await supabase
    .from('wallet_transactions')
    .insert(walletTransactionPayload)
    .select()
    .single()

  if (wtxErr) {
    return {
      success: false,
      error: {
        message: `Wallet transaction insert failed: ${wtxErr.message}`,
        ...wtxErr,
      },
    }
  }

  // ── 7. Insert escrow_transaction ──────────────────────────────────────────
  const escrowTransactionPayload = {
    trade_id: trade.id,
    buyer_id: trade.buyer_id,
    seller_id: trade.seller_id,
    amount,
    fee: Number(trade.platform_fee) || 0,
    status: 'held',
  }

  const { data: escrowTransaction, error: etxErr } = await supabase
    .from('escrow_transactions')
    .insert(escrowTransactionPayload)
    .select()
    .single()

  if (etxErr) {
    return {
      success: false,
      error: {
        message: `Escrow transaction insert failed: ${etxErr.message}`,
        ...etxErr,
      },
    }
  }

  return {
    success: true,
    walletTransaction,
    escrowTransaction,
    newAvailable,
    newEscrow,
    reference,
  }
}