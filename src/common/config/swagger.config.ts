import { ApiResponseDto } from '@common/interfaces/api-response.interface';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Socket.IO cannot be described by OpenAPI, so the events live in the description
const DESCRIPTION = `
Backend for the roadrage CarPlay app: rate the drivers around you.

REST covers authentication, skins, reaction packs and coins. Live positions go over **Socket.IO** on the same host.

## Socket.IO

Connect with the access token: \`io(URL, { auth: { token: accessToken } })\`.
A bad or expired token fails the connection with \`Unauthorized\`.

| Event | Direction | Payload | Reply / data |
| --- | --- | --- | --- |
| \`location\` | client → server | \`{ lat, long }\` | ack \`{ bboxId }\` |
| \`nearby\` | client → server | \`{ radius? }\` (metres) | ack \`{ devices: [...] }\` |
| \`location\` | server → client | | \`{ userId, username, skinFileId, lat, long, heading, bboxId, updatedAt }\` |
| \`left\` | server → client | | \`{ userId }\` |
| \`exception\` | server → client | | \`{ status: 'error', message }\` |

A device in \`nearby\`: \`{ userId, username, skinFileId, lat, long, distance, direction, heading, updatedAt }\`.
\`skinFileId\` is the image of the skin that driver selected, to load from
\`GET /api/v1/files/open?fileId=\`; \`null\` for the default car.

Angles are clockwise with **0 = left, 90 = north, 180 = right, 270 = south**.
\`direction\` is where the device is, seen from the requester; \`heading\` is where
it is moving (\`null\` while standing still).
`;

export function setupSwagger(app: INestApplication) {
  const swaggerPath = 'api/docs';

  const options = new DocumentBuilder()
    .setTitle('Roadrage API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Registration, login and token refresh')
    .addTag('Files', 'Upload a file, open it by id')
    .addTag('Skins', 'Skin shop, owned skins and the selected one')
    .addTag('Admin: skins', 'Skin catalog management, ADMIN role only')
    .addTag('Reaction packs', 'Reaction pack shop and owned packs')
    .addTag(
      'Admin: reaction packs',
      'Reaction packs and their reactions, ADMIN role only',
    )
    .addTag('Admin: users', 'Coin grants, ADMIN role only')
    .build();

  const document = SwaggerModule.createDocument(app, options, {
    extraModels: [ApiResponseDto],
  });

  const customOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Roadrage API - Interactive Documentation',
  };

  SwaggerModule.setup(swaggerPath, app, document, customOptions);
  return {
    swaggerPath,
  };
}
