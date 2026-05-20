import { supabase } from '../lib/supabaseClient'

// ─────────────────────────────────────────────
// Fetch all active offers with seller name
// ─────────────────────────────────────────────
export async function getActiveOffers() {
  const { data, error } = await supabase
    .from('offers')
    .select(`
      id,
      seller_id,
      title,
      description,
      category,
      price,
      delivery_time,
      status,
      created_at,
      updated_at,
      profiles:seller_id ( full_name, email )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return { data, error }
}

// ─────────────────────────────────────────────
// Fetch a single offer by ID with seller info
// ─────────────────────────────────────────────
export async function getOfferById(id) {
  const { data, error } = await supabase
    .from('offers')
    .select(`
      id,
      seller_id,
      title,
      description,
      category,
      price,
      delivery_time,
      status,
      created_at,
      updated_at,
      profiles:seller_id ( full_name, email )
    `)
    .eq('id', id)
    .maybeSingle()

  return { data, error }
}

// ─────────────────────────────────────────────
// Insert a new offer (seller only)
// offerData should include:
//   seller_id, title, description, category,
//   price, delivery_time, status
// ─────────────────────────────────────────────
export async function createOffer(offerData) {
  const { data, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()

  return { data, error }
}

// ─────────────────────────────────────────────
// Update an existing offer by ID
// ─────────────────────────────────────────────
export async function updateOffer(id, updates) {
  const { data, error } = await supabase
    .from('offers')
    .update(updates)
    .eq('id', id)
    .select()

  return { data, error }
}

// ─────────────────────────────────────────────
// Pause an offer (set status = 'paused')
// ─────────────────────────────────────────────
export async function pauseOffer(id) {
  const { data, error } = await supabase
    .from('offers')
    .update({ status: 'paused' })
    .eq('id', id)
    .select()

  return { data, error }
}
