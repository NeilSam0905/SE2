import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		"Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env (see .env.example).",
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
	realtime: {
		params: { eventsPerSecond: 10 },
		heartbeatIntervalMs: 15000,
		reconnectAfterMs: (tries) => Math.min(1000 * 2 ** tries, 30000),
	},
	global: {
		headers: { 'X-Client-Info': 'tatuns-staff' },
	},
	db: {
		schema: 'public',
	},
});

// Non-persistent client for creating users without switching the admin's active session.
export const supabaseNoSession = createClient(supabaseUrl, supabaseAnonKey, {
	auth: { persistSession: false },
});

// ── Connection keep-alive & recovery ──────────────────────────────────────────
// Detect visibility changes (tab hidden / Electron minimised) and force
// the realtime transport to reconnect when the window comes back.
let _keepAliveTimer = null;

const startKeepAlive = () => {
	if (_keepAliveTimer) return;
	_keepAliveTimer = setInterval(async () => {
		// 1. Refresh auth token so it doesn't expire while idle
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (session) {
				await supabase.auth.refreshSession();
			}
		} catch { /* auth refresh failed — will retry next interval */ }

		// 2. Lightweight data ping to keep the HTTP connection warm
		try {
			await supabase.from('orders').select('orderID', { count: 'exact', head: true }).limit(0);
		} catch { /* ignore */ }
	}, 45_000); // every 45 seconds
};

const stopKeepAlive = () => {
	if (_keepAliveTimer) { clearInterval(_keepAliveTimer); _keepAliveTimer = null; }
};

if (typeof document !== 'undefined') {
	document.addEventListener('visibilitychange', async () => {
		if (document.visibilityState === 'visible') {
			// Refresh auth session first — token may have expired while hidden
			try { await supabase.auth.refreshSession(); } catch { /* noop */ }
			// Force all realtime channels to reconnect immediately.
			try { supabase.realtime.connect(); } catch { /* already connected */ }
			startKeepAlive();
		} else {
			stopKeepAlive();
		}
	});
	// Also handle Electron-style focus/blur events
	window.addEventListener('focus', async () => {
		try { await supabase.auth.refreshSession(); } catch { /* noop */ }
		try { supabase.realtime.connect(); } catch { /* noop */ }
		startKeepAlive();
	});
	window.addEventListener('blur', () => stopKeepAlive());
	window.addEventListener('online', async () => {
		// Network came back (e.g. WiFi reconnected)
		try { await supabase.auth.refreshSession(); } catch { /* noop */ }
		try { supabase.realtime.connect(); } catch { /* noop */ }
		startKeepAlive();
	});
	startKeepAlive();
}

// Derive a stable auth email from a display name (Supabase Auth requires email).
export const toAuthEmail = (name) => {
	const safe = String(name || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ".");
	return `${safe}@tatuns.app`;
};

export const PRODUCT_IMAGE_BUCKET = "product-images";

const normalizeFileName = (name) => String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");

export const getPublicStorageUrl = (bucket, path) => {
	if (!bucket || !path) return null;
	const { data } = supabase.storage.from(bucket).getPublicUrl(path);
	return data?.publicUrl || null;
};

export const uploadProductImage = async ({ file, productId }) => {
	if (!file) throw new Error("No file provided");
	if (productId == null) throw new Error("No productId provided");

	const safeName = normalizeFileName(file.name);
	const stamp = Date.now();
	const path = `products/${productId}/${stamp}-${safeName}`;

	const { error } = await supabase.storage
		.from(PRODUCT_IMAGE_BUCKET)
		.upload(path, file, {
			upsert: true,
			contentType: file.type || "application/octet-stream",
			cacheControl: "3600",
		});

	if (error) throw error;

	return {
		path,
		publicUrl: getPublicStorageUrl(PRODUCT_IMAGE_BUCKET, path),
	};
};
