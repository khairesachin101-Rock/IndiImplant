// Real data layer, backed by Supabase (Postgres + Row Level Security).
// Every function here keeps the exact same name/shape it had in the old
// mock Express backend, so the page components didn't need to change —
// only what happens *inside* each function is now real.

import { supabase } from "./supabaseClient.js";

function fail(error, fallback) {
  throw new Error(error?.message || fallback);
}

// ---------- shape mappers (snake_case DB columns -> camelCase the UI expects) ----------

function mapProduct(p) {
  if (!p) return p;
  return {
    id: p.id,
    companyId: p.company_id,
    companyName: p.company_name,
    name: p.name,
    category: p.category,
    material: p.material,
    sizeRange: p.size_range,
    cdscoCertified: p.cdsco_certified,
    rating: p.rating,
    ordersCount: p.orders_count,
    price: p.price,
    deliveryDays: p.delivery_days,
    description: p.description,
    specs: p.specs || {},
    isPSI: p.is_psi,
    imageUrl: p.image_url,
  };
}

function mapCompany(c) {
  if (!c) return c;
  return {
    id: c.id,
    name: c.name,
    logoInitial: c.logo_initial,
    about: c.about,
    location: c.location,
    cdscoLicense: c.cdsco_license,
    phone: c.phone,
    psiEnabled: c.psi_enabled,
  };
}

function mapEnquiry(e) {
  if (!e) return e;
  return {
    id: e.id,
    doctorName: e.doctor_name,
    phone: e.phone,
    hospital: e.hospital,
    message: e.message,
    type: e.type,
    productId: e.product_id,
    productName: e.product_name,
    companyId: e.company_id,
    companyName: e.company_name,
    status: e.status,
    paymentDueDate: e.payment_due_date,
    createdAt: e.created_at,
  };
}

function mapPsiCase(c) {
  if (!c) return c;
  return {
    id: c.id,
    doctorName: c.doctor_name,
    phone: c.phone,
    companyId: c.company_id,
    companyName: c.company_name,
    caseNotes: c.case_notes,
    openCase: c.open_case,
    filePath: c.file_path,
    status: c.status,
    quotation: c.quotation,
    paymentDueDate: c.payment_due_date,
    createdAt: c.created_at,
  };
}

function mapMessage(m) {
  if (!m) return m;
  return {
    id: m.id,
    threadId: m.thread_id,
    threadType: m.thread_type,
    sender: m.sender_role,
    text: m.text,
    at: m.created_at,
  };
}

