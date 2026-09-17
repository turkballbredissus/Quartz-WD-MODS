window.Q = (function () {
  const cfg = window.QUARTZ_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
    && !cfg.SUPABASE_URL.startsWith("PASTE") && !cfg.SUPABASE_ANON_KEY.startsWith("PASTE");
  const client = (configured && window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const state = { session: null, profile: null };

  async function load() {
    if (!client) return state;
    const { data } = await client.auth.getSession();
    state.session = data.session || null;
    if (state.session) {
      const meta = state.session.user.user_metadata || {};
      const { data: profile } = await client.rpc("ensure_profile", { p_display_name: meta.display_name || null });
      state.profile = profile || null;
    }
    return state;
  }

  const ready = load();

  function isAdmin() {
    return !!state.profile && (state.profile.role === "admin" || state.profile.role === "owner");
  }
  function isOwner() {
    return !!state.profile && state.profile.role === "owner";
  }

  async function signOut() {
    if (client) await client.auth.signOut();
    location.href = "./";
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  async function renderNav() {
    await ready;
    const slot = document.getElementById("nav-account");
    if (!slot) return;
    slot.replaceChildren();
    if (!state.session) {
      const a = el("a", "btn-primary", "Sign in");
      a.href = "login.html";
      slot.appendChild(a);
      return;
    }
    const name = el("span", "nav-name", state.profile ? state.profile.display_name : "you");
    slot.appendChild(name);
    if (isAdmin()) {
      const a = el("a", "nav-admin", "Admin");
      a.href = "admin.html";
      slot.appendChild(a);
    }
    const out = el("button", "btn-ghost", "Sign out");
    out.type = "button";
    out.addEventListener("click", signOut);
    slot.appendChild(out);
  }

  function errorText(err) {
    if (!err) return "Something went wrong.";
    return err.message || String(err);
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function slug(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "mod";
  }

  function fmtDate(iso) {
    return new Date(iso).toISOString().slice(0, 10);
  }

  function bindFileToTextarea(fileInput, textarea, onName) {
    fileInput.addEventListener("change", () => {
      const f = fileInput.files[0];
      if (!f) return;
      f.text().then(t => { textarea.value = t; });
      if (onName) onName(f.name.replace(/\.js$/i, "").replace(/[-_]+/g, " "));
    });
  }

  return { client, configured, state, ready, isAdmin, isOwner, signOut, renderNav, errorText, downloadText, slug, fmtDate, bindFileToTextarea, el };
})();
