<?php

namespace App\Http\Requests;

class UpdateOrderRequest extends StoreOrderRequest
{
    // Same rules as create. Update inherits to keep the field surface in
    // exactly one place; a future divergence (e.g. customer_id immutable on
    // update) overrides here.
}
