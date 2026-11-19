import { isVerified, RENTAL_PERIOD_LABEL, type ListingItem, type PublicUser, type ServiceItem } from '@bara/shared';
import type { ListingCardProps } from '@/components/ListingCard';

const toOwner = (u: PublicUser): ListingCardProps['owner'] => ({
  name: u.displayName,
  verified: isVerified(u),
  rating: u.reviewCount > 0 ? u.reputationScore : undefined,
});

export function listingToCard(l: ListingItem): ListingCardProps {
  const base = {
    kind: l.type,
    title: l.title,
    href: `/p/${l.id}`,
    neighborhood: l.neighborhood,
    imageUrl: l.images[0],
    owner: toOwner(l.owner),
  };

  switch (l.type) {
    case 'SALE':
      return { ...base, price: l.price ?? undefined };
    case 'RENT':
      return {
        ...base,
        price: l.rentalRate ?? undefined,
        priceSuffix: l.rentalPeriod ? RENTAL_PERIOD_LABEL[l.rentalPeriod].suffix : undefined,
      };
    case 'BARTER':
      return { ...base, barterWants: l.barterWants };
  }
}

export function serviceToCard(s: ServiceItem): ListingCardProps {
  return {
    kind: 'SERVICE',
    title: s.title,
    href: `/s/${s.id}`,
    neighborhood: s.neighborhood,
    imageUrl: s.images?.[0],
    owner: toOwner(s.provider),
    // QUOTE → sin precio → la tarjeta muestra "A cotizar".
    price: s.pricingModel === 'QUOTE' ? undefined : (s.basePrice ?? undefined),
    priceSuffix: s.pricingModel === 'HOURLY' ? '/hora' : undefined,
  };
}
