<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $rows = AuditLog::query()
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        return Inertia::render('AuditLogs/Index', [
            'rows' => $rows,
        ]);
    }
}
