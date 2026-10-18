"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileDown, LayoutGrid, Package, Palette, PanelsTopLeft, Rocket, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaveIndicator, SaveStatusProvider, useAutosave } from "@/components/workspace/save-status";
import { OverviewTab } from "@/components/workspace/overview-tab";
import { BrandingTab } from "@/components/workspace/branding-tab";
import { ProductsTab } from "@/components/workspace/products-tab";
import { HomepageTab } from "@/components/workspace/homepage-tab";
import { SeoTab } from "@/components/workspace/seo-tab";
import { LaunchTab } from "@/components/workspace/launch-tab";
import { ExportTab } from "@/components/workspace/export-tab";
import { updateProjectContent, type ProductRow } from "@/lib/actions/projects";
import type { ChecklistItem, StoreContent } from "@/lib/blueprint";

export type ExportAccess = { export: boolean; jsonExport: boolean; planName: string };

export type WorkspaceProps = {
  projectId: string;
  initialContent: StoreContent;
  initialProducts: ProductRow[];
  initialChecklist: ChecklistItem[];
  exportAccess: ExportAccess;
};

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "products", label: "Products", icon: Package },
  { id: "homepage", label: "Homepage", icon: PanelsTopLeft },
  { id: "seo", label: "SEO", icon: Search },
  { id: "launch", label: "Launch checklist", icon: Rocket },
  { id: "export", label: "Export", icon: FileDown },
] as const;
type TabId = (typeof TABS)[number]["id"];

export type ContentUpdater = <K extends keyof StoreContent>(key: K, value: StoreContent[K]) => void;

export function Workspace(props: WorkspaceProps) {
  return (
    <SaveStatusProvider>
      <WorkspaceInner {...props} />
    </SaveStatusProvider>
  );
}

function WorkspaceInner({ projectId, initialContent, initialProducts, initialChecklist, exportAccess }: WorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const [tab, setTab] = React.useState<TabId>(TABS.some((t) => t.id === requested) ? (requested as TabId) : "overview");
  const [content, setContent] = React.useState(initialContent);
  const [products, setProducts] = React.useState(initialProducts);
  const currency = content.currency;

  useAutosave(`content:${projectId}`, content, async (value) => {
    const result = await updateProjectContent(projectId, value);
    return result.ok ? { ok: true } : result;
  });

  const update: ContentUpdater = React.useCallback((key, value) => {
    setContent((c) => ({ ...c, [key]: value }));
  }, []);

  const onTabChange = (value: string) => {
    setTab(value as TabId);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-fg-subtle">Store workspace</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{content.store_name || "Untitled store"}</h1>
          {content.tagline && <p className="mt-1 text-fg-muted">{content.tagline}</p>}
        </div>
        <SaveIndicator />
      </div>

      <Tabs value={tab} onValueChange={onTabChange} className="mt-6">
        <TabsList aria-label="Workspace sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id}>
              <Icon aria-hidden /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab content={content} products={products} checklist={initialChecklist} currency={currency} onUseName={(name) => update("store_name", name)} onNavigate={onTabChange} />
        </TabsContent>
        <TabsContent value="branding">
          <BrandingTab content={content} update={update} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab
            projectId={projectId}
            products={products}
            setProducts={setProducts}
            categories={content.product_categories}
            currency={currency}
            onCurrencyChange={(code) => update("currency", code)}
          />
        </TabsContent>
        <TabsContent value="homepage">
          <HomepageTab content={content} update={update} products={products} currency={currency} />
        </TabsContent>
        <TabsContent value="seo">
          <SeoTab content={content} update={update} products={products} setProducts={setProducts} />
        </TabsContent>
        <TabsContent value="launch">
          <LaunchTab projectId={projectId} initialChecklist={initialChecklist} />
        </TabsContent>
        <TabsContent value="export">
          <ExportTab projectId={projectId} content={content} access={exportAccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
