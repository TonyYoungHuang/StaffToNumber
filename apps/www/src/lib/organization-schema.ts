export type PublicOperatorIdentity = {
  legalName: string;
  registrationIdentifier: string;
  addressCountry: string;
  addressRegion: string;
  addressLocality: string;
  postalCode: string;
  sameAs: string[];
};

type OrganizationSchemaInput = {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  operator: PublicOperatorIdentity;
};

export function buildOrganizationSchema(input: OrganizationSchemaInput) {
  const address = {
    "@type": "PostalAddress",
    ...(input.operator.addressCountry ? { addressCountry: input.operator.addressCountry } : {}),
    ...(input.operator.addressRegion ? { addressRegion: input.operator.addressRegion } : {}),
    ...(input.operator.addressLocality ? { addressLocality: input.operator.addressLocality } : {}),
    ...(input.operator.postalCode ? { postalCode: input.operator.postalCode } : {}),
  };
  const hasAddress = Object.keys(address).length > 1;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.siteName,
    url: input.siteUrl,
    email: input.supportEmail,
    ...(input.operator.legalName ? { legalName: input.operator.legalName } : {}),
    ...(input.operator.registrationIdentifier
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "business-registration",
            value: input.operator.registrationIdentifier,
          },
        }
      : {}),
    ...(hasAddress ? { address } : {}),
    ...(input.operator.sameAs.length > 0 ? { sameAs: input.operator.sameAs } : {}),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: input.supportEmail,
        availableLanguage: ["English", "Chinese"],
      },
    ],
  };
}
