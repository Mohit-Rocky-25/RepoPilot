import { useSWR } from "../core/use-swr";
export function useSWRImmutable(key: string, fn: any) {
  return useSWR(key, fn, { revalidateOnFocus: false });
}
