<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\ReturnCase;
use App\Models\ReturnItem;
use App\Models\SavedView;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReturnController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $status = (string) $request->query('status', '');

        $rows = ReturnCase::query()
            ->with(['customer:id,name,company', 'order:id,order_code'])
            ->when($q !== '', fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('case_code', 'like', "%{$q}%")
                    ->orWhere('case_title', 'like', "%{$q}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$q}%"));
            }))
            ->when($status !== '', fn ($qq) => $qq->where('case_status', $status))
            ->latest('date_reported')
            ->limit(200)
            ->get();

        return Inertia::render('Returns/Index', [
            'rows' => $rows,
            'filters' => ['q' => $q, 'status' => $status],
            'savedViews' => SavedView::query()
                ->where('user_id', Auth::id())
                ->where('database_type', 'return')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function show(ReturnCase $return): Response
    {
        $return->load([
            'customer:id,name,company,phone,city',
            'order:id,order_code,order_date,order_value',
            'items.orderItem.product:id,sku',
            'creator:id,name',
            'inspector:id,name',
            'resolver:id,name',
        ]);

        return Inertia::render('Returns/Show', [
            'returnCase' => $return,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'related_order_id' => ['required', 'exists:orders,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'date_reported' => ['required', 'date'],
            'severity' => ['nullable', Rule::in(['low', 'medium', 'high', 'critical'])],
            'reported_via' => ['nullable', Rule::in(['whatsapp', 'phone', 'email', 'in_person'])],
            'case_title' => ['nullable', 'string', 'max:255'],
            'reason_detail' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer', 'exists:order_items,id'],
            'items.*.qty_returned' => ['required', 'numeric', 'min:0.001'],
            'items.*.condition' => ['required', Rule::in(ReturnItem::CONDITIONS)],
            'items.*.reason' => ['nullable', 'string'],
        ]);

        // Verify each line item belongs to the related order + qty is within open range
        $valueAtRisk = 0.0;
        foreach ($data['items'] as $row) {
            $oi = OrderItem::with('order:id,order_value')->find($row['order_item_id']);
            if (! $oi || $oi->order_id !== (int) $data['related_order_id']) {
                throw ValidationException::withMessages([
                    'items' => 'One or more line items do not belong to this order.',
                ]);
            }
            $alreadyReturned = (float) $oi->qty_returned;
            $delivered = (float) $oi->qty_delivered;
            $openForReturn = $delivered - $alreadyReturned;
            if ((float) $row['qty_returned'] > $openForReturn + 0.001) {
                throw ValidationException::withMessages([
                    'items' => "Line '{$oi->product_name}': cannot return {$row['qty_returned']}, only {$openForReturn} delivered units are eligible.",
                ]);
            }
            $valueAtRisk += (float) $row['qty_returned'] * (float) ($oi->unit_price ?? 0);
        }

        $return = DB::transaction(function () use ($data, $valueAtRisk) {
            $brand = null;
            $caseType = null;

            $case = ReturnCase::create([
                'case_code' => $this->nextCaseCode(),
                'related_order_id' => $data['related_order_id'],
                'customer_id' => $data['customer_id'],
                'case_title' => $data['case_title'] ?? null,
                'date_reported' => $data['date_reported'],
                'reported_via' => $data['reported_via'] ?? null,
                'severity' => $data['severity'] ?? 'medium',
                'case_status' => 'reported',
                'reason_detail' => $data['reason_detail'] ?? null,
                'value_at_risk' => round($valueAtRisk, 2),
                'created_by' => Auth::id(),
            ]);

            foreach ($data['items'] as $row) {
                ReturnItem::create([
                    'return_id' => $case->id,
                    'order_item_id' => $row['order_item_id'],
                    'qty_returned' => $row['qty_returned'],
                    'condition' => $row['condition'],
                    'reason' => $row['reason'] ?? null,
                ]);

                $oi = OrderItem::lockForUpdate()->find($row['order_item_id']);
                $oi->qty_returned = (float) $oi->qty_returned + (float) $row['qty_returned'];
                $oi->status = $oi->deriveStatus();
                $oi->save();
            }

            return $case;
        });

        return redirect()->route('returns.show', ['return' => $return->id])
            ->with('success', "Return case {$return->case_code} created.");
    }

    public function startInspection(ReturnCase $return): RedirectResponse
    {
        abort_if($return->case_status !== 'reported', 422, "Case is already {$return->case_status}.");

        $return->update([
            'case_status' => 'under_inspection',
            'inspection_started_at' => now(),
            'inspected_by' => Auth::id(),
        ]);

        return back()->with('success', 'Inspection started.');
    }

    public function resolve(Request $request, ReturnCase $return): RedirectResponse
    {
        abort_if(! in_array($return->case_status, ['reported', 'under_inspection'], true), 422, "Case is already {$return->case_status}.");

        $data = $request->validate([
            'resolution_type' => ['required', Rule::in(ReturnCase::RESOLUTION_TYPES)],
            'resolution_date' => ['nullable', 'date'],
            'credit_note_number' => ['nullable', 'string', 'max:50'],
            'replacement_lr_number' => ['nullable', 'string', 'max:50'],
            'internal_notes' => ['nullable', 'string'],
        ]);

        $return->update([
            'case_status' => 'resolved',
            'resolution_type' => $data['resolution_type'],
            'resolution_date' => $data['resolution_date'] ?? now()->toDateString(),
            'resolved_by' => Auth::id(),
            'credit_note_number' => $data['credit_note_number'] ?? null,
            'replacement_lr_number' => $data['replacement_lr_number'] ?? null,
            'internal_notes' => $data['internal_notes'] ?? $return->internal_notes,
        ]);

        return back()->with('success', "Case resolved as {$data['resolution_type']}.");
    }

    public function reject(Request $request, ReturnCase $return): RedirectResponse
    {
        abort_if(! in_array($return->case_status, ['reported', 'under_inspection'], true), 422, "Case is already {$return->case_status}.");

        $data = $request->validate([
            'internal_notes' => ['nullable', 'string'],
        ]);

        // Roll back qty_returned on the linked OrderItems
        DB::transaction(function () use ($return, $data) {
            $return->load('items');
            foreach ($return->items as $ri) {
                $oi = OrderItem::lockForUpdate()->find($ri->order_item_id);
                if (! $oi) {
                    continue;
                }
                $oi->qty_returned = max(0, (float) $oi->qty_returned - (float) $ri->qty_returned);
                $oi->status = $oi->deriveStatus();
                $oi->save();
            }

            $return->update([
                'case_status' => 'rejected',
                'resolved_by' => Auth::id(),
                'resolution_date' => now()->toDateString(),
                'internal_notes' => $data['internal_notes'] ?? $return->internal_notes,
            ]);
        });

        return back()->with('success', 'Case rejected; quantities released back to delivered.');
    }

    private function nextCaseCode(): string
    {
        // Serialize across concurrent return-case creates so two requests can't claim
        // the same RET-YYYY-NNNN. See OrderController::nextOrderCode for the same pattern.
        return Cache::lock('return-code:next', 10)->block(5, function () {
            $year = now()->year;
            $prefix = "RET-{$year}-";
            $last = DB::table('returns')->where('case_code', 'like', "{$prefix}%")->orderByDesc('id')->value('case_code');
            $next = $last ? (int) substr($last, strlen($prefix)) + 1 : 1;

            return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        });
    }
}
