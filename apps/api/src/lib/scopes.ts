export function hasScopes(required: string[], actual: string[]): boolean {
  return required.every((scope) => actual.includes(scope));
}
