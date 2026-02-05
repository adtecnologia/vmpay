// Configurações compartilhadas da aplicação

// API Key para autenticação na API VMpay
export const API_KEY = process.env.VMPAY_API_KEY || '305f5cd2-331a-444a-946c-910640622038';

// Chave de autenticação para o serviço SOAP Vmachine
export const VMACHINE_AUTH_KEY = process.env.VMACHINE_AUTH_KEY || API_KEY;

// Configuração do endpoint SOAP Vmachine
export const VMACHINE_ENDPOINT = process.env.VMACHINE_ENDPOINT || 'https://vmachine.grupoferrasa.com.br:10100/(FCF9630D-13BD-4E65-A64E-DDB18E13D416)/vmachine.svc';

export const VMACHINE_WSDL = process.env.VMACHINE_WSDL || 'https://vmachine.grupoferrasa.com.br:10100/(FCF9630D-13BD-4E65-A64E-DDB18E13D416)/vmachine.svc?wsdl';

// Porta do servidor
export const PORT = parseInt(process.env.PORT || '3000', 10);
