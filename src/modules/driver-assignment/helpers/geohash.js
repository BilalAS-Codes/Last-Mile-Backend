const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const encodeGeohash = (latitude, longitude, precision = 9) => {
    let latMin = -90, latMax = 90;
    let lonMin = -180, lonMax = 180;
    let geohash = '';
    let isEven = true;
    let bit = 0;
    let ch = 0;

    while (geohash.length < precision) {
        let mid;
        if (isEven) {
            mid = (lonMin + lonMax) / 2;
            if (longitude > mid) {
                ch = (ch << 1) | 1;
                lonMin = mid;
            } else {
                ch = (ch << 1) | 0;
                lonMax = mid;
            }
        } else {
            mid = (latMin + latMax) / 2;
            if (latitude > mid) {
                ch = (ch << 1) | 1;
                latMin = mid;
            } else {
                ch = (ch << 1) | 0;
                latMax = mid;
            }
        }
        isEven = !isEven;
        if (bit < 4) {
            bit++;
        } else {
            geohash += BASE32[ch];
            bit = 0;
            ch = 0;
        }
    }
    return geohash;
};

const getCommonPrefixLength = (g1, g2) => {
    let match = 0;
    const len = Math.min(g1.length, g2.length);
    for (let i = 0; i < len; i++) {
        if (g1[i] === g2[i]) {
            match++;
        } else {
            break;
        }
    }
    return match;
};

module.exports = {
    encodeGeohash,
    getCommonPrefixLength
};
