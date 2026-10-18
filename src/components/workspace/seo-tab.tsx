"use client";

import * as React from "react";
import { Field, Input, Textarea } from "@/components/ui/input";
import { CharCount, Section, StringListEditor } from "@/components/workspace/fields";
import { useAutosave } from "@/components/workspace/save-status";
import { updateProduct, type ProductRow } from "@/lib/actions/projects";
import type { StoreContent } from "@/lib/blueprint";
import type { ContentUpdater } from "@/components/workspace/workspace";

type Props = {
  content: StoreContent;
  update: ContentUpdater;
  products: ProductRow[];
  setProducts: React.Dispatch<React.SetStateAction<ProductRow[]>>;
};

export function SeoTab({ content, update, products, setProducts }: Props) {
  const seo = content.seo;
  return (
    <div className="space-y-4">
      <Section title="Homepage SEO" description="Shopify: Online Store → Preferences → Title and meta description.">
        <Field label="SEO title" htmlFor="seo_title">
          <Input id="seo_title" maxLength={120} value={seo.title} onChange={(e) => update("seo", { ...seo, title: e.target.value })} />
        </Field>
        <div className="-mt-3 flex justify-end">
          <CharCount value={seo.title} max={120} recommended={60} />
        </div>
        <Field label="Meta description" htmlFor="seo_meta">
          <Textarea id="seo_meta" rows={3} maxLength={320} value={seo.meta_description} onChange={(e) => update("seo", { ...seo, meta_description: e.target.value })} />
        </Field>
        <div className="-mt-3 flex justify-end">
          <CharCount value={seo.meta_description} max={320} recommended={155} />
        </div>
        <SearchPreview title={seo.title || content.store_name} description={seo.meta_description} />
        <Field label="Keywords" htmlFor="seo_keywords">
          <StringListEditor
            id="seo_keywords"
            values={seo.keywords}
            onChange={(keywords) => update("seo", { ...seo, keywords })}
            max={20}
            maxLength={80}
            placeholder="Keyword"
            addLabel="Add keyword"
          />
        </Field>
      </Section>

      <Section title="Product SEO" description="Shopify: each product → Search engine listing.">
        {products.length === 0 && <p className="text-sm text-fg-muted">No products yet.</p>}
        {products.map((product) => (
          <ProductSeoEditor
            key={product.id}
            product={product}
            onChange={(next) => setProducts((list) => list.map((p) => (p.id === next.id ? next : p)))}
          />
        ))}
      </Section>
    </div>
  );
}

function ProductSeoEditor({ product, onChange }: { product: ProductRow; onChange: (p: ProductRow) => void }) {
  useAutosave(`product:${product.id}`, product, (value) =>
    updateProduct(value.id, {
      title: value.title,
      description: value.description,
      price: value.price,
      category: value.category,
      seo: value.seo,
    }).then((r) => (r.ok ? { ok: true } : r)),
  );

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-medium">{product.title}</p>
      <div>
        <Input
          aria-label={`SEO title for ${product.title}`}
          placeholder="SEO title"
          maxLength={120}
          value={product.seo.title}
          onChange={(e) => onChange({ ...product, seo: { ...product.seo, title: e.target.value } })}
        />
        <div className="mt-1 flex justify-end">
          <CharCount value={product.seo.title} max={120} recommended={60} />
        </div>
      </div>
      <div>
        <Textarea
          aria-label={`SEO description for ${product.title}`}
          placeholder="SEO description"
          rows={2}
          maxLength={320}
          value={product.seo.description}
          onChange={(e) => onChange({ ...product, seo: { ...product.seo, description: e.target.value } })}
        />
        <div className="mt-1 flex justify-end">
          <CharCount value={product.seo.description} max={320} recommended={155} />
        </div>
      </div>
    </div>
  );
}

function SearchPreview({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 text-left" aria-label="Search result preview">
      <p className="text-xs text-[#4d5156]">yourstore.com</p>
      <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab]">{title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{description || "Add a meta description to control this snippet."}</p>
    </div>
  );
}
