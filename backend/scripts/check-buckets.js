const admin = require('firebase-admin');
const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

admin.storage().getBuckets()
  .then(res => {
    const buckets = res[0];
    buckets.forEach(bucket => console.log(bucket.name));
  })
  .catch(err => {
    console.error('ERROR:', err);
  });
