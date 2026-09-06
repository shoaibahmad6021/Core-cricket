"use client";

import { FormEvent, useState } from "react";
import "./login.css";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to continue");
      const returnTo = new URLSearchParams(window.location.search).get("return_to");
      window.location.href = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to continue"); setBusy(false); }
  }
  return <main className="login-page"><section className="login-card"><img src="/core-cricket-crest.webp" alt="Core Cricket" /><span>CORE CRICKET</span><h1>{mode === "login" ? "Welcome back" : "Create your profile"}</h1><p>{mode === "login" ? "Sign in with your phone number and password." : "One phone number can have only one Core Cricket profile."}</p><form onSubmit={submit}>{mode === "register" && <><label>Full name<input name="name" required autoComplete="name" /></label><label>Email address <small>optional</small><input name="email" type="email" autoComplete="email" /></label></>}<label>Phone number<input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="647-000-0000" /></label><label>Password<input name="password" type="password" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{error && <div className="login-error">{error}</div>}<button disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form><button className="mode-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "First time? Create an account" : "Already registered? Sign in"}</button><small className="credit">CREATED BY SHOAIB</small></section></main>;
}
