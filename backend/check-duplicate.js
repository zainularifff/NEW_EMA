const fs = require('fs');

// Baca fail server.js
const content = fs.readFileSync('server.js', 'utf8');

// Cari corak semua route app.get, app.post, app.put, app.delete
const routeMatches = [...content.matchAll(/app\.(get|post|put|delete)\(["']([^"']+)["']/g)];
const routes = routeMatches.map(m => `${m[1].toUpperCase()} ${m[2]}`);

const counts = {};
routes.forEach(route => {
    counts[route] = (counts[route] || 0) + 1;
});

// Tapis mana-mana API yang wujud lebih dari 1 kali
const duplicates = Object.entries(counts).filter(([route, count]) => count > 1);

if (duplicates.length > 0) {
    console.log("Senarai API Duplikasi Dijumpai:");
    duplicates.forEach(([route, count]) => {
        console.log(`- ${route} (Ditulis sebanyak ${count} kali)`);
    });
} else {
    console.log("Bagus! Tiada duplikasi API (endpoint) dijumpai.");
}