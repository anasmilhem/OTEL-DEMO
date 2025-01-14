const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { PeriodicExportingMetricReader, MeterProvider } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { metrics } = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node');

// Create and configure metrics exporter
const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics'
});

// Create metric reader
const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
});

// Create and configure MeterProvider
const meterProvider = new MeterProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'demo-backend-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
});

// Add metric reader to MeterProvider
meterProvider.addMetricReader(metricReader);

// Set global meter provider
metrics.setGlobalMeterProvider(meterProvider);

// Get a meter instance
const meter = metrics.getMeter('demo-backend-metrics');

// Create metrics
const activeUsers = meter.createUpDownCounter('active_users', {
    description: 'Number of active users in the system',
    unit: 'users',
});

const httpRequestDuration = meter.createHistogram('http_request_duration', {
    description: 'Duration of HTTP requests',
    unit: 'ms',
});

const dbOperationDuration = meter.createHistogram('db_operation_duration', {
    description: 'Duration of database operations',
    unit: 'ms',
});

const apiEndpointCounter = meter.createCounter('api_endpoint_hits', {
    description: 'Number of hits per API endpoint',
    unit: 'calls',
});

const errorCounter = meter.createCounter('error_count', {
    description: 'Number of errors occurred',
    unit: 'errors',
});

// Add SDK initialization before the exports
const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'demo-backend-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
    metricReader,
    metricExporter,
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
    }),
    instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();

// Export metrics for use in other files
module.exports = {
    activeUsers,
    httpRequestDuration,
    dbOperationDuration,
    apiEndpointCounter,
    errorCounter
}; 