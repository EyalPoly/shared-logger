const winston = require("winston");
const path = require("path");
const fs = require("fs");
const DailyRotateFile = require("winston-daily-rotate-file");

class SharedLogger {
  static instance = null;

  static getInstance(options = {}) {
    if (!SharedLogger.instance) {
      SharedLogger.instance = new SharedLogger(options);
    }
    return SharedLogger.instance;
  }

  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.combinedLogsDir =
      options.combinedLogsDir || path.join(this.rootDir, "logs", "combined");
    this.errorLogsDir =
      options.errorLogsDir || path.join(this.rootDir, "logs", "errors");
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || "info";

    this.createLogDirectories();
    this.setupFormats();
    this.setupCustomLevels();
    this.setupTransports();
    this.createLogger();
  }

  createLogDirectories() {
    [this.combinedLogsDir, this.errorLogsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  setupFormats() {
    const errorFormatter = winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const errorStack = stack || (meta?.error?.stack ?? "");
      const errorMsg = meta?.error?.message ? ` | ${meta.error.message}` : "";
      return `${timestamp} ${level}: ${message}${errorMsg}${errorStack ? `\n${errorStack}` : ""}`;
    });

    this.fileFormat = winston.format.combine(
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      winston.format.errors({ stack: true }),
      winston.format.prettyPrint({
        depth: 5,
      }),
      errorFormatter
    );

    this.consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      winston.format.errors({ stack: true }),
      winston.format.prettyPrint({
        depth: 5,
      }),
      errorFormatter
    );
  }

  setupCustomLevels() {
    this.customLevels = {
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
      },
      colors: {
        error: "red",
        warn: "yellow",
        info: "green",
      },
    };
    winston.addColors(this.customLevels.colors);
  }

  setupTransports() {
    this.consoleTransport = new winston.transports.Console({
      format: this.consoleFormat,
    });

    this.combinedFileTransport = new DailyRotateFile({
      filename: path.join(this.combinedLogsDir, "%DATE%_combined.log"),
      format: this.fileFormat,
      datePattern: "YYYY-MM-DD-HH",
      maxSize: "2m",
      maxFiles: "14d",
      handleExceptions: true,
      handleRejections: true,
      zippedArchive: true,
    });

    this.errorFileTransport = new DailyRotateFile({
      filename: path.join(this.errorLogsDir, "%DATE%_error.log"),
      level: "error",
      format: this.fileFormat,
      datePattern: "YYYY-MM-DD-HH",
      maxSize: "2m",
      maxFiles: "14d",
      handleExceptions: true,
      handleRejections: true,
      zippedArchive: true,
    });
  }

  createLogger() {
    this.logger = winston.createLogger({
      level: this.logLevel,
      levels: this.customLevels.levels,
      transports: [
        this.errorFileTransport,
        this.combinedFileTransport,
        this.consoleTransport,
      ],
    });
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  updateLogDirectories(combinedPath, errorPath) {
    this.combinedLogsDir = combinedPath;
    this.errorLogsDir = errorPath;
    this.createLogDirectories();
    this.setupTransports();
    this.createLogger();
  }

  setLogLevel(level) {
    this.logLevel = level;
    this.logger.level = level;
  }

  // Method to add correlation ID middleware for Express
  correlationMiddleware() {
    return (req, res, next) => {
      this.logger.defaultMeta = {
        requestId: req.id || require("crypto").randomUUID(),
        path: req.path,
        method: req.method,
      };
      next();
    };
  }
}

module.exports = SharedLogger;
