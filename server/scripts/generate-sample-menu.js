require('dotenv').config();
const ExcelJS = require('exceljs');
const path = require('path');

const OUTPUT_PATH = path.join('C:\\Users\\Admin\\OneDrive\\Desktop\\final', 'sample-menu-upload.xlsx');

const sampleData = [
    // Beverages
    { name: 'Masala Chai',       category: 'Beverages',   price: 30,  description: 'Spiced Indian tea',        availability: 'yes', is_veg: 'yes' },
    { name: 'Filter Coffee',     category: 'Beverages',   price: 40,  description: 'South Indian filter coffee', availability: 'yes', is_veg: 'yes' },
    { name: 'Fresh Lime Soda',   category: 'Beverages',   price: 50,  description: 'Refreshing lime soda',     availability: 'yes', is_veg: 'yes' },
    { name: 'Mango Lassi',       category: 'Beverages',   price: 80,  description: 'Sweet mango yogurt drink', availability: 'yes', is_veg: 'yes' },
    { name: 'Cold Coffee',       category: 'Beverages',   price: 90,  description: 'Chilled blended coffee',   availability: 'yes', is_veg: 'yes' },

    // Starters
    { name: 'Paneer Tikka',      category: 'Starters',    price: 180, description: 'Grilled cottage cheese',   availability: 'yes', is_veg: 'yes' },
    { name: 'Chicken 65',        category: 'Starters',    price: 220, description: 'Spicy fried chicken',      availability: 'yes', is_veg: 'no'  },
    { name: 'Veg Spring Rolls',  category: 'Starters',    price: 130, description: 'Crispy vegetable rolls',   availability: 'yes', is_veg: 'yes' },
    { name: 'Fish Fingers',      category: 'Starters',    price: 250, description: 'Battered fish fillets',    availability: 'yes', is_veg: 'no'  },
    { name: 'Onion Rings',       category: 'Starters',    price: 110, description: 'Crispy onion rings',       availability: 'yes', is_veg: 'yes' },

    // Main Course
    { name: 'Butter Chicken',    category: 'Main Course', price: 320, description: 'Creamy tomato chicken curry', availability: 'yes', is_veg: 'no'  },
    { name: 'Dal Makhani',       category: 'Main Course', price: 200, description: 'Slow cooked black lentils',   availability: 'yes', is_veg: 'yes' },
    { name: 'Palak Paneer',      category: 'Main Course', price: 220, description: 'Spinach and cottage cheese',  availability: 'yes', is_veg: 'yes' },
    { name: 'Mutton Rogan Josh', category: 'Main Course', price: 380, description: 'Kashmiri mutton curry',       availability: 'yes', is_veg: 'no'  },
    { name: 'Veg Biryani',       category: 'Main Course', price: 180, description: 'Fragrant vegetable rice',     availability: 'yes', is_veg: 'yes' },
    { name: 'Chicken Biryani',   category: 'Main Course', price: 260, description: 'Aromatic chicken rice',       availability: 'yes', is_veg: 'no'  },

    // Breads
    { name: 'Butter Naan',       category: 'Breads',      price: 40,  description: 'Soft leavened bread',      availability: 'yes', is_veg: 'yes' },
    { name: 'Garlic Naan',       category: 'Breads',      price: 50,  description: 'Naan with garlic butter',  availability: 'yes', is_veg: 'yes' },
    { name: 'Tandoori Roti',     category: 'Breads',      price: 30,  description: 'Whole wheat roti',         availability: 'yes', is_veg: 'yes' },
    { name: 'Paratha',           category: 'Breads',      price: 60,  description: 'Layered wheat flatbread',  availability: 'yes', is_veg: 'yes' },

    // Desserts
    { name: 'Gulab Jamun',       category: 'Desserts',    price: 80,  description: 'Soft milk dumplings',      availability: 'yes', is_veg: 'yes' },
    { name: 'Rasmalai',          category: 'Desserts',    price: 100, description: 'Cottage cheese in sweet milk', availability: 'yes', is_veg: 'yes' },
    { name: 'Ice Cream',         category: 'Desserts',    price: 90,  description: '2 scoops, choice of flavor',  availability: 'yes', is_veg: 'yes' },
    { name: 'Kheer',             category: 'Desserts',    price: 70,  description: 'Rice pudding with saffron',   availability: 'yes', is_veg: 'yes' },
];

