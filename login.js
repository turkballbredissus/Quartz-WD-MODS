(function () {
  const { client } = Q;
  const form = document.getElementById("login-form");
  const title = document.getElementById("title");
  const nameField = document.getElementById("name-field");
  const submit = document.getElementById("submit");
  const toggle = document.getElementById("toggle");
  const status = document.getElementById("status");
  let creating = false;

  toggle.addEventListener("click", () => {
    creating = !creating;
    title.textContent = creating ? "Create an account" : "Sign in";
    submit.textContent = creating ? "Create account" : "Sign in";
    toggle.textContent = creating ? "I already have one" : "Create an account";
    nameField.hidden = !creating;
    form.elements.display_name.required = creating;
    form.elements.password.autocomplete = creating ? "new-password" : "current-password";
    status.textContent = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!client) {
      status.textContent = "Accounts are not set up yet.";
      return;
    }
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    status.textContent = "Working...";

    if (creating) {
      const display_name = form.elements.display_name.value.trim();
      const { data, error } = await client.auth.signUp({
        email, password, options: { data: { display_name } }
      });
      if (error) { status.textContent = Q.errorText(error); return; }
      if (!data.session) {
        status.textContent = "Check your email for a confirmation link, then sign in.";
        return;
      }
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) { status.textContent = Q.errorText(error); return; }
    }

    const meta = creating ? form.elements.display_name.value.trim() : null;
    const { error: perr } = await client.rpc("ensure_profile", { p_display_name: meta });
    if (perr) { status.textContent = Q.errorText(perr); return; }
    location.href = "./";
  });

  Q.ready.then(() => {
    if (Q.state.session) location.href = "./";
  });
  Q.renderNav();
})();
