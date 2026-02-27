import type {
  CalculatorType,
  BidResult,
  InteriorSqftInputs,
  InteriorDetailedInputs,
  ExteriorSqftInputs,
  ExteriorDetailedInputs,
} from './calculator.types';

// Customer information
export interface CustomerInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  jobDate?: Date;
  notes?: string;
}

// Union type for all possible calculator inputs
export type CalculatorInputs =
  | InteriorSqftInputs
  | InteriorDetailedInputs
  | ExteriorSqftInputs
  | ExteriorDetailedInputs;

// A saved bid
export interface Bid {
  id: string;
  calculatorType: CalculatorType;
  customer: CustomerInfo;
  inputs: CalculatorInputs;
  result: BidResult;
  createdAt: Date;
  updatedAt: Date;
}

// Bid list item for display
export interface BidListItem {
  id: string;
  customerName: string;
  total: number;
  createdAt: Date;
  calculatorType: CalculatorType;
}
