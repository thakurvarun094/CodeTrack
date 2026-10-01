import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 }
  ]
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const r = http.get(`${BASE}/api/contests/upcoming`);
  check(r, { "status is 200": (x) => x.status === 200 });
  sleep(1);
}
