// js/api/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { SUPABASE_CONFIG } from '../config.js' // <-- Los dos puntos (../) suben un nivel a la carpeta 'js/'

export const supabase = createClient(
    SUPABASE_CONFIG.URL,
    SUPABASE_CONFIG.ANON_KEY
)
