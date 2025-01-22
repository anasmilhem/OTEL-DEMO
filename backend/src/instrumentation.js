console.log('=== STARTING CUSTOM METRICS INSTRUMENTATION ===');

const { metrics } = require('@opentelemetry/api');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');

console.log('=== IMPORTS COMPLETED ===');

// Create the OTLP exporter regardless of existing provider
const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_METRIC_COLLECTOR_ENDPOINT || 'http://backend-collector-collector.dynatrace.svc.cluster.local:4318/v1/metrics',
    headers: {
        'Content-Type': 'application/x-protobuf'
    },
    protocol: 'http/protobuf'
});

console.log('=== METRIC EXPORTER CREATED ===');
console.log('Metric exporter configured with URL:', process.env.OTEL_METRIC_COLLECTOR_ENDPOINT || 'http://backend-collector-collector.dynatrace.svc.cluster.local:4318/v1/metrics');

// Create the metric reader
const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
});

// Check if we already have a meter provider (from Dynatrace)
const existingProvider = metrics.getMeterProvider();

console.log('=== EXISTING PROVIDER ===');
console.log(existingProvider);
console.log('=== EXISTING PROVIDER END ===');

let meter;

// Better check for existing provider
if (existingProvider && existingProvider._sharedState) {
    console.log('=== USING EXISTING METER PROVIDER ===');
    // Try to add our OTLP exporter to the existing provider
    if (typeof existingProvider.addMetricReader === 'function') {
        console.log('=== ADDING OTLP EXPORTER TO EXISTING PROVIDER ===');
        try {
            existingProvider.addMetricReader(metricReader);
            console.log('Successfully added OTLP exporter to existing provider');
        } catch (error) {
            console.warn('Failed to add OTLP exporter to existing provider:', error);
        }
    } else {
        console.warn('=== WARNING: Cannot add metric reader to existing provider ===');
    }
    meter = metrics.getMeter('backend-service', '1.0.0');
} else {
    console.log('=== NO EXISTING PROVIDER FOUND, CREATING NEW PROVIDER ===');
    // Create a new meter provider
    const meterProvider = new MeterProvider({
        resource: new Resource({
            'service.name': 'backend-service',
            'service.version': '1.0.0'
        }),
    });
    
    // Add the metric reader to the provider
    meterProvider.addMetricReader(metricReader);
    
    // Set the global meter provider
    metrics.setGlobalMeterProvider(meterProvider);
    meter = metrics.getMeter('backend-service', '1.0.0');
}

console.log('=== METER CREATED ===');

// Create metrics with original names
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
