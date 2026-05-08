const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const billingRepository = require('../src/modules/billing/billing.repository');

async function testRevenueStats() {
    try {
        const stats = await billingRepository.getFinancialStats();
        const chartData = await billingRepository.getRevenueChartData();

        console.log('--- Financial Stats ---');
        console.log(stats);
        
        console.log('--- Weekly Chart Data ---');
        console.table(chartData.weekly);
        
        console.log('--- Monthly Chart Data ---');
        console.table(chartData.monthly);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testRevenueStats();
