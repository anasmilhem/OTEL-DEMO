const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { PeriodicExportingMetricReader, MeterProvider, AggregationTemporality } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { metrics } = require('@opentelemetry/api');


const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: {
        'Content-Type': 'application/x-protobuf'
    },
    // temporalityPreference: AggregationTemporality.DELTA,
    protocol: 'http/protobuf',
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

// Get a meter instance with a proper namespace
const meter = metrics.getMeter('otel.demo.backend');

// Create metrics following Dynatrace naming conventions and limits
const activeUsers = meter.createUpDownCounter('otel.users.active', {
    description: 'Number of active users in the system (via OpenTelemetry)',
    unit: 'users',
});

const httpRequestDuration = meter.createHistogram('otel.http.duration', {
    description: 'Duration of HTTP requests (via OpenTelemetry)',
    unit: 'ms',
});

const dbOperationDuration = meter.createHistogram('otel.db.duration', {
    description: 'Duration of database operations (via OpenTelemetry)',
    unit: 'ms',
});

const apiEndpointCounter = meter.createCounter('otel.api.hits', {
    description: 'Number of hits per API endpoint (via OpenTelemetry)',
    unit: 'calls',
});

const errorCounter = meter.createCounter('otel.errors.count', {
    description: 'Number of errors occurred (via OpenTelemetry)',
    unit: 'errors',
});


module.exports = {
    activeUsers,
    httpRequestDuration,
    dbOperationDuration,
    apiEndpointCounter,
    errorCounter
}; 
