"use client";

import * as React from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { CharCount } from "@/components/workspace/fields";
import { useAutosave, useForgetStatus } from "@/components/workspace/save-status";
import { createProduct, deleteProduct, updateProduct, type ProductRow } from "@/lib/actions/projects";
import { cn, formatMoney } from "@/lib/utils";

type Props = {
  projectId: string;
  products: ProductRow[];
  setProducts: React.Dispatch<React.SetStateAction<ProductRow[]>>;
  categories: string[];
  currency: string;
  onCurrencyChange: (currency: string) => void;
};

const ALL = "__all__";
const UNCATEGORISED = "Uncategorised";

export function ProductsTab({ projectId, products, setProducts, categories, currency, onCurrencyChange }: Props) {
  const [filter, setFilter] = React.useState(ALL);
  const [adding, startAdding] = React.useTransition();

  const allCategories = React.useMemo(() => {
    const set = new Set<string>(categories.filter(Boolean));
    products.forEach((p) => p.category && set.add(p.category));
    return [...set];
  }, [categories, products]);

  const groups = React.useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    for (const p of products) {
      const key = p.category || UNCATEGORISED;
      if (filter !== ALL && key !== filter) continue;
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()];
  }, [products, filter]);

  const add = () =>
    startAdding(async () => {
      const result = await createProduct(projectId, {
        title: "New product",
        category: filter !== ALL && filter !== UNCATEGORISED ? filter : "",
      });
      if (result.ok) {
        setProducts((list) => [...list, result.data]);
        toast.success("Product added");
      } else {
        toast.error(result.error);
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-[auto_1fr] items-center gap-3 sm:flex">
          <label htmlFor="category-filter" className="text-sm text-fg-muted">
            Category
          </label>
          <Select id="category-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-auto sm:min-w-44">
            <option value={ALL}>All ({products.length})</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c} ({products.filter((p) => p.category === c).length})
              </option>
            ))}
            {products.some((p) => !p.category) && <option value={UNCATEGORISED}>{UNCATEGORISED}</option>}
          </Select>
          <label htmlFor="currency" className="text-sm text-fg-muted">
            Currency
          </label>
          <CurrencyInput value={currency} onChange={onCurrencyChange} />
        </div>
        <Button onClick={add} disabled={adding || products.length >= 200}>
          {adding ? <Spinner /> : <Plus />} Add product
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={<Package />} title="No products yet" description="Add your first product to start building the catalog." />
      ) : (
        groups.map(([category, items]) => (
          <section key={category} aria-label={category}>
            <h3 className="mb-3 text-sm font-medium text-fg-muted">
              {category} <span className="text-fg-subtle">· {items.length}</span>
            </h3>
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((product) => (
                <ProductEditor
                  key={product.id}
                  product={product}
                  categories={allCategories}
                  currency={currency}
                  onChange={(next) => setProducts((list) => list.map((p) => (p.id === next.id ? next : p)))}
                  onDeleted={() => setProducts((list) => list.filter((p) => p.id !== product.id))}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  currency,
  onChange,
  onDeleted,
}: {
  product: ProductRow;
  categories: string[];
  currency: string;
  onChange: (product: ProductRow) => void;
  onDeleted: () => void;
}) {
  const [priceText, setPriceText] = React.useState(product.price.toFixed(2));
  const [deleting, startDeleting] = React.useTransition();
  const forget = useForgetStatus();
  const listId = `categories-${product.id}`;

  useAutosave(`product:${product.id}`, product, (value) =>
    updateProduct(value.id, {
      title: value.title,
      description: value.description,
      price: value.price,
      category: value.category,
      seo: value.seo,
    }).then((r) => (r.ok ? { ok: true } : r)),
  );

  const set = <K extends keyof ProductRow>(key: K, value: ProductRow[K]) => onChange({ ...product, [key]: value });
  const priceValid = /^\d{1,7}([.,]\d{0,2})?$/.test(priceText.trim());

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Title" htmlFor={`title-${product.id}`} error={product.title.trim() ? undefined : "Title is required"}>
          <Input id={`title-${product.id}`} value={product.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label={`Price (${currency})`} htmlFor={`price-${product.id}`} error={priceValid ? undefined : "Invalid price"}>
          <Input
            id={`price-${product.id}`}
            inputMode="decimal"
            value={priceText}
            className="tabular-nums"
            aria-invalid={!priceValid}
            onChange={(e) => {
              setPriceText(e.target.value);
              const n = Number(e.target.value.replace(",", "."));
              if (/^\d{1,7}([.,]\d{0,2})?$/.test(e.target.value.trim()) && Number.isFinite(n)) set("price", n);
            }}
            onBlur={() => priceValid && setPriceText(product.price.toFixed(2))}
          />
        </Field>
      </div>
      <Field label="Category" htmlFor={`category-${product.id}`} className="mt-4">
        <Input id={`category-${product.id}`} list={listId} value={product.category} maxLength={100} onChange={(e) => set("category", e.target.value)} />
        <datalist id={listId}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Description" htmlFor={`description-${product.id}`} className="mt-4">
        <Textarea id={`description-${product.id}`} rows={5} maxLength={5000} value={product.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={cn("text-sm text-fg-subtle tabular-nums")}>{formatMoney(product.price, currency)}</span>
        <div className="flex items-center gap-3">
          <CharCount value={product.description} max={5000} />
          <ConfirmDialog
            title={`Delete “${product.title}”?`}
            description="This removes the product from your blueprint. This can't be undone."
            confirmLabel="Delete product"
            pending={deleting}
            onConfirm={() =>
              new Promise<void>((resolve) =>
                startDeleting(async () => {
                  const result = await deleteProduct(product.id);
                  if (result.ok) {
                    forget(`product:${product.id}`);
                    onDeleted();
                    toast.success("Product deleted");
                  } else toast.error(result.error);
                  resolve();
                }),
              )
            }
            trigger={
              <Button size="icon-sm" variant="ghost" aria-label={`Delete ${product.title}`}>
                <Trash2 />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}

/** ISO 4217 code input; only commits well-formed codes. */
function CurrencyInput({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [text, setText] = React.useState(value);
  const valid = /^[A-Za-z]{3}$/.test(text);
  return (
    <Input
      id="currency"
      value={text}
      maxLength={3}
      aria-invalid={!valid}
      className="w-20 font-mono uppercase"
      onChange={(e) => {
        setText(e.target.value);
        if (/^[A-Za-z]{3}$/.test(e.target.value)) onChange(e.target.value.toUpperCase());
      }}
    />
  );
}
