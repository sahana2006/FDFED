import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { LoginDto, SignupDto } from './dto/users.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Public — no role required (user has no session yet)
  @Post()
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Patient registered successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  signup(@Body() body: SignupDto) {
    return this.usersService.signupPatient({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim(),
      phone: body.phone.trim(),
      dob: body.dob.trim(),
      gender: body.gender.trim(),
      bloodGroup: body.bloodGroup.trim(),
      guardianName: body.guardianName?.trim() ?? '',
      password: body.password,
    });
  }

  // Public — no role required (authenticates and returns session)
  @Post('login')
  @ApiOperation({ summary: 'Log in to the system' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  login(@Body() body: LoginDto) {
    const email = body.email.trim();
    const password = body.password;
    
    if (!email || !password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = this.usersService.login(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }
}
