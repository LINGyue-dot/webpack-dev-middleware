/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Stats} Stats */
/** @typedef {import("webpack").MultiStats} MultiStats */
/** @typedef {import("../index.js").IncomingMessage} IncomingMessage */
/** @typedef {import("../index.js").ServerResponse} ServerResponse */

/**
 * @template {IncomingMessage} Request
 * @template {ServerResponse} Response
 * @param {import("../index.js").Context<Request, Response>} context
 */
function getPaths(context) {
  const { stats, options } = context;
  /** @type {Stats[]} */
  const childStats =
    /** @type {MultiStats} */
     // 正常编译打包 stats.stats = normal
    (stats).stats
      ? /** @type {MultiStats} */ (stats).stats
      : [/** @type {Stats} */ (stats)];
  const publicPaths = [];

  for (const { compilation } of childStats) {
    /**
     * compilation 示例
     * {
          errors: [], // 报错信息
          warnings: [], // 警告信息
          assets: [], // 输出的文件名
          chunks: [], // 所有的代码块
          modules: [], // 所有的代码模块
          entrypoints: [], // 所有的入口文件
          namedChunkGroups: [], // 所有命名的 chunk
          children: [], // 子编译器的 stats 数据
          hash: "hash值",
          etag: "etag值",
          version: "版本号",
          publicPath: "publicPath",
          assetsByChunkName: {}
        }
     */
    // The `output.path` is always present and always absolute
    // 绝对路径  
    const outputPath = compilation.getPath(
      compilation.outputOptions.path || ""
    );
    // ==> basePath
    const publicPath = options.publicPath
      ? compilation.getPath(options.publicPath)
      : compilation.outputOptions.publicPath
      ? compilation.getPath(compilation.outputOptions.publicPath)
      : "";

    publicPaths.push({ outputPath, publicPath });
  }

  return publicPaths;
}

module.exports = getPaths;
