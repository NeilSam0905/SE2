import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ovucquikswfdlexjrdai.supabase.co";
const supabaseAnonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_nF5salrKZJQ65fbCHNPagw_ppqKXY3N";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
