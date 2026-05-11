<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Shipment;
use App\Models\ShipmentItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ShipmentController extends Controller
{
    public function store(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'transporter_id' => ['nullable', 'exists:transporters,id'],
            'pickup_scheduled_date' => ['nullable', 'date'],
            'lr_number' => ['nullable', 'string', 'max:50'],
            'vehicle_number' => ['nullable', 'string', 'max:20'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_contact' => ['nullable', 'string', 'max:20'],
            'expected_delivery' => ['nullable', 'date'],
            'packed_by' => ['nullable', 'string', 'max:255'],
            'number_of_boxes' => ['nullable', 'integer', 'min:0'],
            'parcel_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer', 'exists:order_items,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
        ]);

        DB::transaction(function () use ($order, $data) {
            // Validate each line: qty ≤ open qty
            foreach ($data['items'] as $row) {
                $oi = OrderItem::where('order_id', $order->id)->findOrFail($row['order_item_id']);
                $open = (float) $oi->qty_ordered - (float) $oi->qty_packed - (float) $oi->qty_cancelled;
                if ((float) $row['qty'] > $open + 0.001) {
                    throw ValidationException::withMessages([
                        'items' => "Line '{$oi->product_name}': requested {$row['qty']}, only {$open} open.",
                    ]);
                }
            }

            $shipment = Shipment::create([
                'shipment_code' => $this->nextShipmentCode(),
                'order_id' => $order->id,
                'transporter_id' => $data['transporter_id'] ?? null,
                'pickup_scheduled_date' => $data['pickup_scheduled_date'] ?? null,
                'lr_number' => $data['lr_number'] ?? null,
                'vehicle_number' => $data['vehicle_number'] ?? null,
                'driver_name' => $data['driver_name'] ?? null,
                'driver_contact' => $data['driver_contact'] ?? null,
                'expected_delivery' => $data['expected_delivery'] ?? null,
                'packed_by' => $data['packed_by'] ?? null,
                'number_of_boxes' => $data['number_of_boxes'] ?? null,
                'parcel_weight_kg' => $data['parcel_weight_kg'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'packed',
                'created_by' => Auth::id(),
            ]);

            foreach ($data['items'] as $row) {
                ShipmentItem::create([
                    'shipment_id' => $shipment->id,
                    'order_item_id' => $row['order_item_id'],
                    'qty' => $row['qty'],
                ]);

                // Increment qty_packed on the order item, re-derive line status
                $oi = OrderItem::lockForUpdate()->find($row['order_item_id']);
                $oi->qty_packed = (float) $oi->qty_packed + (float) $row['qty'];
                $oi->status = $oi->deriveStatus();
                $oi->save();
            }
        });

        return back();
    }

    public function advance(Shipment $shipment, string $target): RedirectResponse
    {
        $allowed = ['dispatched', 'delivered', 'cancelled'];
        abort_unless(in_array($target, $allowed, true), 422);

        DB::transaction(function () use ($shipment, $target) {
            $old = $shipment->status;

            $payload = ['status' => $target];
            if ($target === 'dispatched' && !$shipment->dispatch_date) {
                $payload['dispatch_date'] = now()->toDateString();
            }
            if ($target === 'delivered' && !$shipment->delivered_date) {
                $payload['delivered_date'] = now()->toDateString();
            }
            $shipment->update($payload);

            // Cascade line qty updates per target
            $shipment->load('items');
            foreach ($shipment->items as $si) {
                $oi = OrderItem::lockForUpdate()->find($si->order_item_id);
                if (!$oi) continue;

                if ($target === 'dispatched' && $old !== 'dispatched') {
                    $oi->qty_dispatched = (float) $oi->qty_dispatched + (float) $si->qty;
                }
                if ($target === 'delivered' && $old !== 'delivered') {
                    if ((float) $oi->qty_dispatched < (float) $oi->qty_packed) {
                        // Edge case: skipped dispatched and went straight to delivered
                        $oi->qty_dispatched = (float) $oi->qty_dispatched + (float) $si->qty;
                    }
                    $oi->qty_delivered = (float) $oi->qty_delivered + (float) $si->qty;
                }
                if ($target === 'cancelled') {
                    $oi->qty_packed = max(0, (float) $oi->qty_packed - (float) $si->qty);
                }
                $oi->status = $oi->deriveStatus();
                $oi->save();
            }
        });

        return back();
    }

    public function destroy(Shipment $shipment): RedirectResponse
    {
        DB::transaction(function () use ($shipment) {
            // Refund the line item quantities before deleting
            $shipment->load('items');
            foreach ($shipment->items as $si) {
                $oi = OrderItem::lockForUpdate()->find($si->order_item_id);
                if (!$oi) continue;

                if (in_array($shipment->status, ['delivered'], true)) {
                    $oi->qty_delivered = max(0, (float) $oi->qty_delivered - (float) $si->qty);
                }
                if (in_array($shipment->status, ['delivered', 'dispatched'], true)) {
                    $oi->qty_dispatched = max(0, (float) $oi->qty_dispatched - (float) $si->qty);
                }
                $oi->qty_packed = max(0, (float) $oi->qty_packed - (float) $si->qty);
                $oi->status = $oi->deriveStatus();
                $oi->save();
            }

            $shipment->delete();
        });

        return back();
    }

    public function pickingSlip(Shipment $shipment): Response
    {
        $shipment->load([
            'order.customer',
            'items.orderItem.product:id,sku',
        ]);

        if (!$shipment->picking_slip_generated_at) {
            $shipment->forceFill(['picking_slip_generated_at' => now()])->save();
        }

        return Inertia::render('Shipments/PickingSlip', [
            'shipment' => $shipment,
        ]);
    }

    public function packingSlip(Shipment $shipment): Response
    {
        $shipment->load([
            'order.customer',
            'transporter:id,name',
            'items.orderItem.product:id,sku',
        ]);

        if (!$shipment->packing_slip_generated_at) {
            $shipment->forceFill(['packing_slip_generated_at' => now()])->save();
        }

        return Inertia::render('Shipments/PackingSlip', [
            'shipment' => $shipment,
        ]);
    }

    private function nextShipmentCode(): string
    {
        $year = now()->year;
        $prefix = "SHP-{$year}-";
        $last = DB::table('shipments')->where('shipment_code', 'like', "{$prefix}%")->orderByDesc('id')->value('shipment_code');
        $next = $last ? (int) substr($last, strlen($prefix)) + 1 : 1;
        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
