// AUTO-GENERATED FROM app/Models/* — DO NOT EDIT BY HAND.
// Run: php artisan ts:types
//
// Captures column-level types only ($fillable + $casts). Relations,
// accessors and frontend-only fields stay in the hand-maintained
// entities.ts — import these as a base and extend as needed.

export interface AuditLogRow {
    id: number;
    user_id: string | null;
    entity_type: string | null;
    entity_id: string | null;
    action: string | null;
    changes: unknown[] | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CommunicationRow {
    id: number;
    order_id: string | null;
    channel: string | null;
    template_name: string | null;
    to_recipient: string | null;
    body: string | null;
    status: string | null;
    external_id: string | null;
    sent_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}

// CompanySetting: no $fillable declared, skipping.

export interface CustomerRow {
    id: number;
    tally_id: string | null;
    tally_guid: string | null;
    tally_synced_at: string | null;
    customer_code: string | null;
    name: string | null;
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
    brand_preferences: unknown[] | null;
    customer_type: string | null;
    status: string | null;
    onboarded_at: string | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
}

export interface DailyReportRow {
    id: number;
    report_date: string | null;
    html_content: string | null;
    pdf_url: string | null;
    recipients: string | null;
    sent_at: string | null;
    metrics: unknown[] | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface OrderRow {
    id: number;
    order_code: string | null;
    tracking_uuid: string | null;
    customer_id: string | null;
    order_date: string | null;
    order_source: string | null;
    customer_reference_number: string | null;
    customer_po_number: string | null;
    brands: unknown[] | null;
    order_value: string | null;
    discount_amount: string | null;
    status: string | null;
    priority: string | null;
    lr_shared_with_customer: boolean | null;
    pod_received: boolean | null;
    triplicate_received: boolean | null;
    invoice_number: string | null;
    invoice_date: string | null;
    payment_terms: string | null;
    payment_due_date: string | null;
    payment_status: string | null;
    amount_received: string | null;
    payment_received_date: string | null;
    payment_mode: string | null;
    tally_voucher_id: string | null;
    tally_pushed_at: string | null;
    internal_notes: string | null;
    created_by: string | null;
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
}

export interface OrderItemRow {
    id: number;
    order_id: string | null;
    product_id: string | null;
    product_name: string | null;
    qty_ordered: string | null;
    qty_packed: string | null;
    qty_dispatched: string | null;
    qty_delivered: string | null;
    qty_cancelled: string | null;
    qty_returned: string | null;
    unit: string | null;
    unit_price: string | null;
    discount_pct: string | null;
    tax_rate: string | null;
    line_total: string | null;
    status: string | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface PaymentRow {
    id: number;
    order_id: string | null;
    paid_on: string | null;
    amount: string | null;
    mode: string | null;
    reference: string | null;
    notes: string | null;
    created_by: string | null;
    tally_voucher_id: string | null;
    tally_pushed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface ProductRow {
    id: number;
    tally_id: string | null;
    tally_guid: string | null;
    tally_synced_at: string | null;
    sku: string | null;
    name: string | null;
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
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
}

export interface ReturnCaseRow {
    id: number;
    case_code: string | null;
    related_order_id: string | null;
    customer_id: string | null;
    case_title: string | null;
    date_reported: string | null;
    case_type: string | null;
    brand: string | null;
    item_description: string | null;
    quantity_affected: string | null;
    value_at_risk: string | null;
    reason_detail: string | null;
    evidence_photo_urls: unknown[] | null;
    customer_communication_urls: unknown[] | null;
    reported_via: string | null;
    severity: string | null;
    case_status: string | null;
    inspection_started_at: string | null;
    inspected_by: string | null;
    resolution_type: string | null;
    resolution_date: string | null;
    resolved_by: string | null;
    replacement_lr_number: string | null;
    credit_note_number: string | null;
    responsible_party: string | null;
    internal_notes: string | null;
    created_by: string | null;
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
}

export interface ReturnItemRow {
    id: number;
    return_id: string | null;
    order_item_id: string | null;
    qty_returned: string | null;
    condition: string | null;
    reason: string | null;
    replacement_order_item_id: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface SavedViewRow {
    id: number;
    user_id: string | null;
    database_type: string | null;
    name: string | null;
    view_type: string | null;
    config: unknown[] | null;
    is_default: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface ShipmentRow {
    id: number;
    shipment_code: string | null;
    order_id: string | null;
    transporter_id: string | null;
    packed_by: string | null;
    number_of_boxes: string | null;
    parcel_weight_kg: string | null;
    picking_slip_generated_at: string | null;
    packing_slip_generated_at: string | null;
    pickup_scheduled_date: string | null;
    driver_name: string | null;
    driver_contact: string | null;
    vehicle_number: string | null;
    dispatch_date: string | null;
    lr_number: string | null;
    lr_shared_with_customer: boolean | null;
    lr_shared_at: string | null;
    expected_delivery: string | null;
    delivered_date: string | null;
    pod_received: boolean | null;
    triplicate_received: boolean | null;
    triplicate_received_date: string | null;
    status: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface ShipmentItemRow {
    id: number;
    shipment_id: string | null;
    order_item_id: string | null;
    qty: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface StockItemRow {
    id: number;
    product_id: string | null;
    godown_name: string | null;
    qty_opening: string | null;
    qty_inward: string | null;
    qty_outward: string | null;
    qty_closing: string | null;
    as_of_date: string | null;
    tally_synced_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface TallySyncLogRow {
    id: number;
    entity_type: string | null;
    direction: string | null;
    status: string | null;
    records_processed: string | null;
    records_created: string | null;
    records_updated: string | null;
    records_failed: string | null;
    error_message: string | null;
    sample_payload: unknown[] | null;
    started_at: string | null;
    completed_at: string | null;
    triggered_by: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface TransporterRow {
    id: number;
    transporter_code: string | null;
    name: string | null;
    contact_person: string | null;
    primary_phone: string | null;
    secondary_phone: string | null;
    whatsapp: string | null;
    email: string | null;
    office_address: string | null;
    city: string | null;
    gstin: string | null;
    areas_served: unknown[] | null;
    vehicle_types: unknown[] | null;
    avg_transit_days: string | null;
    cost_per_kg: string | null;
    triplicate_reliability: string | null;
    payment_terms: string | null;
    status: string | null;
    onboarded_at: string | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
}

export interface UserRow {
    id: number;
    name: string | null;
    email: string | null;
    password: unknown | null;
    role: string | null;
    density_preference: string | null;
    created_at: string | null;
    updated_at: string | null;
}

