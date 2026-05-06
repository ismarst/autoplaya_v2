// js/api/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { CONFIG } from '../config.js'

export const supabase = createClient(
    CONFIG.URL,
    CONFIG.ANON_KEY
)
