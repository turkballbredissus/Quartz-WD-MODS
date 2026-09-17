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
    return [m.name, m.description, m.author_name, m.tag].join(" ").toLowerCase().includes(query);
  }

  function row(m) {
    const art = el("article", "mod");
    const href = "mod.html?id=" + m.id;

    const head = el("div", "mod-head");
    const name = el("a", "mod-name", m.name);
    name.href = href;
    head.append(name, el("span", "mod-version", "v" + m.version), el("span", "mod-tag", m.tag));

    const desc = el("p", "mod-desc", m.description);
    const meta = el("div", "mod-meta",
      "by " + (m.author_name || "unknown") + ", updated " + Q.fmtDate(m.updated_at) +
      (m.downloads ? ", " + m.downloads + " installs" : ""));

    const actions = el("div", "mod-actions");
    const view = el("a", "btn-ghost", "View");
    view.href = href;
    actions.appendChild(view);

    art.append(head, desc, meta, actions);
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
      .select("id, name, version, tag, description, author_name, downloads, updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      empty.textContent = "Could not load the catalog: " + Q.errorText(error);
      return;
    }
    mods = data || [];
    render();
  }

  Q.renderNav();
  loadMods();
})();
