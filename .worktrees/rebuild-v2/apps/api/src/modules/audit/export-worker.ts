import { processPendingAuditExports } from './exporter';

if (import.meta.main) {
  const result = await processPendingAuditExports();
  console.log(JSON.stringify(result));
}
