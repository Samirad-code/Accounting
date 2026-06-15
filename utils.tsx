
import React from 'react';
import { Invoice } from './types';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';

/**
 * Format currency in Tomans
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fa-IR').format(Math.round(amount)) + ' تومان';
};

/**
 * Format date to Persian/Jalali string
 */
export const formatJalali = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR').format(date);
};

/**
 * Get color based on stock levels
 */
export const getStockStatusColor = (current: number, threshold: number) => {
  if (current <= 0) return 'text-red-600 dark:text-red-400 font-bold';
  if (current <= threshold) return 'text-orange-500 dark:text-orange-300 font-bold';
  return 'text-green-600 dark:text-green-400';
};

/**
 * Beautiful PDF/Print invoice generator
 */
export const exportToPDF = (invoice: Invoice, filename: string) => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.direction = 'rtl';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  
  const dateStr = formatJalali(invoice.date);
  const dueDateStr = invoice.dueDate ? formatJalali(invoice.dueDate) : '---';
  
  const itemsRows = invoice.items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
      <td style="padding: 12px 10px; font-weight: bold; text-align: center; color: #475569; border: 1px solid #cbd5e1;">${(idx + 1).toLocaleString('fa-IR')}</td>
      <td style="padding: 12px 10px; font-weight: 800; text-align: right; color: #0f172a; border: 1px solid #cbd5e1;">${item.productName}</td>
      <td style="padding: 12px 10px; font-weight: bold; text-align: center; color: #0f172a; border: 1px solid #cbd5e1;">${item.qty.toLocaleString('fa-IR')}</td>
      <td style="padding: 12px 10px; font-weight: bold; text-align: center; color: #1e293b; border: 1px solid #cbd5e1;">${formatCurrency(item.unitPrice).replace(' تومان', '')}</td>
      <td style="padding: 12px 10px; font-weight: 900; text-align: center; color: #0f172a; border: 1px solid #cbd5e1;">${formatCurrency(item.qty * item.unitPrice).replace(' تومان', '')}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="font-family: 'Inter', 'Vazirmatn', 'Tahoma', sans-serif; padding: 40px; background-color: #ffffff; color: #1e293b; width: 800px; box-sizing: border-box; direction: rtl; text-align: right; line-height: 1.6;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1e3a8a; padding-bottom: 15px; margin-bottom: 25px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 900; color: #1e3a8a; margin: 0; display: flex; align-items: center; gap: 8px;">
            💎 فروشگاه پلاستیک‌بان
          </h1>
          <p style="font-size: 11px; color: #64748b; font-weight: bold; margin: 5px 0 0 0;">سیستم حسابداری فروشگاهی و ملزومات پلاستیک و بسته‌بندی</p>
        </div>
        <div style="text-align: left;">
          <h2 style="font-size: 18px; font-weight: 950; color: #1e3a8a; margin: 0; background-color: #eff6ff; padding: 8px 24px; border-radius: 12px; border: 2px solid #3b82f6;">صورتحساب فروش کالا</h2>
        </div>
      </div>

      <!-- Document Meta Details -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; font-size: 13px; background-color: #f8fafc; border-radius: 12px; padding: 18px; border: 1px solid #e2e8f0;">
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div><strong style="color: #475569;">شماره فاکتور:</strong> <span style="font-family: monospace; font-weight: 900; color: #1e3a8a; font-size: 14px;">${invoice.invoiceNumber}</span></div>
          <div><strong style="color: #475569;">تاریخ صدور:</strong> <span style="font-weight: bold; color: #0f172a;">${dateStr}</span></div>
          <div><strong style="color: #475569;">نوع فاکتور:</strong> <span style="font-weight: bold; color: #0f172a;">${invoice.type === 'RETAIL' ? 'خرده‌فروشی' : 'عمده‌فروشی'}</span></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; text-align: left; align-items: flex-end;">
          <div><strong style="color: #475569;">نام خریدار:</strong> <span style="font-weight: bold; color: #1e3a8a; font-size: 14px;">${invoice.customerName || 'مشتری گذری'}</span></div>
          <div><strong style="color: #475569;">موعد تسویه:</strong> <span style="font-weight: bold; color: #ea580c;">${dueDateStr}</span></div>
          <div><strong style="color: #475569;">وضعیت تسویه فاکتور:</strong> <span style="font-weight: 900; color: ${invoice.remainingAmount === 0 ? '#15803d' : '#b91c1c'};">${invoice.remainingAmount === 0 ? '✔️ تسویه شده' : '⚠️ بدهکار'}</span></div>
        </div>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background-color: #1e3a8a; color: #ffffff; text-align: right;">
            <th style="padding: 12px 10px; font-weight: 900; text-align: center; width: 45px; border: 1px solid #1e3a8a;">ردیف</th>
            <th style="padding: 12px 10px; font-weight: 900; text-align: right; border: 1px solid #1e3a8a;">نام شرح کالا / خدمات</th>
            <th style="padding: 12px 10px; font-weight: 900; text-align: center; width: 75px; border: 1px solid #1e3a8a;">تعداد</th>
            <th style="padding: 12px 10px; font-weight: 900; text-align: center; width: 140px; border: 1px solid #1e3a8a;">قیمت واحد (تومان)</th>
            <th style="padding: 12px 10px; font-weight: 900; text-align: center; width: 150px; border: 1px solid #1e3a8a;">جمع کل (تومان)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Bottom Calculator & Terms -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; font-size: 13px; align-items: start;">
        <!-- Terms box -->
        <div style="border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; background-color: #fafafa; display: flex; flex-direction: column; min-height: 180px; justify-content: space-between; box-sizing: border-box;">
          <div>
            <h4 style="font-weight: 900; color: #1e3a8a; margin: 0 0 10px 0; font-size: 14px;">توضیحات و شرایط فروش:</h4>
            <ul style="margin: 0; padding-right: 18px; line-height: 1.8; color: #475569; font-size: 11px;">
              <li>کالای فروخته شده فقط تا ۷ روز با ارائه این فاکتور قابل تعویض می‌باشد.</li>
              <li>در صورت گشوده شدن بسته‌بندی یا آسیب بابت جابجایی نادرست، تعویض کالا امکان‌پذیر نیست.</li>
              <li>کلیه مبالغ فاکتور بر حسب تومان می‌باشد و در موعد مقرر باید تسویه گردد.</li>
            </ul>
          </div>
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #f1f5f9; font-size: 11px; text-align: center; font-weight: bold; color: #4f46e5;">
            تلفن تماس: ۰۹۱۲۳۴۵۶۷۸۹ | مدیریت: پویان
          </div>
        </div>

        <!-- Price block -->
        <div style="display: flex; flex-direction: column; gap: 10px; background-color: #f1f5f9; border-radius: 12px; padding: 18px; border: 1px solid #e2e8f0; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #64748b; font-weight: bold;">جمع کل اقلام:</span>
            <span style="font-weight: bold; color: #334155;">${formatCurrency(invoice.items.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0))}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #b91c1c;">
            <span style="font-weight: bold;">تخفیف فاکتور:</span>
            <span style="font-weight: bold;">${formatCurrency(invoice.discountTotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; border-top: 2px solid #cbd5e1; padding-top: 10px; color: #1e3a8a;">
            <span>مبلغ قابل پرداخت:</span>
            <span>${formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #166534; font-weight: bold;">
            <span>پرداخت نقدی / بیعانه:</span>
            <span>${formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; border-top: 1px dashed #cbd5e1; padding-top: 10px; color: #b91c1c;">
            <span>مانده بدهکاری:</span>
            <span>${formatCurrency(invoice.remainingAmount)}</span>
          </div>
        </div>
      </div>

      <!-- Signatures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; font-size: 13px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 25px;">
        <div>
          <p style="color: #475569; font-weight: bold; margin-bottom: 40px; margin-top: 0;">مهر و امضاء مدیریت فروشگاه</p>
          <div style="font-weight: 900; color: #1e3a8a; font-size: 14px;">پلاستیک‌بان (پویان)</div>
        </div>
        <div>
          <p style="color: #475569; font-weight: bold; margin-bottom: 40px; margin-top: 0;">مهر و امضاء خریدار محترم</p>
          <div style="font-weight: bold; color: #475569; font-size: 14px;">${invoice.customerName || 'مشتری گذری'}</div>
        </div>
      </div>

      <!-- Footer Message -->
      <div style="text-align: center; margin-top: 50px; font-size: 11px; font-weight: bold; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
        صاحب امضاء فاکتور فوق مسئول قانونی تحویل صحت کالا می‌باشد. از خرید شما صمیمانه سپاسگزاریم.
      </div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      letterRendering: true,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };
  
  // Choose html2pdf to build and download the PDF
  html2pdf()
    .from(container)
    .set(opt)
    .save()
    .then(() => {
      document.body.removeChild(container);
    })
    .catch((err: any) => {
      console.error('PDF Generation Error:', err);
      // Fallback to simple title change and printing
      document.body.removeChild(container);
      const originalTitle = document.title;
      document.title = filename;
      window.print();
      document.title = originalTitle;
    });
};

/**
 * Beautiful POS/Direct Printing receipt generator (suitable for standard or thermal receipts)
 */
export const printInvoice = (invoice: Invoice) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  const dateStr = formatJalali(invoice.date);
  const dueDateStr = invoice.dueDate ? formatJalali(invoice.dueDate) : '---';

  const itemsRows = invoice.items.map((item, idx) => `
    <tr style="border-bottom: 1px dashed #000; font-size: 11px;">
      <td style="padding: 6px 2px; text-align: right; color: #000;">${item.productName}</td>
      <td style="padding: 6px 2px; text-align: center; color: #000;">${item.qty.toLocaleString('fa-IR')}</td>
      <td style="padding: 6px 2px; text-align: left; color: #000; font-family: monospace;">${formatCurrency(item.unitPrice).replace(' تومان', '')}</td>
      <td style="padding: 6px 2px; text-align: left; font-weight: bold; color: #000; font-family: monospace;">${formatCurrency(item.qty * item.unitPrice).replace(' تومان', '')}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="utf-8">
      <title>فاکتور_${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: auto;
          margin: 0;
        }
        body {
          font-family: 'Tahoma', 'Vazirmatn', sans-serif;
          margin: 0;
          padding: 10px;
          color: #000;
          background: #fff;
          font-size: 11px;
          line-height: 1.4;
          direction: rtl;
          text-align: right;
        }
        .receipt {
          width: 72mm;
          max-width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .border-bottom-double { border-bottom: 3px double #000; }
        .border-bottom-dashed { border-bottom: 1px dashed #000; }
        .py-2 { padding-top: 8px; padding-bottom: 8px; }
        .my-2 { margin-top: 8px; margin-bottom: 8px; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
        }
        th {
          border-bottom: 1px solid #000;
          font-size: 10px;
          font-weight: bold;
          padding: 4px 2px;
        }
        .totals-table td {
          padding: 3px 2px;
        }
      </style>
    </head>
    <body onload="window.print();">
      <div class="receipt">
        <div class="text-center border-bottom-double py-2">
          <h2 style="margin: 0 0 5px 0; font-size: 14px;">💎 فروشگاه پلاستیک‌بان</h2>
          <p style="margin: 0; font-size: 10px; font-weight: bold;">سیستم حسابداری فروشگاهی ملزومات پلاستیک</p>
          <p style="margin: 3px 0 0 0; font-size: 9px; font-weight: bold;">تلفن: ۰۹۱۲۳۴۵۶۷۸۹ | مدیریت: پویان</p>
        </div>

        <div class="border-bottom-dashed py-2" style="font-size: 10px; line-height: 1.6;">
          <div><strong>فاکتور شماره:</strong> <span style="font-family: monospace; font-weight: bold;">${invoice.invoiceNumber}</span></div>
          <div><strong>تاریخ صدور:</strong> ${dateStr}</div>
          <div><strong>نام خریدار:</strong> ${invoice.customerName || 'مشتری گذری'}</div>
          <div><strong>نوع فاکتور:</strong> ${invoice.type === 'RETAIL' ? 'خرده‌فروشی' : 'عمده‌فروشی'}</div>
          ${invoice.dueDate ? `<div><strong>موعد تسویه:</strong> ${dueDateStr}</div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: right; color: #000;">کالا / خدمات</th>
              <th style="width: 25px; text-align: center; color: #000;">تعداد</th>
              <th style="width: 50px; text-align: left; color: #000;">فی (تومان)</th>
              <th style="width: 55px; text-align: left; color: #000;">جمع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="border-bottom-dashed py-2">
          <table class="totals-table" style="margin: 0; font-size: 10.5px; width: 100%;">
            <tr>
              <td style="color: #000;">جمع کل اقلام:</td>
              <td class="text-left font-mono" style="color: #000;">${formatCurrency(invoice.items.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0)).replace(' تومان', '')}</td>
            </tr>
            ${invoice.discountTotal > 0 ? `
            <tr>
              <td style="color: #000;">تخفیف فاکتور:</td>
              <td class="text-left font-mono" style="color: #000;">-${formatCurrency(invoice.discountTotal).replace(' تومان', '')}</td>
            </tr>
            ` : ''}
            <tr style="font-size: 12px; font-weight: bold; color: #000;">
              <td>مبلغ قابل پرداخت:</td>
              <td class="text-left font-mono">${formatCurrency(invoice.totalAmount).replace(' تومان', '')}</td>
            </tr>
            <tr>
              <td style="color: #000;">پرداخت نقدی / بیعانه:</td>
              <td class="text-left font-mono" style="color: #000;">${formatCurrency(invoice.paidAmount).replace(' تومان', '')}</td>
            </tr>
            <tr style="font-weight: bold; color: #000; border-top: 1px dashed #000;">
              <td style="padding-top: 5px;">مانده بدهکاری:</td>
              <td class="text-left font-mono" style="padding-top: 5px;">${formatCurrency(invoice.remainingAmount).replace(' تومان', '')} ${invoice.remainingAmount > 0 ? 'بدهکار' : 'تسویه'}</td>
            </tr>
          </table>
        </div>

        <div class="text-center py-2" style="font-size: 9px; margin-top: 5px;">
          <p style="margin: 0; font-weight: bold;">از خرید شما صمیمانه سپاسگزاریم.</p>
          <p style="margin: 3px 0 0 0; font-size: 7.5px; color: #555;">طراحی شده توسط سیستم مدیریت فروشگاه پلاستیک‌بان</p>
        </div>
      </div>
    </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
};

/**
 * Beautiful multi-sheet financial report generator in Excel (XLSX) format
 */
export const exportReportsToExcel = (
  filteredInvoices: Invoice[],
  stats: {
    grossSales: number;
    totalCogs: number;
    totalDiscounts: number;
    netProfit: number;
    categoryProfit: Record<string, { sales: number; profit: number }>;
    topProducts: { name: string; profit: number; sales: number; percent: number }[];
  },
  filename: string
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary Performance
  const summaryData = [
    { "شاخص مالی": "فروش ناخالص (جمع کل فاکتورها + تخفیفات)", "مقدار (تومان)": stats.grossSales },
    { "شاخص مالی": "بهای تمام شده کالاهای به فروش رفته (COGS)", "مقدار (تومان)": stats.totalCogs },
    { "شاخص مالی": "مجموع تخفیفات اعمال شده روی فاکتورها", "مقدار (تومان)": stats.totalDiscounts },
    { "شاخص مالی": "سود خالص نهایی", "مقدار (تومان)": stats.netProfit },
    { "شاخص مالی": "تعداد کل فاکتورهای فیلتر شده", "مقدار (فاکتور)": filteredInvoices.length }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "خلاصه عملکرد");

  // Sheet 2: Invoices List
  const invoicesData = filteredInvoices.map(inv => ({
    "شماره فاکتور": inv.invoiceNumber,
    "نام خریدار": inv.customerName || "مشتری گذری",
    "نوع فروش": inv.type === 'RETAIL' ? "خرده‌فروشی" : "عمده‌فروشی",
    "تاریخ ثبت": formatJalali(inv.date),
    "مبلغ کل اقلام": inv.items.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0),
    "تخفیف فاکتور": inv.discountTotal,
    "مبلغ قابل پرداخت": inv.totalAmount,
    "بیعانه / دریافتی": inv.paidAmount,
    "مانده بدهی": inv.remainingAmount
  }));
  const wsInvoices = XLSX.utils.json_to_sheet(invoicesData);
  XLSX.utils.book_append_sheet(wb, wsInvoices, "لیست فاکتورها");

  // Sheet 3: Category Profitability
  const categoriesData = Object.entries(stats.categoryProfit).map(([cat, val]) => ({
    "نام دسته‌بندی": cat,
    "جمع کل فروش ریاضی کالاها": val.sales,
    "سود ناخالص دسته‌بندی": val.profit
  }));
  const wsCategories = XLSX.utils.json_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, wsCategories, "سوددهی دسته‌بندی‌ها");

  // Sheet 4: Top Profit Products
  const productsData = stats.topProducts.map(p => ({
    "نام محصول کالا": p.name,
    "جمع فروش محصول": p.sales,
    "مبلغ کل سود خالص حاصله": p.profit,
    "درصد سود به فروش": `${p.percent.toFixed(1)}%`
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, wsProducts, "محصولات برتر سودآور");

  // Force Right-To-Left layout for all sheets in Excel (Farsi format)
  const sheets = [wsSummary, wsInvoices, wsCategories, wsProducts];
  sheets.forEach(sheet => {
    if (!sheet['!views']) {
      sheet['!views'] = [];
    }
    sheet['!views'].push({ RTL: true });
  });

  // Write and download Workbook
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
