<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Legacy /reports/daily route — content merged into /reports with a date
 * range. This controller now just redirects to the unified page so any
 * bookmark or external link still lands somewhere useful.
 */
class DailyReportController extends Controller
{
    public function show(Request $request): RedirectResponse
    {
        $date = $request->query('date', now()->toDateString());

        return redirect()->route('reports.index', ['from' => $date, 'to' => $date]);
    }
}
