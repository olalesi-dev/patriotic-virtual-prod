const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(indexFile, 'utf8');

// We will inject a script that checks window.location.hostname and prepends a banner to the body

const bannerSnippet = `
<script>
  (function() {
    var host = window.location.hostname;
    var env = 'prod';
    if (host.includes('dev')) env = 'dev';
    if (host.includes('test')) env = 'test';
    
    if (env !== 'prod') {
      document.addEventListener('DOMContentLoaded', function() {
        var banner = document.createElement('div');
        banner.style.padding = '8px 16px';
        banner.style.textAlign = 'center';
        banner.style.fontFamily = 'monospace, sans-serif';
        banner.style.fontSize = '12px';
        banner.style.fontWeight = 'bold';
        banner.style.letterSpacing = '1px';
        banner.style.zIndex = '999999';
        banner.style.position = 'relative';
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.justifyContent = 'center';
        banner.style.gap = '8px';
        
        if (env === 'dev') {
          banner.style.backgroundColor = '#dc2626'; // red-600
          banner.style.color = '#ffffff';
          banner.innerHTML = '🚧 THIS IS A DEVELOPMENT ENVIRONMENT. DATA ENTERED HERE IS NOT REAL.';
        } else if (env === 'test') {
          banner.style.backgroundColor = '#f59e0b'; // amber-500
          banner.style.color = '#ffffff';
          banner.innerHTML = '⚠️ THIS IS A TEST/STAGING ENVIRONMENT. NOT FOR PRODUCTION USE.';
        }
        
        document.body.insertBefore(banner, document.body.firstChild);
      });
    }
  })();
</script>
`;

// Add to head if not already there
if (!content.includes('THIS IS A DEVELOPMENT ENVIRONMENT')) {
  content = content.replace('</head>', bannerSnippet + '</head>');
  fs.writeFileSync(indexFile, content, 'utf8');
  console.log('Successfully injected banner script into public/index.html');
} else {
  console.log('Banner script already injected in public/index.html');
}
