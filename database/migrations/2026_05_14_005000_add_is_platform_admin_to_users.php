<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Platform admin flag — orthogonal to tenant_id. Marks users on the OCC
 * team (Delta System staff) who can manage the platform-level pipeline
 * at /admin/leads, the future /admin/tenants console, etc.
 *
 * Distinct from "tenant owner": a user is a tenant owner via their
 * role='owner' within a tenant. A user is a platform admin via this
 * flag. Virag wears both hats (owner of GC Communication AND platform
 * admin of the OCC SaaS). Most users will have only one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_platform_admin')->default(false)->after('role');
        });

        // Seed the first platform admin — the founder of Delta System.
        // The seeder also handles fresh installs; this catches existing DBs.
        DB::table('users')->where('email', 'virag@deltasystem.in')->update([
            'is_platform_admin' => true,
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_platform_admin');
        });
    }
};
