export function useSWRInfinite(getKey: (index: number) => string) {
  return { data: [], size: 0, setSize: () => {} };
}
