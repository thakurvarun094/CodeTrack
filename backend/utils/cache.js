export function setCache(res, seconds) {
  res.set("Cache-Control", `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`);
}

export function noCache(res) {
  res.set("Cache-Control", "no-store");
}
