const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');

class InvoiceGenerator {
    async generateExcel(orders) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Order Details');

        // Define columns
        worksheet.columns = [
            { header: 'Order ID', key: 'id', width: 40 },
            { header: 'Tracking ID', key: 'tracking_id', width: 20 },
            { header: 'Customer Name', key: 'customer_name', width: 25 },
            { header: 'Customer Phone', key: 'customer_phone', width: 20 },
            { header: 'Order Value', key: 'order_value', width: 15 },
            { header: 'COD Amount', key: 'cod_amount', width: 15 },
            { header: 'Delivery Fee', key: 'delivery_fee', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Delivered At', key: 'updated_at', width: 25 }
        ];

        // Add rows
        orders.forEach(order => {
            worksheet.addRow({
                id: order.id,
                tracking_id: order.tracking_id,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                order_value: parseFloat(order.order_value),
                cod_amount: parseFloat(order.cod_amount),
                delivery_fee: parseFloat(order.delivery_fee),
                status: order.status,
                updated_at: order.updated_at
            });
        });

        // Styling
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        return await workbook.xlsx.writeBuffer();
    }

    async generatePDF(invoiceData, orders) {
        const { clientName, amount, billingPeriod, dueDate, invoiceId, extra_charges, currency } = invoiceData;
        const currencyStr = currency || 'SAR';

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Arial', sans-serif; color: #333; margin: 0; padding: 40px; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #3498db; padding-bottom: 20px; }
                .logo { font-size: 28px; font-weight: bold; color: #3498db; }
                .invoice-info { text-align: right; }
                .details { margin-top: 40px; display: flex; justify-content: space-between; }
                table { width: 100%; border-collapse: collapse; margin-top: 40px; }
                th { background-color: #f8f9fa; text-align: left; padding: 12px; border-bottom: 2px solid #dee2e6; }
                td { padding: 12px; border-bottom: 1px solid #dee2e6; }
                .totals { margin-top: 30px; text-align: right; }
                .total-row { font-size: 18px; font-weight: bold; color: #2c3e50; margin-top: 10px; }
                .footer { margin-top: 60px; font-size: 12px; color: #7f8c8d; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">LAST MILE LOGISTICS</div>
                <div class="invoice-info">
                    <h1 style="margin: 0; color: #2c3e50;">INVOICE</h1>
                    <p style="margin: 5px 0;"># ${invoiceId}</p>
                    <p style="margin: 5px 0;">Date: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div class="details">
                <div>
                    <h3 style="color: #3498db; margin-bottom: 10px;">Bill To:</h3>
                    <p style="margin: 0; font-weight: bold;">${clientName}</p>
                    <p style="margin: 5px 0;">Billing Period: ${billingPeriod}</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="color: #3498db; margin-bottom: 10px;">Payment Details:</h3>
                    <p style="margin: 0;"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> UNPAID</p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: center;">Orders</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Delivery Service Fees (${billingPeriod})</td>
                        <td style="text-align: center;">${orders.length}</td>
                        <td style="text-align: right;">${(parseFloat(amount) - parseFloat(extra_charges || 0)).toFixed(2)} ${currencyStr}</td>
                    </tr>
                    ${extra_charges > 0 ? `
                    <tr>
                        <td>Extra Charges / Handling Fees</td>
                        <td style="text-align: center;">-</td>
                        <td style="text-align: right;">${parseFloat(extra_charges).toFixed(2)} ${currencyStr}</td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-row">Total Amount: ${parseFloat(amount).toFixed(2)} ${currencyStr}</div>
            </div>

            <div class="footer">
                <p>Thank you for your business!</p>
                <p>For any queries regarding this invoice, please contact support@logiflow.com</p>
                <p>&copy; 2026 Last Mile Logistics. All rights reserved.</p>
            </div>
        </body>
        </html>
        `;

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new'
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            printBackground: true
        });
        await browser.close();
        return pdfBuffer;
    }
}

module.exports = new InvoiceGenerator();
