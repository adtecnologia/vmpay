import { Router, Response } from 'express';
import { AuthenticatedRequest, apiKeyAuth } from '../../middleware/auth';
import { vmachineService } from '../../services/vmachine.service';

const router = Router();

/**
 * @swagger
 * /tags/{tag_number}/balance:
 *   get:
 *     tags: [Tags]
 *     summary: Consulta saldo da conta vinculada à tag
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: tag_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Número da tag de identificação
 *       - in: query
 *         name: machine_asset_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Código da máquina
 *     responses:
 *       200:
 *         description: Resposta da consulta de saldo da conta vinculada à tag
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 current_balance:
 *                   type: number
 *                   description: Saldo da conta vinculada à tag
 *       401:
 *         description: API Key não informada
 *       403:
 *         description: API Key não autorizada
 *       404:
 *         description: Cartão não encontrado ou inativo/bloqueado
 */
router.get('/:tag_number/balance', apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { tag_number } = req.params;
  const { machine_asset_number } = req.query;

  if (!machine_asset_number) {
    res.status(400).json({ error: 'machine_asset_number é obrigatório' });
    return;
  }

  try {
    // Chama o serviço SOAP para consulta de saldo
    const soapResponse = await vmachineService.getBalance({
      TagNumber: tag_number,
      MachineNumber: machine_asset_number as string,
    });

    const { AvailableCredit } = soapResponse;

    console.log('aqui ra ssim', soapResponse)

    res.status(200).json({
      current_balance: AvailableCredit || 0
    });
  } catch (error: any) {
    console.error('[Balance] Erro ao consultar saldo:', error.message);

    // Extrai o código de erro da mensagem SOAP
    const errorMessage = error.message || '';
    const errorCode = extractSoapErrorCode(errorMessage);

    // Se for erro de tag não encontrada, retorna 404
    if (errorCode === 'INVALID_TAG') {
      res.status(404).json({
        error: 'Cartão não encontrado ou inativo/bloqueado'
      });
      return;
    }

    res.status(500).json({
      error: errorMessage || 'Erro ao consultar saldo no serviço externo'
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
  if (msg.includes('insuficientbalance') || msg.includes('saldo')) {
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

export { router as balanceRouter };
