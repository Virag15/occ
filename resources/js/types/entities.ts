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
    min_order_level: string | null;
    reorder_level: string | null;
    negative_stock_reason: string | null;
    is_active: boolean;
    stock_items?: StockItem[];
    total_stock?: number | string | null;
};

export type CustomerLite = { id: number; name: string; company?: string | null };
export type TransporterLite = { id: number; name: string };
export type ProductLite = {
    id: number;
    name: string;
    sku?: string | null;
    brand?: string | null;
    unit?: string | null;
    default_sale_price?: string | null;
    gst_rate?: string | null;
};

export type OrderItem = {
    id?: number;
    product_id: number | null;
    product_name: string;
    qty_ordered: number | string;
    qty_packed?: number | string;
    qty_dispatched?: number | string;
    qty_delivered?: number | string;
    qty_cancelled?: number | string;
    qty_returned?: number | string;
    unit?: string | null;
    unit_price?: number | string | null;
    tax_rate?: number | string | null;
    line_total?: number | string | null;
    status?: string;
    notes?: string | null;
    product?: { id: number; name: string; sku?: string | null };
};

export type Order = {
    id: number;
    order_code: string;
    customer_id: number;
    customer?: CustomerLite;
    order_date: string;
    order_source: string | null;
    brands: string[] | null;
    order_value: string | null;
    status: string;
    priority: string;

    packing_slip_generated: boolean;
    packed_by: string | null;
    items_packed_count: number | null;
    parcel_weight_kg: string | null;
    number_of_boxes: number | null;

    pickup_scheduled_date: string | null;
    transporter_id: number | null;
    transporter?: TransporterLite | null;
    driver_name: string | null;
    driver_contact: string | null;
    vehicle_number: string | null;
    dispatch_date: string | null;
    lr_number: string | null;
    lr_shared_with_customer: boolean;
    expected_delivery: string | null;

    delivered_date: string | null;
    pod_received: boolean;
    triplicate_received: boolean;
    triplicate_received_date: string | null;

    invoice_number: string | null;
    invoice_date: string | null;
    payment_terms: string | null;
    payment_due_date: string | null;
    payment_status: string;
    amount_received: string | null;
    payment_received_date: string | null;
    payment_mode: string | null;

    internal_notes: string | null;
    items?: OrderItem[];
    created_at: string;
    updated_at: string;
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
