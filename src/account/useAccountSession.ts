import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountError, accountService, type AccountService } from "./service";

export type AccountSessionState = {
  status: "unavailable" | "loading" | "signed-out" | "signed-in" | "error";
  session: Session | null;
  error: string | null;
};
export function useAccountSession(service: AccountService = accountService) {
  const [state,setState] = useState<AccountSessionState>({status:service.available?"loading":"unavailable",session:null,error:null});
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!service.available) {setState({status:"unavailable",session:null,error:null});return;}
    const current = ++generation.current;
    setState({status:"loading",session:null,error:null});
    try {
      const session = await service.getSession();
      if (current === generation.current) setState({status:session?"signed-in":"signed-out",session,error:null});
    } catch(error) {
      if (current === generation.current) setState({status:"error",session:null,error:accountError(error)});
    }
  },[service]);
  useEffect(() => {
    const unsubscribe = service.subscribe(session => {
      generation.current++;
      setState({status:session?"signed-in":"signed-out",session,error:null});
    });
    void refresh();
    return () => {generation.current++;unsubscribe();};
  },[service,refresh]);
  return {...state,refresh};
}
