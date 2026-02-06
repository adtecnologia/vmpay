import axios from 'axios';
import * as https from 'https';
import { randomUUID } from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import {
  VmachineConfig,
  PerformConsumptionRequest,
  PerformConsumptionResponse,
  ReverseConsumptionRequest,
  ReverseConsumptionResponse,
  GetBalanceRequest,
  GetBalanceResponse,
  PerformSaleRequest,
  PerformSaleResponse,
  CancelSaleRequest,
  CancelSaleResponse,
  SearchAccountsRequest,
  SearchAccountsResponse,
} from './vmachine.types';
import { VMACHINE_ENDPOINT, VMACHINE_AUTH_KEY } from '../config';

/**
 * @description
 * Cliente SOAP para comunicação com a API Vmachine do Grupo Ferrasa.
 * Implementa os métodos definidos no WSDL para integração com vending machines.
 */
export class VmachineService {
  private config: VmachineConfig;
  private soapClient: any = null;

  constructor(config: Partial<VmachineConfig> = {}) {
    this.config = {
      endpoint: config.endpoint || VMACHINE_ENDPOINT,
      wsdl: config.wsdl,
      username: config.username || VMACHINE_AUTH_KEY,
      password: config.password,
    };
  }

  /**
   * @description Inicializa o cliente SOAP
   */
  private async initClient(): Promise<void> {
    if (this.soapClient) return;

    try {
      console.log(`[VmachineService] Cliente inicializado para: ${this.endpoint}`);
    } catch (error) {
      console.error('[VmachineService] Erro ao inicializar cliente SOAP:', error);
      throw error;
    }
  }

  get endpoint(): string {
    return this.config.endpoint;
  }

  get wsdl(): string | undefined {
    return this.config.wsdl;
  }

