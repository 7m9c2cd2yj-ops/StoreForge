/**
 * Shopify integration layer.
 *
 * Today StoreForge publishes via *export*: merchants download a Shopify import
 * CSV and copy content into their own store. No live Shopify store is created
 * or modified by this application.
 *
 * To add direct publishing later, implement `StorePublisher` with Shopify's
 * official Admin GraphQL API:
 *   - Authenticate with OAuth via a Shopify app (never ask for a merchant's
 *     Shopify password). Request the minimum scopes, e.g. `write_products`
 *     and `write_content`.
 *   - Store the offline access token encrypted, server-side only, in a new
 *     `shopify_connections` table with RLS (owner read: none; service role only).
 *   - Verify HMAC on OAuth callbacks and webhooks, and handle app uninstall.
 * Then register it in `getPublisher` behind a feature flag.
 */

import type { ExportProduct } from "@/lib/export/blueprint-export";
import { productsToShopifyCsv } from "@/lib/export/blueprint-export";

export type PublishResult =
  | { kind: "file"; filename: string; contentType: string; body: string }
  | { kind: "remote"; url: string };

export interface StorePublisher {
  readonly id: string;
  readonly label: string;
  /** Whether this publisher changes a live store (requires explicit user consent). */
  readonly writesToLiveStore: boolean;
  publishProducts(args: { storeName: string; products: ExportProduct[] }): Promise<PublishResult>;
}

export const csvExportPublisher: StorePublisher = {
  id: "shopify-csv",
  label: "Shopify product CSV",
  writesToLiveStore: false,
  async publishProducts({ storeName, products }) {
    return {
      kind: "file",
      filename: "shopify-products.csv",
      contentType: "text/csv; charset=utf-8",
      body: productsToShopifyCsv(products, storeName),
    };
  },
};

export function getPublisher(): StorePublisher {
  return csvExportPublisher;
}
