<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyReport extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'report_date', 'html_content', 'pdf_url', 'recipients', 'sent_at', 'metrics',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'sent_at' => 'datetime',
            'metrics' => 'array',
        ];
    }
}
