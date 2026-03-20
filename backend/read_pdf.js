const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:\\Users\\dayoo\\Downloads\\LegitScript-healthcare-certification-standards (1).pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('C:\\Users\\dayoo\\Downloads\\LegitScript-healthcare-certification-standards.txt', data.text);
    console.log("PDF successfully extracted to text. Total characters: " + data.text.length);
}).catch(console.error);
