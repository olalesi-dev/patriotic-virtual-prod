const fs = require('fs');
try {
    const err = fs.readFileSync('ts_error.txt', 'utf16le');
    console.log(err.substring(0, 1000));
} catch(e){
    console.log(e);
}
