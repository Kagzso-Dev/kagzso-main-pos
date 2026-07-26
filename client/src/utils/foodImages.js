// Curated Unsplash food photo IDs — matched by keyword against item name + category.
// Each entry: { k: [keywords], id: 'unsplash-photo-id' }
// Served via: https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=400&q=80

const ENTRIES = [
    // ── Indian Mains ──────────────────────────────────────────────────────
    { k: ['biryani', 'dum'], id: '1563379091339-03b21ab4a4f8' },
    { k: ['curry', 'gravy', 'masala', 'makhani', 'korma', 'butter chicken', 'tikka masala'], id: '1585937421612-70a008356fbe' },
    { k: ['dal', 'daal', 'lentil', 'tadka'], id: '1585937421612-70a008356fbe' },
    { k: ['paneer', 'cottage cheese', 'shahi'], id: '1631452180519-c014fe946bc7' },
    { k: ['tandoori', 'tikka', 'kebab', 'kabab', 'seekh'], id: '1601050690597-df0568f70950' },
    { k: ['chicken', 'murgh', 'poultry'], id: '1598515214211-89d3c73ae83b' },
    { k: ['mutton', 'lamb', 'keema', 'kheema', 'gosht'], id: '1544025162-d76538253958' },
    { k: ['fish', 'prawn', 'shrimp', 'seafood', 'crab', 'lobster', 'meen'], id: '1559847580-cb0a8c7a0a30' },
    { k: ['egg', 'omelette', 'omelet', 'anda', 'bhurji'], id: '1482012792084-a0c3725f289f' },

    // ── Indian Breads ─────────────────────────────────────────────────────
    { k: ['naan', 'roti', 'paratha', 'chapati', 'kulcha', 'puri', 'bread'], id: '1574071318508-1cdbab80d002' },

    // ── Rice Dishes ───────────────────────────────────────────────────────
    { k: ['rice', 'pulao', 'pilaf', 'khichdi', 'fried rice'], id: '1512058564366-18510be2db19' },

    // ── South Indian ─────────────────────────────────────────────────────
    { k: ['dosa', 'idli', 'vada', 'uttapam', 'sambar', 'rasam', 'appam', 'upma', 'pongal'], id: '1610769919911-bc11a78baca6' },

    // ── Snacks & Street Food ─────────────────────────────────────────────
    { k: ['samosa', 'pakora', 'bajji', 'bonda', 'bhaji', 'chaat', 'pani puri', 'golgappa', 'bhel', 'vada pav'], id: '1504674900247-0877df9cc836' },
    { k: ['fries', 'chips', 'wedges', 'nachos'], id: '1541014741855-b0a7bd7db7de' },
    { k: ['soup', 'shorba', 'broth', 'rasam'], id: '1547592166-23ac45744acd' },
    { k: ['salad', 'raita', 'kachumber'], id: '1512621776951-a57141f2eefd' },

    // ── International ────────────────────────────────────────────────────
    { k: ['pizza'], id: '1565299624946-b28f40a0ae38' },
    { k: ['burger', 'sandwich', 'sub', 'wrap', 'roll'], id: '1568901346375-23c9450c58cd' },
    { k: ['pasta', 'noodles', 'spaghetti', 'penne', 'maggi', 'hakka', 'chowmein', 'chow mein'], id: '1481931098730-318b6f776db0' },
    { k: ['taco', 'burrito', 'quesadilla', 'nacho', 'mexican'], id: '1565299624946-b28f40a0ae38' },

    // ── Beverages ────────────────────────────────────────────────────────
    { k: ['coffee', 'cappuccino', 'latte', 'espresso', 'mocha', 'americano', 'cold coffee'], id: '1509042239860-f519ba90f446' },
    { k: ['tea', 'chai', 'masala chai', 'green tea'], id: '1576092768241-dec231879fc3' },
    { k: ['juice', 'lassi', 'milkshake', 'shake', 'smoothie', 'frappe'], id: '1546541612-35e8c38ef13a' },
    { k: ['water', 'soda', 'cola', 'cold drink', 'soft drink', 'mocktail', 'cocktail', 'beer', 'wine'], id: '1548839140-29a749e1cf4d' },

    // ── Desserts & Sweets ────────────────────────────────────────────────
    { k: ['ice cream', 'kulfi', 'gelato', 'sorbet', 'sundae'], id: '1488900099109-12b028089570' },
    { k: ['cake', 'pastry', 'brownie', 'cookie', 'muffin', 'cupcake', 'cheesecake'], id: '1578985545062-cb2b47849da3' },
    { k: ['gulab jamun', 'jalebi', 'halwa', 'kheer', 'rasmalai', 'ladoo', 'barfi', 'mithai', 'sweet', 'dessert', 'pudding', 'payasam'], id: '1551024709-8f23befc6f87' },
    { k: ['chocolate', 'nutella'], id: '1549465735-b88a4e7e5c9a' },
];

// Reliable generic food photo — used when no keyword matches or specific image fails
export const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80';

const CDN = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&q=80`;

export const getFoodFallbackImage = (name = '', category = '') => {
    const text = `${name} ${category}`.toLowerCase();
    for (const { k, id } of ENTRIES) {
        if (k.some(kw => text.includes(kw))) return CDN(id);
    }
    return FALLBACK_IMAGE_URL;
};
