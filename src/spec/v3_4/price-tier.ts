import type { ComplexType } from '../../core/descriptor';
import type { PriceTierInput } from '../../model';

/** `price_tier_type` */
export const PRICE_TIER: ComplexType<PriceTierInput> = {
    name: 'price_tier_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 1, max: 1 },
        { el: 'name', key: 'name', kind: 'string', min: 1, max: 1 },
    ],
};
