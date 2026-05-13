<?php

namespace Tests\Feature;

use App\Models\BridgeAgentToken;
use App\Models\TallyOperation;
use App\Models\Tenant;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Per-tenant bridge agent token mechanics: issuance returns the plaintext
 * once, the DB stores only the hash, lookups by hash work, revocation
 * disables a token, and tokens from one tenant don't authenticate as
 * another tenant.
 */
class BridgeAgentTokenTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $alpha;

    private Tenant $beta;

    protected function setUp(): void
    {
        parent::setUp();
        $this->alpha = Tenant::create(['name' => 'Alpha Co.', 'slug' => 'alpha']);
        $this->beta = Tenant::create(['name' => 'Beta Co.', 'slug' => 'beta']);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_issuing_a_token_returns_plaintext_and_stores_only_hash(): void
    {
        ['token' => $plaintext, 'model' => $row] = $this->alpha->issueBridgeToken('Office PC');

        // Plaintext: 64-char hex (32 random bytes hex-encoded)
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $plaintext);

        // Stored hash matches what we'd hash for lookup
        $this->assertSame(BridgeAgentToken::hashToken($plaintext), $row->token_hash);
        $this->assertNotEquals($plaintext, $row->token_hash, 'plaintext must not be stored');
        $this->assertSame($this->alpha->id, $row->tenant_id);
        $this->assertSame('Office PC', $row->name);
        $this->assertNull($row->revoked_at);
        $this->assertNull($row->last_seen_at);
    }

    public function test_two_calls_issue_different_tokens(): void
    {
        ['token' => $t1] = $this->alpha->issueBridgeToken('PC1');
        ['token' => $t2] = $this->alpha->issueBridgeToken('PC2');

        $this->assertNotSame($t1, $t2);
    }

    public function test_using_a_valid_token_authenticates_against_the_correct_tenant(): void
    {
        ['token' => $alphaToken] = $this->alpha->issueBridgeToken('Alpha PC');

        $this->withHeaders(['Authorization' => 'Bearer '.$alphaToken])
            ->getJson('/api/bridge/ping')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_wrong_token_is_rejected(): void
    {
        $this->alpha->issueBridgeToken('Alpha PC'); // mint one but don't use it

        $this->withHeaders(['Authorization' => 'Bearer not-a-real-token'])
            ->getJson('/api/bridge/ping')
            ->assertUnauthorized();
    }

    public function test_revoked_token_is_rejected(): void
    {
        ['token' => $token, 'model' => $row] = $this->alpha->issueBridgeToken('Old PC');
        $row->update(['revoked_at' => now()]);

        $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/bridge/ping')
            ->assertUnauthorized();
    }

    public function test_last_seen_at_is_stamped_on_successful_auth(): void
    {
        ['token' => $token, 'model' => $row] = $this->alpha->issueBridgeToken('PC');
        $this->assertNull($row->last_seen_at);

        $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/bridge/ping')
            ->assertOk();

        $this->assertNotNull($row->fresh()->last_seen_at);
    }

    public function test_tokens_from_one_tenant_only_see_that_tenants_queue(): void
    {
        // Mint a token for each, queue an op for each (directly, with explicit
        // tenant_id so the test data setup doesn't depend on context behavior).
        ['token' => $alphaToken] = $this->alpha->issueBridgeToken('Alpha PC');
        ['token' => $betaToken] = $this->beta->issueBridgeToken('Beta PC');

        $alphaOp = new TallyOperation([
            'operation' => 'push_customer', 'payload' => ['name' => 'Alpha cust'],
            'status' => 'pending',
        ]);
        $alphaOp->tenant_id = $this->alpha->id;
        $alphaOp->save();

        $betaOp = new TallyOperation([
            'operation' => 'push_customer', 'payload' => ['name' => 'Beta cust'],
            'status' => 'pending',
        ]);
        $betaOp->tenant_id = $this->beta->id;
        $betaOp->save();

        // Sanity: both rows exist with the right tenant_id
        $this->assertSame(
            2,
            TallyOperation::withoutGlobalScope(TenantScope::class)->count()
        );

        // Alpha's agent claims — should see only Alpha's op
        $alphaClaim = $this->withHeaders(['Authorization' => 'Bearer '.$alphaToken])
            ->postJson('/api/bridge/claim', ['max' => 10])
            ->json('operations');
        $this->assertCount(1, $alphaClaim);
        $this->assertSame('Alpha cust', $alphaClaim[0]['payload']['name']);

        // Beta's agent claims — should see only Beta's op
        $betaClaim = $this->withHeaders(['Authorization' => 'Bearer '.$betaToken])
            ->postJson('/api/bridge/claim', ['max' => 10])
            ->json('operations');
        $this->assertCount(1, $betaClaim);
        $this->assertSame('Beta cust', $betaClaim[0]['payload']['name']);
    }
}
