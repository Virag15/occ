<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function store(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'paid_on' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'mode' => ['required', Rule::in(Payment::MODES)],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($order, $data) {
            $payment = Payment::create($data + [
                'order_id' => $order->id,
                'created_by' => Auth::id(),
            ]);

            $this->recompute($order);

            AuditLog::record('payment_recorded', $order, [
                'amount' => ['from' => null, 'to' => '₹ '.number_format((float) $data['amount'], 2)],
                'mode' => ['from' => null, 'to' => $data['mode']],
                'reference' => ['from' => null, 'to' => $data['reference'] ?? '—'],
            ]);

            return $payment;
        });

        return back();
    }

    public function destroy(Payment $payment): RedirectResponse
    {
        $order = $payment->order;
        $snapshot = [
            'amount' => ['from' => '₹ '.number_format((float) $payment->amount, 2), 'to' => null],
            'paid_on' => ['from' => $payment->paid_on?->toDateString(), 'to' => null],
            'mode' => ['from' => $payment->mode, 'to' => null],
        ];

        DB::transaction(function () use ($payment, $order) {
            $payment->delete();
            $this->recompute($order);
        });

        AuditLog::record('payment_deleted', $order, $snapshot);

        return back();
    }

    /**
     * Recompute the parent order's payment fields from the sum of payments.
     *  - amount_received  = SUM(payments.amount)
     *  - payment_received_date = latest payment date
     *  - payment_mode = mode of the latest payment
     *  - payment_status = paid / partial / pending / overdue (derived)
     */
    private function recompute(Order $order): void
    {
        $order->load('payments');
        $total = (float) $order->payments->sum('amount');
        $latest = $order->payments->sortByDesc('paid_on')->first();
        $orderValue = (float) ($order->order_value ?? 0);

        $status = match (true) {
            $total <= 0.001 => $order->payment_due_date && $order->payment_due_date->isPast() ? 'overdue' : 'pending',
            $total >= $orderValue - 0.01 => 'paid',
            default => 'partial',
        };

        $order->forceFill([
            'amount_received' => round($total, 2),
            'payment_received_date' => $latest?->paid_on,
            'payment_mode' => $latest?->mode,
            'payment_status' => $status,
        ])->save();
    }
}
