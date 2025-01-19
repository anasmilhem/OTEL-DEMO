console.log('=== STARTING CUSTOM METRICS INSTRUMENTATION ===');

const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { PeriodicExportingMetricReader, MeterProvider, AggregationTemporality } = require('@opentelemetry/sdk-metrics');
const { metrics } = require('@opentelemetry/api');

console.log('=== IMPORTS COMPLETED ===');

const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: {
        'Content-Type': 'application/x-protobuf'
    },
    protocol: 'http/protobuf',
});

console.log('=== METRIC EXPORTER CREATED ===');
console.log('Metric exporter configured with URL:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

// Add error handling
metricExporter.on('error', (error) => {
    console.error('=== METRIC EXPORT ERROR ===', error);
});

metricExporter.on('success', () => {
    console.log('=== METRICS EXPORTED SUCCESSFULLY ===');
});

// Create metric reader
const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
});

// Create and configure MeterProvider with minimal configuration
// The collector will add the necessary resource attributes
const meterProvider = new MeterProvider();

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
console.log('Created API endpoint counter metric');

const errorCounter = meter.createCounter('otel.errors.count', {
    description: 'Number of errors occurred (via OpenTelemetry)',
    unit: 'errors',
});

// Record a test metric immediately
console.log('=== RECORDING TEST METRIC ===');
apiEndpointCounter.add(1, {
    method: 'STARTUP',
    route: '/test'
});
console.log('=== TEST METRIC RECORDED ===');

module.exports = {
    activeUsers,
    httpRequestDuration,
    dbOperationDuration,
    apiEndpointCounter,
    errorCounter
}; 
