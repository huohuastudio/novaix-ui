import { postAuthWsTicket } from "@/api"

export async function getWSTicket(): Promise<string> {
  const { data } = await postAuthWsTicket()
  return data?.data?.ticket ?? ""
}
