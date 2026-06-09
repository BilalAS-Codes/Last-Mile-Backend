const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// In-memory store for notifications
const inMemoryNotifications = [];

const createNotification = async (userId, title, message, type, metadata = null) => {
    const notification = {
        id: uuidv4(),
        user_id: userId,
        title,
        message,
        type,
        read: false,
        metadata: metadata || null,
        created_at: new Date(),
        updated_at: new Date()
    };
    inMemoryNotifications.push(notification);
    return notification;
};

const syncDatabaseNotifications = async (userId) => {
    try {
        if (!userId) return;
        // Fetch all orders assigned to this user
        const result = await db.query(
            "SELECT * FROM orders WHERE driver_id = $1",
            [userId]
        );
        for (const order of result.rows) {
            const trackingId = order.tracking_id;
            
            // Check if ORDER_ASSIGNED notification already exists
            const hasAssigned = inMemoryNotifications.some(
                n => n.user_id === userId && n.type === 'ORDER_ASSIGNED' && n.metadata?.trackingId === trackingId
            );
            if (!hasAssigned) {
                inMemoryNotifications.push({
                    id: uuidv4(),
                    user_id: userId,
                    title: 'New Batch/Order Assigned',
                    message: `You have been assigned a new order: ${trackingId}. Please proceed to pick it up.`,
                    type: 'ORDER_ASSIGNED',
                    read: false,
                    metadata: { trackingId },
                    created_at: order.created_at || new Date(),
                    updated_at: order.created_at || new Date()
                });
            }
        }

        // Sync zone assignment
        const userResult = await db.query(
            "SELECT u.id, u.zone_id, z.name as zone_name FROM users u LEFT JOIN zones z ON u.zone_id = z.id WHERE u.id = $1",
            [userId]
        );
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            if (user.zone_id && user.zone_name) {
                const hasZone = inMemoryNotifications.some(
                    n => n.user_id === userId && n.type === 'ZONE_ASSIGNED' && n.metadata?.zoneId === user.zone_id
                );
                if (!hasZone) {
                    inMemoryNotifications.push({
                        id: uuidv4(),
                        user_id: userId,
                        title: 'Zone Assigned',
                        message: `You have been assigned to Zone: ${user.zone_name} (ID: ${user.zone_id}).`,
                        type: 'ZONE_ASSIGNED',
                        read: false,
                        metadata: { zoneId: user.zone_id, zoneName: user.zone_name },
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }
            }
        }
    } catch (e) {
        console.error("Failed to sync database notifications for driver:", e);
    }
};

const getUserNotifications = async (userId, limit = 50, offset = 0) => {
    await syncDatabaseNotifications(userId);
    // Filter notifications belonging to the user or system-wide (null user_id)
    const userNotifications = inMemoryNotifications.filter(
        n => n.user_id === userId || n.user_id === null
    );
    
    // Sort by created_at DESC
    userNotifications.sort((a, b) => b.created_at - a.created_at);
    
    return userNotifications.slice(offset, offset + limit);
};

const getUnreadCount = async (userId) => {
    await syncDatabaseNotifications(userId);
    return inMemoryNotifications.filter(
        n => (n.user_id === userId || n.user_id === null) && n.read === false
    ).length;
};

const markAsRead = async (id, userId) => {
    const notification = inMemoryNotifications.find(
        n => n.id === id && (n.user_id === userId || n.user_id === null)
    );
    if (notification) {
        notification.read = true;
        notification.updated_at = new Date();
    }
    return notification;
};

const markAllAsRead = async (userId) => {
    const unread = inMemoryNotifications.filter(
        n => (n.user_id === userId || n.user_id === null) && n.read === false
    );
    for (const n of unread) {
        n.read = true;
        n.updated_at = new Date();
    }
    return unread;
};

const getAdminUserIds = async () => {
    try {
        const query = `
            SELECT id FROM users
            WHERE LOWER(role) = 'admin'
        `;
        const result = await db.query(query);
        return result.rows.map(row => row.id);
    } catch (err) {
        console.error('Failed to fetch admin user IDs from database:', err);
        return [];
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    getAdminUserIds,
    inMemoryNotifications // Exposed for debugging/testing
};
