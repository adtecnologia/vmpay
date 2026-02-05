import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import authorizerRouter from './routes/authorizer';
import { PORT } from './config';

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// ============================================
// Swagger Configuration
// ============================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VMpay External Authorizers API',
      version: 'v1',
      description: 'API para autorização de compras em vending machines do sistema VMpay',
    },
    servers: [
      {
        url: `http://localhost:${PORT}/vmpay/v1/authorizer`,
        description: 'Servidor de desenvolvimento',
      },
    ],
    tags: [
      { name: 'Authorizations', description: 'Autorização de vendas' },
      { name: 'Tags', description: 'Consulta de saldo' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'API-Key',
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  },
  apis: ['./src/routes/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// JSON spec endpoint
app.get('/docs/spec', (req, res) => {
  res.json(swaggerSpec);
});

// Rota base da API
app.use('/vmpay/v1/authorizer', authorizerRouter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`VMpay Authorizer API rodando em http://localhost:${PORT}`);
  console.log(`Documentação Swagger: http://localhost:${PORT}/docs`);
  console.log(`\nEndpoints disponíveis:`);
  console.log(`  POST   /vmpay/v1/authorizer/authorizations`);
  console.log(`  POST   /vmpay/v1/authorizer/authorizations/:order_uuid/rollback`);
  console.log(`  GET    /vmpay/v1/authorizer/tags/:tag_number/balance`);
});
