import * as esbuild from "esbuild"
import { cp, mkdir, rm, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, "dist")
const assetsDir = join(__dirname, "assets")
const watch = process.argv.includes("--watch")

const copyFile = async (source, target) => {
  await mkdir(dirname(target), { recursive: true })
  await cp(source, target)
}

const copyAssets = async () => {
  await copyFile(join(__dirname, "manifest.json"), join(distDir, "manifest.json"))

  const assetFiles = await readdir(assetsDir)
  for (const file of assetFiles) {
    await copyFile(join(assetsDir, file), join(distDir, "assets", file))
  }
}

const buildOptions = {
  entryPoints: [join(__dirname, "src", "content.ts")],
  bundle: true,
  outfile: join(distDir, "content.js"),
  platform: "browser",
  target: "es2020",
  format: "iife",
  sourcemap: true
}

const run = async () => {
  await rm(distDir, { recursive: true, force: true })
  await mkdir(distDir, { recursive: true })
  await copyAssets()

  if (!watch) {
    await esbuild.build(buildOptions)
    console.log("Build complete")
    return
  }

  const ctx = await esbuild.context(buildOptions)
  await ctx.watch()
  console.log("Watching for changes...")

  process.on("SIGINT", async () => {
    await ctx.dispose()
    process.exit(0)
  })
}

run().catch((error) => {
  console.error("Build failed:", error)
  process.exit(1)
})
