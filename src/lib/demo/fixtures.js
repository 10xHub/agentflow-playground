// Fixture bundles are code-split: nothing here downloads unless a visitor enters the demo.
const LOADERS = {
  support: () => import("@/demo/fixtures/support.json"),
}

const loaded = {}

export const loadFixture = async (scenario) => {
  if (!loaded[scenario]) {
    const load = LOADERS[scenario]
    if (!load) throw new Error(`Unknown demo scenario: ${scenario}`)
    loaded[scenario] = (await load()).default
  }
  return loaded[scenario]
}

export const getLoadedFixture = (scenario) => loaded[scenario] ?? null
