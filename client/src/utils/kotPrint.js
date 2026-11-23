export const printKOT = (order, settings = {}) => {
    if (!order) return;
    const allItems = order.items || [];
    const nonCancelled = allItems.filter(i => i.status?.toUpperCase() !== 'CANCELLED');
    if (nonCancelled.length === 0) return;
    const pending = nonCancelled.filter(i => i.status?.toUpperCase() !== 'READY');
    const itemsToPrint = pending.length > 0 ? pending : nonCancelled;

    const orderNum = `${order.orderType === 'dine-in' ? 'DI' : 'TK'}-${String(order.orderNumber).replace('ORD-', '')}`;
    const tableName = order.tableId?.name || (order.tableId?.number ? `Table ${order.tableId.number}` : (order.tableId ? `Table ${order.tableId}` : '—'));
    const dateStr = new Date(order.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
    const restaurantName = (settings?.restaurantName || 'RESTAURANT').toUpperCase();

    const itemsHTML = itemsToPrint.map(item => {
        const variant = item.variant?.name || (typeof item.variant === 'string' ? item.variant : '');
        return `
            <tr>
                <td style="padding:4px 0;font-size:11px;vertical-align:top;">
                    ${item.name}
                    ${variant ? `<br/><span style="font-size:9px;opacity:0.8;">[${variant}]</span>` : ''}
                </td>
                <td style="padding:4px 0;font-size:11px;text-align:center;vertical-align:top;">${item.quantity}</td>
            </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>KOT — ${orderNum}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Courier Prime','Courier New',Courier,monospace; font-size:12px; width:72mm; margin:0 auto; padding:10px 5px; color:#000; background:#fff; }
        .receipt-container { background:white; padding:10px 5px; }
        .center { text-align:center; }
        .bold { font-weight:bold; }
        .dash { border-top:1px dashed #000; margin:8px 0; }
        .solid { border-top:1px solid #000; margin:8px 0; }
        .row { display:flex; justify-content:space-between; margin:4px 0; font-size:11px; }
        table { width:100%; border-collapse:collapse; margin:6px 0; }
        th { font-size:10px; text-align:left; padding:4px 0; border-bottom:1px dashed #000; font-weight:bold; }
        @page { margin:0; size:80mm auto; }
        @media print {
            body { width:72mm; padding:0; background:white; }
            .receipt-container { box-shadow:none !important; padding:10px 5px !important; }
        }
    </style></head><body>
    <div class="receipt-container">
        <div class="center bold" style="font-size:18px;letter-spacing:1px;text-transform:uppercase;">${restaurantName}</div>
        <div class="solid"></div>
        <div class="row"><span>KOT</span><span class="bold">${orderNum}</span></div>
        <div class="row"><span>TOKEN</span><span class="bold">#${order.tokenNumber || '—'}</span></div>
        <div class="row"><span>TIME</span><span>${dateStr}</span></div>
        <div class="row"><span>TYPE</span><span class="bold">${order.orderType?.toUpperCase()}</span></div>
        ${order.orderType === 'dine-in' ? `<div class="row"><span>TABLE</span><span class="bold">${tableName}</span></div>` : ''}
        <div class="dash"></div>
        <table>
            <thead>
                <tr>
                    <th style="width:75%;text-align:left;">ITEM</th>
                    <th style="width:25%;text-align:center;">QTY</th>
                </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
        </table>
        <div class="dash"></div>
        <div class="center" style="font-size:11px;margin:10px 0 2px;font-weight:bold;">THANK YOU FOR YOUR VISIT!</div>
        <div class="center" style="font-size:10px;color:#555;">Please visit us again soon &#9829;</div>
    </div>
    </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:80mm;height:1px;opacity:0;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        iframe.contentWindow.onafterprint = () => { if (document.body.contains(iframe)) document.body.removeChild(iframe); };
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 30000);
    }, 300);
};
