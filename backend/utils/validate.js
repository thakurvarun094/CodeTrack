export function isValidHandle(s) {
  if (typeof s !== "string") return false;
  return /^[A-Za-z0-9_.-]{1,40}$/.test(s);
}
