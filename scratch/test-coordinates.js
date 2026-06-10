const turf = require('@turf/turf');

const coordinates = [[58.49669203319333,23.639390751033307],[58.45069277365683,23.50102433035352],[58.63812259236533,23.47459236808766],[58.60173511840362,23.608585399350467],[58.49943825764329,23.63813353157019]];

const closed = [...coordinates];
if (JSON.stringify(closed[0]) !== JSON.stringify(closed[closed.length - 1])) {
    closed.push(closed[0]);
}

const poly = turf.polygon([closed]);

const testPoints = [
    { name: 'Driver', lat: 23.5500, lng: 58.5200 },
    { name: 'Order 1', lat: 23.5400, lng: 58.5000 },
    { name: 'Order 2', lat: 23.5600, lng: 58.5400 },
    { name: 'Order 3', lat: 23.5800, lng: 58.5600 }
];

testPoints.forEach(p => {
    const pt = turf.point([p.lng, p.lat]);
    console.log(`${p.name} inside:`, turf.booleanPointInPolygon(pt, poly));
});
