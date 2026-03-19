import { headers } from "next/headers";

export async function isSignedInRequest() {
  const requestHeaders = await headers();
  const status = requestHeaders.get("x-clerk-auth-status");
  const cookie = requestHeaders.get("cookie");
  console.log("[g-trade-web session]", { status, cookie });
  return status === "signed-in";
}
