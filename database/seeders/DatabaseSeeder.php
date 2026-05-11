<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Transporter;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedUsers();
        $this->seedTransporters();
        $this->seedTallyMirrors(); // DEV ONLY - real data flows from Tally bridge
    }

    private function seedUsers(): void
    {
        User::firstOrCreate(
            ['email' => 'virag@deltasystem.in'],
            [
                'name' => 'Virag Bora',
                'password' => Hash::make('password'),
                'role' => 'owner',
                'density_preference' => 'comfortable',
                'email_verified_at' => now(),
            ],
        );
    }

    private function seedTransporters(): void
    {
        $rows = [
            ['name' => 'VRL Logistics', 'city' => 'Nashik', 'avg_transit_days' => 2, 'triplicate_reliability' => 5, 'areas_served' => ['maharashtra', 'gujarat']],
            ['name' => 'Gati-KWE', 'city' => 'Nashik', 'avg_transit_days' => 3, 'triplicate_reliability' => 4, 'areas_served' => ['pan_india']],
            ['name' => 'TCI Express', 'city' => 'Mumbai', 'avg_transit_days' => 2, 'triplicate_reliability' => 4, 'areas_served' => ['maharashtra', 'gujarat', 'mp']],
            ['name' => 'Safexpress', 'city' => 'Nashik', 'avg_transit_days' => 3, 'triplicate_reliability' => 5, 'areas_served' => ['pan_india']],
            ['name' => 'Local Tempo Service', 'city' => 'Nashik', 'avg_transit_days' => 1, 'triplicate_reliability' => 3, 'areas_served' => ['maharashtra']],
        ];

        foreach ($rows as $i => $row) {
            Transporter::firstOrCreate(
                ['name' => $row['name']],
                $row + [
                    'transporter_code' => sprintf('TRP-%03d', $i + 1),
                    'status' => 'active',
                    'payment_terms' => 'monthly',
                ],
            );
        }
    }

    private function seedTallyMirrors(): void
    {
        // Placeholder customers/products marked with DEV- tally_ids so they're easy
        // to wipe when the real Tally bridge starts pushing data.
        $customers = [
            ['name' => 'Sharma Electricals', 'city' => 'Nashik', 'customer_type' => 'dealer'],
            ['name' => 'Patel Switchgears', 'city' => 'Surat', 'customer_type' => 'dealer'],
            ['name' => 'BuildPro Contractors', 'city' => 'Pune', 'customer_type' => 'contractor'],
            ['name' => 'MSEB Tender Cell', 'city' => 'Mumbai', 'customer_type' => 'government'],
            ['name' => 'Krishna Engineering', 'city' => 'Indore', 'customer_type' => 'oem'],
        ];

        foreach ($customers as $i => $c) {
            Customer::firstOrCreate(
                ['tally_id' => sprintf('DEV-CUST-%03d', $i + 1)],
                $c + [
                    'customer_code' => sprintf('GC-%03d', $i + 1),
                    'payment_terms' => '30_days',
                    'brand_preferences' => ['C&S Electric', 'BCH Electric'],
                    'status' => 'active',
                    'state' => 'Maharashtra',
                ],
            );
        }

        $products = [
            ['name' => 'C&S MCB 6A SP', 'brand' => 'C&S Electric', 'sku' => 'CS-MCB-6A', 'unit' => 'NOS', 'mrp' => 180],
            ['name' => 'C&S MCB 32A DP', 'brand' => 'C&S Electric', 'sku' => 'CS-MCB-32A', 'unit' => 'NOS', 'mrp' => 540],
            ['name' => 'BCH Contactor 32A', 'brand' => 'BCH Electric', 'sku' => 'BCH-CTR-32A', 'unit' => 'NOS', 'mrp' => 1450],
            ['name' => 'Luker Distribution Board 8-way', 'brand' => 'Luker', 'sku' => 'LK-DB-8W', 'unit' => 'NOS', 'mrp' => 2200],
            ['name' => 'Kaycee Selector Switch', 'brand' => 'Kaycee', 'sku' => 'KC-SS-3P', 'unit' => 'NOS', 'mrp' => 320],
        ];

        foreach ($products as $i => $p) {
            Product::firstOrCreate(
                ['tally_id' => sprintf('DEV-PROD-%03d', $i + 1)],
                $p + [
                    'hsn_code' => '8536',
                    'gst_rate' => 18.00,
                    'default_sale_price' => $p['mrp'] * 0.85,
                    'default_purchase_price' => $p['mrp'] * 0.62,
                    'is_active' => true,
                ],
            );
        }
    }
}
