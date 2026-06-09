const repository = require('../notification.repository');

// Helper to notify all administrators
const notifyAllAdmins = async (title, message, type, metadata) => {
    const adminIds = await repository.getAdminUserIds();
    const promises = adminIds.map(adminId => 
        repository.createNotification(adminId, title, message, type, metadata)
    );
    return Promise.all(promises);
};

const notifyAdminOrderAssigned = async (trackingId, driverName) => {
    return notifyAllAdmins(
        'Order Assigned to Driver',
        `Order ${trackingId} has been successfully assigned to Driver: ${driverName}.`,
        'ORDER_ASSIGNED',
        { trackingId, driverName }
    );
};

const notifyAdminOrderPickedUp = async (trackingId, driverName) => {
    return notifyAllAdmins(
        'Order Picked Up',
        `Driver ${driverName} has picked up order ${trackingId}.`,
        'ORDER_PICKED_UP',
        { trackingId, driverName }
    );
};

const notifyAdminZoneAssigned = async (driverName, zoneName) => {
    return notifyAllAdmins(
        'Driver Assigned to Zone',
        `Driver ${driverName} was assigned to Zone: ${zoneName}.`,
        'ZONE_ASSIGNED',
        { driverName, zoneName }
    );
};

const notifyAdminSettlementSubmitted = async (driverName, amount, currency = 'USD') => {
    return notifyAllAdmins(
        'Settlement Received',
        `Driver ${driverName} submitted a cash settlement of ${amount} ${currency}.`,
        'SETTLEMENT_COMPLETED',
        { driverName, amount, currency }
    );
};

const notifyAdminCodCollected = async (trackingId, driverName, amount, currency = 'USD') => {
    return notifyAllAdmins(
        'COD Amount Collected',
        `Driver ${driverName} collected COD of ${amount} ${currency} for Order ${trackingId}.`,
        'COD_COLLECTED',
        { trackingId, driverName, amount, currency }
    );
};

const notifyAdminDriverStatusChanged = async (driverName, isActive) => {
    const status = isActive ? 'Active' : 'Blocked/Inactive';
    return notifyAllAdmins(
        'Driver Status Updated',
        `Driver ${driverName} is now marked as ${status}.`,
        'ACCOUNT_STATUS',
        { driverName, isActive }
    );
};

const notifyAdminInvoiceGenerated = async (clientName, amount, currency = 'USD') => {
    return notifyAllAdmins(
        'Invoice Generated against Client',
        `An invoice of amount ${amount} ${currency} has been generated for client: ${clientName}.`,
        'INVOICE_GENERATED',
        { clientName, amount, currency }
    );
};

const notifyAdminCredentials = async (adminId, email, password) => {
    return repository.createNotification(
        adminId,
        'Welcome Admin to Last-Mile!',
        `Your Admin account has been created. Username: ${email}, Password: ${password}. Please keep these details secure.`,
        'USER_CREATED',
        { email, password }
    );
};

module.exports = {
    notifyAdminOrderAssigned,
    notifyAdminOrderPickedUp,
    notifyAdminZoneAssigned,
    notifyAdminSettlementSubmitted,
    notifyAdminCodCollected,
    notifyAdminDriverStatusChanged,
    notifyAdminInvoiceGenerated,
    notifyAdminCredentials
};
