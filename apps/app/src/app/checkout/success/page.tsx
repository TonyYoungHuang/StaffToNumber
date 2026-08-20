import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://scoretransposer.com";
  const destination = new URL("/checkout/success", `${siteUrl.replace(/\/$/u, "")}/`);

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") destination.searchParams.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => destination.searchParams.append(key, item));
  }

  redirect(destination.toString());
}
