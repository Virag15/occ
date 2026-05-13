<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use ReflectionClass;
use Symfony\Component\Finder\Finder;

/**
 * Generate TypeScript type declarations for each Eloquent model based on
 * $fillable + $casts. Output goes to resources/js/types/entities.generated.ts
 * — separate from the hand-maintained entities.ts so we don't clobber the
 * relation + accessor types that live there.
 *
 * Run after any migration that adds/removes columns or changes a cast:
 *   php artisan ts:types
 */
class GenerateTsTypes extends Command
{
    protected $signature = 'ts:types
                            {--print : Print to stdout instead of writing the file}';

    protected $description = 'Generate TypeScript types from Eloquent $fillable + $casts.';

    /** Cast-name → TypeScript type mapping. Unknown casts fall through to `unknown`. */
    private const CAST_MAP = [
        'int' => 'number',
        'integer' => 'number',
        'real' => 'number',
        'float' => 'number',
        'double' => 'number',
        'boolean' => 'boolean',
        'bool' => 'boolean',
        'array' => 'unknown[]',
        'collection' => 'unknown[]',
        'object' => 'Record<string, unknown>',
        'json' => 'unknown',
        // Dates/datetimes serialize to ISO 8601 strings when sent to Inertia,
        // so the frontend sees them as strings.
        'date' => 'string',
        'datetime' => 'string',
        'timestamp' => 'string',
        // decimal:X — Laravel casts decimals to strings to preserve precision.
        'decimal' => 'string',
        'string' => 'string',
    ];

    public function handle(): int
    {
        $models = $this->discoverModels();
        if (empty($models)) {
            $this->error('No models found under app/Models.');

            return self::FAILURE;
        }

        $out = "// AUTO-GENERATED FROM app/Models/* — DO NOT EDIT BY HAND.\n";
        $out .= "// Run: php artisan ts:types\n";
        $out .= "//\n";
        $out .= "// Captures column-level types only (\$fillable + \$casts). Relations,\n";
        $out .= "// accessors and frontend-only fields stay in the hand-maintained\n";
        $out .= "// entities.ts — import these as a base and extend as needed.\n\n";

        foreach ($models as $class) {
            $out .= $this->renderInterface($class);
        }

        if ($this->option('print')) {
            $this->line($out);

            return self::SUCCESS;
        }

        $path = resource_path('js/types/entities.generated.ts');
        file_put_contents($path, $out);
        $this->info(sprintf('Wrote %s (%d models, %d bytes).', $path, count($models), strlen($out)));

        return self::SUCCESS;
    }

    /** @return array<int, class-string<Model>> */
    private function discoverModels(): array
    {
        $found = [];
        foreach (Finder::create()->in(app_path('Models'))->files()->name('*.php') as $file) {
            $class = 'App\\Models\\'.$file->getBasename('.php');
            if (! class_exists($class)) {
                continue;
            }
            $ref = new ReflectionClass($class);
            if ($ref->isAbstract() || ! $ref->isSubclassOf(Model::class)) {
                continue;
            }
            $found[] = $class;
        }
        sort($found);

        return $found;
    }

    private function renderInterface(string $class): string
    {
        $short = class_basename($class);
        /** @var Model $instance */
        $instance = new $class;
        $fillable = $instance->getFillable();
        $casts = $this->readCasts($instance);

        if (empty($fillable)) {
            return "// {$short}: no \$fillable declared, skipping.\n\n";
        }

        // Collect column → ts-type pairs, then emit. A model may have
        // created_at in $fillable (e.g. AuditLog seeds it explicitly) and
        // also pick it up from HasTimestamps; the array dedupes.
        $cols = ['id' => 'number'];
        foreach ($fillable as $field) {
            $cols[$field] = $this->castToTs($casts[$field] ?? null).' | null';
        }
        $traits = class_uses_recursive($class);
        if (in_array('Illuminate\\Database\\Eloquent\\Concerns\\HasTimestamps', $traits, true)) {
            $cols['created_at'] = $cols['created_at'] ?? 'string | null';
            $cols['updated_at'] = $cols['updated_at'] ?? 'string | null';
        }
        if (in_array('Illuminate\\Database\\Eloquent\\SoftDeletes', $traits, true)) {
            $cols['deleted_at'] = 'string | null';
        }

        $lines = ["export interface {$short}Row {"];
        foreach ($cols as $name => $tsType) {
            // id is non-null; only that one column escapes the default.
            $rendered = $name === 'id' ? $tsType : $tsType;
            $lines[] = "    {$name}: {$rendered};";
        }
        $lines[] = '}';

        return implode("\n", $lines)."\n\n";
    }

    /** @return array<string,string> */
    private function readCasts(Model $instance): array
    {
        $raw = $instance->getCasts();
        $out = [];
        foreach ($raw as $field => $cast) {
            // "decimal:2" → "decimal", "Illuminate\Support\Carbon" → strip namespace
            $base = strtolower(explode(':', (string) $cast)[0]);
            $base = class_basename($base) ?: $base;
            $out[$field] = strtolower($base);
        }

        return $out;
    }

    private function castToTs(?string $cast): string
    {
        if ($cast === null || $cast === '') {
            return 'string';
        }

        return self::CAST_MAP[$cast] ?? 'unknown';
    }
}
