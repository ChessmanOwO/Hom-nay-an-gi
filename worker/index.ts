import {trustedClientIp} from '../lib/review-abuse';
import { dailySnapshot } from "../lib/backups";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const cleanHeaders=new Headers(request.headers);cleanHeaders.delete('x-hnag-client-ip');const clientIp=trustedClientIp(request as any);if(clientIp)cleanHeaders.set('x-hnag-client-ip',clientIp);request=new Request(request,{headers:cleanHeaders});
    const response=await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    if(request.method!=="GET"&&request.method!=="HEAD"&&new URL(request.url).pathname.startsWith("/api/")&&response.status<400)ctx.waitUntil(dailySnapshot(env).catch(()=>console.warn("Daily database snapshot failed")));
    const secure=new Response(response.body,response);
    secure.headers.set("X-Content-Type-Options","nosniff");
    secure.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
    secure.headers.set("Permissions-Policy","geolocation=(self), camera=(), microphone=()");
    if(new URL(request.url).protocol==="https:")secure.headers.set("Strict-Transport-Security","max-age=31536000");
    return secure;
  },
};

export default worker;
