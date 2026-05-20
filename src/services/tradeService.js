import { supabase } from '../lib/supabaseClient'

const PLATFORM_FEE_RATE = 0.025 // 2.5%

// ─────────────────────────────────────────────────────────────────────────────
// Start a trade from a marketplace offer
// Guards: user must be logged-in buyer; cannot trade own offer
// ─────────────────────────────────────────────────────────────────────────────
export async function startTradeFromOffer(offer, buyerProfile) {
  if (!buyerProfile?.id) {
    return { data: null, error: { message: 'You must be logged in to start a trade.' } }
  }

  if (buyerProfile.role !== 'buyer') {
    return { data: null, error: { message: 'Only buyers can start trades.' } }
  }

  if (offer.seller_id === buyerProfile.id) {
    return { data: null, error: { message: 'You cannot start a trade on your own offer.' } }
  }

  const amount         = Number(offer.price)
  const platform_fee   = parseFloat((amount * PLATFORM_FEE_RATE).toFixed(2))
  const seller_receives = parseFloat((amount - platform_fee).toFixed(2))

  const { data, error } = await supabase
    .from('trades')
    .insert([
      {
        buyer_id:      buyerProfile.id,
        seller_id:     offer.seller_id,
        offer_id:      offer.id,
        amount,
        platform_fee,
        seller_receives,
        status:        'created',
      },
    ])
    .select()

  return { data, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch a single trade by ID — joins buyer, seller, and offer profiles
// ─────────────────────────────────────────────────────────────────────────────
export async function getTradeById(id) {
  const { data, error } = await supabase
    .from('trades')
    .select(`
      id,
      buyer_id,
      seller_id,
      offer_id,
      amount,
      platform_fee,
      seller_receives,
      status,
      delivery_message,
      delivery_proof_url,
      created_at,
      updated_at,
      buyer:buyer_id   ( full_name, email ),
      seller:seller_id ( full_name, email ),
      offer:offer_id   ( title, category, delivery_time )
    `)
    .eq('id', id)
    .maybeSingle()

  return { data, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all trades visible to the current user
//   buyer  → trades where buyer_id  = profile.id
//   seller → trades where seller_id = profile.id
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserTrades(profile) {
  if (!profile?.id) return { data: [], error: null }

  const column = profile.role === 'seller' ? 'seller_id' : 'buyer_id'

  const { data, error } = await supabase
    .from('trades')
    .select(`
      id,
      buyer_id,
      seller_id,
      offer_id,
      amount,
      platform_fee,
      seller_receives,
      status,
      created_at,
      updated_at,
      buyer:buyer_id   ( full_name ),
      seller:seller_id ( full_name ),
      offer:offer_id   ( title, category )
    `)
    .eq(column, profile.id)
    .order('created_at', { ascending: false })

  return { data, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// Update trade status (and optionally extra fields)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateTradeStatus(id, status, updates = {}) {
  const { data, error } = await supabase
    .from('trades')
    .update({ status, ...updates })
    .eq('id', id)
    .select()

  return { data, error }
}
