const db = require('../src/config/db');
const authService = require('../src/modules/auth/auth.service');
const authRepository = require('../src/modules/auth/auth.repository');

// Simple test runner
const runTests = async () => {
    console.log('--- STARTING AUTH INTEGRATION TESTS ---');
    
    // Find an admin and driver for testing
    const adminUser = await db.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    const driverUser = await db.query("SELECT * FROM users WHERE role = 'driver' LIMIT 1");
    
    if (!adminUser.rows.length) {
        console.error('No admin user found in database. Please run seed data first.');
        return;
    }
    if (!driverUser.rows.length) {
        console.error('No driver user found in database. Please run seed data first.');
        return;
    }

    const admin = adminUser.rows[0];
    const driver = driverUser.rows[0];
    console.log(`Using admin: ${admin.email}, ID: ${admin.id}`);
    console.log(`Using driver: ${driver.email}, ID: ${driver.id}`);

    // Helper to clear existing refresh tokens for these users
    await db.query("DELETE FROM refresh_tokens WHERE user_id IN ($1, $2)", [admin.id, driver.id]);

    try {
        // --- TEST 1: Login Token Generation ---
        console.log('\n[Test 1] Logging in admin...');
        // Let's call the internal generator directly or simulate service login
        // We will call the login method directly if we have the password.
        // But since password is encrypted, we can manually create a token via service's helper by simulating it, 
        // or just test the refresh function with mock tokens we insert.
        // Let's create a refresh token for admin manually.
        const tokenString = 'test_plain_admin_refresh_token_string';
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(tokenString).digest('hex');
        
        // Expiry in 7 days
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await authRepository.createRefreshToken(admin.id, tokenHash, expiresAt);
        console.log('Admin refresh token created successfully.');

        // Verify it is in database
        let doc = await authRepository.findRefreshToken(tokenHash);
        if (doc) {
            console.log('SUCCESS: Token found in database.');
        } else {
            throw new Error('FAIL: Token not found in database.');
        }

        // --- TEST 2: Refresh and Rotation ---
        console.log('\n[Test 2] Refreshing token...');
        const refreshResult = await authService.refresh(tokenString, 'cookie');
        console.log('SUCCESS: Token refreshed successfully. New token: ', refreshResult.refreshToken);
        
        // Verify rotation: old token is revoked
        const oldDoc = await authRepository.findRefreshToken(tokenHash);
        if (oldDoc && oldDoc.is_revoked) {
            console.log('SUCCESS: Old token marked as revoked.');
        } else {
            throw new Error('FAIL: Old token was not marked as revoked.');
        }

        // Verify new token exists and is valid
        const newHash = crypto.createHash('sha256').update(refreshResult.refreshToken).digest('hex');
        const newDoc = await authRepository.findRefreshToken(newHash);
        if (newDoc && !newDoc.is_revoked) {
            console.log('SUCCESS: New token is active in the database.');
        } else {
            throw new Error('FAIL: New token not found or is revoked.');
        }

        // --- TEST 3: Token Reuse Detection ---
        console.log('\n[Test 3] Attempting to reuse revoked old token...');
        try {
            await authService.refresh(tokenString, 'cookie');
            throw new Error('FAIL: Reuse of old token did not fail.');
        } catch (err) {
            if (err.message.includes('Token reuse detected')) {
                console.log('SUCCESS: Token reuse detected and rejected. Message:', err.message);
                // Verify all user tokens were deleted
                const remainingTokens = await db.query("SELECT * FROM refresh_tokens WHERE user_id = $1", [admin.id]);
                if (remainingTokens.rows.length === 0) {
                    console.log('SUCCESS: All refresh tokens for user deleted.');
                } else {
                    throw new Error('FAIL: User sessions were not fully cleaned up on reuse.');
                }
            } else {
                throw err;
            }
        }

        // --- TEST 4: Admin Inactivity (24h) ---
        console.log('\n[Test 4] Testing admin 24h inactivity...');
        const inactiveAdminToken = 'inactive_admin_token';
        const inactiveHash = crypto.createHash('sha256').update(inactiveAdminToken).digest('hex');
        // Expiry in 7 days, but last_active_at was 25 hours ago
        const lastActiveTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
        
        // Insert directly
        await db.query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, last_active_at) VALUES ($1, $2, $3, $4)",
            [admin.id, inactiveHash, expiresAt, lastActiveTime]
        );
        
        try {
            await authService.refresh(inactiveAdminToken, 'cookie');
            throw new Error('FAIL: Inactive admin refresh did not fail.');
        } catch (err) {
            if (err.message.includes('Session expired due to inactivity')) {
                console.log('SUCCESS: Inactive admin rejected correctly. Message:', err.message);
                // Verify the token is removed from database
                const checkDoc = await authRepository.findRefreshToken(inactiveHash);
                if (!checkDoc) {
                    console.log('SUCCESS: Inactive token deleted from DB.');
                } else {
                    throw new Error('FAIL: Inactive token was not deleted.');
                }
            } else {
                throw err;
            }
        }

        // --- TEST 5: Driver Inactivity Exemption ---
        console.log('\n[Test 5] Testing driver inactivity exemption (25h inactive)...');
        const driverToken = 'driver_token';
        const driverHash = crypto.createHash('sha256').update(driverToken).digest('hex');
        
        // Insert directly
        await db.query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, last_active_at) VALUES ($1, $2, $3, $4)",
            [driver.id, driverHash, new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), lastActiveTime]
        );
        
        const driverRefreshResult = await authService.refresh(driverToken, 'body');
        console.log('SUCCESS: Driver refreshed successfully despite 25h inactivity.');
        console.log('New driver refresh token: ', driverRefreshResult.refreshToken);

        // --- TEST 6: Missing Refresh Token / Cookie Handling ---
        console.log('\n[Test 6] Testing missing refresh token/cookie handling...');
        try {
            await authService.refresh(undefined, 'cookie');
            throw new Error('FAIL: Missing refresh token in cookie did not fail.');
        } catch (err) {
            if (err.statusCode === 401 && err.message.includes('Refresh token cookie is missing')) {
                console.log('SUCCESS: Missing cookie thrown as 401 with correct message:', err.message);
            } else {
                throw new Error(`FAIL: Missing cookie error did not return expected status/message. Got status: ${err.statusCode}, message: ${err.message}`);
            }
        }

        try {
            await authService.refresh(undefined, 'body');
            throw new Error('FAIL: Missing refresh token in body did not fail.');
        } catch (err) {
            if (err.statusCode === 401 && err.message.includes('Refresh token is required')) {
                console.log('SUCCESS: Missing body token thrown as 401 with correct message:', err.message);
            } else {
                throw new Error(`FAIL: Missing body token error did not return expected status/message. Got status: ${err.statusCode}, message: ${err.message}`);
            }
        }

        // Clean up
        await db.query("DELETE FROM refresh_tokens WHERE user_id IN ($1, $2)", [admin.id, driver.id]);
        console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY ---');
        
    } catch (err) {
        console.error('\n!!! TEST FAILED !!!');
        console.error(err);
    } finally {
        await db.pool.end();
    }
};

runTests();