(async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Kagzso POS';
    wb.created = new Date();

    const ws = wb.addWorksheet('Menu Items');

    // Column definitions
    ws.columns = [
        { key: 'name',         header: 'name',         width: 26 },
        { key: 'category',     header: 'category',     width: 18 },
        { key: 'price',        header: 'price',        width: 10 },
        { key: 'description',  header: 'description',  width: 36 },
        { key: 'availability', header: 'availability', width: 14 },
        { key: 'is_veg',       header: 'is_veg',       width: 10 },
    ];

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = {
            bottom: { style: 'medium', color: { argb: 'FF6366F1' } },
        };
    });
    headerRow.height = 22;

    // Category row colors
    const catColors = {
        'Beverages':   'FFE0F2FE',
        'Starters':    'FFFEF9C3',
        'Main Course': 'FFFCE7F3',
        'Breads':      'FFF0FDF4',
        'Desserts':    'FFEDE9FE',
    };

    // Add data rows
    sampleData.forEach((item, i) => {
        const row = ws.addRow(item);
        const bg = catColors[item.category] || 'FFFFFFFF';
        row.eachCell((cell) => {
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.alignment = { vertical: 'middle' };
            cell.border    = {
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
        });
        // Price — right aligned, number format
        row.getCell('price').numFmt  = '₹#,##0';
        row.getCell('price').alignment = { horizontal: 'right', vertical: 'middle' };
        row.height = 18;
    });

    // Freeze header row
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto-filter on header
    ws.autoFilter = { from: 'A1', to: 'F1' };

    // ── Instructions sheet ────────────────────────────────────────────────────
    const info = wb.addWorksheet('Instructions');
    info.columns = [{ key: 'col', width: 70 }];

    const instructions = [
        ['KAGZSO POS — Bulk Menu Upload Instructions'],
        [''],
        ['HOW TO USE THIS FILE:'],
        ['1. Edit the "Menu Items" sheet — add, remove, or change rows.'],
        ['2. Keep the header row exactly as-is (row 1).'],
        ['3. In SuperAdmin → Restaurant → Upload Menu (Excel), upload this file.'],
        [''],
        ['COLUMN GUIDE:'],
        ['name         (required)  — Item name. e.g. "Butter Chicken"'],
        ['category     (required)  — Category name. Auto-created if it does not exist.'],
        ['price        (required)  — Price in rupees. Must be a number > 0.'],
        ['description  (optional)  — Short description shown on menu.'],
        ['availability (optional)  — "yes" = available, "no" = hidden. Default: yes.'],
        ['is_veg       (optional)  — "yes" = veg, "no" = non-veg. Default: no.'],
        [''],
        ['VALID VALUES FOR availability:  yes / no / true / false / 1 / 0 / active / inactive'],
        ['VALID VALUES FOR is_veg:        yes / no / true / false / 1 / 0 / veg'],
        [''],
        ['NOTES:'],
        ['- Rows with empty name, category, or price ≤ 0 are skipped.'],
        ['- New categories are auto-created with a random color.'],
        ['- Duplicate item names in the same category will be skipped.'],
        ['- Max file size: 10 MB.'],
    ];

    instructions.forEach(([text], i) => {
        const row = info.addRow([text]);
        if (i === 0) {
            row.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF6366F1' } };
            row.height = 24;
        } else if (text.startsWith('HOW TO') || text.startsWith('COLUMN') || text.startsWith('VALID') || text.startsWith('NOTES')) {
            row.getCell(1).font = { bold: true, size: 11 };
        } else {
            row.getCell(1).font = { size: 10, color: { argb: 'FF475569' } };
        }
    });

    await wb.xlsx.writeFile(OUTPUT_PATH);
    console.log(`\n✅ Sample Excel created at:\n   ${OUTPUT_PATH}\n`);
    console.log(`   ${sampleData.length} sample menu items across 5 categories.`);
    console.log('   Upload it via: SuperAdmin → Restaurant → Upload Menu (Excel)\n');
})();
