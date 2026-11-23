export const printKOT = (order, settings = {}) => {
    if (!order) return;
    const allItems = order.items || [];
    const nonCancelled = allItems.filter(i => i.status?.toUpperCase() !== 'CANCELLED');
    if (nonCancelled.length === 0) return;
    const pending = nonCancelled.filter(i => i.status?.toUpperCase() !== 'READY');
    const itemsToPrint = pending.length > 0 ? pending : nonCancelled;

    const orderNum = `${order.orderType === 'dine-in' ? 'DI' : 'TK'}-${String(order.orderNumber).replace('ORD-', '')}`;
    const tableInfo = order.orderType === 'dine-in'
        ? `Table ${order.tableId?.number || order.tableId || '?'}  |  DINE-IN`
        : `Token ${order.tokenNumber || '?'}  |  TAKEAWAY`;
    const now = new Date(order.createdAt);
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    const restaurantName = (settings?.restaurantName || 'RESTAURANT').toUpperCase();
    const totalQty = itemsToPrint.reduce((s, i) => s + (i.quantity || 1), 0);

    const W = 32;
    const c = (t) => { const p = Math.max(0, Math.floor((W - t.length) / 2)); return ' '.repeat(p) + t; };
    const LINE = '================================';

    const itemLines = itemsToPrint.map(i => {
        const variant = i.variant?.name ? ` (${i.variant.name})` : '';
        return ` ${String(i.quantity) + 'x'}  ${i.name}${variant}`;
    }).join('\n');

    const isPendingOnly = pending.length > 0 && pending.length < nonCancelled.length;
    const footer = isPendingOnly ? '*** PENDING ITEMS ONLY ***' : '*** KITCHEN COPY - NO AMOUNT ***';

    const kotText = [LINE, c(restaurantName), c('-- KITCHEN ORDER TICKET --'), LINE,
        c(orderNum), c(tableInfo), c(`${dateStr}  |  ${timeStr}`),
        c(`[ ${totalQty} ITEM${totalQty !== 1 ? 'S' : ''} ]`),
        LINE, itemLines, LINE, c(footer), LINE].join('\n');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page{margin:0;size:80mm auto;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:bold;color:#000;width:80mm;padding:4mm;white-space:pre;line-height:1.5;}
    </style></head><body>${kotText}</body></html>`;

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
