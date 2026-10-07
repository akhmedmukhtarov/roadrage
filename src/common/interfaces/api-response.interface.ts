import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Operation successful' })
  message: string;

  @ApiProperty()
  data: T | null;

  @ApiProperty({
    example: null,
    nullable: true,
  })
  error: {
    code: string;
    details: string;
  } | null;

  @ApiProperty({
    example: {
      timestamp: '2026-10-07T12:00:00.000Z',
    },
  })
  meta: {
    timestamp: string;
  };
}

export interface IApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  error: {
    code: string;
    details: string;
  } | null;
  meta: {
    timestamp: string;
  };
}
