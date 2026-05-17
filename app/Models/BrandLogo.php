<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * A brand the tenant deals in, with its logo. Rendered on quotation /
 * invoice PDFs as an authorised-dealer strip.
 *
 * @property int $tenant_id
 * @property string $name
 * @property string $logo_path
 * @property int $sort_order
 */
class BrandLogo extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = ['name', 'logo_path', 'sort_order'];

    /**
     * Base64 data URI of the logo, for embedding in DomPDF (which can't
     * fetch files over the network). Returns null if the file is missing.
     */
    public function dataUri(): ?string
    {
        if (! $this->logo_path) {
            return null;
        }
        $disk = Storage::disk('public');
        if (! $disk->exists($this->logo_path)) {
            return null;
        }
        $absolute = $disk->path($this->logo_path);
        $mime = mime_content_type($absolute) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($absolute));
    }
}
