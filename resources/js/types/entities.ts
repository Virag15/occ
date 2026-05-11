export type Transporter = {
    id: number;
    transporter_code: string | null;
    name: string;
    contact_person: string | null;
    primary_phone: string | null;
    secondary_phone: string | null;
    whatsapp: string | null;
    email: string | null;
    office_address: string | null;
    city: string | null;
    gstin: string | null;
    areas_served: string[] | null;
    vehicle_types: string[] | null;
    avg_transit_days: number | null;
    cost_per_kg: string | null;
    triplicate_reliability: number | null;
    payment_terms: string | null;
    status: string;
    onboarded_at: string | null;
    notes: string | null;
};

export type Customer = {
    id: number;
    tally_id: string;
    tally_synced_at: string | null;
    customer_code: string | null;
    name: string;
    company: string | null;
    gstin: string | null;
    contact_person: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    billing_address: string | null;
    delivery_address: string | null;
    city: string | null;
    state: string | null;
    payment_terms: string | null;
    credit_limit: string | null;
    brand_preferences: string[] | null;
    customer_type: string | null;
    status: string;
    onboarded_at: string | null;
    notes: string | null;
};

export type StockItem = {
    id: number;
    product_id: number;
    godown_name: string;
    qty_opening: string;
    qty_inward: string;
    qty_outward: string;
    qty_closing: string;
    as_of_date: string | null;
    tally_synced_at: string | null;
};

export type Product = {
    id: number;
    tally_id: string;
    tally_synced_at: string | null;
    sku: string | null;
    name: string;
    brand: string | null;
    category: string | null;
    description: string | null;
    hsn_code: string | null;
    unit: string | null;
    gst_rate: string | null;
    mrp: string | null;
    default_sale_price: string | null;
    default_purchase_price: string | null;
    is_active: boolean;
    stock_items?: StockItem[];
};

export type Pagination = {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
};

export type IndexPageProps<TRow, TPeek = TRow> = {
    rows: TRow[];
    pagination: Pagination;
    filters: { q: string };
    peek: TPeek | null;
};
