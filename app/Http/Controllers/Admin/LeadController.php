<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform admin: OCC's own sales pipeline. All routes under /admin/leads
 * are gated by the platform_admin middleware (only Delta System staff,
 * not tenant owners).
 *
 * The page groups leads by status into a kanban-like layout. Status
 * changes happen via an inline PATCH; the controller re-renders the
 * same page so the React side just re-fetches props.
 */
class LeadController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = (string) $request->query('status', '');
        $q = trim((string) $request->query('q', ''));

        $leads = Lead::query()
            ->when($statusFilter !== '', fn ($qq) => $qq->where('status', $statusFilter))
            ->when($q !== '', fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('business_name', 'like', "%{$q}%")
                    ->orWhere('name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            }))
            ->with([
                'assignedTo:id,name,email',
                'convertedTenant:id,name,uuid',
            ])
            ->orderByDesc('created_at')
            ->get();

        // Pre-bucket by status so React can render columns without re-grouping.
        $byStatus = collect(Lead::STATUSES)->mapWithKeys(fn ($s) => [$s => []])->all();
        foreach ($leads as $lead) {
            $byStatus[$lead->status][] = $lead;
        }

        $platformUsers = User::query()
            ->where('is_platform_admin', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('Admin/Leads/Index', [
            'leads_by_status' => $byStatus,
            'counts' => collect($byStatus)->map(fn ($l) => count($l)),
            'platform_users' => $platformUsers,
            'filters' => ['status' => $statusFilter, 'q' => $q],
            'statuses' => Lead::STATUSES,
        ]);
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(Lead::STATUSES)],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'converted_tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
        ]);

        // Defensive: assigned_to must be a platform admin, not just any user.
        if (! empty($data['assigned_to'])) {
            $assignee = User::find($data['assigned_to']);
            if (! $assignee || ! $assignee->is_platform_admin) {
                abort(422, 'Can only assign leads to platform admins.');
            }
        }

        $lead->update(array_filter($data, fn ($v) => $v !== null));

        return back();
    }

    /**
     * Mark a lead as paid + provisioned. Creates a Tenant + an owner User
     * + stamps converted_tenant_id on the lead. P3.3 will flesh this out;
     * for now it's a minimal one-click provision used by the kanban.
     */
    public function provision(Request $request, Lead $lead): RedirectResponse
    {
        if ($lead->converted_tenant_id) {
            return back()->withErrors(['lead' => 'Lead is already provisioned.']);
        }

        // TODO P3.3: build a proper provisioning service with welcome email,
        // initial password, workspace defaults, etc. Stub for now so the
        // admin kanban can demonstrate the workflow end-to-end.
        $tenant = Tenant::create([
            'name' => $lead->business_name,
            'plan' => 'starter',
        ]);

        $lead->update([
            'status' => Lead::STATUS_PROVISIONED,
            'converted_tenant_id' => $tenant->id,
        ]);

        return back()->with('success', "Provisioned tenant '{$tenant->name}' for {$lead->name}.");
    }
}
