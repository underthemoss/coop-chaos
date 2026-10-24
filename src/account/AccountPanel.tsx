import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountError, accountService, emailCodeLength, type AccountMode, type AccountService } from "./service";
import { useAccountSession } from "./useAccountSession";
import "./account.css";

export function AccountPanel({mode,onClose,onSessionChange,service=accountService}: {
  mode: AccountMode;
  onClose: () => void;
  onSessionChange?: (session: Session | null) => void;
  service?: AccountService;
}) {
  const account = useAccountSession(service), id = useId();
  const [email,setEmail] = useState(""), [sentTo,setSentTo] = useState<string|null>(null), [code,setCode] = useState("");
  const [pending,setPending] = useState(false), [error,setError] = useState<string|null>(null);
  const [resendAt,setResendAt] = useState(0), [now,setNow] = useState(Date.now());
  const attempt = useRef(0), busy = useRef(false), notify = useRef(onSessionChange);
  notify.current = onSessionChange;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {heading.current?.focus();},[]);
  useEffect(() => {
    attempt.current++;busy.current=false;setPending(false);setSentTo(null);setCode("");setError(null);
    return () => {attempt.current++;};
  },[mode]);
  useEffect(() => {
    if (account.status === "signed-in" || account.status === "signed-out") notify.current?.(account.session);
  },[account.status,account.session]);
  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setInterval(() => setNow(Date.now()),1000);
    return () => window.clearInterval(timer);
  },[resendAt]);
  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current=true;const current=++attempt.current;setPending(true);setError(null);
    try {await action();} catch(e) {if(current===attempt.current)setError(accountError(e));}
    finally {if(current===attempt.current){busy.current=false;setPending(false);}}
  }
  function send() {
    if (Date.now() < resendAt) return;
    const address=(sentTo??email).trim(), current=attempt.current+1;
    void run(async()=>{
      // Cool down attempts too: a transport failure may follow an accepted email.
      const deadline=Date.now()+60000;setResendAt(deadline);setNow(Date.now());
      await service.requestCode(address,mode);
      if(current===attempt.current){setSentTo(address);setCode("");}
    });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!sentTo) {send();return;}
    void run(async()=>{await service.verifyCode(sentTo,code);await account.refresh();});
  }
  const wait=Math.max(0,Math.ceil((resendAt-now)/1000));
  return <section className="account-panel" aria-labelledby={`${id}-title`} aria-busy={pending}>
    <button type="button" onClick={onClose}>Back</button>
    <h1 ref={heading} tabIndex={-1} id={`${id}-title`}>{account.status==="signed-in"?"Your account":mode==="login"?"Log in":"Create account"}</h1>
    {account.status==="unavailable"?<><p>{service.unavailableReason}</p><button onClick={onClose}>Continue as guest</button></>:
    account.status==="loading"?<p role="status">Checking your account…</p>:
    account.status==="error"?<><p role="alert">{account.error}</p><button onClick={()=>void account.refresh()}>Try again</button><button onClick={onClose}>Continue as guest</button></>:
    account.status==="signed-in"?<><p>Logged in as {account.session?.user.email??"your account"}.</p><p>Device games stay on this device. Account copies are saved only when you choose to save a copy.</p><button disabled={pending} onClick={()=>void run(async()=>{await service.signOut();await account.refresh();})}>{pending?"Signing out…":"Sign out"}</button></>:
    <>
      <p>{sentTo?`Enter the ${emailCodeLength}-digit code for ${sentTo}. If the address is eligible, check its inbox and spam folder.`:`Use your email to receive an ${emailCodeLength}-digit code. You can keep playing as a guest.`}</p>
      <form onSubmit={submit}>
        {sentTo?<><label htmlFor={`${id}-code`}>Email code</label><input id={`${id}-code`} autoFocus inputMode="numeric" autoComplete="one-time-code" pattern={`[0-9]{${emailCodeLength}}`} maxLength={emailCodeLength} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} required disabled={pending}/></>:
        <><label htmlFor={`${id}-email`}>Email</label><input id={`${id}-email`} type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} required disabled={pending}/></>}
        <button type="submit" disabled={pending||(!sentTo&&wait>0)}>{pending?(sentTo?"Checking code…":"Requesting code…"):sentTo?"Verify code":wait>0?`Try again in ${wait}s`:"Send code"}</button>
      </form>
      {sentTo&&<div className="account-actions"><button disabled={pending||wait>0} onClick={send}>{wait>0?`Resend in ${wait}s`:"Resend code"}</button><button disabled={pending} onClick={()=>{attempt.current++;setSentTo(null);setCode("");setError(null);}}>Use another email</button></div>}
      <p className="quiet">Logging in does not upload or replace any game on this device.</p>
    </>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
