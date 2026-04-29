const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:\\Users\\dayoo\\Downloads\\LegitScript-healthcare-certification-standards.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('C:\\Users\\dayoo\\IdeaProjects\\PatrioticTH\\patriotic-virtual-prod\\backend\\legit.txt', data.text);
    console.log("Extracted: " + data.text.length + " characters.");
}).catch(console.error);
