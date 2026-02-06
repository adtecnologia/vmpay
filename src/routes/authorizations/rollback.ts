import { Router, Response } from 'express';
import { AuthenticatedRequest, apiKeyAuth } from '../../middleware/auth';
import { orders } from './authorize';
import { vmachineService } from '../../services/vmachine.service';

const router = Router();

/**
 * @swagger
 * /authorizations/{order_uuid}/rollback:
 *   post:
 *     tags: [Authorizations]
 *     summary: Solicitar o estorno de uma autorização de venda
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: order_uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador único do pedido
 *     responses:
 *       200:
 *         description: Resposta da solicitação de estorno
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rolled_back:
 *                   type: boolean
 *                   description: Indica se o estorno foi feito ou não
 *                 error_code:
 *                   type: string
 *                   enum:
 *                     - PREVIOUSLY_ROLLED_BACK
 *                     - NOT_AUTHORIZED
 *                     - NOT_FOUND
 *                   description: Código que indica o motivo de não ter realizado o estorno
 *       401:
 *         description: API Key não informada
 *       403:
 *         description: API Key não autorizada
 */
router.post('/:order_uuid/rollback', apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { order_uuid } = req.params;

  try {
    // Chama o serviço SOAP para estorno
    const soapResponse = await vmachineService.reverseConsumption({
      IdTransaction: order_uuid,
      MachineNumber: order_uuid,
    });

    const { Status } = soapResponse.ReverseConsumptionResult;

    // Atualiza o pedido
    const rolledBack = Status === 'Success';

    res.status(200).json({
      rolled_back: rolledBack
    });
  } catch (error: any) {
    console.error('[Rollback] Erro ao estornar venda:', error.message);

    // Extrai o código de erro da mensagem SOAP
    const errorMessage = error.message || '';
    const errorCode = extractSoapErrorCode(errorMessage);

    res.status(200).json({
      rolled_back: false,
      error_code: errorCode
    });
  }
});

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
  
  // PREVIOUSLY_ROLLED_BACK
  if (msg.includes('consumptionalreadyreversed')) {
    return 'PREVIOUSLY_ROLLED_BACK';
  }

  return 'INTERNAL_ERROR';
}

export { router as rollbackRouter };
