const winston = require('winston');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { OTLPLogsExporter } = require('@opentelemetry/exporter-logs-otlp-http');

// Configure OTLP exporter first
const logsExporter = new OTLPLogsExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://dynatrace-logs-collector.dynatrace:4318' // Remove /v1/logs
});

// Initialize OpenTelemetry logging
const loggerProvider = new LoggerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'product-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    })
});

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logsExporter));
const otelLogger = loggerProvider.getLogger('product-service');

// Configure Winston with a custom transport
const OTLPTransport = winston.transports.Stream;
const transport = new OTLPTransport({
    stream: {
        write: (log) => {
            const parsedLog = JSON.parse(log);
            otelLogger.emit({
                severityText: parsedLog.level.toUpperCase(),
                body: parsedLog.message,
                attributes: parsedLog
            });
        }
    }
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'product-service',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        new winston.transports.Console(),
        transport
    ]
});

// Add shutdown handler
process.on('SIGTERM', () => {
    loggerProvider.shutdown()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Error shutting down logger provider:', error);
            process.exit(1);
        });
});

module.exports = { logger, loggerProvider };