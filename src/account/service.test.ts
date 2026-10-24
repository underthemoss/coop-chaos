import { describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { initialSettlement } from "../simulation/settlement";
import { encodeSettlement } from "../persistence/settlement-save";
import { accountConfig } from "./client";
import { createAccountService, maxCloudSaveBytes } from "./service";

const user = "10000000-0000-4000-8000-000000000001", other = "20000000-0000-4000-8000-000000000002";
const copyId = "30000000-0000-4000-8000-000000000003";
const session = {user:{id:user,email:"player@example.test",is_anonymous:false}} as Session;
const row = {id:copyId,name:"Lowfork",created_at:"2026-10-24T12:00:00Z"};
const text = encodeSettlement(initialSettlement());
function fixture() {
  const auth = {
    getSession:vi.fn().mockResolvedValue({data:{session},error:null}),
    getUser:vi.fn().mockResolvedValue({data:{user:session.user},error:null}),
    signInWithOtp:vi.fn().mockResolvedValue({error:null}),
    verifyOtp:vi.fn().mockResolvedValue({data:{session},error:null}),
    signOut:vi.fn().mockResolvedValue({error:null}),
    onAuthStateChange:vi.fn(),
  };
  const query = {
    select:vi.fn(),eq:vi.fn(),order:vi.fn(),insert:vi.fn(),
    range:vi.fn().mockResolvedValue({data:[row],error:null}),
    single:vi.fn().mockResolvedValue({data:{...row,payload:text},error:null}),
  };
  for(const fn of [query.select,query.eq,query.order,query.insert])fn.mockReturnValue(query);
  const from=vi.fn().mockReturnValue(query);
  return {auth,query,from,service:createAccountService({auth,from} as unknown as SupabaseClient)};
}
describe("real account adapter boundaries",()=>{
  it("requires HTTPS and a publishable key, with honest unavailable behavior",async()=>{
    const publicConfig={VITE_SUPABASE_URL:"https://project.supabase.co",VITE_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_example"};
    for(const env of [{},{...publicConfig},{...publicConfig,VITE_ACCOUNT_EMAIL_READY:"false"},{...publicConfig,VITE_ACCOUNT_EMAIL_READY:"TRUE"},{...publicConfig,VITE_ACCOUNT_EMAIL_READY:"true",VITE_SUPABASE_PUBLISHABLE_KEY:"sb_secret_not-for-the-browser"},{...publicConfig,VITE_ACCOUNT_EMAIL_READY:"true",VITE_SUPABASE_URL:"http://project.supabase.co"}])expect(accountConfig(env)).toBeNull();
    expect(accountConfig({...publicConfig,VITE_ACCOUNT_EMAIL_READY:"true"})).toEqual({url:"https://project.supabase.co",key:"sb_publishable_example"});
    const service=createAccountService(null);expect(service.available).toBe(false);
    await expect(service.requestCode("player@example.test","signup")).rejects.toThrow("not available");
    await expect(service.getSession()).rejects.toThrow("not available");
  });
  it("separates login from account creation and never pretends requesting a code signs in",async()=>{
    const {service,auth}=fixture();
    await service.requestCode(" player@example.test ","login");
    expect(auth.signInWithOtp).toHaveBeenLastCalledWith({email:"player@example.test",options:{shouldCreateUser:false}});
    await service.requestCode("player@example.test","signup");
    expect(auth.signInWithOtp).toHaveBeenLastCalledWith({email:"player@example.test",options:{shouldCreateUser:true}});
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    auth.signInWithOtp.mockResolvedValueOnce({error:{message:"Too many requests. Try later."}});
    await expect(service.requestCode("player@example.test","login")).rejects.toThrow("Too many requests");
    await expect(service.requestCode("invalid","signup")).rejects.toThrow("valid email");
  });
  it("verifies eight digits in the same flow and surfaces rejected, missing-session and expired-session errors",async()=>{
    const {service,auth}=fixture();
    for (const token of ["abc", "123456", "1234567", "123456789", "1234567x"])
      await expect(service.verifyCode("player@example.test",token)).rejects.toThrow("8-digit");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(await service.verifyCode("player@example.test"," 12345678 ")).toEqual(session);
    expect(auth.verifyOtp).toHaveBeenCalledWith({email:"player@example.test",token:"12345678",type:"email"});
    auth.verifyOtp.mockResolvedValueOnce({data:{session:null},error:{message:"Code has expired"}});
    await expect(service.verifyCode("player@example.test","12345678")).rejects.toThrow("expired");
    auth.verifyOtp.mockResolvedValueOnce({data:{session:null},error:null});
    await expect(service.verifyCode("player@example.test","12345678")).rejects.toThrow("No session");
    auth.getSession.mockResolvedValueOnce({data:{session:null},error:{message:"Session expired"}});
    await expect(service.getSession()).rejects.toThrow("Session expired");
    auth.signOut.mockResolvedValueOnce({error:{message:"Connection unavailable"}});
    await expect(service.signOut()).rejects.toThrow("Connection unavailable");
    await service.signOut();expect(auth.signOut).toHaveBeenLastCalledWith({scope:"local"});
  });
  it("subscribes without async SDK work inside the auth callback and unsubscribes",()=>{
    const {service,auth}=fixture(),listener=vi.fn(),unsubscribe=vi.fn();
    auth.onAuthStateChange.mockImplementation(callback=>{callback("SIGNED_OUT",null);return {data:{subscription:{unsubscribe}}};});
    const stop=service.subscribe(listener);expect(listener).toHaveBeenCalledWith(null);stop();expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it("scopes metadata pages and individual validated reads to the verified current user",async()=>{
    const {service,query}=fixture();
    expect(await service.copies.list(50)).toEqual([{id:copyId,name:row.name,createdAt:row.created_at}]);
    expect(query.eq).toHaveBeenCalledWith("owner_id",user);expect(query.range).toHaveBeenCalledWith(50,99);
    const loaded=await service.copies.get(copyId);expect(loaded.text).toBe(text);expect(loaded.state).toEqual(initialSettlement());
    expect(query.eq).toHaveBeenCalledWith("id",copyId);
    query.single.mockResolvedValueOnce({data:{...row,payload:'{"damaged":true}'},error:null});
    await expect(service.copies.get(copyId)).rejects.toThrow("damaged or incompatible");
  });
  it("rejects guest/anonymous access, revoked sessions and responses from an account that changed",async()=>{
    const {service,auth,from}=fixture();
    auth.getUser.mockResolvedValueOnce({data:{user:null},error:null});
    await expect(service.copies.list()).rejects.toThrow("Log in");expect(from).not.toHaveBeenCalled();
    auth.getUser.mockResolvedValueOnce({data:{user:{id:user,is_anonymous:true}},error:null});
    await expect(service.copies.list()).rejects.toThrow("Log in");
    auth.getUser.mockResolvedValueOnce({data:{user:null},error:{message:"Invalid session"}});
    await expect(service.copies.list()).rejects.toThrow("Invalid session");
    auth.getSession.mockResolvedValueOnce({data:{session:{user:{id:other}}},error:null});
    await expect(service.copies.list()).rejects.toThrow("account changed");
  });
  it("validates name and bounded UTF-8 payload before any write",async()=>{
    const {service,from}=fixture();
    await expect(service.copies.create(" ",text,copyId,user)).rejects.toThrow("Name the copy");
    await expect(service.copies.create("Game","{}",copyId,user)).rejects.toThrow("damaged or incompatible");
    await expect(service.copies.create("Game","🪶".repeat(maxCloudSaveBytes/4+1),copyId,user)).rejects.toThrow("too large");
    expect(from).not.toHaveBeenCalled();
  });
  it("binds a pending save to the initiating account before insertion",async()=>{
    const {service,auth,from}=fixture();
    let resolveOwner!: (value: unknown)=>void;
    auth.getUser.mockReturnValueOnce(new Promise(resolve=>{resolveOwner=resolve;}));
    const pending=service.copies.create("Lowfork",text,copyId,user);
    resolveOwner({data:{user:{id:other,is_anonymous:false}},error:null});
    await expect(pending).rejects.toThrow("account changed before saving");
    expect(from).not.toHaveBeenCalled();
  });
  it("uses insert-only with a stable ID and reconciles duplicate or ambiguous replies without another copy",async()=>{
    const {service,query}=fixture();
    await service.copies.create(" Lowfork ",text,copyId,user);
    expect(query.insert).toHaveBeenCalledWith({id:copyId,owner_id:user,name:"Lowfork",payload:text});
    query.single.mockResolvedValueOnce({data:null,error:{message:"duplicate key",code:"23505"}});
    expect(await service.copies.create("Lowfork",text,copyId,user)).toEqual({id:copyId,name:"Lowfork",createdAt:row.created_at});
    query.single.mockRejectedValueOnce(new Error("Lost reply"));
    expect(await service.copies.create("Lowfork",text,copyId,user)).toEqual({id:copyId,name:"Lowfork",createdAt:row.created_at});
    query.single.mockResolvedValueOnce({data:null,error:{message:"duplicate"}}).mockResolvedValueOnce({data:{...row,name:"Different",payload:text},error:null});
    await expect(service.copies.create("Lowfork",text,copyId,user)).rejects.toThrow("different saved copy");
    query.single.mockResolvedValueOnce({data:null,error:{message:"offline"}}).mockResolvedValueOnce({data:null,error:{message:"offline"}});
    await expect(service.copies.create("Lowfork",text,copyId,user)).rejects.toThrow("same request ID");
  });
});
