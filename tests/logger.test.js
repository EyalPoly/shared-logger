const Logger = require("../src/index");
const winston = require("winston");
const path = require("path");
const fs = require("fs");
const DailyRotateFile = require("winston-daily-rotate-file");

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));
jest.mock("winston-daily-rotate-file");
jest.mock("winston", () => {
  const format = {
    combine: jest.fn(),
    timestamp: jest.fn(() => jest.fn()),
    prettyPrint: jest.fn(() => jest.fn()),
    printf: jest.fn((formatter) => formatter),
    colorize: jest.fn(),
    errors: jest.fn(() => jest.fn()),
  };

  const transports = {
    Console: jest.fn(),
  };

  const createLogger = jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    defaultMeta: {},
    add: jest.fn(),
  }));

  const addColors = jest.fn();

  return {
    format,
    transports,
    createLogger,
    addColors,
  };
});

describe("Logger", () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create log directories if they do not exist", () => {
    fs.existsSync.mockReturnValue(false);
    logger = new Logger();

    expect(fs.existsSync).toHaveBeenCalledWith(logger.combinedLogsDir);
    expect(fs.existsSync).toHaveBeenCalledWith(logger.errorLogsDir);
    expect(fs.mkdirSync).toHaveBeenCalledWith(logger.combinedLogsDir, {
      recursive: true,
    });
    expect(fs.mkdirSync).toHaveBeenCalledWith(logger.errorLogsDir, {
      recursive: true,
    });
  });

  it("should not create log directories if they already exist", () => {
    fs.existsSync.mockReturnValue(true);
    logger = new Logger();

    expect(fs.existsSync).toHaveBeenCalledWith(logger.combinedLogsDir);
    expect(fs.existsSync).toHaveBeenCalledWith(logger.errorLogsDir);
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it("should set up custom log levels and colors", () => {
    logger = new Logger();

    expect(winston.addColors).toHaveBeenCalledWith(logger.customLevels.colors);
  });

  it("should create a logger with the correct transports", () => {
    logger = new Logger();

    expect(winston.createLogger).toHaveBeenCalledWith({
      level: logger.logLevel,
      levels: logger.customLevels.levels,
      transports: [
        expect.any(DailyRotateFile),
        expect.any(DailyRotateFile),
        expect.any(winston.transports.Console),
      ],
    });
  });

  it("should update log directories and recreate logger", () => {
    fs.existsSync.mockReturnValue(false);
    logger = new Logger();
    const newCombinedPath = path.join(process.cwd(), "new_combined_logs");
    const newErrorPath = path.join(process.cwd(), "new_error_logs");

    logger.updateLogDirectories(newCombinedPath, newErrorPath);

    expect(logger.combinedLogsDir).toBe(newCombinedPath);
    expect(logger.errorLogsDir).toBe(newErrorPath);
    expect(fs.mkdirSync).toHaveBeenCalledWith(newCombinedPath, {
      recursive: true,
    });
    expect(fs.mkdirSync).toHaveBeenCalledWith(newErrorPath, {
      recursive: true,
    });
    expect(winston.createLogger).toHaveBeenCalledTimes(2);
  });

  it("should set log level", () => {
    logger = new Logger();
    const newLogLevel = "debug";

    logger.setLogLevel(newLogLevel);

    expect(logger.logLevel).toBe(newLogLevel);
    expect(logger.logger.level).toBe(newLogLevel);
  });

  it("should log messages at different levels", () => {
    logger = new Logger();
    const message = "Test message";
    const meta = { key: "value" };

    logger.error(message, meta);
    expect(logger.logger.error).toHaveBeenCalledWith(message, meta);

    logger.warn(message, meta);
    expect(logger.logger.warn).toHaveBeenCalledWith(message, meta);

    logger.info(message, meta);
    expect(logger.logger.info).toHaveBeenCalledWith(message, meta);

    logger.debug(message, meta);
    expect(logger.logger.debug).toHaveBeenCalledWith(message, meta);
  });

  it("should add correlation ID middleware", () => {
    logger = new Logger();
    const req = { id: "123", path: "/test", method: "GET" };
    const res = {};
    const next = jest.fn();

    const middleware = logger.correlationMiddleware();
    middleware(req, res, next);

    expect(logger.logger.defaultMeta).toEqual({
      requestId: "123",
      path: "/test",
      method: "GET",
    });
    expect(next).toHaveBeenCalled();
  });
});
