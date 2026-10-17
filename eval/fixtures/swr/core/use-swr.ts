import { initCache } from "../_internal/utils/cache";
import { SWRConfiguration } from "./types";

export function useSWR<Data = any, Error = any>(
  key: string,
  fn: () => Promise<Data>,
  config?: SWRConfiguration
) {
  const cache = initCache();
  return { data: undefined as Data | undefined, error: undefined as Error | undefined };
}
