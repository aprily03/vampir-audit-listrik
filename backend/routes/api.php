<?php

use App\Http\Controllers\Api\AuditPcLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExecutiveReportController;
use App\Http\Controllers\Api\LabRoomController;
use App\Http\Controllers\Api\MasterPcSpecController;
use App\Http\Controllers\Api\MonthlyElectricityBillController;
use App\Http\Controllers\Api\PanelLimitController;
use App\Http\Controllers\Api\PanelReadingController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\UrgentIncidentController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/labs', [LabRoomController::class, 'index']);
    Route::get('/settings', [SettingController::class, 'index']);

    Route::middleware('role:ADMIN,AUDITOR')->group(function () {
        Route::get('/specs', [MasterPcSpecController::class, 'index']);
        Route::get('/audits', [AuditPcLogController::class, 'index']);
        Route::get('/audits/progress', [AuditPcLogController::class, 'progress']);
        Route::post('/audits', [AuditPcLogController::class, 'store']);
    });

    Route::middleware('role:ADMIN,MAINTENANCE')->group(function () {
        Route::get('/panel-limits', [PanelLimitController::class, 'index']);
        Route::get('/panel-readings', [PanelReadingController::class, 'index']);
        Route::post('/panel-readings', [PanelReadingController::class, 'store']);
        Route::get('/incidents', [UrgentIncidentController::class, 'index']);
        Route::patch('/incidents/{incident}/status', [UrgentIncidentController::class, 'updateStatus']);
    });

    Route::middleware('role:ADMIN,PIMPINAN')->group(function () {
        Route::get('/bills', [MonthlyElectricityBillController::class, 'index']);
        Route::get('/reports/executive/summary', [ExecutiveReportController::class, 'summary']);
        Route::get('/reports/executive/pdf', [ExecutiveReportController::class, 'download']);
    });

    Route::middleware('role:ADMIN')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);

        Route::post('/labs', [LabRoomController::class, 'store']);
        Route::patch('/labs/{lab_room}', [LabRoomController::class, 'update']);
        Route::delete('/labs/{lab_room}', [LabRoomController::class, 'destroy']);

        Route::post('/specs', [MasterPcSpecController::class, 'store']);
        Route::patch('/specs/{master_pc_spec}', [MasterPcSpecController::class, 'update']);
        Route::delete('/specs/{master_pc_spec}', [MasterPcSpecController::class, 'destroy']);

        Route::patch('/panel-limits/{panel_limit}', [PanelLimitController::class, 'update']);

        Route::post('/incidents', [UrgentIncidentController::class, 'store']);

        Route::post('/bills', [MonthlyElectricityBillController::class, 'store']);
        Route::patch('/bills/{bill}', [MonthlyElectricityBillController::class, 'update']);
        Route::delete('/bills/{bill}', [MonthlyElectricityBillController::class, 'destroy']);

        Route::patch('/settings', [SettingController::class, 'update']);
        Route::get('/settings/history', [SettingController::class, 'history']);

        Route::patch('/audits/{audit_pc_log}', [AuditPcLogController::class, 'update']);
        Route::delete('/audits/{audit_pc_log}', [AuditPcLogController::class, 'destroy']);
    });
});
