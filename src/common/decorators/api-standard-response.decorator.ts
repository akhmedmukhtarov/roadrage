import { ApiResponseDto } from '@common/interfaces/api-response.interface';
import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

interface ApiStandardResponseOptions {
  /** HTTP status the success response is documented under. Defaults to 200. */
  status?: 200 | 201;
  description?: string;
  /** data is an array of `model` rather than a single `model`. */
  isArray?: boolean;
}

/**
 * Documents an endpoint's success response as the global TransformInterceptor actually
 * shapes it: `ApiResponseDto` with `data` narrowed to `model` (or an array of it).
 */
export const ApiStandardResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options: ApiStandardResponseOptions = {},
) => {
  const { status = 200, description, isArray = false } = options;
  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };
  const ApiResponseForStatus =
    status === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponseForStatus({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          { properties: { data: dataSchema } },
        ],
      },
    }),
  );
};

/** Documents an endpoint that returns no data: `data` is `null`. */
export const ApiNoDataResponse = (description?: string) =>
  applyDecorators(
    ApiExtraModels(ApiResponseDto),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          { properties: { data: { type: 'null', example: null } } },
        ],
      },
    }),
  );
