import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		"Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env (see .env.example).",
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Non-persistent client for creating users without switching the admin's active session.
export const supabaseNoSession = createClient(supabaseUrl, supabaseAnonKey, {
	auth: { persistSession: false },
});

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
