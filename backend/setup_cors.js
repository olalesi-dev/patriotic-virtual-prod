const {Storage} = require('@google-cloud/storage');

const storage = new Storage({
  projectId: 'patriotic-virtual-prod',
  keyFilename: 'c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json'
});

async function testWrite() {
  try {
    const bucket = storage.bucket('patriotic-virtual-prod-us-central1');
    await bucket.file('test.txt').save('test', { resumable: false });
    console.log('Test file written to patriotic-virtual-prod-us-central1 successfully!');
  } catch (err) {
    console.error('ERROR:', err);
  }
}

testWrite();
