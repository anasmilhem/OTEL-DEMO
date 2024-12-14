const winston = require('winston');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { OTLPLogsExporter } = require('@opentelemetry/exporter-logs-otlp-http');

// Configure Winston logger
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
        new winston.transports.Console()
    ]
});

// Initialize OpenTelemetry logging
const loggerProvider = new LoggerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'product-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    })
});

// Configure OTLP exporter
const logsExporter = new OTLPLogsExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://dynatrace-logs-collector.dynatrace:4318/v1/logs'
});

// Bridge Winston to OpenTelemetry
logger.on('data', (log) => {
    const otelLogger = loggerProvider.getLogger('product-service');
    otelLogger.emit({
        severityText: log.level.toUpperCase(),
        body: log.message,
        attributes: {
            ...log,
            timestamp: log.timestamp
        }
    });
});

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logsExporter));

module.exports = { logger, loggerProvider }; 