const mammoth = require("mammoth");

mammoth.extractRawText({path: "C:\\Users\\dayoo\\Downloads\\PVT Website Developer Brief.docx"})
    .then(function(result){
        const text = result.value; // The raw text
        console.log(text);
        if (result.messages.length > 0) {
            console.error(result.messages);
        }
    })
    .catch(function(error) {
        console.error(error);
    });
