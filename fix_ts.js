const fs = require('fs');
const p = 'emr-portal/src/app/(provider)/analytics/google/PageClient.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
    /const \{ data: report, isLoading, error \} = useQuery\(\{/g,
    'const { data: report, isLoading, error } = useQuery<any>({'
);

fs.writeFileSync(p, txt);
console.log('Fixed useQuery inference!');
