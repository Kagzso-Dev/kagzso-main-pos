const KOT_WIDTH_MM = 80;

const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export const printKOTSlip = (order, settings = {}, filterNew = false) => {
    if (!order) return;

    const restaurantName = (settings?.restaurantName || 'RESTAURANT').toUpperCase();

    const orderNum = order.orderType === 'dine-in' ? 'DI' : 'TK';
    const ordNum = String(order.orderNumber).startsWith('ORD-') ? String(order.orderNumber).replace('ORD-', '') : order.orderNumber;
    const displayOrderNumber = `${orderNum}-${ordNum}`;
    const tokenNumber = order.tokenNumber ? `#${order.tokenNumber}` : '—';

    const date = new Date(order.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    let activeItems = (order.items || []).filter(
        (item) => item.status?.toUpperCase() !== 'CANCELLED'
    );

    if (filterNew) {
        activeItems = activeItems.filter(item => item.isNewlyAdded);
    }

    if (activeItems.length === 0) {
        console.warn('No items to print on KOT');
        return;
    }

    const orderTypeStr = order.orderType === 'dine-in' ? 'DINE-IN' : 'TAKEAWAY';
    const tableName = order.tableId?.name || (order.tableId?.number ? `Table ${order.tableId.number}` : (order.tableId ? `Table ${order.tableId}` : '—'));
    const orderNotes = order.notes || order.orderNotes || order.note || '';

    const itemsHtml = activeItems.map(item => {
        const name = escapeHtml(item.name || 'Item');
        const variant = item.variant?.name || (typeof item.variant === 'string' ? item.variant : '');
        const notes = item.notes || '';
        return `
            <tr>
                <td style="padding:5px 0;font-size:12px;vertical-align:top;overflow-wrap:anywhere;word-break:break-word;">
                    <span style="font-weight:bold;">${name}</span>${item.isNewlyAdded ? ' <strong style="font-size:9px;">(NEW)</strong>' : ''}
                    ${variant ? `<br/><span style="font-size:10px;opacity:0.85;">(${escapeHtml(variant)})</span>` : ''}
                    ${notes ? `<br/><span style="font-size:10px;color:#555;font-style:italic;">Note: ${escapeHtml(notes)}</span>` : ''}
                </td>
                <td style="padding:5px 0;font-size:13px;text-align:center;vertical-align:top;font-weight:bold;">${item.quantity}</td>
            </tr>`;
    }).join('');

    const orderNotesHtml = orderNotes ? `
        <div class="dash"></div>
        <div style="font-size:11px;padding:4px 0;overflow-wrap:anywhere;word-break:break-word;">
            <strong>Order Note:</strong> ${escapeHtml(orderNotes)}
        </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>KOT - ${escapeHtml(displayOrderNumber)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 12px;
    width: 72mm;
    margin: 0 auto;
    padding: 10px 5px;
    color: #000;
    background: #f4f4f5;
    overflow-y: auto;
  }
  
  /* Preview Header Styling */
  .preview-header {
    background: white;
    padding: 15px;
    border-radius: 12px;
    margin-bottom: 20px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    text-align: center;
    font-family: 'Inter', sans-serif;
    position: sticky;
    top: 5px;
    z-index: 100;
    border: 1px solid #e4e4e7;
  }
  .preview-title {
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #71717a;
    margin-bottom: 10px;
  }
  .preview-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 11px;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    text-transform: uppercase;
  }
  .btn-print {
    background: #f97316;
    color: white;
  }
  .btn-print:hover { background: #ea580c; }
  .btn-close {
    background: #e4e4e7;
    color: #3f3f46;
  }
  .btn-close:hover { background: #d4d4d8; }

  /* Receipt Styling */
  .receipt-container {
    background: white;
    padding: 20px 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    min-height: 100vh;
  }

  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .dash   { border-top: 1px dashed #000; margin: 8px 0; }
  .solid  { border-top: 1px solid  #000; margin: 8px 0; }
  .row    { display:flex; justify-content:space-between; margin:4px 0; font-size:12px; }
  table   { width:100%; border-collapse:collapse; margin:6px 0; }
  th      { font-size:11px; text-align:left; padding:4px 0; border-bottom:1px dashed #000; font-weight:bold; }
  
  @page { margin: 0; size: ${KOT_WIDTH_MM}mm auto; }
  @media print { 
    @page { size: ${KOT_WIDTH_MM}mm auto; margin: 0; }
    html, body { width: ${KOT_WIDTH_MM}mm; margin: 0; padding: 0; background: white; }
    .preview-header { display: none !important; }
    .receipt-container {
      width: ${KOT_WIDTH_MM - 8}mm;
      margin: 0 auto;
      padding: 8px 4px !important;
      box-shadow: none !important;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      word-break: break-word;
      page-break-inside: avoid;
      height: auto !important;
      min-height: auto !important;
    }
    .row { font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    td { font-size: 12px !important; overflow-wrap: anywhere; word-break: break-word; }
    th { font-size: 11px !important; }
  }
</style>
</head>
<body>

<div class="preview-header">
    <div class="preview-title">KOT Preview</div>
    <div class="preview-actions">
        <button class="btn btn-print" onclick="window.print()">Print KOT</button>
        <button class="btn btn-close" onclick="window.close()">Close Preview</button>
    </div>
</div>

<div class="receipt-container">
    <div class="center bold" style="font-size:13px;letter-spacing:2px;margin-bottom:2px;">KOT</div>
    <div class="center bold" style="font-size:18px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(restaurantName)} ${filterNew ? '(NEW)' : ''}</div>
    <div class="solid"></div>

    <div class="row" style="align-items:center;"><span>KOT</span><span class="bold" style="font-size:16px;">${escapeHtml(displayOrderNumber)}</span></div>
    <div class="row" style="align-items:center;"><span>TOKEN</span><span class="bold" style="font-size:16px;">${escapeHtml(tokenNumber)}</span></div>
    <div class="row"><span>TIME</span><span>${escapeHtml(date)}</span></div>
    <div class="row"><span>TYPE</span><span class="bold">${escapeHtml(orderTypeStr)}</span></div>
    ${order.orderType === 'dine-in'
        ? `<div class="row"><span>TABLE</span><span class="bold">${escapeHtml(tableName)}</span></div>`
        : ''}

    <div class="dash"></div>

    <table>
      <thead>
        <tr>
          <th style="width:75%;text-align:left;">ITEM</th>
          <th style="width:25%;text-align:center;">QTY</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    ${orderNotesHtml}

    <div class="dash"></div>
    <div class="center" style="font-size:10px;color:#666;margin:6px 0 2px;letter-spacing:1px;">KITCHEN ORDER TICKET</div>
</div>

<script>
  window.onload = function() {
    window.focus();
  };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=450,height=700,scrollbars=yes');
    if (!win) {
        alert('Pop-up blocked! Please allow pop-ups for this site to view the KOT preview.');
        return;
    }
    
    win.document.write(html);
    win.document.close();
};
