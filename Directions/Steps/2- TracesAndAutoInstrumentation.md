# Auto-Instrumentation and Trace Collection with OpenTelemetry

## Introduction
After setting up log collection, the next step is to configure automatic instrumentation for Node.js applications and collect traces. This guide covers:
1. Setting up auto-instrumentation configuration
2. Enabling instrumentation via namespace annotation
3. Understanding the trace collection process

## Step 1: Creating the Auto-Instrumentation Configuration

First, let's create the instrumentation configuration file:

```yaml:k8s/otel-instrumentation/node.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: demo-instrumentation
spec:
  exporter:
    endpoint: http://dynatrace-logs-collector.dynatrace.svc.cluster.local:4318
  propagators:
    - tracecontext    # Enables distributed tracing context
    - baggage        # Enables passing metadata between services
  sampler:
    type: parentbased_traceidratio    # Sampling strategy
    argument: "1"    # Sample 100% of traces
  nodejs:
    env:
      - name: OTEL_NODE_ENABLED_INSTRUMENTATIONS
        value: http,express,mongodb,winston,mongoose
      - name: OTEL_EXPORTER_OTLP_PROTOCOL
        value: "http/protobuf"
      - name: OTEL_EXPORTER_OTLP_ENDPOINT
        value: "http://dynatrace-logs-collector.dynatrace.svc.cluster.local:4318"
      - name: OTEL_NODE_INCLUDE_TRACE_CONTEXT
        value: "true"
      - name: OTEL_LOG_LEVEL
        value: "debug"
```

```bash
kubectl apply -f k8s/otel-instrumentation/node.yaml -n dynatrace
```

### Understanding the Configuration

1. **Exporter Configuration**:
   - Points to our DaemonSet collector
   - Uses OTLP HTTP protocol
   - Ensures traces go through the same pipeline as logs

2. **Propagators**:
   - `tracecontext`: W3C standard for trace context propagation
   - `baggage`: Allows metadata to flow between services

3. **Sampling Configuration**:
   - Uses parent-based sampling
   - Set to 100% for development (adjust for production)

4. **Node.js Specific Settings**:
   - Enables specific instrumentations (http, express, etc.)
   - Configures debug logging
   - Ensures trace context is included

## Step 2: Enable Auto-Instrumentation via Namespace Annotation

Add the auto-instrumentation annotation to your namespace:

```yaml:k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: custom-otel-app
  annotations:
    instrumentation.opentelemetry.io/inject-nodejs: "true"
```

```bash
kubectl apply -f k8s/namespace.yaml
```

### How Auto-Instrumentation Works

1. **Injection Process**:
   - OpenTelemetry Operator watches for pods in annotated namespaces
   - Automatically injects the instrumentation agent
   - Modifies pod spec to include necessary environment variables

2. **Agent Initialization**:
   - Agent loads before application code
   - Automatically instruments supported libraries
   - Establishes connection to collector

3. **Runtime Impact**:
   - Minimal performance overhead
   - No code changes required
   - Automatic context propagation

## Step 3: Verifying the Setup

1. **Check Operator Logs**:

```bash
kubectl logs -n opentelemetry-operator-system deployment/opentelemetry-operator-controller-manager
```

2. **Verify Pod Injection**:

```bash
kubectl get pods -n custom-otel-app -o yaml | grep -i opentelemetry
```

3. **Monitor Trace Flow**:
```bash
kubectl logs -n dynatrace deployment/dynatrace-logs-collector | grep "trace"
```

## Best Practices

1. **Sampling Strategy**:
   - Start with 100% sampling in development
   - Adjust based on traffic volume in production
   - Consider using tail-based sampling

2. **Resource Attribution**:
   - Set service name via `OTEL_SERVICE_NAME`
   - Add custom attributes for better filtering
   - Use consistent naming conventions

3. **Security Considerations**:
   - Use secure endpoints in production
   - Implement proper RBAC
   - Monitor resource usage

## Troubleshooting

1. **No Traces Appearing**:
   - Verify namespace annotation
   - Check collector endpoint configuration
   - Inspect pod environment variables

2. **Missing Context**:
   - Ensure propagators are configured
   - Verify instrumentation list includes all needed libraries
   - Check for manual context handling in code

3. **Performance Issues**:
   - Adjust sampling rate
   - Monitor memory usage
   - Check batch export settings

## Next Steps

1. **Custom Instrumentation**:
   - Add manual spans for business logic
   - Implement custom attributes
   - Configure specific instrumentation settings

2. **Monitoring**:
   - Set up trace analytics in Dynatrace
   - Create custom dashboards
   - Configure alerts

3. **Production Readiness**:
   - Review security settings
   - Optimize sampling configuration
   - Plan scaling strategy



// ... previous content ...

## Step 4: Update DaemonSet Collector Configuration

Before traces can flow through our system, we need to update our DaemonSet collector configuration to handle trace data. Add the following to your `dynatrace-otel-collecter-daemonset-template.yaml`:

```yaml:Directions/otel-templates/collecters/dynatrace-otel-collecter-daemonset-template.yaml
// ... existing config ...
    service:
      pipelines:
        logs:
          receivers: [filelog]
          processors: [k8sattributes, resourcedetection/gcp, resource, attributes, batch]
          exporters: [otlphttp/dynatrace]
        traces:    # Add this new pipeline
          receivers: [otlp]
          processors: [k8sattributes, resourcedetection/gcp, resource, attributes, batch]
          exporters: [otlphttp/dynatrace]
```

```bash
kubectl apply -f dynatrace-otel-collecter-daemonset-template.yaml
```

### Understanding the Trace Pipeline

1. **Receivers**:
   - Uses `otlp` receiver to accept traces from auto-instrumented applications
   - Supports both HTTP (4318) and gRPC (4317) protocols

2. **Processors**:
   - Uses the same processor chain as logs for consistency
   - Enriches traces with Kubernetes metadata
   - Adds cloud resource detection
   - Standardizes attributes
   - Batches for efficient export

3. **Exporters**:
   - Sends traces to Dynatrace using the same exporter as logs
   - Maintains consistent authentication and endpoint configuration

This configuration ensures that:
- Traces and logs use consistent processing
- Both telemetry types are enriched with the same metadata
- The collector can handle both types of data efficiently

