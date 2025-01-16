A shared logging solution for Node.js microservices built on top of Winston.

## Installation

```bash
npm install @EyalPoly/shared-logger
```

## Usage

```javascript
const SharedLogger = require("@EyalPoly/shared-logger");

const logger = SharedLogger.getInstance({
  serviceName: "my-service",
  logLevel: "info",
  logsBasePath: "/var/log/services",
});

// Basic logging
logger.info("Server started", { port: 3000 });
logger.error("Database connection failed", { error: err });
```

## Configuration Options

- `serviceName`: Name of your service (default: 'default-service')
- `rootDir`: Root directory for logs (default: process.cwd())
- `logLevel`: Logging level (default: process.env.LOG_LEVEL || 'info')
- `logsBasePath`: Base path for all service logs (default: '/var/log/services')

## License

MIT