export const api = {
  // ---------- PRODUCTS ----------
  getProducts: async ({ category, search, sort } = {}) => {
    let q = supabase.from("products").select("*");
    if (category) q = q.ilike("category", category);
    if (search) {
      q = q.or(
        `name.ilike.%${search}%,company_name.ilike.%${search}%,material.ilike.%${search}%`
      );
    }
    if (sort === "rating") q = q.order("rating", { ascending: false });
    else if (sort === "orders") q = q.order("orders_count", { ascending: false });
    else if (sort === "price_asc") q = q.order("price", { ascending: true, nullsFirst: false });
    else if (sort === "price_desc") q = q.order("price", { ascending: false, nullsFirst: false });

    const { data, error } = await q;
    if (error) fail(error, "Could not load products");
    return (data || []).map(mapProduct);
  },

  getProduct: async (id) => {
    const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (error || !data) fail(error, "Product not found");
    return mapProduct(data);
  },

  getCategories: async () => {
    const { data, error } = await supabase.from("products").select("category");
    if (error) fail(error, "Could not load categories");
    return [...new Set((data || []).map((p) => p.category))];
  },

  // ---------- COMPANIES ----------
  getCompanies: async ({ psiOnly } = {}) => {
    let q = supabase.from("companies").select("*");
    if (psiOnly === "true" || psiOnly === true) q = q.eq("psi_enabled", true);
    const { data, error } = await q;
    if (error) fail(error, "Could not load companies");
    return (data || []).map(mapCompany);
  },

  getCompany: async (id) => {
    const { data: company, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !company) fail(error, "Company not found");

    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", id);
    if (prodError) fail(prodError, "Could not load company products");

    return { ...mapCompany(company), products: (products || []).map(mapProduct) };
  },

  updateCompany: async (id, payload) => {
    const { data, error } = await supabase
      .from("companies")
      .update({
        name: payload.name,
        about: payload.about,
        location: payload.location,
        cdsco_license: payload.cdscoLicense,
        phone: payload.phone,
        psi_enabled: payload.psiEnabled,
        logo_initial: (payload.name || "N").charAt(0).toUpperCase(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) fail(error, "Could not update company profile");
    return mapCompany(data);
  },

  updateCompanyProfile: async (id, { name, about, location, phone, psiEnabled }) => {
    const { data, error } = await supabase
      .from("companies")
      .update({
        name,
        about,
        location,
        phone,
        psi_enabled: psiEnabled,
        logo_initial: (name || "N").charAt(0).toUpperCase(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) fail(error, "Could not update company profile");
    return mapCompany(data);
  },

  // ---------- CATALOGUE SELF-SERVE (manufacturer adds their own products) ----------
  uploadProductImage: async (companyId, file) => {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${companyId}/${Date.now()}_${cleanName}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) fail(error, "Image upload failed");
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  },

  createProduct: async (payload) => {
    const { data, error } = await supabase
      .from("products")
      .insert({
        company_id: payload.companyId,
        company_name: payload.companyName,
        name: payload.name,
        category: payload.category,
        material: payload.material || null,
        size_range: payload.sizeRange || null,
        cdsco_certified: !!payload.cdscoCertified,
        price: payload.price === "" || payload.price == null ? null : Number(payload.price),
        delivery_days: payload.deliveryDays ? Number(payload.deliveryDays) : null,
        description: payload.description || "",
        specs: payload.specs || {},
        is_psi: !!payload.isPSI,
        image_url: payload.imageUrl || null,
      })
      .select()
      .single();
    if (error) fail(error, "Could not add product");
    return mapProduct(data);
  },

  getMyProducts: async (companyId) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) fail(error, "Could not load your products");
    return (data || []).map(mapProduct);
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) fail(error, "Could not delete product");
  },

  // ---------- ENQUIRIES / ORDERS ----------
  createEnquiry: async ({ doctorName, phone, hospital, message, productId, type, companyId, companyName }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) fail(null, "You must be logged in");

    let product = null;
    if (productId) {
      const { data } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
      product = data;
    }

    const { data, error } = await supabase
      .from("enquiries")
      .insert({
        doctor_id: user.id,
        doctor_name: doctorName,
        phone,
        hospital: hospital || "",
        message,
        type: type || "enquiry",
        product_id: productId || null,
        product_name: product ? product.name : null,
        company_id: product ? product.company_id : companyId || null,
        company_name: product ? product.company_name : companyName || null,
      })
      .select()
      .single();

    if (error) fail(error, "Could not send enquiry");
    return mapEnquiry(data);
  },

  getEnquiries: async ({ companyId, doctorId } = {}) => {
    let q = supabase.from("enquiries").select("*").order("created_at", { ascending: false });
    if (companyId) q = q.eq("company_id", companyId);
    if (doctorId) q = q.eq("doctor_id", doctorId);
    const { data, error } = await q;
    if (error) fail(error, "Could not load enquiries");
    return (data || []).map(mapEnquiry);
  },

  getEnquiry: async (id) => {
    const { data, error } = await supabase.from("enquiries").select("*").eq("id", id).maybeSingle();
    if (error || !data) fail(error, "Enquiry not found");
    return mapEnquiry(data);
  },

  updateEnquiryStatus: async (id, status) => {
    const payload = { status };
    if (status === "confirmed") {
      payload.payment_due_date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    }
    const { data, error } = await supabase
      .from("enquiries")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) fail(error, "Could not update enquiry");
    return mapEnquiry(data);
  },

  // ---------- PSI CONNECT ----------
  createPsiCase: async ({ doctorName, phone, companyId, caseNotes, openCase, filePath }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) fail(null, "You must be logged in");

    let companyName = null;
    if (companyId) {
      const { data } = await supabase.from("companies").select("name").eq("id", companyId).maybeSingle();
      companyName = data?.name || null;
    }

    const { data, error } = await supabase
      .from("psi_cases")
      .insert({
        doctor_id: user.id,
        doctor_name: doctorName,
        phone,
        company_id: companyId || null,
        company_name: companyName,
        case_notes: caseNotes,
        open_case: !!openCase,
        file_path: filePath || null,
      })
      .select()
      .single();

    if (error) fail(error, "Could not submit PSI case");
    return mapPsiCase(data);
  },

  getPsiCases: async ({ companyId, openCase, doctorId } = {}) => {
    let q = supabase.from("psi_cases").select("*").order("created_at", { ascending: false });
    if (companyId) q = q.eq("company_id", companyId);
    if (doctorId) q = q.eq("doctor_id", doctorId);
    if (openCase === "true" || openCase === true) q = q.eq("open_case", true);
    const { data, error } = await q;
    if (error) fail(error, "Could not load PSI cases");
    return (data || []).map(mapPsiCase);
  },

  getPsiCase: async (id) => {
    const { data, error } = await supabase.from("psi_cases").select("*").eq("id", id).maybeSingle();
    if (error || !data) fail(error, "PSI case not found");
    return mapPsiCase(data);
  },

  updatePsiCase: async (id, { status, quotation }) => {
    const payload = {};
    if (status) payload.status = status;
    if (quotation !== undefined) payload.quotation = quotation;
    if (status === "confirmed") {
      payload.payment_due_date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    }
    const { data, error } = await supabase
      .from("psi_cases")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) fail(error, "Could not update PSI case");
    return mapPsiCase(data);
  },

  // ---------- PSI FILE UPLOAD (Supabase Storage, private bucket) ----------
  uploadPsiFile: async (file) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) fail(null, "You must be logged in");

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}_${cleanName}`;
    const { error } = await supabase.storage.from("psi-files").upload(path, file);
    if (error) fail(error, "File upload failed");
    return path;
  },

  // ---------- CHAT (real-time via Supabase; threadType = 'psi' | 'enquiry') ----------
  getMessages: async (threadId, threadType = "psi") => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .eq("thread_type", threadType)
      .order("created_at", { ascending: true });
    if (error) fail(error, "Could not load messages");
    return (data || []).map(mapMessage);
  },

  sendMessage: async ({ threadId, threadType = "psi", sender, text }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) fail(null, "You must be logged in");

    const { data, error } = await supabase
      .from("messages")
      .insert({ thread_id: threadId, thread_type: threadType, sender_id: user.id, sender_role: sender, text })
      .select()
      .single();
    if (error) fail(error, "Could not send message");
    return mapMessage(data);
  },

  // Subscribe to new messages in a thread in real time. Returns an
  // unsubscribe function.
  subscribeMessages: (threadId, threadType, onInsert) => {
    const channel = supabase
      .channel(`messages-${threadType}-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          if (payload.new.thread_type === threadType) onInsert(mapMessage(payload.new));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
