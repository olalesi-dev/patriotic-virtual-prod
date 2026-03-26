const fs = require('fs');
const envPath = 'emr-portal/.env.production';
let envContent = fs.readFileSync(envPath, 'utf8');

if (!envContent.includes('GA_PROPERTY_ID=')) {
    // Ensure there is a newline before appending
    if (!envContent.endsWith('\n')) {
        envContent += '\n';
    }
    envContent += 'GA_PROPERTY_ID=527331101\n';
    fs.writeFileSync(envPath, envContent);
    console.log('Appended GA_PROPERTY_ID to .env.production');
} else {
    console.log('GA_PROPERTY_ID already exists.');
}
