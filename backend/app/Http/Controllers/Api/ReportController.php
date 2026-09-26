<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function collections(Request $request)
    {
        $reportType = $request->query('report_type', 'daily');

        $query = Receipt::query();

        /*
        |--------------------------------------------------------------------------
        | DAILY REPORT
        |--------------------------------------------------------------------------
        */
        if ($reportType === 'daily') {

            $date = $request->query(
                'date',
                now()->format('Y-m-d')
            );

            $query->whereDate('date', $date);

            $period = Carbon::parse($date)
                ->format('F d, Y');
        }

        /*
        |--------------------------------------------------------------------------
        | MONTHLY REPORT
        |--------------------------------------------------------------------------
        */
        elseif ($reportType === 'monthly') {

            $year = $request->query(
                'year',
                now()->year
            );

            $month = $request->query(
                'month',
                now()->month
            );

            $query
                ->whereYear('date', $year)
                ->whereMonth('date', $month);

            $period = Carbon::create(
                $year,
                $month,
                1
            )->format('F Y');
        }

        /*
        |--------------------------------------------------------------------------
        | QUARTERLY REPORT
        |--------------------------------------------------------------------------
        */
        elseif ($reportType === 'quarterly') {

            $year = $request->query(
                'year',
                now()->year
            );

            $quarter = $request->query(
                'quarter',
                ceil(now()->month / 3)
            );

            $startMonth = (($quarter - 1) * 3) + 1;
            $endMonth = $startMonth + 2;

            $query
                ->whereYear('date', $year)
                ->whereBetween(
                    \Illuminate\Support\Facades\DB::raw(
                        'MONTH(date)'
                    ),
                    [$startMonth, $endMonth]
                );

            $period =
                "Q{$quarter} {$year}";
        }

        /*
        |--------------------------------------------------------------------------
        | SEMESTRAL REPORT
        |--------------------------------------------------------------------------
        */
        elseif ($reportType === 'semestral') {

            $year = $request->query(
                'year',
                now()->year
            );

            $semester = $request->query(
                'semester',
                1
            );

            if ($semester == 1) {

                $startMonth = 1;
                $endMonth = 6;

                $period =
                    "1st Semester {$year}";

            } else {

                $startMonth = 7;
                $endMonth = 12;

                $period =
                    "2nd Semester {$year}";
            }

            $query
                ->whereYear('date', $year)
                ->whereBetween(
                    \Illuminate\Support\Facades\DB::raw(
                        'MONTH(date)'
                    ),
                    [$startMonth, $endMonth]
                );
        }

        /*
        |--------------------------------------------------------------------------
        | CUSTOM DATE RANGE
        |--------------------------------------------------------------------------
        */
        elseif ($reportType === 'custom') {

            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            if (!$startDate || !$endDate) {

                return response()->json([
                    'message' =>
                        'Start date and end date are required.'
                ], 422);
            }

            $query->whereBetween(
                'date',
                [$startDate, $endDate]
            );

            $period =
                Carbon::parse($startDate)->format('M d, Y')
                . ' - ' .
                Carbon::parse($endDate)->format('M d, Y');
        }

        /*
        |--------------------------------------------------------------------------
        | INVALID REPORT TYPE
        |--------------------------------------------------------------------------
        */
        else {

            return response()->json([
                'message' =>
                    'Invalid report type.'
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | GET RECEIPTS
        |--------------------------------------------------------------------------
        */

        $receipts = $query
            ->orderBy('date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        /*
        |--------------------------------------------------------------------------
        | TOTAL COLLECTION
        |--------------------------------------------------------------------------
        */

        $totalCollection = $receipts->sum(
            function ($receipt) {
                return (float) $receipt->amount;
            }
        );

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'report_type' => $reportType,
            'period' => $period,

            'total_collection' =>
                number_format(
                    $totalCollection,
                    2,
                    '.',
                    ''
                ),

            'total_receipts' =>
                $receipts->count(),

            'receipts' =>
                $receipts,
        ]);
    }
}