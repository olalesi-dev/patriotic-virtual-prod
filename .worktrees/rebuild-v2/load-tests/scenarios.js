import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock-load-test-token';

export const options = {
  scenarios: {
    clinical_workflow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 3000 }, 
        { duration: '1m', target: 3000 }, 
        { duration: '30s', target: 0 },   
      ],
      exec: 'clinicalWorkflow',
    },
    patient_portal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 4000 }, 
        { duration: '1m', target: 4000 }, 
        { duration: '30s', target: 0 },    
      ],
      exec: 'patientPortal',
    },
    webhook_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 }, 
        { duration: '1m', target: 1000 }, 
        { duration: '30s', target: 0 },    
      ],
      exec: 'webhookStress',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'], // Allow 5% for local stress
    http_req_duration: ['p(95)<1000'], // Allow 1s for local stress
  },
};

const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  },
};

export function clinicalWorkflow() {
  group('Clinical Workflow', () => {
    http.get(`${BASE_URL}/clinical/dashboard/stats`, params);
    http.get(`${BASE_URL}/clinical/patients?search=doe&limit=20`, params);
    http.post(`${BASE_URL}/clinical/patients`, JSON.stringify({
      firstName: 'Load',
      lastName: 'Test',
      email: `test-${Math.random()}@example.com`,
    }), params);
    sleep(1);
  });
}

export function patientPortal() {
  group('Patient Portal', () => {
    http.get(`${BASE_URL}/profile/me`, params);
    http.get(`${BASE_URL}/clinical/appointments?limit=20`, params);
    http.get(`${BASE_URL}/admin/store/products?limit=20`, params);
    sleep(2);
  });
}

export function webhookStress() {
  group('Webhook Ingestion', () => {
    const payload = JSON.stringify({
      EventType: 'MedicationStatusUpdate',
      Data: {
        PrescriptionId: Math.floor(Math.random() * 1000000),
        PatientId: 6789,
        Status: 'Sent',
        Timestamp: new Date().toISOString(),
      },
    });

    http.post(`${BASE_URL}/dosespot/webhooks`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Secret mock-webhook-secret',
      },
    });
    sleep(0.5);
  });
}
