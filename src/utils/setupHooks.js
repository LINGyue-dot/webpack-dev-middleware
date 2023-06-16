/** @typedef {import("webpack").Configuration} Configuration */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").MultiCompiler} MultiCompiler */
/** @typedef {import("webpack").Stats} Stats */
/** @typedef {import("webpack").MultiStats} MultiStats */

/** @typedef {import("../index.js").IncomingMessage} IncomingMessage */
/** @typedef {import("../index.js").ServerResponse} ServerResponse */
/** @typedef {Configuration["stats"]} StatsOptions */
/** @typedef {{ children: Configuration["stats"][] }} MultiStatsOptions */
/** @typedef {Exclude<Configuration["stats"], boolean | string | undefined>} NormalizedStatsOptions */

/**
 * 监听 webpack hook ，在 编译结束时候执行 context.callbacks
 * @template {IncomingMessage} Request
 * @template {ServerResponse} Response
 * @param {import("../index.js").Context<Request, Response>} context
 */
function setupHooks(context) {
  function invalid() {
    if (context.state) {
      context.logger.log("Compilation starting...");
    }

    // We are now in invalid state
    // eslint-disable-next-line no-param-reassign
    context.state = false;
    // eslint-disable-next-line no-param-reassign, no-undefined
    context.stats = undefined;
  }

  /**
   * @param {Configuration["stats"]} statsOptions
   * @returns {NormalizedStatsOptions}
   */
  function normalizeStatsOptions(statsOptions) {
    if (typeof statsOptions === "undefined") {
      // eslint-disable-next-line no-param-reassign
      statsOptions = { preset: "normal" };
    } else if (typeof statsOptions === "boolean") {
      // eslint-disable-next-line no-param-reassign
      statsOptions = statsOptions ? { preset: "normal" } : { preset: "none" };
    } else if (typeof statsOptions === "string") {
      // eslint-disable-next-line no-param-reassign
      statsOptions = { preset: statsOptions };
    }

    return statsOptions;
  }

  /**
   * @param {Stats | MultiStats} stats
   */
  function done(stats) {
    // We are now on valid state
    // eslint-disable-next-line no-param-reassign
    context.state = true;
    // eslint-disable-next-line no-param-reassign
    context.stats = stats;

    // Do the stuff in nextTick, because bundle may be invalidated if a change happened while compiling
    process.nextTick(() => {
      const { compiler, logger, options, state, callbacks } = context;

      // Check if still in valid state
      if (!state) {
        return;
      }

      logger.log("Compilation finished");

      const isMultiCompilerMode = Boolean(
        /** @type {MultiCompiler} */
        (compiler).compilers
      );

      /**
       * @type {StatsOptions | MultiStatsOptions | NormalizedStatsOptions}
       */
      let statsOptions;

      if (typeof options.stats !== "undefined") {
        statsOptions = isMultiCompilerMode
          ? {
              children:
                /** @type {MultiCompiler} */
                (compiler).compilers.map(() => options.stats),
            }
          : options.stats;
      } else {
        statsOptions = isMultiCompilerMode
          ? {
              children:
                /** @type {MultiCompiler} */
                (compiler).compilers.map((child) => child.options.stats),
            }
          : /** @type {Compiler} */ (compiler).options.stats;
      }

      if (isMultiCompilerMode) {
        /** @type {MultiStatsOptions} */
        (statsOptions).children =
          /** @type {MultiStatsOptions} */
          (statsOptions).children.map(
            /**
             * @param {StatsOptions} childStatsOptions
             * @return {NormalizedStatsOptions}
             */
            (childStatsOptions) => {
              // eslint-disable-next-line no-param-reassign
              childStatsOptions = normalizeStatsOptions(childStatsOptions);

              if (typeof childStatsOptions.colors === "undefined") {
                // eslint-disable-next-line no-param-reassign
                childStatsOptions.colors =
                  // eslint-disable-next-line global-require
                  require("colorette").isColorSupported;
              }

              return childStatsOptions;
            }
          );
      } else {
        /** @type {NormalizedStatsOptions} */
        (statsOptions) = normalizeStatsOptions(
          /** @type {StatsOptions} */ (statsOptions)
        );

        if (typeof statsOptions.colors === "undefined") {
          // eslint-disable-next-line global-require
          statsOptions.colors = require("colorette").isColorSupported;
        }
      }

      const printedStats = stats.toString(statsOptions);

      // Avoid extra empty line when `stats: 'none'`
      if (printedStats) {
        // eslint-disable-next-line no-console
        console.log(printedStats);
      }

      // eslint-disable-next-line no-param-reassign
      context.callbacks = [];

      // Execute callback that are delayed
      callbacks.forEach(
        /**
         * @param {(...args: any[]) => Stats | MultiStats} callback
         */
        (callback) => {
          callback(stats);
        }
      );
    });
  }

  // compiler.hooks.watchRun.tap 方法用于向 webpack 的 WatchRun 钩子中注入回调函数，该钩子在文件中的某些修改被侦测到时触发。回调函数接收 compiler 实例作为参数，可以在其中执行一些自定义的操作。通常，WatchRun 钩子被用于在文件发生改变时执行某些特定任务，比如清除缓存、重载页面或者触发热模块替换（HMR）等。
  // TODO 这个钩子函数相关的 改为 ctrl + s
  context.compiler.hooks.watchRun.tap("webpack-dev-middleware", invalid);
  context.compiler.hooks.invalid.tap("webpack-dev-middleware", invalid);
  context.compiler.hooks.done.tap("webpack-dev-middleware", done);
}

module.exports = setupHooks;
