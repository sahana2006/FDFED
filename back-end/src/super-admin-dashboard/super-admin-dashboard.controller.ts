import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../users/users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';

@ApiTags('Super Admin - Dashboard')
@ApiHeader({ name: 'role', required: true, description: 'Must be super_admin' })
@Controller('super-admin/dashboard')
@Roles(Role.SUPER_ADMIN)
@UseGuards(RolesGuard)
export class SuperAdminDashboardController {
  constructor(private readonly dashboardService: SuperAdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get super admin dashboard summary and branch table data' })
  @ApiResponse({ status: 200, description: 'Dashboard snapshot' })
  getDashboard() {
    return this.dashboardService.getDashboardSnapshot();
  }
}