  /**
   * @description Gera o envelope SOAP com cabeçalho de autenticação
   */
  private buildSoapEnvelope(body: string): string {
    const authKey = this.config.username || '';

    return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                 xmlns:ven="http://multiclubes.com.br/retail/vendingmachine">
  <soapenv:Header>
    <_AuthenticationKey xmlns="ns">${authKey}</_AuthenticationKey>
  </soapenv:Header>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * @description Realiza o consumo (autorização de venda)
   * @param request - Dados da transação de consumo
   */
  async performConsumption(request: PerformConsumptionRequest): Promise<PerformConsumptionResponse> {
    await this.initClient();

    // Gera um ConsumptionUid único se não fornecido
    const consumptionUid = request.IdTransaction;

    const body = `<ven:PerformConsumption>
      <ven:data>
        <ven:ConsumptionAccount>${request.TagNumber}</ven:ConsumptionAccount>
        <ven:ConsumptionUid>${consumptionUid}</ven:ConsumptionUid>
        <ven:Items>
          ${request.Products.ProductItem.map(item => `<ven:ConsumptionItemData>
            <ven:Product>${item.Code}</ven:Product>
            <ven:Quantity>${item.Quantity}</ven:Quantity>
            <ven:UnitPrice>${item.Price}</ven:UnitPrice>
          </ven:ConsumptionItemData>`).join('')}
        </ven:Items>
        <ven:PosEid>${request.MachineNumber}</ven:PosEid>
      </ven:data>
    </ven:PerformConsumption>`;

    const soapEnvelope = this.buildSoapEnvelope(body);
    return this.callSoapMethod('PerformConsumption', soapEnvelope);
  }

  /**
   * @description Estorna uma transação de consumo
   * @param request - Dados do estorno
   */
  async reverseConsumption(request: ReverseConsumptionRequest): Promise<ReverseConsumptionResponse> {
    await this.initClient();

    const body = `<ven:ReverseConsumption>
      <ven:data>
        <ven:ConsumptionUid>${request.IdTransaction}</ven:ConsumptionUid>
      </ven:data>
    </ven:ReverseConsumption>`;

    const soapEnvelope = this.buildSoapEnvelope(body);
    console.log('[VmachineService] ReverseConsumption - Envelope SOAP:');
    console.log(soapEnvelope);
    return this.callSoapMethod('ReverseConsumption', soapEnvelope);
  }

  /**
   * @description Consulta o saldo de uma tag
   * @param request - Dados para consulta de saldo
   */
  async getBalance(request: GetBalanceRequest): Promise<GetBalanceResponse> {
    await this.initClient();

    const body = `<ven:GetBalance>
      <ven:data>
        <ven:ConsumptionAccount>${request.TagNumber}</ven:ConsumptionAccount>
        <ven:PosEid>${request.MachineNumber}</ven:PosEid>
      </ven:data>
    </ven:GetBalance>`;

    const soapEnvelope = this.buildSoapEnvelope(body);
    console.log('[VmachineService] GetBalance - Envelope SOAP:');
    console.log(soapEnvelope);
    return this.callSoapMethod('GetBalance', soapEnvelope);
  }

  /**
   * @description Realiza uma venda direta
   * @param request - Dados da venda
   */
  async performSale(request: PerformSaleRequest): Promise<PerformSaleResponse> {
    await this.initClient();

    const body = `<PerformSale xmlns="http://multiclubes.com.br/retail/vendingmachine">
      <IdTransaction>${request.IdTransaction}</IdTransaction>
      <TagNumber>${request.TagNumber}</TagNumber>
      <MachineNumber>${request.MachineNumber}</MachineNumber>
      <Products>
        ${request.Products.ProductItem.map(item => `<ProductItem>
          <Code>${item.Code}</Code>
          <Quantity>${item.Quantity}</Quantity>
          <Price>${item.Price}</Price>
        </ProductItem>`).join('')}
      </Products>
      <Date>${request.Date}</Date>
    </PerformSale>`;

    const soapEnvelope = this.buildSoapEnvelope(body);
    console.log('[VmachineService] PerformSale - Envelope SOAP:');
    console.log(soapEnvelope);
    return this.callSoapMethod('PerformSale', soapEnvelope);
  }

  /**
   * @description Cancela uma venda
   * @param request - Dados do cancelamento
   */
  async cancelSale(request: CancelSaleRequest): Promise<CancelSaleResponse> {
    await this.initClient();

    const body = `<CancelSale xmlns="http://multiclubes.com.br/retail/vendingmachine">
      <IdTransaction>${request.IdTransaction}</IdTransaction>
      <MachineNumber>${request.MachineNumber}</MachineNumber>
      <Date>${request.Date}</Date>
    </CancelSale>`;

    const soapEnvelope = this.buildSoapEnvelope(body);
    console.log('[VmachineService] CancelSale - Envelope SOAP:');
    console.log(soapEnvelope);
    return this.callSoapMethod('CancelSale', soapEnvelope);
  }

  /**
   * @description Busca contas/tags por critérios
   * @param request - Critérios de busca
   */
  async searchAccounts(request: SearchAccountsRequest): Promise<SearchAccountsResponse> {
    await this.initClient();

    const body = `<SearchAccounts xmlns="http://multiclubes.com.br/retail/vendingmachine">
      ${request.TagNumber ? `<TagNumber>${request.TagNumber}</TagNumber>` : ''}
      ${request.Name ? `<Name>${request.Name}</Name>` : ''}
      ${request.Document ? `<Document>${request.Document}</Document>` : ''}
    </SearchAccounts>`;

    const soapEnvelope = this.buildSoapEnvelope(body);
    console.log('[VmachineService] SearchAccounts - Envelope SOAP:');
    console.log(soapEnvelope);
    return this.callSoapMethod('SearchAccounts', soapEnvelope);
  }

  /**
   * @description Executa uma chamada SOAP genérica
   */
  private async callSoapMethod<T>(methodName: string, soapEnvelope: string): Promise<T> {
    const agent = new https.Agent({
      rejectUnauthorized: false, // Para desenvolvimento
    });

    // Log da requisição SOAP para debug
    console.log(`[VmachineService] ${methodName} - Envelope SOAP:`);
    console.log(soapEnvelope);

    try {
      const response = await axios.post(this.endpoint, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `"http://multiclubes.com.br/retail/vendingmachine/IService/${methodName}"`,
        },
        httpsAgent: agent,
        timeout: 30000,
      });

      // Log da resposta
      console.log(`[VmachineService] ${methodName} - Resposta (raw):`, response.data.substring(0, 500));

      // Faz parse do XML para JSON
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: true,
      });

      const jsonResponse = parser.parse(response.data);
      console.log(`[VmachineService] ${methodName} - Resposta (parsed):`, JSON.stringify(jsonResponse, null, 2));

      console.log(`[VmachineService] ${methodName} executado com sucesso`);
      return this.parseSoapResponse<T>(jsonResponse, methodName);
    } catch (error: any) {
      // Log detalhado do erro
      console.error(`[VmachineService] ${methodName} - Erro HTTP:`, error.response?.status);
      console.error(`[VmachineService] ${methodName} - Resposta de erro:`, error.response?.data);

      throw this.handleSoapError(error, methodName);
    }
  }

  /**
   * @description Faz o parse da resposta SOAP
   * A estrutura típica é: Envelope -> Body -> {MethodName}Response -> {MethodName}Result
   */
  private parseSoapResponse<T>(responseData: any, methodName: string): T {
    try {
      console.log(`[VmachineService] ${methodName} - Parse: responseData keys =`, Object.keys(responseData || {}));

      // Estrutura após parse: Envelope -> Body -> {MethodName}Response -> {MethodName}Result
      const envelope = responseData?.Envelope || responseData?.['soap:Envelope'];
      console.log(`[VmachineService] ${methodName} - Parse: envelope =`, envelope ? 'encontrado' : 'null');

      if (envelope) {
        const body = envelope.Body || envelope['soap:Body'];
        console.log(`[VmachineService] ${methodName} - Parse: body keys =`, body ? Object.keys(body) : 'null');

        if (body) {
          // Procura por {MethodName}Response
          const responseKey = `${methodName}Response`;
          const response = body[responseKey];
          console.log(`[VmachineService] ${methodName} - Parse: ${responseKey} =`, response ? 'encontrado' : 'null');

          if (response) {
            // Procura por {MethodName}Result dentro da response
            const resultKey = `${methodName}Result`;
            const result = response[resultKey];
            console.log(`[VmachineService] ${methodName} - Parse: ${resultKey} =`, result ? 'encontrado' : 'null');

            if (result) {
              console.log(`[VmachineService] ${methodName} - Resultado extraído com sucesso`);
              return result;
            }
          }

          // Verifica se há Fault
          if (body.Fault || body['s:Fault']) {
            const fault = body.Fault || body['s:Fault'];
            const faultString = fault.faultstring || fault['fault:string'] || fault.message;
            console.error(`[VmachineService] ${methodName} - Fault:`, faultString);
          }
        }
      }

      // Fallback: tenta extrair qualquer Result encontrado
      if (responseData && typeof responseData === 'object') {
        const findResult = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return null;
          for (const key of Object.keys(obj)) {
            if (key.includes('Result')) {
              console.log(`[VmachineService] ${methodName} - Fallback encontrou:`, key);
              return obj[key];
            }
            const found = findResult(obj[key]);
            if (found) return found;
          }
          return null;
        };

        const result = findResult(responseData);
        if (result) {
          console.log(`[VmachineService] ${methodName} - Resultado encontrado (fallback)`);
          return result;
        }
      }

      console.log(`[VmachineService] ${methodName} - Resposta retornada sem parse`);
      return responseData;
    } catch (error) {
      console.error(`[VmachineService] Erro ao fazer parse da resposta de ${methodName}:`, error);
      throw error;
    }
  }

  /**
   * @description Tratamento de erros SOAP
   */
  private handleSoapError(error: any, methodName: string): Error {
    if (error.response?.data) {
      // Tenta extrair a mensagem de erro do Fault SOAP
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: false,
      });

      try {
        const jsonError = parser.parse(error.response.data);
        console.log('[VmachineService] Erro parseado:', JSON.stringify(jsonError, null, 2));

        // Acessa via path
        const envelope = jsonError['s:Envelope'] || jsonError.Envelope;
        const body = envelope?.['s:Body'] || envelope?.Body;
        const fault = body?.['s:Fault'] || body?.Fault;

        if (fault) {
          // faultstring pode ter #text
          const faultStringObj = fault['s:faultstring'] || fault.faultstring;
          const faultString = typeof faultStringObj === 'object' && faultStringObj?.['#text']
            ? faultStringObj['#text']
            : String(faultStringObj);

          // detail.Fault pode ter #text
          const detail = fault.detail;
          let errorType = '';
          if (detail?.['Fault']?.['#text']) {
            errorType = detail['Fault']['#text'];
          } else if (typeof detail === 'string') {
            errorType = detail;
          }

          const message = faultString || errorType || error.response.statusText;
          return new Error(`${errorType ? errorType + ': ' : ''}${message}`);
        }
      } catch (parseError) {
        console.error('[VmachineService] Erro ao fazer parse do Fault:', parseError);
      }

      return new Error(`SOAP Error em ${methodName}: HTTP ${error.response.status} - ${error.response.statusText}`);
    } else if (error.code === 'ECONNREFUSED') {
      return new Error(`SOAP Error em ${methodName}: Não foi possível conectar ao servidor`);
    }
    return new Error(`SOAP Error em ${methodName}: ${error.message}`);
  }

  /**
   * @description Testa a conexão com o serviço
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.searchAccounts({});
      return true;
    } catch (error) {
      console.error('[VmachineService] Teste de conexão falhou:', error);
      return false;
    }
  }
}

// Exporta instância única do serviço
export const vmachineService = new VmachineService();
