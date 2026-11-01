export const SWRConfig = ({ children }: any) => children;
export const defaultConfig = { revalidateOnFocus: true };
export function mergeConfigurations(...configs: any[]) {
  return Object.assign({}, ...configs);
}
