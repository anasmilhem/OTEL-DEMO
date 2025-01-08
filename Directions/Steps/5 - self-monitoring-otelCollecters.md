# Self-Monitoring OpenTelemetry Collectors

## Introduction
This guide explains how to set up self-monitoring for your OpenTelemetry collectors in a Kubernetes environment. By monitoring the collectors themselves, you can ensure they're functioning correctly and track their resource usage.

## Understanding Collector Self-Monitoring
OpenTelemetry collectors can expose their own metrics through a Prometheus endpoint. This allows us to:
- Monitor collector health
- Track processing performance
- Observe resource usage
- Identify potential bottlenecks

## Step 1: Enable Metrics Collection

First, enable metrics collection in your collector configuration by adding the observability section:

```yaml:Directions/otel-templates/collecters/self-monitoring-template.yaml
spec:
  observability:
    metrics:
      enableMetrics: true
```

## Step 2: Configure the Prometheus Receiver

Add the prometheus receiver to collect metrics from the collector itself:

```yaml:Directions/otel-templates/collecters/self-monitoring-template.yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: contrib-opentelemetry-collector-daemonset  # or deployment based on your collector type
          scrape_interval: 30s
          static_configs:
            - targets:
                - ${MY_POD_IP}:8888  # Collector's metrics endpoint
```

## Step 3: Set Up Processing Pipeline

Configure a dedicated pipeline for processing the collector's metrics. The processors are specifically configured for Dynatrace compatibility:

```yaml:Directions/otel-templates/collecters/self-monitoring-template.yaml
processors:
  filter/histogram:
    error_mode: ignore
    metrics:
      metric:
        - "type == METRIC_DATA_TYPE_HISTOGRAM"
  cumulativetodelta: {}
  batch:
    send_batch_max_size: 1000
    timeout: 30s
    send_batch_size: 800

service:
  pipelines:
    metrics/prometheus:
      receivers: [prometheus]
      processors: [filter/histogram, cumulativetodelta, batch]
      exporters: [otlphttp/dynatrace]
```

### Understanding the Processors

#### 1. filter/histogram Processor
This processor is specifically needed because:
- Dynatrace does not support histogram metric types
- Rather than causing errors, we filter out these unsupported metrics
- `error_mode: ignore` ensures the pipeline continues to function even when histogram metrics are encountered
- This prevents data ingestion failures in Dynatrace

#### 2. cumulativetodelta Processor
This processor is essential for Dynatrace compatibility because:
- Dynatrace does not support cumulative sum metric types
- It converts cumulative metrics (which many OpenTelemetry collectors output) into delta metrics
- Delta metrics are the format Dynatrace expects and can process
- Without this conversion, the metrics would not be properly ingested by Dynatrace

Example of Conversion:
```
Before (Cumulative - Not supported by Dynatrace):
Time    Value
1:00    1000
1:01    1500
1:02    2000

After (Delta - Supported by Dynatrace):
Time    Value
1:00    1000
1:01    500
1:02    500
```

## Step 4: Configure Debug Exporter (Optional)

For additional visibility during setup and troubleshooting, add the debug exporter:

```yaml:Directions/otel-templates/collecters/self-monitoring-template.yaml
exporters:
  debug:
    verbosity: basic
    sampling_initial: 5
    sampling_thereafter: 20

service:
  telemetry:
    logs:
      level: "info"
    metrics:
      level: "detailed"
```

## Key Metrics to Monitor

The collector exposes several important metrics:

1. Receiver Metrics:
   - `otelcol_receiver_accepted_spans`
   - `otelcol_receiver_refused_spans`

2. Processor Metrics:
   - `otelcol_processor_batch_batch_size`
   - `otelcol_processor_batch_timeout_trigger`

3. Exporter Metrics:
   - `otelcol_exporter_sent_spans`
   - `otelcol_exporter_failed_spans`

4. Resource Usage:
   - `process_cpu_seconds_total`
   - `process_resident_memory_bytes`

## Complete Example Configuration

Here's a complete example showing how to implement self-monitoring in your collector:

```yaml:Directions/otel-templates/collecters/self-monitoring-template.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: dynatrace-metrics-node
  namespace: dynatrace
spec:
  # ... other spec fields ...
  observability:
    metrics:
      enableMetrics: true
  config:
    receivers:
      prometheus:
        config:
          scrape_configs:
            - job_name: contrib-opentelemetry-collector-daemonset
              scrape_interval: 30s
              static_configs:
                - targets:
                    - ${MY_POD_IP}:8888

    processors:
      filter/histogram:
        error_mode: ignore
        metrics:
          metric:
            - "type == METRIC_DATA_TYPE_HISTOGRAM"
      cumulativetodelta: {}
      batch:
        send_batch_max_size: 1000
        timeout: 30s
        send_batch_size: 800

    exporters:
      otlphttp/dynatrace:
        endpoint: "${env:DT_ENDPOINT}"
        headers:
          Authorization: "Api-Token ${env:DT_API_TOKEN}"
      debug:
        verbosity: basic
        sampling_initial: 5
        sampling_thereafter: 20

    service:
      telemetry:
        logs:
          level: "info"
        metrics:
          level: "detailed"
      pipelines:
        metrics/prometheus:
          receivers: [prometheus]
          processors: [filter/histogram, cumulativetodelta, batch]
          exporters: [otlphttp/dynatrace]
```

## Viewing Metrics in Dynatrace

Once configured, you can view your collector metrics in Dynatrace:
1. Navigate to the Metrics browser
2. Search for "otelcol" to find collector-specific metrics
3. Create dashboards to monitor collector health and performance

