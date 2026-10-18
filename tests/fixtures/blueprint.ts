/** A realistic, schema-valid model response used across tests. */
export function makeBlueprint(overrides: Record<string, unknown> = {}) {
  return {
    store_name: "Ember & Oak",
    currency: "eur",
    alternative_names: [
      { name: "Hearthwick", rationale: "Warm and tactile." },
      { name: "Slow Flame", rationale: "Signals calm." },
      { name: "Oakline", rationale: "Natural and modern." },
      { name: "Kindle Co", rationale: "Approachable." },
    ],
    tagline: "Slow-burning comfort for considered homes.",
    brand_story: "  We started with one question.  ",
    target_audience: { summary: "Design-minded renters", segments: ["Gift buyers", "Self-care"] },
    brand_colors: [
      { name: "Charcoal", hex: "#1F1D1B", usage: "Text" },
      { name: "Broken", hex: "not-a-color", usage: "Oops" },
      { name: "Ember", hex: "#c2410c", usage: "Accent" },
    ],
    typography: { heading_font: "Fraunces", body_font: "Inter", rationale: "Editorial warmth." },
    positioning: { statement: "Premium candles.", price_positioning: "Premium", differentiators: ["Soy wax"] },
    product_categories: ["Signature", "Travel"],
    product_ideas: [{ name: "Reed diffuser", rationale: "Natural extension." }],
    products: [
      { title: "Cedar Hearth Candle", description: "A slow burn.", suggested_price: 34.004, category: "Signature", seo_title: "Cedar candle", seo_description: "Soy candle" },
      { title: "Fig Travel Tin", description: "Pocket-sized.", suggested_price: 18, category: "Travel", seo_title: "Fig tin", seo_description: "Travel candle" },
      { title: "   ", description: "Invalid: blank title", suggested_price: 10, category: "Travel", seo_title: "", seo_description: "" },
      { title: "Negative Price", description: "Clamped", suggested_price: -5, category: "Care", seo_title: "", seo_description: "" },
    ],
    homepage: {
      hero_headline: "Light something slower.",
      hero_subheadline: "Hand-poured soy candles.",
      hero_cta: "Shop candles",
      featured_heading: "Signature scents",
      featured_subheading: "Start here.",
      benefits: [{ title: "Clean burn", description: "Soy wax and cotton wicks." }],
      story_heading: "Our story",
      story_body: "Made in small batches.",
      faq_heading: "Questions",
      newsletter_heading: "Stay in the glow",
      newsletter_body: "Occasional emails.",
      footer_tagline: "Made slowly.",
    },
    about_page: { heading: "About", body: "We make candles." },
    faq: [{ question: "How long do they burn?", answer: "About 50 hours." }],
    seo: { title: "Ember & Oak Candles", meta_description: "Soy candles.", keywords: ["soy candles"] },
    theme: { style: "Minimal editorial", characteristics: ["Large imagery"], recommended_sections: ["Hero"] },
    launch_checklist: [
      { title: "Order product samples", description: "Test burn times.", category: "Product" },
      { title: "Choose a domain", description: "Duplicate of a core step", category: "Setup" },
    ],
    ...overrides,
  };
}
