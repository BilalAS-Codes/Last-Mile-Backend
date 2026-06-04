const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'assignment-settings.json');

const defaultSettings = {
    strategy: 'zone' // default strategy: 'fifo', 'nearest', 'zone'
};

const getSettings = () => {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading assignment settings:', e);
    }
    return defaultSettings;
};

const updateSettings = (strategy) => {
    const validStrategies = ['fifo', 'nearest', 'zone'];
    if (!validStrategies.includes(strategy.toLowerCase())) {
        throw new Error('Invalid strategy. Must be one of: fifo, nearest, zone');
    }
    const settings = { strategy: strategy.toLowerCase() };
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf8');
    return settings;
};

module.exports = {
    getSettings,
    updateSettings
};
