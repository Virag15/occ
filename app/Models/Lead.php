<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A sales lead for OCC itself. Lifecycle is the sales pipeline that
 * lives in /admin/leads (built in P2.3).
 *
 * Deliberately NOT using BelongsToTenant — leads belong to the OCC
 * platform, not to any customer tenant. The /admin/leads page is
 * owner-of-Delta-System only, not per-tenant-owner.
 *
 * @property int $id
 * @property string $name
 * @property string $business_name
 * @property string $phone
 * @property string|null $email
 * @property string $status
 * @property int|null $assigned_to
 * @property int|null $converted_tenant_id
 */
class Lead extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_NEW = 'new';

    public const STATUS_CONTACTED = 'contacted';

    public const STATUS_DEMO_DONE = 'demo_done';

    public const STATUS_QUOTE_SENT = 'quote_sent';

    public const STATUS_PAID = 'paid';

    public const STATUS_PROVISIONED = 'provisioned';

    public const STATUS_LOST = 'lost';

    public const STATUSES = [
        self::STATUS_NEW,
        self::STATUS_CONTACTED,
        self::STATUS_DEMO_DONE,
        self::STATUS_QUOTE_SENT,
        self::STATUS_PAID,
        self::STATUS_PROVISIONED,
        self::STATUS_LOST,
    ];

    public const SOURCE_CONTACT_FORM = 'contact_form';

    public const SOURCE_WHATSAPP = 'whatsapp';

    public const SOURCE_PHONE = 'phone';

    public const SOURCE_REFERRAL = 'referral';

    public const SOURCE_EVENT = 'event';

    public const SOURCE_OTHER = 'other';

    protected $fillable = [
        'name', 'business_name', 'phone', 'email',
        'current_software', 'orders_per_month', 'notes',
        'source', 'status', 'assigned_to', 'converted_tenant_id',
        'utm_source', 'utm_medium', 'utm_campaign',
        'referrer', 'ip', 'user_agent',
    ];

    /** Model-level defaults so freshly-created leads have status + source in memory. */
    protected $attributes = [
        'status' => self::STATUS_NEW,
        'source' => self::SOURCE_CONTACT_FORM,
    ];

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function convertedTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'converted_tenant_id');
    }

    /** True if the lead has progressed past first contact. */
    public function isInPipeline(): bool
    {
        return ! in_array($this->status, [self::STATUS_NEW, self::STATUS_LOST], true);
    }

    /** Terminal states — no further pipeline action expected. */
    public function isClosed(): bool
    {
        return in_array($this->status, [self::STATUS_PROVISIONED, self::STATUS_LOST], true);
    }
}
