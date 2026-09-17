(function () {
  const { client, el } = Q;
  const id = Number(new URLSearchParams(location.search).get("id"));
  const layout = document.getElementById("mod-layout");
  const missing = document.getElementById("mod-missing");
  const updateBox = document.getElementById("update-box");
  const form = document.getElementById("update-form");
  const status = document.getElementById("update-status");
  let mod = null;

  function text(id, v) { document.getElementById(id).textContent = v; }

  function show() {
    document.title = mod.name + ", Quartz";
    text("m-name", mod.name);
    text("m-version", "v" + mod.version);
    text("m-updated", Q.fmtDate(mod.updated_at));
    text("m-created", Q.fmtDate(mod.created_at));
    text("m-tag", mod.tag);
    text("m-author", mod.author_name || "unknown");
    text("m-downloads", String(mod.downloads || 0));
    text("m-short", mod.description);

    const details = document.getElementById("m-details");
    details.replaceChildren();
    const paras = (mod.details || "").split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (paras.length === 0) {
      details.appendChild(el("p", "mod-meta", "No description yet."));
    } else {
      paras.forEach(p => details.appendChild(el("p", "", p)));
    }
    layout.hidden = false;
  }

  document.getElementById("m-install").addEventListener("click", () => {
    Q.downloadText(Q.slug(mod.name) + ".js", mod.source);
    mod.downloads = (mod.downloads || 0) + 1;
    text("m-downloads", String(mod.downloads));
    client.rpc("count_download", { p_mod: mod.id });
  });

  Q.bindFileToTextarea(form.elements.file, form.elements.source);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sending...";
    const fd = form.elements;
    const { error } = await client.from("mod_submissions").insert({
      kind: "update",
      mod_id: mod.id,
      name: mod.name,
      tag: mod.tag,
      description: mod.description,
      version: fd.version.value.trim(),
      details: fd.details.value.trim(),
      source: fd.source.value,
      account_id: Q.state.session.user.id
    });
    status.textContent = error ? Q.errorText(error) : "Sent. It goes live once an admin approves it.";
  });

  async function init() {
    Q.renderNav();
    if (!client || !id) { missing.hidden = false; return; }
    const { data, error } = await client.from("mods").select("*").eq("id", id).maybeSingle();
    if (error || !data) { missing.hidden = false; return; }
    mod = data;
    show();

    await Q.ready;
    if (Q.state.session && mod.author_id === Q.state.session.user.id) {
      form.elements.version.value = mod.version;
      form.elements.details.value = mod.details || "";
      form.elements.source.value = mod.source;
      updateBox.hidden = false;
    }
  }

  init();
})();
