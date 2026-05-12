/** Tailwind class joiner — drop falsy values, join with a space. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
