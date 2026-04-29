const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (optional, mostly for local dev)
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

// Service Account Path
const serviceAccountPath = 'c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json';

if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account not found at: ${serviceAccountPath}`);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'patriotic-virtual-prod' // Explicit project ID
});

// Note: firebase-admin SDK does NOT support deploying indexes directly.
// This script is futile for deploying indexes. Indexes must be deployed via firebase-tools CLI.
// However, since CLI is failing due to PowerShell execution policy, we have a problem.

console.log("Checking if we can create the index via SDK... (Hint: We can't)");
console.log("Please run the following command in a Command Prompt (cmd.exe) NOT PowerShell:");
console.log("npx firebase deploy --only firestore:indexes");

// We can try to use child_process to run it via cmd.exe directly if npx is available
const { spawn } = require('child_process');

console.log("Attempting to run npx via child_process spawn (cmd.exe)...");

const deploy = spawn('cmd.exe', ['/c', 'npx', 'firebase', 'deploy', '--only', 'firestore:indexes'], {
    stdio: 'inherit'
});

deploy.on('close', (code) => {
    console.log(`npx process exited with code ${code}`);
});
