import type { BidResult, MaterialBreakdown, PaintType } from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';
import { calculateInteriorMaterials } from './utils/materialCalculations';

export type RoomType =
  | 'bedroom'
  | 'living-room'
  | 'kitchen'
  | 'bathroom'
  | 'closet'
  | 'dining-room'
  | 'basement'
  | 'hallway'
  | 'office';

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  'bedroom': 'Bedroom',
  'living-room': 'Living Room',
  'kitchen': 'Kitchen',
  'bathroom': 'Bathroom',
  'closet': 'Closet',
  'dining-room': 'Dining Room',
  'basement': 'Basement',
  'hallway': 'Hallway',
  'office': 'Office',
};

// Default SF estimates per room type (for auto-fill)
export const ROOM_DEFAULT_SF: Record<RoomType, number> = {
  'bedroom': 180,
  'living-room': 300,
  'kitchen': 200,
  'bathroom': 80,
  'closet': 50,
  'dining-room': 200,
  'basement': 500,
  'hallway': 100,
  'office': 150,
};

export interface RoomEntry {
  id: string;
  roomType: RoomType;
  roomLabel: string; // e.g. "Master Bedroom", "Bedroom 2"
  wallSqft: number;
  ceilingSqft: number;
  trimLF: number;
  doors: number;
  paintType: PaintType;
}

export interface PerRoomInputs {
  rooms: RoomEntry[];
  markup: number;
}

export interface RoomResult {
  roomId: string;
  roomLabel: string;
  labor: number;
  materials: MaterialBreakdown;
  subtotal: number;
}

export interface PerRoomBidResult extends BidResult {
  roomResults: RoomResult[];
}

export function calculatePerRoom(
  inputs: PerRoomInputs,
  pricing: PricingSettings
): PerRoomBidResult {
  const getRate = (lineItemId: string): number => {
    const item = pricing.lineItems.find((i) => i.id === lineItemId);
    return item?.rate || 0;
  };

  const roomResults: RoomResult[] = inputs.rooms.map((room) => {
    const labor =
      room.wallSqft * getRate('int-wall-sqft') +
      room.ceilingSqft * getRate('int-ceiling-sqft') +
      room.trimLF * getRate('int-trim-lf') +
      room.doors * getRate('int-door');

    const materials = calculateInteriorMaterials({
      wallSqft: room.wallSqft,
      ceilingSqft: room.ceilingSqft,
      trimLF: room.trimLF,
      cabinetDoors: 0,
      newCabinetDoors: 0,
      paintType: room.paintType,
    }, pricing);

    return {
      roomId: room.id,
      roomLabel: room.roomLabel,
      labor,
      materials,
      subtotal: labor + materials.totalCost,
    };
  });

  const totalLabor = roomResults.reduce((sum, r) => sum + r.labor, 0);
  const totalMaterialCost = roomResults.reduce((sum, r) => sum + r.materials.totalCost, 0);
  const allMaterialItems = roomResults.flatMap((r) => r.materials.items);

  const materials: MaterialBreakdown = {
    items: allMaterialItems,
    totalCost: totalMaterialCost,
  };

  const subtotal = totalLabor + totalMaterialCost;
  const marginFactor = Math.max(1 - inputs.markup / 100, 0.01);
  const total = subtotal / marginFactor;
  const profit = total - subtotal;

  return {
    labor: totalLabor,
    materials,
    profit,
    total,
    breakdown: { rooms: roomResults, markup: inputs.markup },
    timestamp: new Date(),
    roomResults,
  };
}
