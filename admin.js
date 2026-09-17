(function () {
  const { client, el } = Q;
  const intro = document.getElementById("intro");
  const panels = document.getElementById("panels");

  function fmtDate(iso) {
    return new Date(iso).toISOString().slice(0, 10);
  }

  function sourceBox(src) {
    const wrap = el("div", "source-wrap");
    const btn = el("button", "linkish", "Show source (" + src.length + " chars)");
    btn.type = "button";
    const ta = el("textarea", "source-view");
    ta.readOnly = true;
    ta.value = src;
    ta.rows = 12;
    ta.hidden = true;
    btn.addEventListener("click", () => {
      ta.hidden = !ta.hidden;
      btn.textContent = (ta.hidden ? "Show" : "Hide") + " source (" + src.length + " chars)";
    });
    wrap.append(btn, ta);
    return wrap;
  }

  async function loadQueue() {
    const list = document.getElementById("queue-list");
    const emptyEl = document.getElementById("queue-empty");
    const { data, error } = await client
      .from("mod_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) { list.replaceChildren(el("p", "form-status", Q.errorText(error))); return; }
    const rows = data || [];
    document.getElementById("queue-count").textContent = rows.length ? "(" + rows.length + ")" : "";
    emptyEl.hidden = rows.length > 0;
    list.replaceChildren(...rows.map(r => {
      const d = el("div", "sub-row stacked");
      const head = el("div", "mod-head");
      head.append(el("span", "sub-name", r.name), el("span", "mod-version", "v" + r.version), el("span", "mod-tag", r.tag));
      const meta = el("div", "mod-meta", "from " + r.account_name + ", " + fmtDate(r.created_at));
      const desc = el("p", "mod-desc", r.description);
      d.append(head, meta, desc);
      if (r.details) d.appendChild(el("p", "sub-note", r.details));
      d.appendChild(sourceBox(r.source));

      const actions = el("div", "form-actions");
      const approve = el("button", "btn-primary", "Approve");
      approve.type = "button";
      const note = el("input", "note-input");
      note.type = "text";
      note.placeholder = "Reason (optional)";
      note.maxLength = 200;
      const deny = el("button", "btn-ghost", "Deny");
      deny.type = "button";
      const st = el("span", "form-status");
      approve.addEventListener("click", async () => {
        approve.disabled = deny.disabled = true;
        const { error } = await client.rpc("approve_submission", { p_submission: r.id });
        if (error) { st.textContent = Q.errorText(error); approve.disabled = deny.disabled = false; return; }
        loadQueue(); loadPublished();
      });
      deny.addEventListener("click", async () => {
        approve.disabled = deny.disabled = true;
        const { error } = await client.rpc("deny_submission", { p_submission: r.id, p_note: note.value });
        if (error) { st.textContent = Q.errorText(error); approve.disabled = deny.disabled = false; return; }
        loadQueue();
      });
      actions.append(approve, note, deny, st);
      d.appendChild(actions);
      return d;
    }));
  }

  async function loadPublished() {
    const list = document.getElementById("pub-list");
    const emptyEl = document.getElementById("pub-empty");
    const { data, error } = await client
      .from("mods")
      .select("id, name, version, tag, author_name, downloads, created_at")
      .order("created_at", { ascending: false });
    if (error) { list.replaceChildren(el("p", "form-status", Q.errorText(error))); return; }
    const rows = data || [];
    document.getElementById("pub-count").textContent = rows.length ? "(" + rows.length + ")" : "";
    emptyEl.hidden = rows.length > 0;
    list.replaceChildren(...rows.map(r => {
      const d = el("div", "sub-row");
      const left = el("div");
      const head = el("div", "mod-head");
      head.append(el("span", "sub-name", r.name), el("span", "mod-version", "v" + r.version), el("span", "mod-tag", r.tag));
      left.append(head, el("div", "mod-meta", "by " + r.author_name + ", " + r.downloads + " downloads, added " + fmtDate(r.created_at)));
      const del = el("button", "btn-ghost", "Delete");
      del.type = "button";
      del.addEventListener("click", async () => {
        if (del.textContent === "Delete") { del.textContent = "Confirm delete"; return; }
        del.disabled = true;
        const { error } = await client.rpc("delete_mod", { p_mod: r.id });
        if (error) { del.textContent = Q.errorText(error); del.disabled = false; return; }
        loadPublished();
      });
      d.append(left, del);
      return d;
    }));
  }

  async function loadAccounts() {
    const list = document.getElementById("acc-list");
    const { data, error } = await client
      .from("profiles")
      .select("id, display_name, role, created_at")
      .order("created_at", { ascending: true });
    if (error) { list.replaceChildren(el("p", "form-status", Q.errorText(error))); return; }
    const rows = data || [];
    document.getElementById("acc-count").textContent = "(" + rows.length + ")";
    list.replaceChildren(...rows.map(r => {
      const d = el("div", "sub-row");
      const left = el("div");
      left.append(el("span", "sub-name", r.display_name), el("div", "mod-meta", "joined " + fmtDate(r.created_at)));
      const right = el("div", "form-actions");
      if (r.role === "owner") {
        right.appendChild(el("span", "status status-owner", "owner"));
      } else {
        const sel = el("select", "role-select");
        ["user", "admin"].forEach(role => {
          const o = el("option", "", role);
          o.value = role;
          o.selected = role === r.role;
          sel.appendChild(o);
        });
        const st = el("span", "form-status");
        sel.addEventListener("change", async () => {
          sel.disabled = true;
          const { error } = await client.rpc("set_role", { p_user: r.id, p_role: sel.value });
          st.textContent = error ? Q.errorText(error) : "Saved";
          sel.disabled = false;
        });
        right.append(sel, st);
      }
      d.append(left, right);
      return d;
    }));
  }

  async function init() {
    Q.renderNav();
    await Q.ready;
    if (!client) { intro.textContent = "Accounts are not set up yet."; return; }
    if (!Q.state.session) {
      intro.replaceChildren(el("a", "", "Sign in"), document.createTextNode(" to continue."));
      intro.firstChild.href = "login.html";
      return;
    }
    if (!Q.isAdmin()) { intro.textContent = "Admins only."; return; }

    intro.textContent = "Signed in as " + Q.state.profile.display_name + " (" + Q.state.profile.role + ").";
    panels.hidden = false;
    loadQueue();
    loadPublished();
    if (Q.isOwner()) {
      document.getElementById("accounts").hidden = false;
      document.getElementById("accounts-link").hidden = false;
      loadAccounts();
    }
  }

  init();
})();
