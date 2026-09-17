(function () {
  const { client, el } = Q;
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const count = document.getElementById("count");
  const search = document.getElementById("search");
  const filters = document.getElementById("filters");

  const TAGS = ["All", "Gameplay", "Visual", "Utility", "Editor"];
  let mods = [];
  let activeTag = "All";
  let query = "";
  const open = new Set();

  TAGS.forEach(tag => {
    const b = el("button", tag === activeTag ? "active" : "", tag);
    b.type = "button";
    b.addEventListener("click", () => {
      activeTag = tag;
      filters.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
      render();
    });
    filters.appendChild(b);
  });

  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    render();
  });

  function matches(m) {
    if (activeTag !== "All" && m.tag !== activeTag) return false;
    if (!query) return true;
    return [m.name, m.description, m.details, m.author_name, m.tag].join(" ").toLowerCase().includes(query);
  }

  function fmtDate(iso) {
    return new Date(iso).toISOString().slice(0, 10);
  }

  function row(m) {
    const art = el("article", "mod");

    const head = el("div", "mod-head");
    const name = el("button", "mod-name", m.name);
    name.type = "button";
    name.addEventListener("click", () => {
      open.has(m.id) ? open.delete(m.id) : open.add(m.id);
      render();
    });
    head.append(name, el("span", "mod-version", "v" + m.version), el("span", "mod-tag", m.tag));

    const desc = el("p", "mod-desc", m.description);
    const meta = el("div", "mod-meta",
      "by " + (m.author_name || "unknown") + ", updated " + fmtDate(m.updated_at) +
      (m.downloads ? ", " + m.downloads + " downloads" : ""));

    const actions = el("div", "mod-actions");
    const dl = el("button", "btn-ghost", "Download");
    dl.type = "button";
    dl.addEventListener("click", () => {
      Q.downloadText(Q.slug(m.name) + ".js", m.source);
      m.downloads = (m.downloads || 0) + 1;
      client.rpc("count_download", { p_mod: m.id });
      render();
    });
    actions.appendChild(dl);

    art.append(head, desc, meta, actions);

    if (open.has(m.id)) {
      const more = el("div", "mod-more");
      if (m.details) more.appendChild(el("p", "", m.details));
      const f = el("p");
      f.append(el("span", "label", "File"), document.createTextNode(Q.slug(m.name) + ".js"));
      more.appendChild(f);
      art.appendChild(more);
    }
    return art;
  }

  function render() {
    const shown = mods.filter(matches);
    list.replaceChildren(...shown.map(row));
    list.hidden = shown.length === 0;
    empty.hidden = shown.length > 0;
    if (mods.length === 0) {
      empty.textContent = "Nothing here yet!";
      count.textContent = "";
    } else {
      empty.textContent = "No mods match that search.";
      count.textContent = shown.length === mods.length
        ? mods.length + " mods"
        : shown.length + " of " + mods.length + " mods";
    }
  }

  async function loadMods() {
    if (!client) { render(); return; }
    const { data, error } = await client
      .from("mods")
      .select("id, name, version, tag, description, details, source, author_name, downloads, updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      empty.textContent = "Could not load the catalog: " + Q.errorText(error);
      return;
    }
    mods = data || [];
    render();
  }

  const form = document.getElementById("request-form");
  const signin = document.getElementById("request-signin");
  const status = document.getElementById("request-status");
  const mine = document.getElementById("my-requests");
  const mineList = document.getElementById("my-requests-list");

  form.elements.file.addEventListener("change", () => {
    const f = form.elements.file.files[0];
    if (!f) return;
    f.text().then(t => { form.elements.source.value = t; });
    if (!form.elements.name.value) {
      form.elements.name.value = f.name.replace(/\.js$/i, "").replace(/[-_]+/g, " ");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sending...";
    const fd = form.elements;
    const { error } = await client.from("mod_submissions").insert({
      name: fd.name.value.trim(),
      version: fd.version.value.trim(),
      tag: fd.tag.value,
      description: fd.description.value.trim(),
      details: fd.details.value.trim(),
      source: fd.source.value,
      account_id: Q.state.session.user.id
    });
    if (error) {
      status.textContent = Q.errorText(error);
      return;
    }
    status.textContent = "Sent. An admin will look at it.";
    form.reset();
    form.elements.version.value = "1.0.0";
    loadMine();
  });

  async function loadMine() {
    const { data } = await client
      .from("mod_submissions")
      .select("id, name, version, tag, status, note, created_at")
      .eq("account_id", Q.state.session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = data || [];
    mine.hidden = rows.length === 0;
    mineList.replaceChildren(...rows.map(r => {
      const d = el("div", "sub-row");
      const left = el("div");
      left.append(el("span", "sub-name", r.name), el("span", "mod-version", " v" + r.version + ", " + r.tag));
      if (r.status === "denied" && r.note) left.appendChild(el("div", "sub-note", "Note: " + r.note));
      d.append(left, el("span", "status status-" + r.status, r.status));
      return d;
    }));
  }

  async function initRequest() {
    await Q.ready;
    if (!client) {
      signin.hidden = false;
      signin.textContent = "Accounts are not set up yet.";
      return;
    }
    if (!Q.state.session) {
      signin.hidden = false;
      return;
    }
    form.hidden = false;
    loadMine();
  }

  Q.renderNav();
  loadMods();
  initRequest();
})();
