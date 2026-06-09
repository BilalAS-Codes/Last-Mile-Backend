const repository = require('../notification.repository');

const notifyClientOrderAssigned = async (clientId, trackingId, driverName) => {
    return await repository.createNotification(
        clientId,
        'Driver Assigned to your Order',
        `Your order ${trackingId} has been assigned to Driver: ${driverName}.`,
        'ORDER_ASSIGNED',
        { trackingId, driverName }
    );
};

const notifyClientOrderPickedUp = async (clientId, trackingId, driverName) => {
    return await repository.createNotification(
        clientId,
        'Order Picked Up',
        `Driver ${driverName} has picked up your order ${trackingId} and is on their way.`,
        'ORDER_PICKED_UP',
        { trackingId, driverName }
    );
};

const notifyClientCodCollected = async (clientId, trackingId, amount, currency = 'USD') => {
    return await repository.createNotification(
        clientId,
        'COD Collected Successfully',
        `COD payment of ${amount} ${currency} for your order ${trackingId} has been received.`,
        'COD_COLLECTED',
        { trackingId, amount, currency }
    );
};

const notifyClientInvoiceGenerated = async (clientId, amount, currency = 'USD') => {
    return await repository.createNotification(
        clientId,
        'New Invoice Generated',
        `An invoice of amount ${amount} ${currency} has been generated against your account.`,
        'INVOICE_GENERATED',
        { amount, currency }
    );
};

const notifyClientCredentials = async (clientId, email, password) => {
    return await repository.createNotification(
        clientId,
        'Welcome Client to Last-Mile!',
        `Your Client account has been created. Username: ${email}, Password: ${password}. Please keep these details secure.`,
        'USER_CREATED',
        { email, password }
    );
};

module.exports = {
    notifyClientOrderAssigned,
    notifyClientOrderPickedUp,
    notifyClientCodCollected,
    notifyClientInvoiceGenerated,
    notifyClientCredentials
};
