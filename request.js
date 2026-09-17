(function () {
  const { client, el } = Q;
  const form = document.getElementById("request-form");
  const signin = document.getElementById("request-signin");
  const status = document.getElementById("request-status");
  const mine = document.getElementById("my-requests");
  const mineList = document.getElementById("my-requests-list");
  const myMods = document.getElementById("my-mods");
  const myModsList = document.getElementById("my-mods-list");

  Q.bindFileToTextarea(form.elements.file, form.elements.source, (n) => {
    if (!form.elements.name.value) form.elements.name.value = n;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sending...";
    const fd = form.elements;
    const { error } = await client.from("mod_submissions").insert({
      kind: "new",
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
      .select("id, kind, name, version, tag, status, note, created_at")
      .eq("account_id", Q.state.session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = data || [];
    mine.hidden = rows.length === 0;
    mineList.replaceChildren(...rows.map(r => {
      const d = el("div", "sub-row");
      const left = el("div");
      left.append(
        el("span", "sub-name", r.name),
        el("span", "mod-version", " v" + r.version + ", " + r.tag + (r.kind === "update" ? ", update" : ""))
      );
      if (r.status === "denied" && r.note) left.appendChild(el("div", "sub-note", "Note: " + r.note));
      d.append(left, el("span", "status status-" + r.status, r.status));
      return d;
    }));
  }

  async function loadMyMods() {
    const { data } = await client
      .from("mods")
      .select("id, name, version, tag, updated_at")
      .eq("author_id", Q.state.session.user.id)
      .order("created_at", { ascending: false });
    const rows = data || [];
    myMods.hidden = rows.length === 0;
    myModsList.replaceChildren(...rows.map(r => {
      const d = el("div", "sub-row");
      const left = el("div");
      const a = el("a", "sub-name", r.name);
      a.href = "mod.html?id=" + r.id;
      left.append(a, el("span", "mod-version", " v" + r.version + ", " + r.tag));
      left.appendChild(el("div", "mod-meta", "updated " + Q.fmtDate(r.updated_at)));
      const open = el("a", "btn-ghost", "Open");
      open.href = "mod.html?id=" + r.id;
      d.append(left, open);
      return d;
    }));
  }

  async function init() {
    Q.renderNav();
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
    loadMyMods();
    loadMine();
  }

  init();
})();
