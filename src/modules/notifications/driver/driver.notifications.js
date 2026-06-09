const repository = require('../notification.repository');

const notifyDriverAssigned = async (driverId, trackingId) => {
    return await repository.createNotification(
        driverId,
        'New Batch/Order Assigned',
        `You have been assigned a new order: ${trackingId}. Please proceed to pick it up.`,
        'ORDER_ASSIGNED',
        { trackingId }
    );
};

const notifyDriverZoneAssigned = async (driverId, zoneId, zoneName) => {
    return await repository.createNotification(
        driverId,
        'Zone Assigned',
        `You have been assigned to Zone: ${zoneName} (ID: ${zoneId}).`,
        'ZONE_ASSIGNED',
        { zoneId, zoneName }
    );
};

const notifyDriverSettlementConfirmed = async (driverId, amount, currency = 'USD') => {
    return await repository.createNotification(
        driverId,
        'Settlement Confirmed',
        `Your cash settlement of ${amount} ${currency} has been verified and approved by the admin.`,
        'SETTLEMENT_COMPLETED',
        { amount, currency }
    );
};

const notifyDriverSettlementPending = async (driverId, amount, currency = 'USD') => {
    return await repository.createNotification(
        driverId,
        'Settlement Balance Alert',
        `You have a pending settlement balance of ${amount} ${currency}. Please settle it with the admin.`,
        'SETTLEMENT_PENDING',
        { amount, currency }
    );
};

const notifyDriverStatusChanged = async (driverId, isActive) => {
    const status = isActive ? 'Active/Unblocked' : 'Inactive/Blocked';
    return await repository.createNotification(
        driverId,
        'Account Status Updated',
        `Your driver account status has been changed to ${status} by the admin.`,
        'ACCOUNT_STATUS',
        { isActive }
    );
};

const notifyDriverCredentials = async (driverId, email, password) => {
    return await repository.createNotification(
        driverId,
        'Welcome to Last-Mile!',
        `Your driver account has been created. Username: ${email}, Password: ${password}. Please keep these details secure.`,
        'USER_CREATED',
        { email, password }
    );
};

const notifyDriverPickedUp = async (driverId, trackingId) => {
    return await repository.createNotification(
        driverId,
        'Order Picked Up',
        `You have successfully picked up order: ${trackingId}.`,
        'ORDER_PICKED_UP',
        { trackingId }
    );
};

const notifyDriverDelivered = async (driverId, trackingId, codAmount, currency = 'SAR') => {
    return await repository.createNotification(
        driverId,
        'Order Delivered',
        `Order ${trackingId} has been successfully delivered. COD Collected: ${codAmount} ${currency}.`,
        'ORDER_DELIVERED',
        { trackingId, codAmount, currency }
    );
};

module.exports = {
    notifyDriverAssigned,
    notifyDriverZoneAssigned,
    notifyDriverSettlementConfirmed,
    notifyDriverSettlementPending,
    notifyDriverStatusChanged,
    notifyDriverCredentials,
    notifyDriverPickedUp,
    notifyDriverDelivered
};
