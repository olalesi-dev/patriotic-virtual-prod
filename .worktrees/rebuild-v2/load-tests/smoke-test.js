import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock-load-test-token';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  const res = http.get(`${BASE_URL}/health`, params);
  check(res, { 'health status 200': (r) => r.status === 200 });

  const dashboardRes = http.get(`${BASE_URL}/clinical/dashboard/stats`, params);
  check(dashboardRes, { 'dashboard status 200': (r) => r.status === 200 });

  sleep(1);
}
