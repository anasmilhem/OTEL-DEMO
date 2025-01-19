console.log('=== STARTING CUSTOM METRICS INSTRUMENTATION ===');

const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { PeriodicExportingMetricReader, MeterProvider } = require('@opentelemetry/sdk-metrics');
const { metrics } = require('@opentelemetry/api');

console.log('=== IMPORTS COMPLETED ===');

// Create the OTLP exporter regardless
const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: {
        'Content-Type': 'application/x-protobuf'
    },
    protocol: 'http/protobuf',
});

console.log('=== METRIC EXPORTER CREATED ===');
console.log('Metric exporter configured with URL:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

// Create metric reader
const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
});

// Check if a meter provider is already registered
const existingProvider = metrics.getMeterProvider();
let meterProvider;

if (existingProvider._version) {  // Check if it's a real provider and not the NoopMeterProvider
    console.log('=== USING EXISTING METER PROVIDER ===');
    meterProvider = existingProvider;
    
    // Add our OTLP exporter to the existing provider
    if (meterProvider.addMetricReader) {
        console.log('=== ADDING OTLP EXPORTER TO EXISTING PROVIDER ===');
        meterProvider.addMetricReader(metricReader);
    } else {
        console.warn('=== WARNING: Cannot add metric reader to existing provider ===');
    }
} else {
    console.log('=== CREATING NEW METER PROVIDER ===');
    meterProvider = new MeterProvider();
    meterProvider.addMetricReader(metricReader);
    metrics.setGlobalMeterProvider(meterProvider);
}

console.log('=== METER PROVIDER CONFIGURED ===');

// Get a meter instance
const meter = metrics.getMeter('otel.demo.backend');

console.log('=== CREATING METRICS ===');

// Create metrics
const activeUsers = meter.createUpDownCounter('otel.users.active', {
    description: 'Number of active users in the system',
    unit: 'users',
});

const httpRequestDuration = meter.createHistogram('otel.http.duration', {
    description: 'Duration of HTTP requests',
    unit: 'ms',
});

const dbOperationDuration = meter.createHistogram('otel.db.duration', {
    description: 'Duration of database operations',
    unit: 'ms',
});

const apiEndpointCounter = meter.createCounter('otel.api.hits', {
    description: 'Number of hits per API endpoint',
    unit: 'calls',
});

const errorCounter = meter.createCounter('otel.errors.count', {
    description: 'Number of errors occurred',
    unit: 'errors',
});

// Record a test metric
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
