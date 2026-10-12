import { PartialType } from '@nestjs/swagger';
import { CreateReactionPackDto } from './create-reaction-pack.dto';

export class UpdateReactionPackDto extends PartialType(CreateReactionPackDto) {}
