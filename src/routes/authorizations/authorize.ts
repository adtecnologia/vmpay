import { Router, Response } from 'express';
import { AuthenticatedRequest, apiKeyAuth } from '../../middleware/auth';
import { vmachineService } from '../../services/vmachine.service';

const router = Router();

interface Product {
  upc_code: string;
  quantity: number;
  unit_value: string;
}

interface AuthorizationRequest {
  order_uuid: string;
  occurred_at: string;
  tag_number: string;
  machine_asset_number: string;
  products: Product[];
}


// Armazenamento em memória (para exemplo)
interface Order {
  order_uuid: string;
  authorized: boolean;
  rolled_back: boolean;
  tag_holder_name?: string;
  transaction_id?: string;
}

const orders: Map<string, Order> = new Map();

/**
 * @swagger
 * /authorizations:
 *   post:
 *     tags: [Authorizations]
 *     summary: Solicitar autorização para a venda de um produto
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_uuid
 *               - occurred_at
 *               - tag_number
 *               - machine_asset_number
 *               - products
 *             properties:
 *               order_uuid:
 *                 type: string
 *                 format: uuid
 *                 description: Identificador único do pedido no sistema VMpay
 *               occurred_at:
 *                 type: string
 *                 format: date-time
 *                 description: Data do pedido
 *               tag_number:
 *                 type: string
 *                 description: Número da tag de identificação (cartão, pulseira, etc)
 *               machine_asset_number:
 *                 type: string
 *                 description: Código da máquina
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     upc_code:
 *                       type: string
 *                       description: Código UPC do produto
 *                     quantity:
 *                       type: integer
 *                       description: Quantidade do produto
 *                     unit_value:
 *                       type: string
 *                       description: Valor unitário do item
 *     responses:
 *       200:
 *         description: Resposta da solicitação de autorização de crédito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authorized:
 *                   type: boolean
 *                   description: Indica se a venda foi autorizada ou não
 *                 error_code:
 *                   type: string
 *                   enum:
 *                     - INVALID_TAG
 *                     - INVALID_MACHINE
 *                     - INVALID_PRODUCT
 *                     - INSUFFICIENT_BALANCE
 *                     - MACHINE_NOT_ALLOWED
 *                     - PRODUCT_NOT_ALLOWED
 *                   description: Código que indica o motivo da não autorização
 *                 tag_holder_name:
 *                   type: string
 *                   description: Nome do portador da tag (opcional)
 *       401:
 *         description: API Key não informada
 *       403:
 *         description: API Key não autorizada
 *       415:
 *         description: Content-Type deve ser application/json
 */
router.post('/', apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  const contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes('application/json')) {
    res.status(415).json({ error: 'Content-Type deve ser application/json' });
    return;
  }

  const { order_uuid, occurred_at, tag_number, machine_asset_number, products } = req.body as AuthorizationRequest;

  // Validação básica dos campos obrigatórios
  if (!order_uuid || !occurred_at || !tag_number || !machine_asset_number || !products) {
    res.status(400).json({ error: 'Campos obrigatórios faltando' });
    return;
  }

  try {
    // Converte produtos para o formato esperado pelo SOAP
    const productItems = products.map(p => ({
      Code: p.upc_code,
      Quantity: p.quantity,
      Price: parseFloat(p.unit_value),
    }));

    // Chama o serviço SOAP para autorização
    const result = await vmachineService.performConsumption({
      IdTransaction: order_uuid,
      TagNumber: tag_number,
      MachineNumber: machine_asset_number,
      Products: { ProductItem: productItems },
      Date: occurred_at,
    });

    const { Status, CustomerName } = result;

    const authorized = Status === 'Success';

    // Armazena o pedido
    orders.set(order_uuid, {
      order_uuid,
      authorized,
      rolled_back: false,
      transaction_id: order_uuid,
    });

    const response: { authorized: boolean; error_code?: string; tag_holder_name?: string } = {
      authorized,
    };

    if (!authorized) {
      // Mapeia status SOAP para código de erro VMpay
      response.error_code = mapSoapStatusToVmpay(Status);
      response.tag_holder_name = CustomerName;
    } else {
      response.tag_holder_name = CustomerName;
    }

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[Authorization] Erro ao autorizar venda:', error.message);

    // Armazena pedido com erro
    orders.set(order_uuid, {
      order_uuid,
      authorized: false,
      rolled_back: false,
    });

    // Extrai o tipo de erro da mensagem
    const errorMessage = error.message || '';
    const errorCode = extractSoapErrorCode(errorMessage);

    res.status(200).json({
      authorized: false,
      error_code: errorCode,
    });
  }
});

/**
 * @description Mapeia erros SOAP para códigos de erro VMpay
 */
function mapSoapStatusToVmpay(status: string): string {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('insuficientbalance') || statusLower.includes('saldo')) {
    return 'INSUFFICIENT_BALANCE';
  }
  if (statusLower.includes('tag') || statusLower.includes('account')) {
    return 'INVALID_TAG';
  }
  if (statusLower.includes('machine') || statusLower.includes('pos')) {
    return 'INVALID_MACHINE';
  }
  if (statusLower.includes('product') || statusLower.includes('item')) {
    return 'INVALID_PRODUCT';
  }

  return 'INTERNAL_ERROR';
}

/**
 * @description Extrai o código de erro da mensagem SOAP
 */
function extractSoapErrorCode(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();

  // INVALID_MACHINE
  if (msg.includes('invalidposeid') || msg.includes('máquina')) {
    return 'INVALID_MACHINE';
  }
  
  // INVALID_TAG
  if (msg.includes('invalidconsumptionuid') || msg.includes('invalidtag') || msg.includes('tag')) {
    return 'INVALID_TAG';
  }

  // INVALID_PRODUCT
  if (msg.includes('invalidproduct') || msg.includes('invaliditem') || msg.includes('productnotfound')) {
    return 'INVALID_PRODUCT';
  }

  // INSUFFICIENT_BALANCE
  if (msg.includes('insufficient') || msg.includes('saldo')) {
    return 'INSUFFICIENT_BALANCE';
  }

  // NOT_ALLOWED
  if (msg.includes('notallowed') || msg.includes('não permitido')) {
    if (msg.includes('machine') || msg.includes('máquina')) {
      return 'MACHINE_NOT_ALLOWED';
    }
    return 'PRODUCT_NOT_ALLOWED';
  }

  return 'INTERNAL_ERROR';
}

export { router as authorizeRouter, orders };
