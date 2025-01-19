console.log('=== STARTING CUSTOM METRICS INSTRUMENTATION ===');

const { metrics } = require('@opentelemetry/api');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');

console.log('=== IMPORTS COMPLETED ===');

// Create the OTLP exporter with the Kubernetes service DNS name
const metricExporter = new OTLPMetricExporter({
    url: 'http://backend-collector-collector.dynatrace.svc.cluster.local:4318/v1/metrics',
    headers: {
        'Content-Type': 'application/x-protobuf'
    },
    protocol: 'http/protobuf'
});

console.log('=== METRIC EXPORTER CREATED ===');
console.log('Metric exporter configured with URL:', 'http://backend-collector-collector.dynatrace.svc.cluster.local:4318/v1/metrics');

// Create the metric reader
const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000, // How often to export metrics
});

// Create and register MeterProvider
const meterProvider = new MeterProvider({
    resource: Resource.default().merge(
        new Resource({
            'service.name': 'backend',
            'service.version': '1.0.0',
            'deployment.environment': process.env.NODE_ENV || 'development'
        })
    )
});

// Add the metric reader to the provider
meterProvider.addMetricReader(metricReader);

// Set as global meter provider
metrics.setGlobalMeterProvider(meterProvider);

// Get a meter instance
const meter = metrics.getMeter('backend-service', '1.0.0');
console.log('=== METER CREATED ===');

// Create metrics
const activeUsers = meter.createUpDownCounter('otel.users.active', {
    description: 'Number of active users in the system',
    unit: 'users',
});

const httpRequestDuration = meter.createHistogram('otel.http.server.request.duration', {
    description: 'Duration of HTTP server requests',
    unit: 's'
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
