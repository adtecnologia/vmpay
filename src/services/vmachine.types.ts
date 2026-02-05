// ============================================
// Tipos para a API SOAP do Vmachine (Grupo Ferrasa)
// ============================================

export interface VmachineConfig {
  endpoint: string;
  wsdl?: string;
  username?: string;
  password?: string;
}

export interface ProductItem {
  Code: string;
  Quantity: number;
  Price: number;
}

export interface PerformConsumptionRequest {
  IdTransaction: string;
  TagNumber: string;
  MachineNumber: string;
  Products: {
    ProductItem: ProductItem[];
  };
  Date: string;
}

// Resposta baseada no WSDL real do Vmachine
export interface PerformConsumptionResponse {
  AvailableCredit?: number;
  CustomerName?: string;
  PrintOrderTicketNumber?: string;
  Status: 'Success' | 'Failure' | string;
  Total?: number;
}

export interface ReverseConsumptionRequest {
  IdTransaction: string;
  MachineNumber: string;
  Date?: string;
}

export interface ReverseConsumptionResponse {
  ReverseConsumptionResult: {
    Status: 'Success' | 'Failure' | string;
    Message?: string;
  };
}

export interface GetBalanceRequest {
  TagNumber: string;
  MachineNumber: string;
}

export interface GetBalanceResponse {
    AvailableCredit?: number;
    ConsumptionAccount?: number;
    CustomerName?: string;
    Document?: string;
}

export interface PerformSaleRequest {
  IdTransaction: string;
  TagNumber: string;
  MachineNumber: string;
  Products: {
    ProductItem: ProductItem[];
  };
  Date: string;
}

export interface PerformSaleResponse {
  PerformSaleResult: {
    AvailableCredit?: number;
    CustomerName?: string;
    PrintOrderTicketNumber?: string;
    Status: 'Success' | 'Failure' | string;
    Total?: number;
  };
}

export interface CancelSaleRequest {
  IdTransaction: string;
  MachineNumber: string;
  Date?: string;
}

export interface CancelSaleResponse {
  CancelSaleResult: {
    Status: 'Success' | 'Failure' | string;
    Message?: string;
  };
}

export interface SearchAccountsRequest {
  TagNumber?: string;
  Name?: string;
  Document?: string;
}

export interface AccountResult {
  Id: string;
  Name: string;
  Document: string;
  TagNumber: string;
  Balance: number;
  Active: boolean;
}

export interface SearchAccountsResponse {
  SearchAccountsResult: {
    Accounts?: {
      AccountResult: AccountResult[];
    };
    Status: 'Success' | 'Failure' | string;
    Message?: string;
  };
}
