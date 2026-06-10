const fs = require('fs');
const path = require('path');
const db = require('./db');

const configPath = path.join(__dirname, 'assignment-settings.json');

const defaultSettings = {
    strategy: 'fifo',
    order_clubbing: false,
    clubbing_distance: 1.00,
    clubbing_time_difference: 1.00
};

const getSettings = async () => {
    try {
        const res = await db.query('SELECT strategy, order_clubbing, clubbing_distance, clubbing_time_difference FROM assignment_settings ORDER BY created_at DESC LIMIT 1');
        if (res.rowCount > 0) {
            const row = res.rows[0];
            return {
                strategy: row.strategy,
                order_clubbing: row.order_clubbing,
                clubbing_distance: parseFloat(row.clubbing_distance),
                clubbing_time_difference: parseFloat(row.clubbing_time_difference)
            };
        }
    } catch (e) {
        console.error('Error reading assignment settings from DB, falling back to file:', e);
    }

    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            const parsed = JSON.parse(data);
            return {
                strategy: parsed.strategy || defaultSettings.strategy,
                order_clubbing: parsed.order_clubbing !== undefined ? parsed.order_clubbing : defaultSettings.order_clubbing,
                clubbing_distance: parsed.clubbing_distance !== undefined ? parseFloat(parsed.clubbing_distance) : defaultSettings.clubbing_distance,
                clubbing_time_difference: parsed.clubbing_time_difference !== undefined ? parseFloat(parsed.clubbing_time_difference) : defaultSettings.clubbing_time_difference
            };
        }
    } catch (e) {
        console.error('Error reading assignment settings file:', e);
    }
    return defaultSettings;
};

const updateSettings = async (strategy, order_clubbing, clubbing_distance, clubbing_time_difference) => {
    const validStrategies = ['fifo', 'nearest', 'zone'];
    if (strategy && !validStrategies.includes(strategy.toLowerCase())) {
        throw new Error('Invalid strategy. Must be one of: fifo, nearest, zone');
    }

    const updates = {};
    if (strategy !== undefined) updates.strategy = strategy.toLowerCase();
    if (order_clubbing !== undefined) updates.order_clubbing = !!order_clubbing;
    if (clubbing_distance !== undefined) updates.clubbing_distance = parseFloat(clubbing_distance);
    if (clubbing_time_difference !== undefined) updates.clubbing_time_difference = parseFloat(clubbing_time_difference);

    try {
        const checkRes = await db.query('SELECT id FROM assignment_settings LIMIT 1');
        if (checkRes.rowCount > 0) {
            const keys = Object.keys(updates);
            if (keys.length > 0) {
                const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
                const values = keys.map(key => updates[key]);
                await db.query(`UPDATE assignment_settings SET ${setClause}, updated_at = NOW()`, values);
            }
        } else {
            const finalSettings = { ...defaultSettings, ...updates };
            await db.query(
                `INSERT INTO assignment_settings (strategy, order_clubbing, clubbing_distance, clubbing_time_difference)
                 VALUES ($1, $2, $3, $4)`,
                [finalSettings.strategy, finalSettings.order_clubbing, finalSettings.clubbing_distance, finalSettings.clubbing_time_difference]
            );
        }
    } catch (e) {
        console.error('Error updating assignment settings in DB:', e);
    }

    let currentSettings = defaultSettings;
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            currentSettings = JSON.parse(data);
        }
    } catch (e) {
        // Ignore JSON read error
    }

    const mergedSettings = { ...currentSettings, ...updates };
    try {
        fs.writeFileSync(configPath, JSON.stringify(mergedSettings, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing assignment settings to file:', e);
    }

    return mergedSettings;
};

module.exports = {
    getSettings,
    updateSettings
};
