export default {
  // relative asset paths so the build works from any subpath (e.g. GitHub Pages)
  base: "./",
  build: {
    outDir: "docs",
  },
  server: {
    allowedHosts: true,
  },
};
