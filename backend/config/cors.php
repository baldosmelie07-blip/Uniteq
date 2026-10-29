
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Allow the UniTeq frontend running locally and on Vercel
    | to communicate with the Laravel backend.
    |
    */

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://uniteq-b3t4.vercel.app',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
