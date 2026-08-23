import { PartialType } from '@nestjs/swagger';
import { CreateLabTechnicianDto } from './create-lab-technician.dto';

export class UpdateLabTechnicianDto extends PartialType(CreateLabTechnicianDto) {}
