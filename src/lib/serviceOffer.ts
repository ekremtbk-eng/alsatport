export const SERVICE_OFFER_PATH = "/hizmet-vermek-istiyorum";

export function serviceListingStartHref(city: string) {
  const params = new URLSearchParams({ type: "hizmet" });
  if (city.trim()) params.set("city", city.trim());
  return `/ilan-ver?${params.toString()}`;
}

export function serviceOfferSignupHref(email: string, city: string) {
  const params = new URLSearchParams({
    email: email.trim(),
    next: serviceListingStartHref(city),
  });
  return `/kayit?${params.toString()}`;
}
